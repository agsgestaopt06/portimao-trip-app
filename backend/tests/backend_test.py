"""Backend tests for Portimão'26 – Iteration 3.

Covers all endpoints referenced by the mobile app + Vercel-deployed web export:
- restaurants (with 5 new Brazilian items)
- tickets (Rede Expressos R6LJC56/R6LJC5N + hotel + Benagil w/ qr_url)
- emergency (9 items, 112 danger)
- trip-stats (phase, budget, checklist)
- briefings, weather, shopping, smart-go, bus/next, itinerary
"""
import pytest
import requests

BASE_URL = None
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Basic health ----------------
class TestBasics:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ---------------- Restaurants (Iteration 3 focus) ----------------
class TestRestaurants:
    def test_restaurants_include_brazilian(self, api):
        r = api.get(f"{BASE_URL}/api/restaurants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 10, f"expected 10 restaurants, got {len(data)}"
        ids = {x["id"] for x in data}
        expected_brazilian = {
            "churrascaria-brasa", "boteco-rio", "pastel-cia",
            "acai-sol", "feijoada-mineira",
        }
        missing = expected_brazilian - ids
        assert not missing, f"missing Brazilian restaurants: {missing}"

    def test_brazilian_restaurants_have_images(self, api):
        r = api.get(f"{BASE_URL}/api/restaurants", timeout=15)
        data = r.json()
        by_id = {x["id"]: x for x in data}
        for rid in ["churrascaria-brasa", "boteco-rio", "pastel-cia",
                    "acai-sol", "feijoada-mineira"]:
            item = by_id[rid]
            assert item.get("image") or item.get("image_url"), f"{rid} missing image"


# ---------------- Tickets ----------------
class TestTickets:
    def test_tickets_have_rede_expressos_and_qr(self, api):
        r = api.get(f"{BASE_URL}/api/tickets", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 4

        ida = next((t for t in data if t["id"] == "expressos-ida"), None)
        volta = next((t for t in data if t["id"] == "expressos-volta"), None)
        assert ida and volta
        assert "Rede Expressos" in ida["operator"]
        assert "Rede Expressos" in volta["operator"]
        assert ida["code"] == "R6LJC56"
        assert volta["code"] == "R6LJC5N"
        for t in data:
            assert t.get("qr_url") and "quickchart.io/qr" in t["qr_url"], \
                f"{t['id']} missing qr_url"

    def test_tickets_include_hotel_and_benagil(self, api):
        r = api.get(f"{BASE_URL}/api/tickets", timeout=15)
        data = r.json()
        ids = {t["id"] for t in data}
        assert {"hotel", "benagil"}.issubset(ids)


# ---------------- Emergency ----------------
class TestEmergency:
    def test_emergency_contacts(self, api):
        r = api.get(f"{BASE_URL}/api/emergency", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 9
        by_id = {c["id"]: c for c in data}
        assert by_id["112"]["tone"] == "danger"
        assert by_id["112"]["phone"] == "112"
        assert by_id["hospital"].get("lat") and by_id["hospital"].get("lng")
        for k in ["farmacia-rocha", "psp", "gnr-praia",
                  "hotel-contact", "embaixada-br"]:
            assert k in by_id


# ---------------- Trip stats ----------------
class TestTripStats:
    def test_trip_stats_fields(self, api):
        r = api.get(f"{BASE_URL}/api/trip-stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for f in ["phase", "phase_label", "budget_spent", "budget_max",
                  "checklist_done", "checklist_total",
                  "shopping_done", "shopping_total", "budget_ratio"]:
            assert f in data
        assert data["phase"] in ("before", "during", "after")
        assert data["budget_max"] == 290


# ---------------- Itinerary ----------------
class TestItinerary:
    def test_itinerary_events(self, api):
        r = api.get(f"{BASE_URL}/api/itinerary", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 4
        day1 = [e for e in data[0]["events"] if e["time"] == "15:15"]
        assert day1 and "Rede Expressos" in day1[0]["title"]
        day4 = [e for e in data[3]["events"] if e["time"] == "13:10"]
        assert day4 and "R6LJC5N" in day4[0]["description"]


# ---------------- Content endpoints ----------------
class TestContent:
    def test_briefings(self, api):
        r = api.get(f"{BASE_URL}/api/briefings", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and isinstance(d["items"], list)

    def test_weather(self, api):
        r = api.get(f"{BASE_URL}/api/weather", timeout=15)
        assert r.status_code == 200

    def test_shopping(self, api):
        r = api.get(f"{BASE_URL}/api/shopping", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) or isinstance(d, dict)


# ---------------- Query-param endpoints ----------------
class TestSmartGo:
    def test_smart_go_requires_params(self, api):
        # Without params -> 422 (validation error) is expected
        r = api.get(f"{BASE_URL}/api/smart-go", timeout=10)
        assert r.status_code == 422

    def test_bus_next_requires_params(self, api):
        r = api.get(f"{BASE_URL}/api/bus/next", timeout=10)
        assert r.status_code == 422
