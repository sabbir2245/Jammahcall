from django.conf import settings
from django.db import models


class Jamaah(models.Model):
    PRAYER_CHOICES = [
        ("fajr", "Fajr"),
        ("dhuhr", "Dhuhr"),
        ("asr", "Asr"),
        ("maghrib", "Maghrib"),
        ("isha", "Isha"),
        ("jumuah", "Jumu'ah"),
    ]

    LOCATION_TYPES = [
        ("current", "Current location"),
        ("selected", "Selected location"),
        ("public", "Public place"),
        ("workplace", "Workplace"),
        ("university", "University"),
        ("park", "Park"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("full", "Full"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="jamaahs",
    )
    prayer = models.CharField(max_length=20, choices=PRAYER_CHOICES)
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    address_label = models.CharField(max_length=255, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["scheduled_at"]),
        ]

    def __str__(self):
        return f"{self.prayer} by {self.organizer}"


class JoinRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    jamaah = models.ForeignKey(
        Jamaah, on_delete=models.CASCADE, related_name="join_requests"
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="join_requests",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["jamaah", "requester"], name="unique_jamaah_requester"
            )
        ]

    def __str__(self):
        return f"{self.requester} -> {self.jamaah}"


class Member(models.Model):
    jamaah = models.ForeignKey(
        Jamaah, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jamaah_memberships"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["jamaah", "user"], name="unique_jamaah_member")
        ]

    def __str__(self):
        return f"{self.user} in {self.jamaah}"


class PrayNeed(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("fulfilled", "Fulfilled"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pray_needs",
    )
    prayer = models.CharField(max_length=20, choices=Jamaah.PRAYER_CHOICES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius_miles = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return f"{self.user} needs {self.prayer}"
