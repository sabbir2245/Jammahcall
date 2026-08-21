from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthTests(APITestCase):
    def test_signup_returns_user_and_tokens(self):
        resp = self.client.post(
            "/api/auth/register/",
            {
                "email": "a@example.com",
                "name": "Ahmed",
                "password": "strongpass123",
                "phone": "555-1234",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertEqual(resp.data["user"]["email"], "a@example.com")
        self.assertTrue(User.objects.filter(email="a@example.com").exists())

    def test_signup_requires_unique_email(self):
        User.objects.create_user(email="dup@example.com", name="D", password="pass12345")
        resp = self.client.post(
            "/api/auth/register/",
            {"email": "dup@example.com", "name": "D", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        User.objects.create_user(email="b@example.com", name="B", password="pass12345")
        resp = self.client.post(
            "/api/auth/login/",
            {"email": "b@example.com", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)

    def test_me_returns_authenticated_user(self):
        user = User.objects.create_user(
            email="c@example.com", name="C", password="pass12345"
        )
        self.client.force_authenticate(user=user)
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["email"], "c@example.com")

    def test_me_requires_auth(self):
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
