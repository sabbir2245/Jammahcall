# New Features Plan — new6.md

## Feature 1: Recurring Jama'ah Schedule

**Backend (`backend/jamaah/models.py`):**
- Add `schedule_type` CharField — choices: `one_time`, `recurring` (default: `one_time`)
- Add `recurring_days` JSONField — nullable, stores array of day ints `[0,1,2,3,4]` (Mon-Fri etc.)
- Migration needed

**Backend (`backend/jamaah/serializers.py`):**
- Add `schedule_type`, `recurring_days` to `JamaahSerializer`

**Frontend Create (`frontend/src/app/(tabs)/create.tsx`):**
- Add toggle chips: "One-time" / "Recurring"
- When recurring selected, show day-of-week checkboxes (Mon–Sun)
- Send `schedule_type` + `recurring_days` in `CreateJamaahInput`

**Frontend API (`frontend/src/lib/api.ts`):**
- Update `Jamaah` interface and `CreateJamaahInput` with new fields

**Frontend Card (`frontend/src/app/(tabs)/index.tsx`):**
- Show recurring badge/icon on cards where `schedule_type === 'recurring'`

---

## Feature 2: Favourites

**Backend (`backend/jamaah/models.py`) — New model:**
```python
class Favourite(models.Model):
    user = ForeignKey(User, CASCADE)
    jamaah = ForeignKey(Jamaah, CASCADE)
    created_at = DateTimeField(auto_now_add=True)
    # UniqueConstraint(user, jamaah)
```

**Backend (`backend/jamaah/serializers.py`):**
- `FavouriteSerializer` — nested jamaah detail

**Backend (`backend/jamaah/views.py`):**
- `FavouriteListCreateView` — GET favourites, POST to add
- `FavouriteDeleteView` — DELETE to remove

**Backend (`backend/jamaah/urls.py`):**
- `GET/POST /api/jamaah/favourites/`
- `DELETE /api/jamaah/favourites/<id>/`

**Frontend API (`frontend/src/lib/api.ts`):**
- `fetchFavourites()`, `addFavourite(jamaahId)`, `removeFavourite(favouriteId)`

**Frontend (`frontend/src/app/(tabs)/profile.tsx`):**
- Add "My Favourites" section below user info — list of saved Jama'ahs with tap to navigate
- Each item shows: prayer type, address, distance, remove button

**Frontend (`frontend/src/app/jamaah/[id].tsx`):**
- Add heart/bookmark icon button — toggles favourite state

---

## Feature 3 & 4: Prayer Times Tab (Replacing Activity)

**Frontend utility (`frontend/src/lib/prayer-times.ts`) — New file:**
```
fetchPrayerTimes(lat, lng, date?)
  → GET https://api.aladhan.com/v1/timings/{date}?latitude={lat}&longitude={lng}&method=2
  → Returns { Fajr, Dhuhr, Asr, Maghrib, Isha, Sunrise, ... }
  
getNextPrayer(timings) → { name, time }
  → Compares current time to each prayer time, returns the next one

formatPrayerTime(timeStr) → "4:30 AM"
  → Converts "04:30" (24h) to "4:30 AM" (12h)
```

**Caching:**
- Store in SecureStore: key = `prayer_times_{date}_{lat}_{lng}`
- Skip fetch if cached and date matches today

**Frontend (`frontend/src/app/(tabs)/activity.tsx`) — Replace entirely:**
- Rename tab from "Activity" to "Prayer Times"
- Top section: **Next Prayer** card — large prayer name + countdown timer (e.g., "Asr in 2h 15m")
- Below: **All 5 prayers** listed as cards/rows:
  - Prayer name | Time | Status (elapsed = gray, upcoming = highlighted)
- **Current date** display (Gregorian + Hijri if API provides it)
- Pull-to-refresh to re-fetch times
- Auto-refresh countdown every minute

**Tab rename (`frontend/src/components/app-tabs.tsx`):**
- Change "Activity" trigger name from `activity` to `prayertimes` (or keep filename, just change label)
- Update label to "Pray Times"

---

## Feature 5: Enhanced Django Admin

**Approach:** Customize Django's built-in admin panel (no separate React app)

