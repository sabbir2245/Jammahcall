# API Schema — MVP Backend

> REST API for the Jama'at MVP. Base URL: `/api/`.
> Auth: Bearer JWT (`Authorization: Bearer <access_token>`) for all protected routes.
> All requests/responses are JSON.

---

## Base URL & Conventions

- Host: e.g. `http://localhost:8000`
- Prefix: `/api`
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
  "phone": "555-1234",
  "city": "Dubai",
  "latitude": 25.2048,
  "longitude": 55.2708
}
```
- `phone`, `city`, `latitude`, `longitude` optional.

Response `201`:
```json
{
  "user": {
    "id": 1,
    "email": "ahmed@example.com",
    "name": "Ahmed",
    "phone": "555-1234",
    "city": "Dubai",
    "profile_picture": "",
    "device_token": "",
    "latitude": 25.2048,
    "longitude": 55.2708,
    "date_joined": "2026-08-18T00:00:00Z"
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

---

## Jama'ah Endpoints (`/api/jamaah/`) — all protected

### List / Create — `GET` / `POST /api/jamaah/`

**GET** query params (all optional):
- `prayer` — filter by prayer (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`, `jumuah`)
- `lat`, `lng`, `radius` — nearby filter (radius in miles, default `5`)

Response `200` (array):
```json
[
  {
    "id": 1,
    "organizer": { "id": 1, "email": "ahmed@example.com", "name": "Ahmed" },
    "prayer": "asr",
    "location_type": "current",
    "latitude": 25.2048,
    "longitude": 55.2708,
    "address_label": "",
    "scheduled_at": null,
    "max_participants": null,
    "status": "open",
    "member_count": 0,
    "created_at": "2026-08-18T00:00:00Z"
  }
]
```

**POST** request:
```json
{
  "prayer": "asr",
  "location_type": "current",
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

Returns a single Jama'ah object (with `member_count`).

### Members — `GET /api/jamaah/<id>/members/`

Returns the list of joined members:
```json
[
  { "id": 1, "user": { "id": 2, "email": "b@example.com", "name": "B" }, "joined_at": "2026-08-18T00:00:00Z" }
]
```

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
  "phone": "555-1234",
  "city": "Dubai",
  "profile_picture": "",
  "device_token": "",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "date_joined": "2026-08-18T00:00:00Z"
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
3. `POST /api/jamaah/requests/` `{"jamaah": 1}` → request to join.
4. `POST /api/jamaah/requests/<id>/accept/` → accept, becomes member.

---

## Pending (Post-MVP / later phases)

- Notifications & preferences endpoints (Activity tab)
- Block / report endpoints (moderation)
- Prayer-times feed
- Mosque / Jumu'ah directory