amah Finder — Technical Specification
1. Overview
Community app for finding and hosting congregational prayer (jamah). Core loop: Hosts list spaces with capacity, prayer times, and location. Seekers browse map, find jamah, join. Trust and safety are primary.

2. User Roles
Role	Permissions
Guest	Browse map only, no exact addresses, cannot join
Member	Phone/email verified. Join public/institutional listings, cannot host personal spaces
Verified Member	ID verified. Host any listing type, join personal-space listings
Institution	Mosque/musalla/organization account, verified via public registry or manual check
Moderator/Admin	Internal role for reviewing listings and reports
Trust rule: The more private the space, the higher the trust bar to host or join.

3. Data Model
User
text
- id: UUID
- name: string
- photo: string (URL)
- phone: string (verified: boolean)
- email: string (verified: boolean)
- verification_status: enum('unverified', 'id_verified', 'institution')
- verification_provider_ref: string (opaque token from KYC vendor)
- trust_score: float
- prayers_hosted: integer
- prayers_joined: integer
- home_location: geography(Point) (optional)
- created_at: timestamp
- updated_at: timestamp
Listing (Space)
text
- id: UUID
- owner_id: UUID (references User or Institution)
- type: enum('institution', 'personal')
- title: string
- description: text
- photos: array(string) (URLs)
- address_full: text (shown only to joined members)
- approximate_geo: geography(Point) (fuzzed ~150m for personal listings)
- capacity_total: integer
- capacity_open: integer
- prayers_offered: jsonb
  {
    "salah": "Fajr|Dhuhr|Asr|Maghrib|Isha",
    "time": "HH:MM" or "calculated",
    "recurring": boolean,
    "days": array(integer)  // 0-6 for Sunday-Saturday
  }
- amenities: jsonb
  {
    "parking": boolean,
    "wudu_area": boolean,
    "women_section": boolean,
    "wheelchair_accessible": boolean
  }
- status: enum('pending_review', 'live', 'rejected', 'paused')
- rating_avg: float
- rating_count: integer
- created_at: timestamp
- updated_at: timestamp
JamahSession
text
- id: UUID
- listing_id: UUID (references Listing)
- date: date
- prayer: enum('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')
- spots_open: integer
- attendees: array(UUID)  // references User
- created_at: timestamp
Attendance
text
- id: UUID
- session_id: UUID (references JamahSession)
- user_id: UUID (references User)
- joined_at: timestamp
- status: enum('going', 'waitlisted', 'cancelled')
Report
text
- id: UUID
- target_type: enum('listing', 'user')
- target_id: UUID
- reporter_id: UUID (references User)
- reason: enum('unsafe', 'inaccurate', 'harassment', 'fake_listing', 'other')
- details: text
- status: enum('pending', 'resolved', 'dismissed')
- resolved_by: UUID (references User)
- resolved_at: timestamp
- created_at: timestamp
Institution
text
- id: UUID
- name: string
- registration_evidence: string (URL)
- admin_user_ids: array(UUID)
- badge_type: enum('mosque', 'musalla', 'office', 'university')
- verification_status: enum('pending', 'verified', 'rejected')
- created_at: timestamp
- updated_at: timestamp
4. Verification & Safety System
4.1 Identity Verification Vendor Integration
Recommended vendors: Stripe Identity, Persona, Onfido, Veriff

Flow:

App initiates verification via vendor SDK

Vendor captures ID document + selfie liveness

Vendor processes verification

Vendor returns result (verified/failed/needs_review) + reference token

Never store raw ID images — only store reference token

4.2 Tiered Trust Model
Status	Can Browse	Can Join Public	Can Join Personal	Can Host Personal
Unverified	✓	✗	✗	✗
Member (phone/email)	✓	✓	✗	✗
Verified Member (ID)	✓	✓	✓	✓
Institution	✓	✓	✓	N/A
4.3 Moderation
All new listings enter review queue before going live

Automated checks: address plausibility, photo moderation, duplicate detection

Human review for personal listings

