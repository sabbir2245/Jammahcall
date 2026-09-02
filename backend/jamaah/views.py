from django.db import models, IntegrityError
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Favourite, Jamaah, JamaahImage, JoinRequest, Member, PrayNeed, Report, Review
from .serializers import (
    FavouriteSerializer,
    JamaahImageSerializer,
    JamaahSerializer,
    JoinRequestSerializer,
    MemberSerializer,
    PrayNeedSerializer,
    ReportSerializer,
    ReviewSerializer,
)


class JamaahListCreateView(generics.ListCreateAPIView):
    serializer_class = JamaahSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Jamaah.objects.select_related("organizer").prefetch_related("members", "images")

        prayer = self.request.query_params.get("prayer")
        if prayer:
            qs = qs.filter(prayer=prayer)

        location_type = self.request.query_params.get("location_type")
        if location_type:
            qs = qs.filter(location_type=location_type)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(address_label__icontains=search)
                | Q(organizer__name__icontains=search)
                | Q(prayer__icontains=search)
            )

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

        sort = self.request.query_params.get("sort", "scheduled_at")
        if sort == "newest":
            qs = qs.order_by("-created_at")
        elif sort == "oldest":
            qs = qs.order_by("created_at")
        elif sort == "popular":
            qs = qs.annotate(member_count_val=models.Count("members")).order_by(
                "-member_count_val"
            )
        else:
            qs = qs.order_by("scheduled_at")

        return qs

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
            {"detail": "Invalid action."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class OrganisedJamaahsView(APIView):
    """Return jamaahs organized by the current user with their pending join requests."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        jamaahs = (
            Jamaah.objects
            .filter(organizer=request.user)
            .select_related("organizer")
            .prefetch_related("members", "members__user", "join_requests", "join_requests__requester")
            .order_by("-created_at")
        )
        result = []
        for j in jamaahs:
            pending = j.join_requests.filter(status="pending")
            result.append({
                "jamaah": JamaahSerializer(j).data,
                "pending_requests": JoinRequestSerializer(pending, many=True).data,
            })
        return Response(result)


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


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Review.objects.select_related("reviewer", "reviewee", "jamaah")
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(reviewee_id=user_id)
        jamaah_id = self.request.query_params.get("jamaah")
        if jamaah_id:
            qs = qs.filter(jamaah_id=jamaah_id)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)


class ReviewJamaahListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(
            jamaah_id=self.kwargs["pk"]
        ).select_related("reviewer", "reviewee", "jamaah").order_by("-created_at")


class JamaahImageListCreateView(generics.ListCreateAPIView):
    serializer_class = JamaahImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JamaahImage.objects.filter(jamaah_id=self.kwargs["pk"]).order_by("order")

    def perform_create(self, serializer):
        jamaah = get_object_or_404(Jamaah, pk=self.kwargs["pk"])
        if JamaahImage.objects.filter(jamaah=jamaah).count() >= 3:
            raise ValidationError("A Jama'ah can have at most 3 images.")
        next_order = JamaahImage.objects.filter(jamaah=jamaah).count()
        serializer.save(jamaah=jamaah, order=next_order)


class FavouriteListCreateView(generics.ListCreateAPIView):
    serializer_class = FavouriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favourite.objects.filter(
            user=self.request.user
        ).select_related("jamaah", "jamaah__organizer").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {"detail": "You have already favourited this Jama'ah."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class FavouriteDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        fav = get_object_or_404(Favourite, pk=pk, user=request.user)
        fav.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportCreateView(generics.CreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class ReportListView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = Report.objects.select_related("reporter", "reported_user", "reported_jamaah")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-created_at")


class ReportActionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk, action):
        report = get_object_or_404(Report, pk=pk)
        if action == "resolve":
            report.status = "resolved"
        elif action == "dismiss":
            report.status = "dismissed"
        else:
            return Response(
                {"detail": "Action must be 'resolve' or 'dismiss'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.save(update_fields=["status"])
        return Response(ReportSerializer(report).data)
