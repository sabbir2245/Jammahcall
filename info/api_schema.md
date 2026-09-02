# API Schema — MVP Backend

> REST API for the Jama'at MVP. Base URL: `/api/`.
> Auth: Bearer JWT (`Authorization: Bearer <access_token>`) for all protected routes.
> All requests/responses are JSON (except file uploads which use `multipart/form-data`).

---

## Base URL & Conventions

- Host: e.g. `http://localhost:8000`
- Prefix: `/api`
- Media files: `/media/` (served in DEBUG mode)
- Error format: `{"detail": "..."}` or `{field: [errors]}`
- Protected endpoints return `401` when no/invalid token.

---

## Auth Endpoints (`/api/auth/`)

### Register — `POST /api/auth/register/` (public)

Create a user and return tokens.

Request:
```json
{
  "email": "ahmed@example.com",
  "name": "Ahmed",
  "password": "strongpass123",
  "gender": "male",
  "phone": "555-1234",
  "city": "Dubai",
  "latitude": 25.2048,
  "longitude": 55.2708
}
```
- `gender` required (`"male"` or `"female"`).
- `phone`, `city`, `latitude`, `longitude` optional.

Response `201`:
```json
{
  "user": {
    "id": 1,
    "email": "ahmed@example.com",
    "name": "Ahmed",
    "gender": "male",
    "phone": "555-1234",
    "city": "Dubai",
    "profile_picture": null,
    "profile_picture_url": null,
    "device_token": "",
    "latitude": 25.2048,
    "longitude": 55.2708,
    "date_joined": "2026-08-18T00:00:00Z",
    "average_rating": null,
    "review_count": 0
  },
  "refresh": "<refresh_token>",
  "access": "<access_token>"
}
```

### Login — `POST /api/auth/login/` (public)

Request:
```json
{ "email": "ahmed@example.com", "password": "strongpass123" }
```
Response `200`:
```json
{ "access": "<access_token>", "refresh": "<refresh_token>" }
```

### Refresh Token — `POST /api/auth/token/refresh/` (public)

Request:
```json
{ "refresh": "<refresh_token>" }
```
Response `200`: `{ "access": "<new_access_token>" }`

### Get / Update Me — `GET` / `PATCH` `/api/auth/me/` (protected)

- `GET`: returns the authenticated user (shape as in register `user` object).
- `PATCH`: update any editable field (`name`, `phone`, `city`, `profile_picture`,
  `device_token`, `latitude`, `longitude`).
- `profile_picture` accepts `multipart/form-data` with an `image` file field.

### Public User Profile — `GET /api/auth/users/<id>/` (protected)

Returns public profile for any user by ID, including `average_rating` and `review_count`.

Response `200`:
```json
{
  "id": 2,
  "email": "b@example.com",
  "name": "Bilal",
  "gender": "male",
  "phone": "",
  "city": "Dhaka",
  "profile_picture": "/media/profile_pictures/photo.jpg",
  "profile_picture_url": "http://localhost:8000/media/profile_pictures/photo.jpg",
  "device_token": "",
  "latitude": null,
  "longitude": null,
  "date_joined": "2026-08-18T00:00:00Z",
  "average_rating": 4.5,
  "review_count": 6
}
```

---

## Jama'ah Endpoints (`/api/jamaah/`) — all protected

### List / Create — `GET` / `POST /api/jamaah/`

