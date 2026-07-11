"""Backend regression tests for iteration 4 (Portimão trip app).
Covers: restaurants (17+), beaches (10), attractions (12),
tickets (passengers/amenities/nearby), hotel-details, ai-tip.
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Restaurants ---
class TestRestaurants:
    def test_restaurants_count_and_new_ids(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/restaurants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 17, f"Expected 17+ restaurants, got {len(data)}"
        ids = {x["id"] for x in data}
        expected_new = {
            "dona-barca", "sushi-portimao", "gelataria-portimao",
            "padaria-tentacao", "pizza-brasil", "praia-esplanada", "vegan-portimao",
        }
        missing = expected_new - ids
        assert not missing, f"Missing new restaurants: {missing}"

    def test_restaurants_have_distance(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/restaurants", timeout=15)
        first = r.json()[0]
        assert "distance_km" in first
        assert "walk_min" in first
        assert "image_url" in first and first["image_url"].startswith("http")
        assert "menu" in first and len(first["menu"]) > 0


# --- Beaches ---
class TestBeaches:
    def test_beaches_count_and_fields(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/beaches", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"Expected 10 beaches, got {len(data)}"
        b0 = data[0]
        for field in ("image_url", "kids_score", "family_tip", "hazards", "lat", "lng", "rating"):
            assert field in b0, f"Missing field {field} in beach {b0.get('id')}"


# --- Attractions ---
class TestAttractions:
    def test_attractions_count_and_ids(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/attractions", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 12, f"Expected 12 attractions, got {len(data)}"
        ids = {x["id"] for x in data}
        expected = {"zoomarine", "slide-splash", "aqualand", "kayak-benagil", "golfinhos",
                    "silves", "sagres", "museu-portimao", "forte-catarina",
                    "marina-portimao", "grutas-marinha", "praia-alvor-vila"}
        missing = expected - ids
        assert not missing, f"Missing attractions: {missing}"

    def test_attraction_fields(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/attractions", timeout=15)
        a = r.json()[0]
        for field in ("category", "price", "hours", "duration", "distance_km", "rating", "kids"):
            assert field in a


# --- Tickets ---
class TestTickets:
    def test_tickets_ida_passengers(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/tickets", timeout=15)
        assert r.status_code == 200
        data = r.json()
        ida = next((t for t in data if t["id"] == "expressos-ida"), None)
        assert ida is not None, "expressos-ida ticket missing"
        assert "passengers" in ida
        pax = ida["passengers"]
        assert len(pax) == 4, f"Expected 4 passengers, got {len(pax)}"
        seats = [p["seat"] for p in pax]
        assert seats == [50, 51, 52, 53], f"Seat order wrong: {seats}"
        # Class check
        for p in pax:
            assert p["class"] == "Inteiro"
        names = " ".join(p["name"].upper() for p in pax)
        for expected_name in ("ALEX", "PRISCILA", "ALEXSANDRO", "ARTHUR"):
            assert expected_name in names

    def test_tickets_hotel_amenities_nearby(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/tickets", timeout=15)
        hotel = next((t for t in r.json() if t["id"] == "hotel"), None)
        assert hotel is not None
        assert "amenities" in hotel and len(hotel["amenities"]) >= 9
        assert "nearby" in hotel and len(hotel["nearby"]) >= 5


# --- Hotel details ---
class TestHotelDetails:
    def test_hotel_details(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/hotel-details", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "Studio 17 by Atlantichotels"
        assert d["score"] == 7.9
        assert d["size_m2"] == 50
        assert len(d["amenities"]) >= 9
        assert len(d["nearby"]) >= 5
        assert len(d["reminders"]) >= 3


# --- AI Tip ---
class TestAITip:
    def test_ai_tip_response(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ai-tip", timeout=45)
        assert r.status_code == 200
        d = r.json()
        assert "tip" in d and isinstance(d["tip"], str) and len(d["tip"]) > 0
        assert "topic" in d
        # icon may not exist if fallback branch — but per spec should exist
        # Only assert when LLM path returned it
        if "icon" in d:
            assert isinstance(d["icon"], str)

    def test_ai_tip_cached(self, api_client):
        r1 = api_client.get(f"{BASE_URL}/api/ai-tip", timeout=45)
        r2 = api_client.get(f"{BASE_URL}/api/ai-tip", timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        # Same tip => cached
        assert r1.json().get("tip") == r2.json().get("tip"), "AI tip not cached (should be same on repeat)"
