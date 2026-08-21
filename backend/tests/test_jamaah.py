from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from jamaah.models import Jamaah

User = get_user_model()


class JamaahTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="org@example.com", name="Organizer", password="pass12345"
        )
        self.client.force_authenticate(user=self.user)

    def test_create_jamaah(self):
        resp = self.client.post(
            "/api/jamaah/",
            {
                "prayer": "asr",
                "location_type": "current",
                "latitude": 25.0,
                "longitude": 55.0,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["prayer"], "asr")
        self.assertEqual(Jamaah.objects.count(), 1)
        self.assertEqual(Jamaah.objects.get().organizer, self.user)

    def test_list_jamaah_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get("/api/jamaah/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_own_created(self):
        Jamaah.objects.create(
            organizer=self.user,
            prayer="maghrib",
            location_type="park",
            latitude=25.1,
            longitude=55.1,
        )
        resp = self.client.get("/api/jamaah/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["prayer"], "maghrib")

    def test_nearby_filter_by_prayer_and_location(self):
        Jamaah.objects.create(
            organizer=self.user,
            prayer="dhuhr",
            location_type="workplace",
            latitude=25.0,
            longitude=55.0,
        )
        resp = self.client.get(
            "/api/jamaah/", {"prayer": "dhuhr", "lat": "25.0", "lng": "55.0"}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_nearby_excludes_far_away(self):
        Jamaah.objects.create(
            organizer=self.user,
            prayer="fajr",
            location_type="current",
            latitude=20.0,
            longitude=55.0,
        )
        resp = self.client.get(
            "/api/jamaah/", {"lat": "25.0", "lng": "55.0", "radius": "1"}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

    def test_retrieve_detail_returns_member_count(self):
        jamaah = Jamaah.objects.create(
            organizer=self.user,
            prayer="isha",
            location_type="other",
            latitude=25.0,
            longitude=55.0,
        )
        resp = self.client.get(f"/api/jamaah/{jamaah.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["member_count"], 0)
