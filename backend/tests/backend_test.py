"""Backend API tests for Portimão trip app.

Covers Smart Go, Briefings, Bus schedule/next, Weather (Open-Meteo),
Shopping list toggle, Tickets, Restaurants, AI Chat (Gemini via Emergent),
and existing endpoints (trip, itinerary, hacks, checklist, budget, gallery,
diary).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://portimao-experiences.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ----- Root / Trip / Existing -----
class TestBasic:
    def test_root(self, sess):
        r = sess.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_trip(self, sess):
        r = sess.get(f"{API}/trip", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["destination"].startswith("Portimão")
        assert d["budget_min"] == 250 and d["budget_max"] == 290

    def test_itinerary(self, sess):
        r = sess.get(f"{API}/itinerary", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 4
        assert items[0]["day"] == 1 and len(items[0]["events"]) > 0

    def test_hacks(self, sess):
        r = sess.get(f"{API}/hacks", timeout=15)
        assert r.status_code == 200 and len(r.json()) >= 6

    def test_checklist_seeded(self, sess):
        r = sess.get(f"{API}/checklist", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 15
        assert all("id" in x and "label" in x for x in data)


# ----- Smart Go -----
class TestSmartGo:
    def test_smart_go_hotel_marina(self, sess):
        r = sess.get(f"{API}/smart-go", params={"from": "hotel", "to": "marina"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("distance_km", "walking", "bolt", "nearby", "maps_url", "from", "to"):
            assert k in d, f"missing {k}"
        assert isinstance(d["distance_km"], (int, float)) and d["distance_km"] > 0
        assert d["walking"]["minutes"] > 0
        assert d["bolt"]["eur"] > 0
        assert isinstance(d["nearby"], list) and len(d["nearby"]) == 3
        assert d["maps_url"].startswith("https://maps.google.com")

    def test_smart_go_hotel_praia_rocha_has_bus(self, sess):
        r = sess.get(f"{API}/smart-go", params={"from": "hotel", "to": "praia-rocha"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Both stops are on L12/L15/L16 → should have bus info
        assert d.get("bus") is not None
        assert d["bus"]["line_id"] in ("12", "15", "16")
        assert d["bus"]["minutes_until"] is not None

    def test_smart_go_invalid_location(self, sess):
        r = sess.get(f"{API}/smart-go", params={"from": "nowhere", "to": "marina"}, timeout=15)
        assert r.status_code == 404


# ----- Briefings -----
class TestBriefings:
    def test_briefings_shape(self, sess):
        r = sess.get(f"{API}/briefings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "now" in data
        assert isinstance(data["items"], list)

    def test_briefings_contains_checkin(self, sess):
        r = sess.get(f"{API}/briefings", timeout=15)
        ids = [i["id"] for i in r.json()["items"]]
        assert "briefing-checkin" in ids


# ----- Bus schedule -----
class TestBus:
    def test_bus_schedule_all_lines(self, sess):
        r = sess.get(f"{API}/bus/schedule", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "lines" in data and "now" in data
        ids = [l["id"] for l in data["lines"]]
        assert set(ids) == {"12", "14", "15", "16"}
        for l in data["lines"]:
            assert l["next"] is not None
            assert "time" in l["next"] and "minutes_until" in l["next"]

    def test_bus_next_hotel_sorted(self, sess):
        r = sess.get(f"{API}/bus/next", params={"stop": "hotel"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["stop"]["id"] == "hotel"
        mins = [b["minutes_until"] for b in d["buses"] if b["minutes_until"] is not None]
        assert mins == sorted(mins)
        assert len(d["buses"]) >= 3  # L12, L14, L15, L16 all pass hotel

    def test_bus_next_bad_stop(self, sess):
        r = sess.get(f"{API}/bus/next", params={"stop": "xyz"}, timeout=15)
        assert r.status_code == 404


# ----- Weather -----
class TestWeather:
    def test_weather(self, sess):
        r = sess.get(f"{API}/weather", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("current_temp", "uv_max", "temp_max", "temp_min", "rain_chance", "daily"):
            assert k in d


# ----- Shopping -----
class TestShopping:
    def test_shopping_seeded(self, sess):
        r = sess.get(f"{API}/shopping", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["items"]) >= 12
        assert d["total"] > 0

    def test_shopping_toggle(self, sess):
        # get first item
        items = sess.get(f"{API}/shopping").json()["items"]
        target = items[0]
        original = target.get("checked", False)
        r = sess.post(f"{API}/shopping/toggle", json={"id": target["id"], "checked": not original}, timeout=15)
        assert r.status_code == 200
        # verify via GET
        after = sess.get(f"{API}/shopping").json()["items"]
        got = [x for x in after if x["id"] == target["id"]][0]
        assert got["checked"] == (not original)
        # revert
        sess.post(f"{API}/shopping/toggle", json={"id": target["id"], "checked": original})


# ----- Tickets -----
class TestTickets:
    def test_tickets(self, sess):
        r = sess.get(f"{API}/tickets", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 4
        types = [t["type"] for t in data]
        assert types.count("bus") == 2
        assert "hotel" in types and "activity" in types
        for t in data:
            assert t.get("code") and t.get("title")


# ----- Restaurants -----
class TestRestaurants:
    def test_restaurants(self, sess):
        r = sess.get(f"{API}/restaurants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5
        for r_ in data:
            assert r_.get("image_url", "").startswith("http")
            assert isinstance(r_.get("menu"), list) and len(r_["menu"]) > 0
            assert "walk_min" in r_ and "distance_km" in r_


# ----- Chat (Gemini) -----
class TestChat:
    def test_chat_reply(self, sess):
        sid = f"TEST_{uuid.uuid4()}"
        r = sess.post(
            f"{API}/chat",
            json={"session_id": sid, "message": "Diz olá em 1 frase curta."},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["session_id"] == sid
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0


# ----- Budget / Gallery / Diary CRUD sanity -----
class TestCRUD:
    def test_budget_list(self, sess):
        r = sess.get(f"{API}/budget/expenses", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "expenses" in d and "total_spent" in d

    def test_budget_add_and_delete(self, sess):
        r = sess.post(f"{API}/budget/expenses",
                      json={"category": "TEST", "description": "TEST_expense", "amount": 1.23},
                      timeout=15)
        assert r.status_code == 200
        eid = r.json()["id"]
        r2 = sess.delete(f"{API}/budget/expenses/{eid}", timeout=15)
        assert r2.status_code == 200

    def test_gallery_list(self, sess):
        r = sess.get(f"{API}/gallery", timeout=15)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_diary_list(self, sess):
        r = sess.get(f"{API}/diary", timeout=15)
        assert r.status_code == 200 and isinstance(r.json(), list)
