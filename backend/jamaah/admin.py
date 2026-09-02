from django.contrib import admin

from .models import Favourite, Jamaah, JamaahImage, JoinRequest, Member, PrayNeed, Report, Review


@admin.register(Jamaah)
class JamaahAdmin(admin.ModelAdmin):
    list_display = [
        "id", "prayer", "organizer", "location_type", "status",
        "schedule_type", "scheduled_at", "created_at",
    ]
    list_filter = ["prayer", "status", "location_type", "schedule_type"]
    search_fields = ["organizer__email", "organizer__name", "address_label"]
    actions = ["approve_listings", "pause_listings"]

    @admin.action(description="Mark selected as open")
    def approve_listings(self, request, queryset):
        queryset.update(status="open")

    @admin.action(description="Pause selected listings")
    def pause_listings(self, request, queryset):
        queryset.update(status="cancelled")


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


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["id", "reviewer", "reviewee", "jamaah", "rating", "created_at"]
    list_filter = ["rating"]


@admin.register(JamaahImage)
class JamaahImageAdmin(admin.ModelAdmin):
    list_display = ["id", "jamaah", "order", "created_at"]


@admin.register(Favourite)
class FavouriteAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "jamaah", "created_at"]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["id", "reporter", "reported_user", "reported_jamaah", "reason", "status", "created_at"]
    list_filter = ["status", "reason"]
    search_fields = ["reporter__email", "details"]
    actions = ["resolve_reports", "dismiss_reports"]

    @admin.action(description="Mark selected as resolved")
    def resolve_reports(self, request, queryset):
        queryset.update(status="resolved")

    @admin.action(description="Dismiss selected reports")
    def dismiss_reports(self, request, queryset):
        queryset.update(status="dismissed")