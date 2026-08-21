# Database Schema — MVP

> Tech stack: Django + PostgreSQL.
> Custom auth user model: `accounts.User`.
> This schema covers only the **MVP** features from `spec.md` §13.

---

## Conventions

- Primary keys: auto-increment `BIGINT` (`BigAutoField`).
- Timestamps: all stored in `TIMESTAMPTZ` (UTC).
- Foreign keys: `ON DELETE` behavior noted per field.
- Indexes: geospatial indexes on location fields for nearby queries.

---

## Auth & Users

### `accounts_user`

Extends Django's AbstractUser. Holds identity + location.

| Column          | Type           | Constraints                     | Notes                                  |
|-----------------|----------------|---------------------------------|----------------------------------------|
| `id`            | bigint         | PK                              |                                        |
| `password`      | varchar(128)   | NOT NULL                        | Django-managed hash                    |
| `last_login`    | timestamptz    | NULL                            |                                        |
| `is_superuser`  | boolean        | NOT NULL, default false         |                                        |
| `username`      | varchar(150)   | NOT NULL, unique                | Django default                         |
| `first_name`    | varchar(150)   | NOT NULL, default ''            |                                        |
| `last_name`     | varchar(150)   | NOT NULL, default ''            |                                        |
| `email`         | varchar(254)   | NOT NULL, unique                |                                        |
| `is_staff`      | boolean        | NOT NULL, default false         |                                        |
| `is_active`     | boolean        | NOT NULL, default true          |                                        |
| `date_joined`   | timestamptz    | NOT NULL                        |                                        |
| `phone`         | varchar(20)    | NULL, unique                    | MVP: phone for login/contact           |
| `profile_picture`| varchar(255)  | NULL                            | URL/path to image                      |
| `city`          | varchar(100)   | NULL                            | Display city, never exact address      |
| `latitude`      | numeric(9,6)   | NULL                            | Approx location (see privacy note)     |
| `longitude`     | numeric(9,6)   | NULL                            | Approx location                        |
| `device_token`  | varchar(255)   | NULL                            | For push notifications                 |

> **Privacy:** Store only approximate location for matching. The user's exact home
> address must **never** be stored or exposed publicly (spec §12).

---

## Jama'ah (Prayer Gatherings)

### `jamaah_jamaah`

A single prayer gathering started by a user.

| Column      | Type         | Constraints                      | Notes                                  |
|-------------|--------------|----------------------------------|----------------------------------------|
| `id`        | bigint       | PK                               |                                        |
| `organizer` | FK → accounts_user | NOT NULL, `ON DELETE CASCADE` | Creator                                 |
| `prayer`    | varchar(20)  | NOT NULL                         | Fajr / Dhuhr / Asr / Maghrib / Isha / Jumu'ah |
| `location_type` | varchar(20) | NOT NULL                    | Current / Selected / Public / Workplace / University / Park / Other |
| `latitude`  | numeric(9,6) | NOT NULL                         |                                        |
| `longitude` | numeric(9,6) | NOT NULL                         |                                        |
| `address_label` | varchar(255) | NULL                         | Human-friendly label (never exact home)|
| `scheduled_at` | timestamptz | NULL                           | NULL = "Now"; else "15 min / 30 min / custom" |
| `max_participants` | integer  | NULL, default NULL             | Optional cap                           |
| `status`    | varchar(20)  | NOT NULL, default 'open'         | open / full / cancelled / completed    |
| `created_at`| timestamptz  | NOT NULL                         |                                        |

**Indexes:** GiST index on `(latitude, longitude)` for nearby searches;
index on `status`; index on `scheduled_at`.

---

### `jamaah_joinrequest`

A user requesting to join a Jama'ah (spec §7).

| Column     | Type          | Constraints                            | Notes                     |
|------------|---------------|----------------------------------------|---------------------------|
| `id`       | bigint        | PK                                     |                           |
| `jamaah`   | FK → jamaah_jamaah | NOT NULL, `ON DELETE CASCADE`      |                           |
| `requester`| FK → accounts_user | NOT NULL, `ON DELETE CASCADE`      |                           |
| `status`   | varchar(20)   | NOT NULL, default 'pending'            | pending / accepted / declined |
| `created_at` | timestamptz | NOT NULL                              |                           |

**Unique constraint:** `(jamaah, requester)` — one request per user per Jama'ah.

---

### `jamaah_member`

Users who have joined (accepted) a Jama'ah.

| Column  | Type           | Constraints                           | Notes                |
|---------|----------------|---------------------------------------|----------------------|
| `id`    | bigint         | PK                                    |                      |
| `jamaah`| FK → jamaah_jamaah | NOT NULL, `ON DELETE CASCADE`      |                      |
| `user`  | FK → accounts_user | NOT NULL, `ON DELETE CASCADE`      |                      |
| `joined_at` | timestamptz | NOT NULL                            |                      |

**Unique constraint:** `(jamaah, user)`.

---

## Find People to Pray (spec §8)