Safety reports hide listing immediately pending review

4.4 Location Privacy
Personal listings: show fuzzed radius (~150m) or nearest landmark publicly

Exact address revealed only after user clicks "Join"

Institutional listings: show exact location (public information)

5. API Endpoints (REST)
Auth
text
POST   /api/auth/phone/send      // Send OTP
POST   /api/auth/phone/verify    // Verify OTP
POST   /api/auth/email/verify    // Verify email
POST   /api/auth/refresh         // Refresh token
DELETE /api/auth/logout          // Logout
Users
text
GET    /api/users/me             // Get current user
PUT    /api/users/me             // Update profile
POST   /api/users/me/verify      // Initiate ID verification
GET    /api/users/me/verify/status // Check verification status
GET    /api/users/:id            // Get user profile (public)
POST   /api/users/:id/report     // Report user
Listings
text
GET    /api/listings             // List nearby (with filters)
  Query: lat, lng, radius, prayer, type, limit, offset
GET    /api/listings/:id         // Get listing detail
POST   /api/listings             // Create listing
PUT    /api/listings/:id         // Update listing
DELETE /api/listings/:id         // Delete listing
POST   /api/listings/:id/report  // Report listing
POST   /api/listings/:id/join    // Join session
DELETE /api/listings/:id/join    // Cancel join
POST   /api/listings/:id/checkin // Check-in (Phase 2)
Sessions
text
GET    /api/sessions/:id/attendees // Get attendees list
GET    /api/sessions/upcoming      // User's upcoming sessions
Institutions
text
GET    /api/institutions         // List institutions
POST   /api/institutions         // Create institution claim
PUT    /api/institutions/:id     // Update institution
GET    /api/institutions/:id/verify // Verification status
Moderation (Admin)
text
GET    /api/admin/listings/pending   // Pending listings
PUT    /api/admin/listings/:id       // Approve/reject
GET    /api/admin/reports            // Reports queue
PUT    /api/admin/reports/:id        // Resolve report
6. Mobile App Integration
6.1 Map Integration
Google Maps Platform (recommended):

Maps SDK for iOS/Android: unlimited free

Dynamic Maps: 10,000 free loads/month

Geocoding: separate SKU with free tier

Set Google Cloud budget alerts from day one

Alternative: Mapbox (also has generous free tier)

Map Features:

Pin clustering at low zoom

Paginated/virtualized listing lists

Cache last-loaded map view for offline use

6.2 Directions Deep Linking
Apple Maps:

text
https://maps.apple.com/?daddr=<lat>,<lng>
Google Maps:

text
https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>
UI Pattern: Tap "Get Directions" → Action sheet with "Open in Apple Maps" / "Open in Google Maps" → Launch URL

iOS: Show both options

Android: Default to Google Maps

7. Push Notifications
Provider: Firebase Cloud Messaging (cross-platform, free)

Notification Types:

Join confirmation

Spot opened (from waitlist)

Prayer starting soon (Phase 2)

Listing approved/rejected

Report resolution

8. Recommended Tech Stack
Layer	Recommendation	Rationale
Mobile	React Native or Flutter	Single codebase for iOS + Android
Backend	Node.js/TypeScript + Express, or Supabase	Fast development, managed infra
Database	PostgreSQL + PostGIS	Geographic queries, JSON support
Auth	Supabase Auth or Firebase Auth	Managed, secure
Storage	Supabase Storage or Firebase Storage	For user photos, listing images
Identity Verification	Stripe Identity / Persona / Onfido	Don't build in-house
Maps	Google Maps Platform or Mapbox	See pricing section
Push Notifications	Firebase Cloud Messaging	Cross-platform, free
Hosting	Supabase/Firebase (MVP), AWS/GCP (scale)	Keep infrastructure managed
Admin Dashboard	Retool or internal React app	Day-one necessity
9. Database Schema (PostgreSQL + PostGIS)
sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100),
  photo VARCHAR(255),
  phone VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT false,
  email VARCHAR(255) UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  verification_status VARCHAR(20) DEFAULT 'unverified',
  verification_provider_ref VARCHAR(255),
  trust_score DECIMAL(3,2) DEFAULT 0,
  prayers_hosted INT DEFAULT 0,
  prayers_joined INT DEFAULT 0,
  home_location GEOGRAPHY(Point),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Listings
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  photos TEXT[],
  address_full TEXT,
  approximate_geo GEOGRAPHY(Point) NOT NULL,
  capacity_total INT NOT NULL,
  capacity_open INT,
  prayers_offered JSONB NOT NULL,
  amenities JSONB,
  status VARCHAR(20) DEFAULT 'pending_review',
  rating_avg DECIMAL(3,2),
  rating_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_listings_geo USING GIST (approximate_geo),
  INDEX idx_listings_status (status)
);