**GET** query params (all optional):
- `prayer` — filter by prayer (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`, `jumuah`)
- `lat`, `lng`, `radius` — nearby filter (radius in miles, default `5`)
- `search` — text search across `address_label`, organizer `name`, `prayer` (case-insensitive)
- `location_type` — filter by type (`current`, `selected`, `public`, `workplace`, `university`, `park`, `other`)
- `status` — filter by status (`open`, `full`, `cancelled`, `completed`)
- `sort` — `newest` (default), `oldest`, `popular` (by member count)

Response `200` (array):
```json
[
  {
    "id": 1,
    "organizer": { "id": 1, "email": "ahmed@example.com", "name": "Ahmed" },
    "prayer": "asr",
    "location_type": "public",
    "latitude": 25.2048,
    "longitude": 55.2708,
    "address_label": "Downtown Musalla",
    "scheduled_at": null,
    "max_participants": 10,
    "status": "open",
    "member_count": 3,
    "images": [
      {
        "id": 1,
        "jamaah": 1,
        "image_url": "http://localhost:8000/media/jamaah_images/photo.jpg",
        "caption": "",
        "order": 0,
        "created_at": "2026-08-18T00:00:00Z"
      }
    ],
    "created_at": "2026-08-18T00:00:00Z"
  }
]
```

**POST** request (JSON or multipart):
```json
{
  "prayer": "asr",
  "location_type": "public",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "address_label": "City Park",
  "scheduled_at": "2026-08-18T17:30:00Z",
  "max_participants": 10
}
```
- `prayer`, `location_type`, `latitude`, `longitude` required.
- `organizer` is set to the authenticated user automatically.
- Response `201`: Jama'ah object (shape above).

### Retrieve — `GET /api/jamaah/<id>/`

Returns a single Jama'ah object with `member_count` and nested `images` array.

### Members — `GET /api/jamaah/<id>/members/`

Returns the list of joined members:
```json
[
  { "id": 1, "user": { "id": 2, "email": "b@example.com", "name": "B" }, "joined_at": "2026-08-18T00:00:00Z" }
]
```

### Jama'ah Images — `GET` / `POST /api/jamaah/<id>/images/`

**GET**: Returns all images for a Jama'ah, ordered by `order`.

**POST** (`multipart/form-data`):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | yes | Image file (max ~10MB) |
| `caption` | string | no | Image caption |
| `order` | integer | no | Display order (0-2) |

- Maximum 3 images per Jama'ah. Returns `400` if exceeded.
- Response `201`: Image object with `image_url` (absolute URL).

### Create Join Request — `POST /api/jamaah/requests/`

Request:
```json
{ "jamaah": 1 }
```
- `requester` is set to the authenticated user automatically.

Response `201`:
```json
{
  "id": 1,
  "jamaah": 1,
  "requester": { "id": 2, "email": "b@example.com", "name": "B" },
  "status": "pending",
  "created_at": "2026-08-18T00:00:00Z"
}
```

- `400` if the user already requested to join this Jama'ah.

### Accept — `POST /api/jamaah/requests/<id>/accept/` (organizer only)

- Response `200`: JoinRequest with `status: "accepted"`.
- Creates a `Member` record for the requester.
- Sets Jama'ah `status: "full"` when `max_participants` is reached.
- `403` if not the organizer; `400` if already handled.

### Decline — `POST /api/jamaah/requests/<id>/decline/` (organizer only)

- Response `200`: JoinRequest with `status: "declined"`.

---

## Reviews (`/api/jamaah/reviews/`) — protected

### List / Create — `GET` / `POST /api/jamaah/reviews/`

**GET** query params:
- `user` — filter reviews for a specific user (by user ID)

Response `200` (array):
```json
[
  {
    "id": 1,
    "reviewer": { "id": 2, "email": "b@example.com", "name": "Bilal" },
    "reviewee": { "id": 1, "email": "a@example.com", "name": "Ahmed" },
    "jamaah": { "id": 5, "prayer": "asr" },
    "rating": 5,
    "comment": "Great organizer, very punctual!",
    "created_at": "2026-08-18T00:00:00Z"
  }
]
```

**POST** request:
```json
{
  "reviewee_id": 1,
  "jamaah_id": 5,
  "rating": 5,
  "comment": "Great organizer, very punctual!"
}
```
- `reviewee_id` required. `jamaah_id` optional.
- `rating` must be 1-5.
- Cannot review yourself. One review per reviewer/reviewee/jamaah combination.
- `reviewer` is set to the authenticated user automatically.
- Response `201`: Review object.

---

## Find People to Pray — `PrayNeed` (`/api/jamaah/pray-needs/`) — protected

### List / Create — `GET` / `POST /api/jamaah/pray-needs/`

**GET** query params (all optional):
- `prayer` — filter by prayer
- `lat`, `lng` — nearby filter (approx ±1°)
- Only returns `status: "active"` needs.

Response `200` (array):
```json
[
  {
    "id": 1,
    "user": { "id": 1, "email": "a@example.com", "name": "Ahmed" },
    "prayer": "asr",
    "latitude": 25.2048,
    "longitude": 55.2708,
    "radius_miles": "1.00",
    "status": "active",
    "created_at": "2026-08-18T00:00:00Z"
  }
]
```

**POST** request:
```json
{
  "prayer": "asr",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "radius_miles": "1.00"
}
```
- `prayer`, `latitude`, `longitude` required; `radius_miles` optional (default `1.00`).
- `user` is set to the authenticated user automatically.
- Response `201`: PrayNeed object (shape above).

### Retrieve — `GET /api/jamaah/pray-needs/<id>/`

Returns a single PrayNeed object.

### Fulfill — `POST /api/jamaah/pray-needs/<id>/fulfill/`

- Marks the need as `fulfilled` (e.g. when someone joins the prayer).
- `400` if the need is not `active`.

### Cancel — `POST /api/jamaah/pray-needs/<id>/cancel/`

- Marks the need as `cancelled`.
- `403` if not the creator.

---

## Data Shapes

### User
```json
{
  "id": 1,
  "email": "a@example.com",
  "name": "Ahmed",
  "gender": "male",
  "phone": "555-1234",
  "city": "Dubai",
  "profile_picture": "/media/profile_pictures/photo.jpg",
  "profile_picture_url": "http://localhost:8000/media/profile_pictures/photo.jpg",
  "device_token": "",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "date_joined": "2026-08-18T00:00:00Z",
  "average_rating": 4.5,
  "review_count": 6
}
```

### Jama'ah
```json
{
  "id": 1,
  "organizer": { "id": 1, "email": "a@example.com", "name": "Ahmed" },
  "prayer": "asr",
  "location_type": "public",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "address_label": "Downtown Musalla",
  "scheduled_at": null,
  "max_participants": 10,
  "status": "open",
  "member_count": 3,
  "images": [],
  "created_at": "2026-08-18T00:00:00Z"
}
```

### Jama'ahImage
```json
{
  "id": 1,
  "jamaah": 1,
  "image_url": "http://localhost:8000/media/jamaah_images/photo.jpg",
  "caption": "",
  "order": 0,
  "created_at": "2026-08-18T00:00:00Z"
}
```

### Review
```json
{
  "id": 1,
  "reviewer": { "id": 2, "email": "b@example.com", "name": "Bilal" },
  "reviewee": { "id": 1, "email": "a@example.com", "name": "Ahmed" },
  "jamaah": { "id": 5, "prayer": "asr" },
  "rating": 5,
  "comment": "Great organizer!",
  "created_at": "2026-08-18T00:00:00Z"
}
```

### Prayer values
`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`, `jumuah`

### Location types
`current`, `selected`, `public`, `workplace`, `university`, `park`, `other`

### Jama'ah status
`open`, `full`, `cancelled`, `completed`

### JoinRequest status
`pending`, `accepted`, `declined`

### PrayNeed status
`active`, `fulfilled`, `cancelled`

---

## Example Flow

1. `POST /api/auth/register/` → get `access` token.
2. `POST /api/jamaah/` (with Bearer token) → create Jama'ah.
3. `POST /api/jamaah/<id>/images/` (multipart) → upload photos.
4. `POST /api/jamaah/requests/` `{"jamaah": 1}` → request to join.
5. `POST /api/jamaah/requests/<id>/accept/` → accept, becomes member.
6. `POST /api/jamaah/reviews/` → rate the organizer after praying together.
7. `GET /api/auth/users/<id>/` → view someone's profile and reviews.

---

## Pending (Post-MVP / later phases)

- Notifications & preferences endpoints (Activity tab)
- Block / report endpoints (moderation)
- Prayer-times feed
- Mosque / Jumu'ah directory
