from django.db.models import F
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Jamaah, JoinRequest, Member, PrayNeed
from .serializers import (
    JamaahSerializer,
    JoinRequestSerializer,
    MemberSerializer,
    PrayNeedSerializer,
)


class JamaahListCreateView(generics.ListCreateAPIView):
    serializer_class = JamaahSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Jamaah.objects.select_related("organizer").prefetch_related("members")
        prayer = self.request.query_params.get("prayer")
        if prayer:
            qs = qs.filter(prayer=prayer)
        lat = self.request.query_params.get("lat")
        lng = self.request.query_params.get("lng")
        radius = self.request.query_params.get("radius", "5")
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                radius = float(radius)
            except ValueError:
                lat = lng = radius = None
            if lat is not None:
                qs = qs.filter(
                    latitude__range=(lat - radius / 69, lat + radius / 69),
                    longitude__range=(lng - radius / 69, lng + radius / 69),
                )
        return qs.order_by("scheduled_at")

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class JamaahRetrieveView(generics.RetrieveAPIView):
    queryset = Jamaah.objects.select_related("organizer").prefetch_related(
        "members", "members__user"
    )
    serializer_class = JamaahSerializer
    permission_classes = [permissions.IsAuthenticated]


class JoinRequestCreateView(generics.CreateAPIView):
    serializer_class = JoinRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {"detail": "You have already requested to join this Jama'ah."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class JoinRequestActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        join_request = JoinRequest.objects.select_related("jamaah").get(pk=pk)
        jamaah = join_request.jamaah
        if request.user != jamaah.organizer:
            return Response(
                {"detail": "Only the organizer can act on join requests."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if join_request.status != "pending":
            return Response(
                {"detail": "This request has already been handled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "accept":
            join_request.status = "accepted"
            join_request.save(update_fields=["status"])
            Member.objects.get_or_create(jamaah=jamaah, user=join_request.requester)
            if (
                jamaah.max_participants
                and jamaah.members.count() >= jamaah.max_participants
            ):
                jamaah.status = "full"
                jamaah.save(update_fields=["status"])
            return Response(JoinRequestSerializer(join_request).data)
        elif action == "decline":
            join_request.status = "declined"
            join_request.save(update_fields=["status"])
            return Response(JoinRequestSerializer(join_request).data)

        return Response(
            {"detail": "Action must be 'accept' or 'decline'."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class JamaahMembersView(generics.ListAPIView):
    serializer_class = MemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Member.objects.filter(jamaah_id=self.kwargs["pk"]).select_related("user")


class PrayNeedListCreateView(generics.ListCreateAPIView):
    serializer_class = PrayNeedSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PrayNeed.objects.select_related("user").filter(status="active")
        prayer = self.request.query_params.get("prayer")
        if prayer:
            qs = qs.filter(prayer=prayer)
        lat = self.request.query_params.get("lat")
        lng = self.request.query_params.get("lng")
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
            except ValueError:
                lat = lng = None
            if lat is not None:
                qs = qs.filter(
                    latitude__range=(lat - 1, lat + 1),
                    longitude__range=(lng - 1, lng + 1),
                )
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PrayNeedRetrieveView(generics.RetrieveAPIView):
    queryset = PrayNeed.objects.select_related("user")
    serializer_class = PrayNeedSerializer
    permission_classes = [permissions.IsAuthenticated]


class PrayNeedActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        pray_need = get_object_or_404(PrayNeed, pk=pk)
        if action == "cancel":
            if request.user != pray_need.user:
                return Response(
                    {"detail": "Only the creator can cancel this."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            pray_need.status = "cancelled"
            pray_need.save(update_fields=["status"])
        elif action == "fulfill":
            if pray_need.status != "active":
                return Response(
                    {"detail": "This pray need is not active."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            pray_need.status = "fulfilled"
            pray_need.save(update_fields=["status"])
        else:
            return Response(
                {"detail": "Action must be 'fulfill' or 'cancel'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(PrayNeedSerializer(pray_need).data)
