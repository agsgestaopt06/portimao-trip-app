"""
Iteration 5 — Deployment diagnosis regression tests.
Compares Render production backend (expected OLD code) vs Emergent preview
backend (expected NEW code) to prove where the drift lies.
"""
import json
import os
import requests
import pytest

RENDER_URL = "https://portimao-family-backend.onrender.com"
PREVIEW_URL = os.environ.get(
    "EXPO_BACKEND_URL",
    "https://portimao-experiences.preview.emergentagent.com",
).rstrip("/")


# ---------- Render (production) — expected OLD ---------- #
class TestRenderProductionOld:
    def test_restaurants_returns_old_count(self):
        r = requests.get(f"{RENDER_URL}/api/restaurants", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # OLD code had 5 restaurants (before the expansion to 17/18)
        assert len(data) == 5, f"Expected 5 (old), got {len(data)}"

    def test_beaches_returns_404(self):
        r = requests.get(f"{RENDER_URL}/api/beaches", timeout=30)
        assert r.status_code == 404

    def test_attractions_returns_404(self):
        r = requests.get(f"{RENDER_URL}/api/attractions", timeout=30)
        assert r.status_code == 404

    def test_tickets_returns_404_or_old_shape(self):
        r = requests.get(f"{RENDER_URL}/api/tickets", timeout=30)
        # In current OLD deployment the /api/tickets endpoint does not exist
        assert r.status_code == 404


# ---------- Emergent preview — expected NEW ---------- #
class TestPreviewNewBackend:
    def test_restaurants_expanded(self):
        r = requests.get(f"{PREVIEW_URL}/api/restaurants", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Review request said 18 — actual seed is 17. Assert >=15 to be robust
        assert len(data) >= 15, f"Expected expanded list, got {len(data)}"

    def test_beaches_new_endpoint(self):
        r = requests.get(f"{PREVIEW_URL}/api/beaches", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 10

    def test_attractions_new_endpoint(self):
        r = requests.get(f"{PREVIEW_URL}/api/attractions", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 12

    def test_tickets_has_passengers(self):
        r = requests.get(f"{PREVIEW_URL}/api/tickets", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # New shape: list; first item (expressos-ida) has passengers array of 4
        assert isinstance(data, list) and len(data) >= 1
        ida = next((x for x in data if x.get("id") == "expressos-ida"), None)
        assert ida is not None, "expressos-ida ticket missing"
        assert isinstance(ida.get("passengers"), list)
        assert len(ida["passengers"]) == 4


# ---------- Local source code sanity ---------- #
class TestLocalSourceHasNewEndpoints:
    SERVER = "/app/backend/server.py"

    @pytest.mark.parametrize(
        "sig",
        [
            "async def beaches",
            "async def attractions",
            "async def hotel_details",
            "async def ai_tip",
            "async def trip_stats",
            "async def emergency",
            "async def tickets",
        ],
    )
    def test_endpoint_defined(self, sig):
        with open(self.SERVER) as f:
            src = f.read()
        assert sig in src, f"Missing definition: {sig}"


class TestDeploymentConfigFiles:
    def test_render_yaml_exists_and_correct(self):
        with open("/app/render.yaml") as f:
            content = f.read()
        assert "rootDir: backend" in content
        assert "autoDeploy: true" in content
        assert "branch: main" in content
        assert "portimao-family-backend" in content
        assert "healthCheckPath: /api/" in content

    def test_vercel_json_cache_headers(self):
        with open("/app/frontend/vercel.json") as f:
            cfg = json.load(f)
        headers = cfg.get("headers", [])
        sources = {h["source"]: h["headers"] for h in headers}

        def _get(source, key):
            for h in sources.get(source, []):
                if h["key"].lower() == key.lower():
                    return h["value"]
            return None

        idx = _get("/index.html", "Cache-Control")
        assert idx and "must-revalidate" in idx

        static = _get("/_expo/static/js/web/(.*)", "Cache-Control")
        assert static and "immutable" in static

        assets = _get("/assets/(.*)", "Cache-Control")
        assert assets and "immutable" in assets

    def test_vercel_json_uses_render_backend_url(self):
        with open("/app/frontend/vercel.json") as f:
            cfg = json.load(f)
        env = cfg.get("build", {}).get("env", {})
        assert env.get("EXPO_PUBLIC_BACKEND_URL") == (
            "https://portimao-family-backend.onrender.com"
        )
        assert "portimao-family-backend.onrender.com" in cfg["buildCommand"]
