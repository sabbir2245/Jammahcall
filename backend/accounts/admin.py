from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    ordering = ["email"]
    list_display = ["email", "name", "phone", "auth_provider", "is_verified", "is_staff"]
    search_fields = ["email", "name", "phone"]
    list_filter = ["is_verified", "auth_provider", "is_staff"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Info", {"fields": ("name", "phone", "city", "gender", "latitude", "longitude")}),
        ("Auth", {"fields": ("auth_provider",)}),
        ("Verification", {"fields": ("is_verified",)}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "phone", "password1", "password2"),
            },
        ),
    )