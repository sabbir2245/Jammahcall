# Muslim Jama'ah App — Unified Specification

> Single, conflict-free specification combining all project documents.
> Sources: `jamat3.pdf`, `read.md`, `read2.md`.

---

## 1. Core Idea

A simple app that helps Muslims find each other and pray together. A person can start a
prayer gathering (a **"Jama'ah"**), and nearby users can see it and join.

> **Find Muslims. Form a Jama'ah. Pray Together.**

---

## 2. Tech Stack

- **Backend:** Django + PostgreSQL
- **Frontend:** React Native (Expo)
- **Auth:** Django REST Framework + JWT
- **Maps:** Google Maps (via `react-native-maps`)

---

## 3. Main Screens

| Screen           | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| Home             | Prayer times, nearby Jama'ahs, join button                     |
| Create Jama'ah   | Pick prayer, location, and time to start a Jama'ah             |
| Jama'ah Details  | Shows who has joined and a Join / Request button               |
| Map              | Shows nearby mosques and active Jama'ahs on a map              |
| Profile          | User info, settings, and past Jama'ahs                         |

---

## 4. Navigation (5 Tabs)

| Tab      | What it does                                                      |
|----------|-------------------------------------------------------------------|
| Home     | Shows today's prayer times and nearby Jama'ahs                    |
| Explore  | Map view of mosques and nearby Jama'ahs                           |
| Create   | Start a new Jama'ah                                               |
| Activity | Requests, invites, and notifications                              |
| Profile  | Account, settings, and Jama'ah history                            |

---

## 5. Home Screen

The main screen of the app. It shows:

- Today's prayer times
- Nearby Jama'ahs
- Ongoing prayer gatherings
- Upcoming Jama'ahs
- Distance from the user
- Number of people joining

**Example:**

```
Asr Jama'ah
📍 0.4 miles away
👥 3 people joined
🕐 Starts in 15 minutes
[Join Jama'ah]
```

---

## 6. Create a Jama'ah

One of the main features. A user creates a new Jama'ah by selecting:

**Prayer:**
- Fajr
- Dhuhr
- Asr
- Maghrib
- Isha
- Jumu'ah

**Location:**
- Current location
- Select a location
- Public place
- Workplace
- University
- Park
- Other

**Time:**
- Now
- In 15 minutes
- In 30 minutes
- Custom time

Then the user clicks **[Create Jama'ah]** and it becomes visible to nearby users.

---

## 7. Join / Request System

Users can request to join an existing Jama'ah.

```
Dhuhr Jama'ah
📍 0.3 miles away
👥 Ahmed + 2 others
🕐 1:20 PM
[Request to Join]
```

The organizer receives:

```
Abdullah wants to join your Jama'ah.
[Accept] [Decline]
```

After accepting:

```
✅ Abdullah joined your Jama'ah.
```

---

## 8. Find People to Pray

If someone is alone and wants to pray in Jama'ah, they can select **"Find People to Pray"**,
then choose:

- Prayer: Asr
- Location: Within 1 mile
- Time: Now

Nearby users receive a notification:

```
Someone near you wants to pray Asr.
They are 0.6 miles away.
[Join] [Not Now]
```

This helps people quickly form a Jama'ah.

---

## 9. Smart Prayer Notifications

Users can choose what notifications they want:

- Someone needs a Jama'ah nearby
- A Jama'ah is within 1 mile
- A Jama'ah has 2+ people
- Jumu'ah is available nearby

**Example notification:**

```
Jama'ah Nearby
4 Muslims are gathering for Maghrib 0.5 miles from you.
[View & Join]
```

---

## 10. Prayer Map

The app has a map showing nearby prayer options:

- Mosque
- Active Jama'ah
- Upcoming Jama'ah
- Prayer Gathering

**Example:**

```
0.4 mi — Asr — 4 people
0.7 mi — Asr — 2 people
1.2 mi — Asr — 7 people
```

Users can choose the most convenient one and join.

---

## 11. Mosque & Community Section

Includes nearby mosques and Muslim communities.

**Mosque Profile** can include:

- Mosque name
- Address
- Prayer times
- Jumu'ah times
- Women's prayer space
- Parking information
- Community events
- Announcements

This makes the app more than a prayer app — a Muslim community platform.

---

## 12. User Profile

Each user has a basic profile:

- Name
- Profile picture
- City
- Prayer preferences
- Jama'ah history
- Community contribution

> **Privacy:** The user's exact home address must never be shown publicly.

---

## 13. MVP Feature List

For a first, simple version, the app only needs:

- Sign up / log in (name, email, phone, location)
- Location access
- Prayer times
- Nearby Jama'ahs list
- Create a Jama'ah
- Join / request to join
- Basic push notifications
- Simple map view
- User profile
- Block / report a user

---

## 14. Later Additions (After MVP)

Once the basic app works, add:

- Mosque directory and profiles
- Jumu'ah listings
- Ramadan features
- Community events
- User verification
- Smarter matching between users

---

## 15. Simple User Flow

```
Need to pray  →  Open app  →  See nearby Jama'ah  →  Request to join  →  Get accepted  →  Pray together
```