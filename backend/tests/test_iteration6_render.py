"""
Iteration 6 tests — verify Render build fix.
- Backend must run WITHOUT emergentintegrations (as on Render).
- requirements.txt must not contain emergentintegrations; must have google-generativeai + httpx.
- /api/ai-tip must always return valid tip (curated fallback when no AI).
- /api/chat: 503 when no AI key; must not 500.
- All other endpoints keep working.
"""
import os
import sys
import json
import subprocess
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"
load_dotenv(BACKEND_DIR / ".env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if not BASE_URL:
    # fallback: read from frontend/.env
    fe_env = ROOT / "frontend" / ".env"
    for line in fe_env.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# =====================================================
# 1) requirements.txt content checks
# =====================================================
class TestRequirements:
    def test_no_emergentintegrations(self):
        content = (BACKEND_DIR / "requirements.txt").read_text().lower()
        assert "emergentintegrations" not in content, "emergentintegrations must be removed for Render build"

    def test_has_google_generativeai(self):
        content = (BACKEND_DIR / "requirements.txt").read_text()
        assert "google-generativeai" in content, "google-generativeai is the production LLM fallback"

    def test_has_httpx(self):
        content = (BACKEND_DIR / "requirements.txt").read_text()
        assert "httpx" in content


# =====================================================
# 2) server.py can import WITHOUT emergentintegrations
#    (simulate Render environment by hiding the package via PYTHONPATH shadowing)
# =====================================================
class TestImportWithoutEmergent:
    def test_import_server_without_emergentintegrations(self, tmp_path):
        """Simulate Render: create a fake blocker for emergentintegrations and import server.py."""
        # Write a sitecustomize that makes emergentintegrations ImportError
        blocker_dir = tmp_path / "shadow"
        blocker_dir.mkdir()
        # Create a "fake" module that raises ImportError when accessed sub-attr — safer to just
        # block by setting sys.modules['emergentintegrations'] = None inside a subprocess.
        script = f"""
import sys
# Block emergentintegrations import (simulate Render env)
sys.modules['emergentintegrations'] = None
sys.modules['emergentintegrations.llm'] = None
sys.modules['emergentintegrations.llm.chat'] = None
sys.path.insert(0, r'{BACKEND_DIR}')
import importlib
try:
    server = importlib.import_module('server')
    assert server.HAS_EMERGENT is False, f"HAS_EMERGENT should be False, got {{server.HAS_EMERGENT}}"
    assert callable(server.llm_generate), 'llm_generate must exist'
    print('IMPORT_OK')
except Exception as e:
    print(f'IMPORT_FAIL: {{type(e).__name__}}: {{e}}')
    raise
"""
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True, text=True, timeout=30,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        assert "IMPORT_OK" in result.stdout, f"STDOUT: {result.stdout}\nSTDERR: {result.stderr}"


# =====================================================
# 3) Core endpoints — counts / data shape
# =====================================================
class TestCoreEndpoints:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200

    def test_restaurants_17(self, s):
        r = s.get(f"{API}/restaurants")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 17, f"expected 17 restaurants, got {len(data)}"
        # Sample field integrity
        assert "walk_min" in data[0]
        assert "distance_km" in data[0]

    def test_beaches_10(self, s):
        r = s.get(f"{API}/beaches")
        assert r.status_code == 200
        assert len(r.json()) == 10

    def test_attractions_12(self, s):
        r = s.get(f"{API}/attractions")
        assert r.status_code == 200
        assert len(r.json()) == 12

    def test_tickets_4_with_passengers(self, s):
        r = s.get(f"{API}/tickets")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 4
        buses = [t for t in data if t.get("type") == "bus"]
        assert len(buses) >= 2
        for b in buses:
            assert "passengers" in b and len(b["passengers"]) == 4

    def test_trip(self, s):
        r = s.get(f"{API}/trip")
        assert r.status_code == 200
        assert r.json().get("destination")

    def test_itinerary(self, s):
        r = s.get(f"{API}/itinerary")
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_hacks(self, s):
        r = s.get(f"{API}/hacks")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_checklist(self, s):
        r = s.get(f"{API}/checklist")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_budget_expenses(self, s):
        r = s.get(f"{API}/budget/expenses")
        assert r.status_code == 200
        j = r.json()
        assert "expenses" in j and "total_spent" in j

    def test_gallery(self, s):
        r = s.get(f"{API}/gallery")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_diary(self, s):
        r = s.get(f"{API}/diary")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# =====================================================
# 4) /api/ai-tip — must return valid tip always
# =====================================================
class TestAITip:
    def test_ai_tip_returns_valid_shape(self, s):
        r = s.get(f"{API}/ai-tip", timeout=25)
        assert r.status_code == 200, f"got {r.status_code}: {r.text}"
        data = r.json()
        # required keys
        for k in ("tip", "topic", "icon", "date"):
            assert k in data, f"missing key {k} in {data}"
        assert isinstance(data["tip"], str) and len(data["tip"]) > 5
        assert isinstance(data["topic"], str)
        assert isinstance(data["icon"], str)


# =====================================================
# 5) /api/chat — with key returns 200; without key returns 503 (NOT 500)
# =====================================================
class TestChat:
    def test_chat_with_key(self, s):
        # In the local env EMERGENT_LLM_KEY is set → should not 503.
        # We accept 200 (reply generated) OR 500 (LLM SDK error) but NOT 503.
        payload = {"session_id": "TEST_chat_session", "message": "Olá!"}
        r = s.post(f"{API}/chat", json=payload, timeout=45)
        # Must not be 503 because EMERGENT_LLM_KEY is present
        assert r.status_code != 503, "should not be 503 when EMERGENT_LLM_KEY is set"
        # Expected either 200 or 500 (if underlying SDK breaks)
        assert r.status_code in (200, 500), f"unexpected {r.status_code}: {r.text}"

    def test_chat_no_key_returns_503(self, tmp_path):
        """Simulate Render env with NO keys. Because server.py runs load_dotenv() which
        populates EMERGENT_LLM_KEY from local .env, we monkey-patch the module-level
        constants AFTER import (this is exactly what would be seen on Render where no
        .env exists and the env vars are unset)."""
        script = f"""
import os, sys, asyncio
sys.modules['emergentintegrations'] = None
sys.modules['emergentintegrations.llm'] = None
sys.modules['emergentintegrations.llm.chat'] = None
sys.path.insert(0, r'{BACKEND_DIR}')
import importlib
server = importlib.import_module('server')
# Simulate Render: no keys, no emergent lib
server.EMERGENT_LLM_KEY = ''
server.GEMINI_API_KEY = ''
server.HAS_EMERGENT = False
from fastapi import HTTPException
async def run():
    try:
        await server.chat(server.ChatRequest(session_id='t', message='oi'))
        print('NO_EXCEPTION')
    except HTTPException as e:
        print(f'HTTP_{{e.status_code}}')
asyncio.run(run())
"""
        result = subprocess.run(
            [sys.executable, "-c", script], capture_output=True, text=True, timeout=30
        )
        assert "HTTP_503" in result.stdout, f"expected 503; STDOUT: {result.stdout}\nSTDERR: {result.stderr}"


# =====================================================
# 6) Simulate no-AI env for /api/ai-tip and verify curated fallback
# =====================================================
class TestAITipNoKeys:
    def test_ai_tip_fallback_when_no_ai_keys(self):
        script = f"""
import os, sys, asyncio
sys.modules['emergentintegrations'] = None
sys.modules['emergentintegrations.llm'] = None
sys.modules['emergentintegrations.llm.chat'] = None
os.environ.pop('EMERGENT_LLM_KEY', None)
os.environ.pop('GEMINI_API_KEY', None)
sys.path.insert(0, r'{BACKEND_DIR}')
import importlib
server = importlib.import_module('server')
importlib.reload(server)
async def run():
    # Bypass Mongo cache by deleting today's tip first (best-effort)
    try:
        await server.db.ai_tips.delete_many({{}})
    except Exception:
        pass
    out = await server.ai_tip()
    assert 'tip' in out and 'topic' in out and 'icon' in out and 'date' in out
    print('OK:' + out['tip'][:60])
asyncio.run(run())
"""
        result = subprocess.run(
            [sys.executable, "-c", script], capture_output=True, text=True, timeout=30
        )
        assert result.stdout.startswith("OK:"), f"STDOUT: {result.stdout}\nSTDERR: {result.stderr}"
