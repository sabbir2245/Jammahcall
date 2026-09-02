from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "gender",
            "phone",
            "city",
            "profile_picture",
            "profile_picture_url",
            "device_token",
            "latitude",
            "longitude",
            "is_verified",
            "auth_provider",
            "date_joined",
            "average_rating",
            "review_count",
        ]
        read_only_fields = ["id", "date_joined", "is_verified", "auth_provider"]

    def get_average_rating(self, obj):
        from jamaah.models import Review
        result = Review.objects.filter(reviewee=obj).aggregate(avg=Avg("rating"))
        return round(result["avg"], 1) if result["avg"] else None

    def get_review_count(self, obj):
        from jamaah.models import Review
        return Review.objects.filter(reviewee=obj).count()

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    gender = serializers.ChoiceField(choices=[("male", "Male"), ("female", "Female")])

    class Meta:
        model = User
        fields = [
            "email",
            "name",
            "gender",
            "phone",
            "city",
            "profile_picture",
            "device_token",
            "latitude",
            "longitude",
            "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user