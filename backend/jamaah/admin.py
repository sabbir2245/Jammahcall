from django.contrib import admin

from .models import Jamaah, JoinRequest, Member, PrayNeed


@admin.register(Jamaah)
class JamaahAdmin(admin.ModelAdmin):
    list_display = ["id", "prayer", "organizer", "location_type", "status", "scheduled_at"]
    list_filter = ["prayer", "status", "location_type"]
    search_fields = ["organizer__email", "address_label"]


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "jamaah", "requester", "status", "created_at"]
    list_filter = ["status"]


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ["id", "jamaah", "user", "joined_at"]


@admin.register(PrayNeed)
class PrayNeedAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "prayer", "radius_miles", "status", "created_at"]
    list_filter = ["prayer", "status"]