import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

stripe.api_key = settings.STRIPE_SECRET_KEY


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=201,
        )


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserPublicProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return get_object_or_404(User, pk=self.kwargs["pk"])


class CreateVerificationSessionView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            verification_session = stripe.identity.VerificationSession.create(
                type="document",
                provided_details={"email": user.email},
                metadata={"user_id": str(user.id)},
            )
            ephemeral_key = stripe.EphemeralKey.create(
                verification_session=verification_session.id,
            )
            return Response(
                {
                    "sessionId": verification_session.id,
                    "ephemeralKeySecret": ephemeral_key.secret,
                }
            )
        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=400)


@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return JsonResponse({"error": "Invalid signature"}, status=400)

    if event["type"] == "identity.verification_session.verified":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
                user.is_verified = True
                user.save(update_fields=["is_verified"])
            except User.DoesNotExist:
                pass

    elif event["type"] == "identity.verification_session.failed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
                user.is_verified = False
                user.save(update_fields=["is_verified"])
            except User.DoesNotExist:
                pass

    return JsonResponse({"status": "ok"})


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token = request.data.get("idToken")
        if not id_token:
            return Response(
                {"detail": "idToken is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            idinfo = google_id_token.verify_oauth2_token(
                id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )

            email = idinfo.get("email")
            name = idinfo.get("name", "")
            picture = idinfo.get("picture", "")

            if not email:
                return Response(
                    {"detail": "Email not found in Google token."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "name": name,
                    "auth_provider": "google",
                    "profile_picture": picture if picture else "",
                },
            )

            if not created and user.auth_provider != "google":
                return Response(
                    {"detail": "An account with this email already exists. Please log in with your password."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if created:
                user.set_unusable_password()
                user.save()

            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "user": UserSerializer(user).data,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Invalid Google token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )