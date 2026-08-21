from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from jamaah.models import PrayNeed

User = get_user_model()


class PrayNeedTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="need@example.com", name="Needer", password="pass12345"
        )
        self.client.force_authenticate(user=self.user)

    def test_create_pray_need(self):
        resp = self.client.post(
            "/api/jamaah/pray-needs/",
            {
                "prayer": "asr",
                "latitude": 25.0,
                "longitude": 55.0,
                "radius_miles": "1.00",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["prayer"], "asr")
        self.assertEqual(resp.data["status"], "active")
        self.assertEqual(resp.data["user"]["email"], "need@example.com")
        self.assertEqual(PrayNeed.objects.count(), 1)

    def test_list_only_active(self):
        PrayNeed.objects.create(
            user=self.user, prayer="maghrib", latitude=25.0, longitude=55.0
        )
        PrayNeed.objects.create(
            user=self.user,
            prayer="isha",
            latitude=25.0,
            longitude=55.0,
            status="fulfilled",
        )
        resp = self.client.get("/api/jamaah/pray-needs/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["prayer"], "maghrib")

    def test_nearby_filter(self):
        PrayNeed.objects.create(
            user=self.user, prayer="fajr", latitude=25.0, longitude=55.0
        )
        resp = self.client.get(
            "/api/jamaah/pray-needs/", {"lat": "25.5", "lng": "55.5"}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_owner_can_cancel(self):
        pn = PrayNeed.objects.create(
            user=self.user, prayer="dhuhr", latitude=25.0, longitude=55.0
        )
        resp = self.client.post(f"/api/jamaah/pray-needs/{pn.id}/cancel/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "cancelled")

    def test_non_owner_cannot_cancel(self):
        other = User.objects.create_user(
            email="other@example.com", name="Other", password="pass12345"
        )
        pn = PrayNeed.objects.create(
            user=other, prayer="dhuhr", latitude=25.0, longitude=55.0
        )
        resp = self.client.post(f"/api/jamaah/pray-needs/{pn.id}/cancel/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_fulfill_active(self):
        pn = PrayNeed.objects.create(
            user=self.user, prayer="asr", latitude=25.0, longitude=55.0
        )
        resp = self.client.post(f"/api/jamaah/pray-needs/{pn.id}/fulfill/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "fulfilled")

    def test_cannot_fulfill_inactive(self):
        pn = PrayNeed.objects.create(
            user=self.user,
            prayer="asr",
            latitude=25.0,
            longitude=55.0,
            status="cancelled",
        )
        resp = self.client.post(f"/api/jamaah/pray-needs/{pn.id}/fulfill/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get("/api/jamaah/pray-needs/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)