-- Jamah Sessions
CREATE TABLE jamah_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prayer VARCHAR(20) NOT NULL,
  spots_open INT,
  attendees UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_sessions_listing (listing_id),
  INDEX idx_sessions_date (date)
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES jamah_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'going',
  UNIQUE(session_id, user_id),
  INDEX idx_attendance_user (user_id),
  INDEX idx_attendance_session (session_id)
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_reports_status (status)
);

-- Institutions
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  registration_evidence VARCHAR(255),
  admin_user_ids UUID[],
  badge_type VARCHAR(20),
  verification_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
10. Query Examples
Find listings within radius
sql
SELECT 
  id, title, type, capacity_total, capacity_open,
  ST_Distance(approximate_geo, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS distance
FROM listings
WHERE 
  status = 'live'
  AND ST_DWithin(approximate_geo, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
  AND prayers_offered @> $4  -- JSON filter for prayer type
ORDER BY distance
LIMIT $5 OFFSET $6;
Get listing with attendance count
sql
SELECT 
  l.*,
  COUNT(a.id) FILTER (WHERE a.status = 'going') AS current_attendees,
  COUNT(a.id) FILTER (WHERE a.status = 'waitlisted') AS waitlist_count
FROM listings l
LEFT JOIN jamah_sessions s ON s.listing_id = l.id
LEFT JOIN attendance a ON a.session_id = s.id
WHERE l.id = $1
GROUP BY l.id;
11. Environment Variables
text
# Auth
JWT_SECRET=
JWT_EXPIRY=7d

# Database
DATABASE_URL=
DATABASE_POOL_SIZE=20

# SMS Provider
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Identity Verification
VERIFICATION_PROVIDER=stripe|persona|onfido
VERIFICATION_API_KEY=
VERIFICATION_WEBHOOK_SECRET=

# Maps
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN= (if using Mapbox)

# Push Notifications
FCM_SERVER_KEY=
FCM_SENDER_ID=

# Storage
STORAGE_BUCKET=
STORAGE_REGION=

# Admin
ADMIN_EMAILS=comma,separated,list
MODERATION_SLA_HOURS=24
12. Non-Functional Requirements
Performance
Map view: pin clustering, paginated lists

Response time: <500ms for API (P95)

Cache map tiles and listing data for offline use

Security
All endpoints require authentication except public browsing

Rate limiting: 100 requests/minute per user

Input validation on all API endpoints

HTTPS-only

CORS configured for mobile origins

Accessibility
VoiceOver/TalkBack support

Sufficient color contrast

Tap targets ≥44px

Localization
Support Arabic RTL from start

Consider Urdu, French, Indonesian

Prayer time calculation: support multiple methods (ISNA, MWL, Umm al-Qura)

Data Retention
Verification data: store only reference token, not raw IDs

User data deletion: delete all personal data within 30 days of account closure

Logs: retain 90 days

13. MVP Roadmap
Phase	Timeline	Deliverables
0. Foundations	Weeks 1-3	Auth, phone verification, database schema, basic map view
1. Core Loop	Weeks 4-8	Create listing, listing detail, join flow, directions chooser
2. Trust Layer	Weeks 9-12	ID verification integration, moderation queue, reporting
3. Polish & Launch	Weeks 13-16	Push notifications, ratings, onboarding polish, beta launch
4. Post-launch	Ongoing	Recurring listings, institutional partnerships, i18n/RTL
Recommendation: Single-city beta before wider launch to seed density.

14. Open Technical Questions
Moderation team: Who handles review queue — founders, volunteers, or paid contractor?

Institutional verification: Partnership/outreach required or self-serve claiming?

Gender policy: Product decision needed for mixed/separate spaces

Data retention policy: Legal review needed for verification data handling

Legal review: Data privacy law (GDPR, CCPA, state biometric laws), terms of service, liability language

This specification is a starting point. Adjust phased roadmap and tech stack based on developer expertise.

what fetures and things user must be able to do in the app , make a list
Jamah Finder — User Feature Checklist
Onboarding & Account
□ Download app from App Store / Google Play
□ Enter phone number for SMS OTP verification
□ Verify email (optional but incentivized)
□ Create basic profile (name, photo)
□ Complete ID verification (scan government ID + selfie liveness check) — optional but required for hosting personal spaces and joining private listings
□ View verification status (unverified → member → verified member)
□ See "Verified" badge on profile after passing ID check
□ Upgrade from member to verified member at any time
Discovery & Browsing
□ View map with nearby jamah listings as pins
□ See list of nearby jamah listings in a bottom sheet
□ Filter listings by:
Prayer (Fajr / Dhuhr / Asr / Maghrib / Isha)

Distance (e.g., 1km, 5km, 10km)

Space type (institution / personal)

□ See listing preview on map pin tap:
Title

Host type (institution badge or personal badge)

Prayer time

Distance from current location

Available spots

Approximate location (fuzzed for personal listings)

□ Search for specific location or listing title
□ Refresh map/listings
□ See prayer time calculation based on location (Phase 2)
□ View gender-specific space indicators (Phase 2)
Listing Detail View
□ View full listing details:
Photos (multiple images)

Host name and verification badge

Host type (institution/personal)

Exact address (revealed only after joining)

Capacity (total and remaining spots)

Prayer time(s) offered

Recurring schedule (if applicable)

Amenities: parking, wudu area, women's section, wheelchair accessible

Rules/notes (e.g., "please arrive 5 min early," "bring your own prayer mat")

Rating and review count

□ View host's profile:
Name, photo

Verification badge

Number of jamahs hosted

Number of jamahs joined

Trust score/reputation

□ See current spot availability in real-time
□ Read reviews from past attendees (Phase 2)
□ View list of attendees (Phase 2 — after joining)
Joining a Jamah
□ Tap "Join" button on listing
□ See confirmation of joining
□ Receive exact address after joining
□ See host contact info (limited, structured — no open chat)
□ Get "Get Directions" button
□ Choose navigation app:
Open in Google Maps

Open in Apple Maps (iOS only)

□ Cancel/withdraw from jamah
□ Join waitlist if spots are full
□ Get notified if a spot opens (push notification)
□ Check-in "I'm here" when arriving (Phase 2)
□ View upcoming jamah sessions in "My Sessions"
Hosting a Space
Suggest a Space Flow
□ Tap "+ Suggest a space" button
□ Choose space type:
Institution (mosque, musalla, university room, office prayer room)

Personal (home, apartment, dorm, private space)

□ If personal: Must be ID verified first — if not, prompted to verify
□ If institution: Search/claim existing institution or add new with verification documents
Enter Listing Details
□ Enter title and description
□ Upload photos (multiple)
□ Drop pin on map for location
□ For personal spaces: address is automatically fuzzed ~150m for public view
□ Set capacity (total number of spots)
□ Select prayer time(s) offered:
Fajr / Dhuhr / Asr / Maghrib / Isha

Specific time (manual entry) or "calculated" based on location

One-off or recurring

If recurring: select days of week

□ Add amenities (checkboxes):
Parking available

Wudu area available

Women's section

Wheelchair accessible

Family-friendly

Gender-separated space

□ Add notes/rules (e.g., "enter through back door," "please remove shoes")
□ Preview listing before submitting
□ Submit for moderation review
After Submission
□ See listing status: pending review / live / rejected / paused
□ Receive notification when listing is approved or rejected
□ If rejected: see reason and requested changes
□ Edit listing after approval
□ Pause/unpause listing
□ Delete listing
□ View analytics:
Number of people who viewed listing

Number of people who joined

Attendance history

Rating received

Institutional Host Features
□ Claim existing institution (mosque, musalla, university)
□ Provide registration/verification evidence (document upload)
□ Get "Verified Institution" badge
□ Add multiple admins to manage the institution's listings
□ Bulk create recurring prayer schedules
□ Assign different admins for different prayer times
□ View attendance analytics across all listings
Trust & Safety
□ Report a listing or user:
Reasons: unsafe, inaccurate, harassment, fake listing, other

Optional details

Submit report to moderation queue

□ Block a user (user cannot see your listings or join your sessions)
□ See safety tips/host guidelines (built into app, not fine print)
□ View trust score / reputation
□ For personal hosts: initial capacity cap until few successful sessions
□ For personal hosts: first-time meetups suggested in common areas
Settings & Profile
□ View and edit profile:
Name

Photo

Phone number (verified)

Email (verified)

□ View verification status and initiate/complete verification
□ Manage notifications:
Push notifications on/off

Specific prayer time notifications

Nearby listing alerts (Phase 2)

□ Prayer time calculation settings (Phase 2):
Calculation method: ISNA, MWL, Umm al-Qura, etc.

Madhhab: Hanafi, Shafi'i, etc.

□ Privacy settings:
Show/hide joined jamah history

Show/hide hosted jamah history

□ Language preference (Phase 2)
□ Account deletion
□ Terms of Service
□ Privacy Policy
□ Support/Contact
Moderation & Admin (Internal)
□ View all pending listings in queue
□ Review listing details, photos, location
□ Approve or reject listing with reason
□ Request changes from host
□ View reports queue
□ Mark reports as resolved or dismissed
□ Hide listing immediately for safety reports
□ Ban/suspend users
□ View moderation analytics:
Number of approvals/rejections

Report resolution time

Most reported listings/users

Push Notifications
□ Receive notification when listing is approved
□ Receive notification when listing is rejected (with reason)
□ Receive notification when someone joins your listing
□ Receive notification when a spot opens (if on waitlist)
□ Receive notification 15 min before jamah starts (Phase 2)
□ Receive notification for nearby jamah in next hour (Phase 2)
□ Receive notification for report resolution
□ Receive notification for new follower (Phase 2)
□ Receive notification for review received (Phase 2)
Reviews & Ratings (Phase 2)
□ Rate a jamah session after attending (1-5 stars)
□ Leave written review
□ See average rating on listing
□ See host's overall rating
□ See individual reviews
□ Report inappropriate reviews
Advanced Features (Phase 2)
□ Recurring listings — auto-renew weekly/monthly
□ Hijri calendar integration
□ In-app check-in ("I'm here")
□ Prayer count history ("hosted 40 jamahs")
□ Follow trusted hosts
□ Save favorite listings
□ Share listing with friends
□ Prayer time notifications
□ Multi-language support (Arabic RTL, Urdu, French, Indonesian)
□ Accessibility features (VoiceOver/TalkBack)
□ Offline mode — cached map and listings
User Capabilities Summary
Capability	Guest	Member	Verified Member	Institution
Browse map	✓	✓	✓	✓
See approximate location	✓	✓	✓	✓
See exact address	✗	✓ (after join)	✓ (after join)	✓
Join institutional listings	✗	✓	✓	✓
Join personal listings	✗	✗	✓	✓
Host institutional listings	✗	✗	✗	✓
Host personal listings	✗	✗	✓	✗
Report listings/users	✗	✓	✓	✓
Rate sessions	✗	✓	✓	✓
Get Verified badge	✗	✗	✓	✓ (institution badge)
Manage multiple admins	✗	✗	✗	✓