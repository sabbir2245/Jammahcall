from rest_framework import serializers
from django.contrib.auth import get_user_model

from accounts.serializers import UserSerializer

from .models import Favourite, Jamaah, JamaahImage, JoinRequest, Member, PrayNeed, Report, Review

User = get_user_model()


class MemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Member
        fields = ["id", "user", "joined_at"]


class JamaahImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = JamaahImage
        fields = ["id", "jamaah", "image", "image_url", "caption", "order", "created_at"]
        read_only_fields = ["jamaah", "order", "created_at"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class JamaahSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    images = JamaahImageSerializer(many=True, read_only=True)

    class Meta:
        model = Jamaah
        fields = [
            "id",
            "organizer",
            "prayer",
            "location_type",
            "latitude",
            "longitude",
            "address_label",
            "scheduled_at",
            "max_participants",
            "status",
            "schedule_type",
            "recurring_days",
            "member_count",
            "images",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def get_member_count(self, obj):
        return obj.members.count()


class JoinRequestSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    jamaah = serializers.PrimaryKeyRelatedField(queryset=Jamaah.objects.all())

    class Meta:
        model = JoinRequest
        fields = ["id", "jamaah", "requester", "status", "created_at"]
        read_only_fields = ["status", "created_at"]


class PrayNeedSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PrayNeed
        fields = [
            "id",
            "user",
            "prayer",
            "latitude",
            "longitude",
            "radius_miles",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = UserSerializer(read_only=True)
    reviewee = UserSerializer(read_only=True)
    reviewee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="reviewee", write_only=True
    )
    jamaah_id = serializers.PrimaryKeyRelatedField(
        queryset=Jamaah.objects.all(), source="jamaah", write_only=True, required=False
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "reviewer",
            "reviewee",
            "reviewee_id",
            "jamaah",
            "jamaah_id",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        reviewer = self.context["request"].user
        reviewee = data.get("reviewee")
        jamaah = data.get("jamaah")
        if reviewer == reviewee:
            raise serializers.ValidationError("You cannot review yourself.")
        if jamaah and Review.objects.filter(
            reviewer=reviewer, reviewee=reviewee, jamaah=jamaah
        ).exists():
            raise serializers.ValidationError("You have already reviewed this user for this Jama'ah.")
        return data


class FavouriteSerializer(serializers.ModelSerializer):
    jamaah = JamaahSerializer(read_only=True)
    jamaah_id = serializers.PrimaryKeyRelatedField(
        queryset=Jamaah.objects.all(), source="jamaah", write_only=True
    )

    class Meta:
        model = Favourite
        fields = ["id", "jamaah", "jamaah_id", "created_at"]
        read_only_fields = ["created_at"]

    def validate(self, data):
        user = self.context["request"].user
        jamaah = data.get("jamaah")
        if Favourite.objects.filter(user=user, jamaah=jamaah).exists():
            raise serializers.ValidationError("You have already favourited this Jama'ah.")
        return data


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "reported_user",
            "reported_jamaah",
            "reason",
            "details",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def validate(self, data):
        reported_user = data.get("reported_user")
        reported_jamaah = data.get("reported_jamaah")
        if not reported_user and not reported_jamaah:
            raise serializers.ValidationError("You must report either a user or a listing.")
        return data