**Backend (`backend/jamaah/admin.py`) — Enhance:**
- `JamaahAdmin`: list_display, list_filter (prayer, status, schedule_type), search_fields, actions (approve/reject/pause)
- `UserAdmin`: custom list, search by email/name, verification status filter
- `ReportAdmin`: list of reports with status filter, resolve action

**Backend (`backend/accounts/admin.py`):**
- Register `User` with custom admin (list display: email, name, is_verified, date_joined)

**New admin features:**
- Dashboard view with stats (total users, jamaahs, pending reports)
- Bulk actions: approve multiple listings, dismiss multiple reports
- Filters: by status, by prayer type, by date range

**Access:** Superuser login at `/admin/` — create via `createsuperuser` command

---

## Feature 6: Report User

**Backend (`backend/jamaah/models.py`) — New model:**
```python
class Report(models.Model):
    REPORT_REASONS = [
        ('unsafe', 'Unsafe'),
        ('inaccurate', 'Inaccurate'),
        ('harassment', 'Harassment'),
        ('fake_listing', 'Fake Listing'),
        ('other', 'Other'),
    ]
    reporter = ForeignKey(User, CASCADE)
    reported_user = ForeignKey(User, CASCADE, null=True, blank=True)
    reported_jamaah = ForeignKey(Jamaah, CASCADE, null=True, blank=True)
    reason = CharField(choices=REPORT_REASONS)
    details = TextField(blank=True)
    status = CharField(
        choices=[('pending','Pending'),('resolved','Resolved'),('dismissed','Dismissed')],
        default='pending'
    )
    created_at = DateTimeField(auto_now_add=True)
```

**Backend serializers + views:**
- `ReportSerializer`, `ReportCreateView` (POST), admin-only list view

**Backend URLs:**
- `POST /api/jamaah/reports/` — create report (any user)
- `GET /api/jamaah/reports/` — list reports (admin only)

**Frontend (`frontend/src/app/user/[id].tsx`):**
- Add "Report User" button at bottom of profile
- Opens modal: select reason, optional details text, submit

**Frontend (`frontend/src/app/jamaah/[id].tsx`):**
- Add "Report Listing" button
- Same modal flow

---

## Feature 7: Google Login/Signup

**Approach:** `expo-auth-session` + `expo-web-browser` (easiest for Expo, cross-platform, low bugs)

**Backend (`backend/accounts/models.py`):**
- Add `auth_provider` CharField — choices: `email`, `google` (default: `email`)

**Backend (`backend/accounts/views.py`) — New endpoint:**
- `POST /api/auth/google/` — receives Google `idToken`, verifies with Google, creates/finds user by email, returns JWT
- Uses `google-auth` library to verify tokens server-side

**Backend (`backend/requirements.txt`):**
- Add `google-auth>=2.0`

**Backend (`.env`):**
- Add `GOOGLE_CLIENT_ID=...` (Web client ID from Google Cloud Console)

**Frontend (`frontend/src/lib/api.ts`):**
- `googleLogin(idToken: string)` — POST to `/api/auth/google/`

**Frontend (`frontend/src/app/login.tsx`):**
- Add "Continue with Google" button below email/password form
- Divider line: "— or —"
- Uses `expo-auth-session` with Google provider
- On success: sends ID token to backend, gets JWT, stores tokens

**Frontend (`frontend/src/app/register.tsx`):**
- Same Google button

**Frontend (`package.json`):**
- Add `expo-auth-session`, `expo-web-browser`

---

## Execution Order

| # | Feature | Backend Files | Frontend Files | Migrations |
|---|---------|--------------|----------------|------------|
| 1 | Recurring schedule | models.py, serializers.py | api.ts, create.tsx, index.tsx | Yes |
| 2 | Favourites | models.py, views.py, serializers.py, urls.py, admin.py | api.ts, profile.tsx, [id].tsx | Yes |
| 3 | Report | models.py, views.py, serializers.py, urls.py, admin.py | api.ts, user/[id].tsx, jamaah/[id].tsx | Yes |
| 4 | Prayer Times tab | — | prayer-times.ts, activity.tsx, app-tabs.tsx | No |
| 5 | Enhanced Django Admin | admin.py (accounts + jamaah) | — | No |
| 6 | Google Auth | views.py, models.py, urls.py | api.ts, login.tsx, register.tsx | Yes |
