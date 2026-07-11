"""Backend tests for Portimão'26 – Iteration 2."""
import os
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
        assert "50" in ida["seat"] and "53" in ida["seat"]
        assert "43" in volta["seat"] and "46" in volta["seat"]
        assert "Abicada" in ida["arrival"]
        for t in data:
            assert t.get("qr_url") and "quickchart.io/qr" in t["qr_url"]


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
        for k in ["farmacia-rocha", "psp", "gnr-praia", "hotel-contact", "embaixada-br"]:
            assert k in by_id


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
        assert data["checklist_total"] > 0


class TestItinerary:
    def test_itinerary_events(self, api):
        r = api.get(f"{BASE_URL}/api/itinerary", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 4

        day1_events = data[0]["events"]
        e1 = [e for e in day1_events if e["time"] == "15:15"]
        assert e1 and "Rede Expressos" in e1[0]["title"] and "Sete Rios" in e1[0]["title"]

        day4_events = data[3]["events"]
        e4 = [e for e in day4_events if e["time"] == "13:10"]
        assert e4 and "R6LJC5N" in e4[0]["description"]


class TestBriefings:
    def test_briefings(self, api):
        r = api.get(f"{BASE_URL}/api/briefings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "now" in data
        assert isinstance(data["items"], list)


class TestBasics:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
