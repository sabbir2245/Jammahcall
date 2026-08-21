from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from jamaah.models import Jamaah, JoinRequest, Member

User = get_user_model()


class JoinRequestTests(APITestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            email="org@example.com", name="Organizer", password="pass12345"
        )
        self.requester = User.objects.create_user(
            email="req@example.com", name="Requester", password="pass12345"
        )
        self.jamaah = Jamaah.objects.create(
            organizer=self.organizer,
            prayer="asr",
            location_type="current",
            latitude=25.0,
            longitude=55.0,
        )

    def test_requester_can_create_join_request(self):
        self.client.force_authenticate(user=self.requester)
        resp = self.client.post(
            "/api/jamaah/requests/",
            {"jamaah": self.jamaah.id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["requester"]["email"], "req@example.com")
        self.assertEqual(JoinRequest.objects.count(), 1)

    def test_duplicate_join_request_rejected(self):
        JoinRequest.objects.create(jamaah=self.jamaah, requester=self.requester)
        self.client.force_authenticate(user=self.requester)
        resp = self.client.post(
            "/api/jamaah/requests/",
            {"jamaah": self.jamaah.id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_organizer_accept_creates_member(self):
        jr = JoinRequest.objects.create(
            jamaah=self.jamaah, requester=self.requester, status="pending"
        )
        self.client.force_authenticate(user=self.organizer)
        resp = self.client.post(f"/api/jamaah/requests/{jr.id}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "accepted")
        self.assertTrue(
            Member.objects.filter(jamaah=self.jamaah, user=self.requester).exists()
        )

    def test_non_organizer_cannot_accept(self):
        jr = JoinRequest.objects.create(
            jamaah=self.jamaah, requester=self.requester, status="pending"
        )
        self.client.force_authenticate(user=self.requester)
        resp = self.client.post(f"/api/jamaah/requests/{jr.id}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_organizer_can_decline(self):
        jr = JoinRequest.objects.create(
            jamaah=self.jamaah, requester=self.requester, status="pending"
        )
        self.client.force_authenticate(user=self.organizer)
        resp = self.client.post(f"/api/jamaah/requests/{jr.id}/decline/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "declined")
        self.assertFalse(
            Member.objects.filter(jamaah=self.jamaah, user=self.requester).exists()
        )

    def test_jamaah_becomes_full_at_capacity(self):
        self.jamaah.max_participants = 1
        self.jamaah.save()
        jr = JoinRequest.objects.create(
            jamaah=self.jamaah, requester=self.requester, status="pending"
        )
        self.client.force_authenticate(user=self.organizer)
        resp = self.client.post(f"/api/jamaah/requests/{jr.id}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.jamaah.refresh_from_db()
        self.assertEqual(self.jamaah.status, "full")

    def test_members_list_endpoint(self):
        Member.objects.create(jamaah=self.jamaah, user=self.requester)
        self.client.force_authenticate(user=self.organizer)
        resp = self.client.get(f"/api/jamaah/{self.jamaah.id}/members/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
