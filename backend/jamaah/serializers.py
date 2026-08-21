from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Jamaah, JoinRequest, Member, PrayNeed


class MemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Member
        fields = ["id", "user", "joined_at"]


class JamaahSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()

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
            "member_count",
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
