from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    CreateVerificationSessionView,
    GoogleAuthView,
    MeView,
    RegisterView,
    stripe_webhook,
    UserPublicProfileView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("google/", GoogleAuthView.as_view(), name="google-auth"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("users/<int:pk>/", UserPublicProfileView.as_view(), name="user-public-profile"),
    path(
        "create-verification-session/",
        CreateVerificationSessionView.as_view(),
        name="create-verification-session",
    ),
    path("webhook/stripe/", stripe_webhook, name="stripe-webhook"),
]