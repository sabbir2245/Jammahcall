"""Seed the database with demo data for testing the app.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear
    python manage.py seed_data --users 50
"""

import math
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from jamaah.models import Jamaah, JoinRequest, Member, PrayNeed

User = get_user_model()

FIRST_NAMES = [
    "Ahmed", "Mohammed", "Abdullah", "Omar", "Ali", "Hassan", "Yusuf", "Ibrahim",
    "Khalid", "Bilal", "Hamza", "Saeed", "Zaid", "Tariq", "Imran", "Salman",
    "Musa", "Ismail", "Farhan", "Rashid", "Nabil", "Karim", "Hatim", "Majid", "Anas",
]
LAST_NAMES = [
    "Al-Farsi", "Al-Rashid", "Hussain", "Khan", "Ahmed", "Ali", "Siddiqui",
    "Rahman", "Hassan", "Malik", "Noor", "Qadir", "Farooq", "Amin", "Zaman",
    "Hamid", "Raza", "Khalil", "Osman", "Sadiq", "Karim", "Latif", "Yasin", "Nadeem", "Sami",
]
CITIES = ["Dhaka", "Dubai", "Abu Dhabi", "Sharjah", "Riyadh", "Jeddah", "Cairo", "Karachi", "Lahore", "Istanbul"]

# Map cities to real central coordinates
CITY_COORDINATES = {
    "Dhaka": (23.723152, 90.393230),
    "Dubai": (25.2048, 55.2708),
    "Abu Dhabi": (24.4539, 54.3773),
    "Sharjah": (25.3463, 55.4209),
    "Riyadh": (24.7136, 46.6753),
    "Jeddah": (21.5433, 39.1728),
    "Cairo": (30.0444, 31.2357),
    "Karachi": (24.8607, 67.0011),
    "Lahore": (31.5204, 74.3587),
    "Istanbul": (41.0082, 28.9784),
}

PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha", "jumuah"]
LOCATION_TYPES = ["current", "selected", "public", "workplace", "university", "park", "other"]

# Primary user base location for local nearby spatial queries
BASE_LAT = 23.723152
BASE_LNG = 90.393230


def get_varied_location(base_lat, base_lng, index, min_km=0.3, max_km=12.0):
    """Generates natural radial dispersion around a base point in 360 degrees."""
    # Use golden angle (~137.5 degrees) for uniform 2D distribution without stacking
    angle_rad = math.radians((index * 137.5) % 360)

    # Vary distance dynamically between min_km and max_km
    radius_km = min_km + ((index * 2.3) % (max_km - min_km))

    # Approx conversions: 1 deg lat ~ 111 km, 1 deg lng ~ 111 * cos(lat) km
    lat_offset = (radius_km / 111.0) * math.sin(angle_rad)
    lng_offset = (radius_km / (111.0 * math.cos(math.radians(base_lat)))) * math.cos(angle_rad)

    return round(base_lat + lat_offset, 6), round(base_lng + lng_offset, 6)


