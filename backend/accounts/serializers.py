from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
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
            "device_token",
            "latitude",
            "longitude",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]


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