# Jamatcall — Full Implementation Plan

## Phase 1: Green/White/Gold Theme Conversion

**Files to modify:**
- `frontend/src/constants/theme.ts` — Convert palette: deep emerald green, white, warm gold, soft-sand cream backgrounds
- `frontend/src/app/(tabs)/profile.tsx` — Remove all hardcoded `#0f172a`, `#1e293b` hex colors, use theme system
- `frontend/src/app/(tabs)/create.tsx` — Update error container hardcoded colors
- `frontend/src/components/ExploreMap.tsx` — Update marker pin colors to green/gold
- `frontend/src/components/app-tabs.tsx` — Update tab bar colors to match new palette

**Color mapping:**
| Old | New |
|-----|-----|
| Navy `#0f172a` / `#1E293B` | Deep emerald `#006B3F` / dark emerald `#004D2C` |
| Amber `#b8860b` | Warm gold `#D4A843` |
| Light bg `#ffffff` | Soft-sand `#F5F0E8` or white `#FFFFFF` |
| Primary `#0f8a5f` | Deep emerald `#006B3F` |

---

## Phase 2: Backend — Database Restructuring

**New models to add in `backend/jamaah/models.py`:**

### 2a. `Review` model
- reviewer (FK → User)
- reviewee (FK → User)
- jamaah (FK → Jamaah, nullable — can review after praying together)
- rating (1-5 integer)
- comment (text, optional)
- created_at
- UniqueConstraint: (reviewer, reviewee, jamaah) — one review per user per jamaah per person

### 2b. `JamaahImage` model
- jamaah (FK → Jamaah)
- image_url (or ImageField)
- caption (optional)
- order (positive integer)
- created_at
- Max 3 per jamaah

### 2c. User profile enhancements
- `average_rating` computed property on User
- `review_count` computed property on User
- `profile_picture` already exists as CharField — keep as URL string

**New serializers:**
- `ReviewSerializer` in `backend/jamaah/serializers.py`
- `JamaahImageSerializer`
- Update `UserSerializer` to include `average_rating`, `review_count`

**New views:**
- `ReviewListCreateView` — GET reviews for a user, POST a review
- `UserPublicProfileView` — GET public profile (name, avatar, avg rating, reviews)
- `JamaahImageView` — GET/POST images for a jamaah (max 3)

**New URLs:**
- `GET/POST /api/jamaah/reviews/` — list/create reviews
- `GET /api/auth/users/<id>/` — public user profile
- `GET/POST /api/jamaah/<id>/images/` — jamaah images

**Migrations:** Run `makemigrations` + `migrate`

---

## Phase 3: Backend — Enhanced Filtering & Search

**Modify `JamaahListCreateView.get_queryset()`:**
- Add `search` param — filter by `address_label` or organizer `name` (icontains)
- Add `location_type` param — filter by type (mosque, park, workplace, etc.)
- Add `sort` param — `newest`, `oldest`, `nearest` (if lat/lng provided)
- Add `status` param — filter by open/full/etc.

---

## Phase 4: Frontend — Explore Page Overhaul

**Files to modify:**
- `frontend/src/app/(tabs)/explore.tsx` — Major rewrite

**New features:**
1. **Search bar** — text input at top, debounced search
2. **Filter chips** — horizontal scrollable row: All, Fajr, Dhuhr, Asr, Maghrib, Isha, Jumu'ah
3. **Sort dropdown** — Newest, Nearest, Popular (most members)
4. **Card view toggle** — switch between map and list view
5. **Jamaah cards** in list view — show prayer type, organizer name, location, member count, distance, thumbnail image if available

**Update `ExploreMap.tsx`:**
- Tappable markers → navigate to jamaah detail
- Add "Open in Maps" button in callout (Linking.openURL to Google Maps / Apple Maps URL)
- Different marker colors by prayer type or location type

---

## Phase 5: Frontend — Jamaah Detail Page Upgrade

**Files to modify:**
- `frontend/src/app/jamaah/[id].tsx`

**New features:**
1. **Image gallery** — horizontal scrollable row of up to 3 images at top
2. **"Open in Google Maps" / "Open in Apple Maps" buttons** — use `Linking.openURL` with `https://maps.google.com/?q=lat,lng` and `https://maps.apple.com/?ll=lat,lng`
2. **Location type badge** — show institution/personal space type
4. **Share button** — share jamaah details

---

## Phase 6: Frontend — User Public Profile Page

**New file:** `frontend/src/app/user/[id].tsx`

**Features:**
1. Profile header — name, avatar (initial or image), city
2. Star rating display — average stars out of 5, review count
3. Reviews list — each review shows reviewer name, star rating, comment, date
4. "Write a review" button (only if current user has been in a jamaah with this user)

**Frontend API additions in `lib/api.ts`:**
- `fetchUserProfile(id)` — GET `/api/auth/users/<id>/`
- `fetchUserReviews(userId)` — GET `/api/jamaah/reviews/?user=<id>`
- `createReview(input)` — POST `/api/jamaah/reviews/`

---

## Phase 7: Frontend — Create Jamaah with Images

**Files to modify:**
- `frontend/src/app/(tabs)/create.tsx`

**New features:**
1. **Location picker** — use current location or pick on map
2. **Address label input** — text field for place name
3. **Image picker** — up to 3 images from camera/gallery (use `expo-image-picker`)
4. **Max participants input** — number stepper
5. **Scheduled time picker** — date/time picker

**Frontend API additions:**
- `uploadJamaahImages(jamaahId, images)` — multipart POST to `/api/jamaah/<id>/images/`

---

## Phase 8: Navigation Updates

**Files to modify:**
- `frontend/src/app/_layout.tsx` — add `/user/[id]` route
- Tab bar icons update to match Islamic/green theme

---

## Execution Order

| Step | Phase | Estimated Changes |
|------|-------|-------------------|
| 1 | Phase 1: Theme | 5 files |
| 2 | Phase 2: Backend models | 3 files + migrations |
| 3 | Phase 3: Backend filtering | 1 file |
| 4 | Phase 6: API functions | 1 file |
| 5 | Phase 5: Jamaah detail | 1 file |
| 6 | Phase 4: Explore page | 2 files |
| 7 | Phase 7: Create page | 1 file |
| 8 | Phase 8: Navigation | 2 files |
| 9 | Testing & fixes | Run server + tests |