class Command(BaseCommand):
    help = "Seed the database with demo users, Jama'ahs, join requests, members, and pray needs."

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=25, help="Number of demo users to create.")
        parser.add_argument("--clear", action="store_true", help="Delete existing seed data first.")

    def handle(self, *args, **options):
        count = options["users"]
        if count < 1:
            self.stderr.write("--users must be at least 1.")
            return

        if options["clear"]:
            self.clear_existing()

        users = self.create_users(count)
        jamaahs = self.create_jamaahs(users)
        self.create_join_requests_and_members(users, jamaahs)
        self.create_pray_needs(users)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded: {len(users)} users, {len(jamaahs)} Jama'ahs, "
                f"{JoinRequest.objects.count()} join requests, "
                f"{Member.objects.count()} members, "
                f"{PrayNeed.objects.count()} pray needs."
            )
        )

    def clear_existing(self):
        User.objects.exclude(is_superuser=True).delete()
        Jamaah.objects.all().delete()
        self.stdout.write("Cleared existing seed data.")

    def create_users(self, count):
        users = []
        password = "demo12345"

        # Fast-login demo account: email "p" / password "P".
        me, created = User.objects.get_or_create(
            email="p",
            defaults={
                "name": "Demo User",
                "city": "Dhaka",
                "latitude": BASE_LAT,
                "longitude": BASE_LNG,
            },
        )
        me.set_password("P")
        me.save()
        users.append(me)

        for i in range(count):
            first = FIRST_NAMES[i % len(FIRST_NAMES)]
            last = LAST_NAMES[i % len(LAST_NAMES)]
            email = f"user{i+1}@demo.com"
            city = CITIES[i % len(CITIES)]

            # Keep half of the demo users scattered locally around base location for spatial testing,
            # and place the rest in their respective city centers.
            if i % 2 == 0:
                lat, lng = get_varied_location(BASE_LAT, BASE_LNG, i, min_km=0.5, max_km=15.0)
            else:
                city_lat, city_lng = CITY_COORDINATES.get(city, (BASE_LAT, BASE_LNG))
                lat, lng = get_varied_location(city_lat, city_lng, i, min_km=0.2, max_km=5.0)

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "name": f"{first} {last}",
                    "phone": f"+971-5{i%10}{i+10:03d}{i:03d}",
                    "city": city,
                    "latitude": lat,
                    "longitude": lng,
                },
            )
            if created:
                user.set_password(password)
                user.save()
            users.append(user)
        return users

    def create_jamaahs(self, users):
        jamaahs = []
        now = timezone.now()
        for i, organizer in enumerate(users[:12]):
            # Scatter Jamaahs smoothly around the base coordinates (from 200m to 8km)
            lat, lng = get_varied_location(BASE_LAT, BASE_LNG, i, min_km=0.2, max_km=8.0)

            jamaah, created = Jamaah.objects.get_or_create(
                organizer=organizer,
                prayer=PRAYERS[i % len(PRAYERS)],
                defaults={
                    "location_type": LOCATION_TYPES[i % len(LOCATION_TYPES)],
                    "latitude": lat,
                    "longitude": lng,
                    "address_label": f"Demo Location {i+1} ({LOCATION_TYPES[i % len(LOCATION_TYPES)].title()})",
                    "scheduled_at": now + timedelta(minutes=15 * (i % 6) + 5),
                    "max_participants": (i % 5) * 2 + 5,
                },
            )
            if created:
                jamaahs.append(jamaah)
        return jamaahs

    def create_join_requests_and_members(self, users, jamaahs):
        for idx, jamaah in enumerate(jamaahs):
            # First 3 following users join as accepted members.
            for offset in range(1, 4):
                member_user = users[(idx * 3 + offset) % len(users)]
                if member_user == jamaah.organizer:
                    continue
                JoinRequest.objects.get_or_create(
                    jamaah=jamaah,
                    requester=member_user,
                    defaults={"status": "accepted"},
                )
                Member.objects.get_or_create(jamaah=jamaah, user=member_user)

            # Pending requests for the organizer to review
            for offset in range(4, 6):
                requester = users[(idx * 3 + offset) % len(users)]
                if requester == jamaah.organizer:
                    continue
                JoinRequest.objects.get_or_create(
                    jamaah=jamaah,
                    requester=requester,
                    defaults={"status": "pending"},
                )

    def create_pray_needs(self, users):
        for i, user in enumerate(users[13:20]):
            # Scatter PrayNeeds across different radii (0.5km to 10km)
            lat, lng = get_varied_location(BASE_LAT, BASE_LNG, i + 10, min_km=0.5, max_km=10.0)

            PrayNeed.objects.get_or_create(
                user=user,
                prayer=PRAYERS[i % len(PRAYERS)],
                defaults={
                    "latitude": lat,
                    "longitude": lng,
                    "radius_miles": round(0.5 + (i % 4) * 0.5, 2),
                },
            )