### `jamaah_prayneed`

A user signaling they want others to join for a prayer.

| Column      | Type           | Constraints                  | Notes                          |
|-------------|----------------|------------------------------|--------------------------------|
| `id`        | bigint         | PK                           |                                |
| `user`      | FK → accounts_user | NOT NULL, `ON DELETE CASCADE` |                                |
| `prayer`    | varchar(20)    | NOT NULL                     |                                |
| `latitude`  | numeric(9,6)   | NOT NULL                     |                                |
| `longitude` | numeric(9,6)  | NOT NULL                     |                                |
| `radius_miles` | numeric(5,2) | NOT NULL, default 1.00      | "Within 1 mile"               |
| `status`    | varchar(20)    | NOT NULL, default 'active'   | active / fulfilled / cancelled |
| `created_at`| timestamptz    | NOT NULL                     |                                |

**Index:** GiST on `(latitude, longitude)`.

---

## Notifications (spec §8, §9)

### `notifications_notification`

Push notifications sent to users.

| Column      | Type           | Constraints                  | Notes                          |
|-------------|----------------|------------------------------|--------------------------------|
| `id`        | bigint         | PK                           |                                |
| `user`      | FK → accounts_user | NOT NULL, `ON DELETE CASCADE` | recipient                      |
| `type`      | varchar(30)    | NOT NULL                     | jamaah_nearby / pray_needed / join_request / jamaah_full / jumuah_available |
| `title`     | varchar(255)   | NOT NULL                     |                                |
| `body`      | text           | NOT NULL                     |                                |
| `link_type` | varchar(30)    | NULL                         | jamaah / prayneed / user       |
| `link_id`   | bigint         | NULL                         | polymorphic target id          |
| `read`      | boolean        | NOT NULL, default false      |                                |
| `created_at`| timestamptz    | NOT NULL                     |                                |

**Index:** `(user, read)`, `created_at`.

---

### `notifications_notificationpreference`

User notification toggles (spec §9).

| Column      | Type           | Constraints                  | Notes                          |
|-------------|----------------|------------------------------|--------------------------------|
| `id`        | bigint         | PK                           |                                |
| `user`      | FK → accounts_user | NOT NULL, unique, `ON DELETE CASCADE` | one row per user |
| `pray_needed_nearby`   | boolean | NOT NULL, default true  | Someone needs a Jama'ah nearby |
| `jamaah_within_mile`   | boolean | NOT NULL, default true  | A Jama'ah within 1 mile        |
| `jamaah_2plus_people`  | boolean | NOT NULL, default true  | A Jama'ah has 2+ people        |
| `jumuah_nearby`        | boolean | NOT NULL, default true  | Jumu'ah available nearby       |

---

## Moderation (spec §13)

### `moderation_block`

Block a user (prevents them from seeing/joining you).

| Column    | Type           | Constraints                          | Notes          |
|-----------|----------------|--------------------------------------|----------------|
| `id`      | bigint         | PK                                   |                |
| `blocker` | FK → accounts_user | NOT NULL, `ON DELETE CASCADE`     |                |
| `blocked` | FK → accounts_user | NOT NULL, `ON DELETE CASCADE`     |                |
| `created_at` | timestamptz | NOT NULL                            |                |

**Unique constraint:** `(blocker, blocked)`.

---

### `moderation_report`

Report a user.

| Column      | Type           | Constraints                  | Notes                          |
|-------------|----------------|------------------------------|--------------------------------|
| `id`        | bigint         | PK                           |                                |
| `reporter`  | FK → accounts_user | NOT NULL, `ON DELETE CASCADE` |                               |
| `reported`  | FK → accounts_user | NOT NULL, `ON DELETE CASCADE` |                               |
| `reason`    | text           | NOT NULL                     |                                |
| `status`    | varchar(20)    | NOT NULL, default 'open'     | open / reviewed / dismissed    |
| `created_at`| timestamptz    | NOT NULL                     |                                |

**Index:** `(status)`, `created_at`.

---

## MVP Coverage Map (spec §13)

| MVP feature                     | Table(s)                                              |
|---------------------------------|-------------------------------------------------------|
| Sign up / log in                | `accounts_user` (JWT)                                 |
| Location access                 | `accounts_user.latitude/longitude`                    |
| Prayer times                    | Derived externally (no table in MVP)                  |
| Nearby Jama'ahs list            | `jamaah_jamaah` (GiST query)                          |
| Create a Jama'ah                | `jamaah_jamaah`                                       |
| Join / request to join          | `jamaah_joinrequest`, `jamaah_member`                 |
| Basic push notifications        | `notifications_notification`, `notifications_notificationpreference` |
| Simple map view                 | `jamaah_jamaah`, `jamaah_prayneed` (lat/lng)          |
| User profile                    | `accounts_user`                                       |
| Block / report a user           | `moderation_block`, `moderation_report`               |

> Prayer times, mosque directory, Jumu'ah listings, events, and user verification are
> **post-MVP** (spec §14) and intentionally omitted.