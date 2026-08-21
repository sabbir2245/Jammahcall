# Backend Progress — MVP

> Step-by-step breakdown of building the Django + PostgreSQL backend for the
> Jama'at MVP, based on `spec.md` and `dbschema.md`.

---

## Phase 1 — Project Setup

1. [x] Create Django project skeleton (`config/`) in `backend/`.
2. [x] Install dependencies in `requirements.txt`:
     - `Django`, `djangorestframework`, `djangorestframework-simplejwt`,
       `psycopg[binary]`, `corsheaders`, `python-dotenv`.
3. [x] Configure `config/settings.py`:
     - PostgreSQL via environment variables (`DB_*`).
     - Set `AUTH_USER_MODEL = "accounts.User"`.
     - Enable `rest_framework`, `simplejwt`, `corsheaders`.
     - Load `.env` via `python-dotenv` (`load_dotenv(BASE_DIR / ".env")`).
4. [x] Configure JWT lifetimes (`SIMPLE_JWT`).
5. [x] Configure CORS for the Expo dev ports.
6. [x] Create `accounts` Django app.
7. [x] Define the custom `User` model in `accounts/models.py`:
     - `email`, `phone`, `city`, `profile_picture`, `device_token`,
       `latitude`, `longitude`.
     - Custom `UserManager` (email-based, no username).
8. [x] Create and run the first migration for `accounts`.
9. [x] Delete the old database and create a fresh `jamatcall` DB.

---

## Phase 2 — Auth

10. [x] Implement sign-up endpoint (name, email, phone, location).
11. [x] Implement log-in endpoint (returns access + refresh JWT).
12. [x] Implement token refresh endpoint.
13. [x] Add `/api/auth/me` to fetch/update the current user profile.
14. [x] Serialize `User` with `accounts/serializers.py`.
15. [x] Add registration/update views in `accounts/views.py`.
16. [x] Wire auth routes into `config/urls.py`.

---

## Phase 3 — Jama'ah Core

17. [x] Create `jamaah` Django app.
18. [x] Define `Jamaah` model per `dbschema.md`:
     - `organizer`, `prayer`, `location_type`, `latitude`, `longitude`,
       `address_label`, `scheduled_at`, `max_participants`, `status`.
19. [~] Add GiST/geographic index for nearby lookups (uses lat/lng range filter now).
20. [x] Define `JoinRequest` model (`jamaah`, `requester`, `status`).
21. [x] Define `Member` model (`jamaah`, `user`, `joined_at`).
22. [x] Create migrations for the `jamaah` app.
23. [x] Implement `JamaahListCreate` view (create + list).
24. [x] Implement `JamaahRetrieve` view (details + members).
25. [x] Implement "nearby Jama'ahs" query (lat/lng range filter + prayer filter).
26. [x] Implement join-request endpoint (create a `JoinRequest`).
27. [x] Implement accept/decline endpoints (organizer action).
28. [x] Convert accepted request → `Member` record.
29. [x] Prevent duplicate join requests (unique `(jamaah, requester)`).
30. [x] Set `status` to `full` when `max_participants` reached.
31. [x] Add `JamaahSerializer`, `JoinRequestSerializer`, `MemberSerializer`.

---

## Phase 4 — Find People to Pray

32. [x] Define `PrayNeed` model per `dbschema.md`.
33. [x] Create migrations for `PrayNeed`.
34. [x] Implement "Find People to Pray" endpoint (create a `PrayNeed`).
35. [x] Implement nearby-`PrayNeed` query.
36. [x] Mark `PrayNeed` as `fulfilled` when joined.
37. [x] Add `PrayNeedSerializer`.

---

## Phase 5 — Notifications

38. [ ] Create `notifications` Django app.
39. [ ] Define `Notification` model per `dbschema.md`.
40. [ ] Define `NotificationPreference` model per `dbschema.md`.
41. [ ] Create migrations for `notifications`.
42. [ ] Create notification helper (fire when: new nearby Jama'ah, 2+ people,
     pray-need, join request, Jumu'ah).
43. [ ] Implement list/unread-count endpoints for the Activity tab.
44. [ ] Implement mark-as-read endpoint.
45. [ ] Implement preferences get/update endpoint.
46. [ ] Integrate FCM/Expo push (`device_token`) for real push.

---

## Phase 6 — Moderation

47. [ ] Create `moderation` Django app.
48. [ ] Define `Block` model per `dbschema.md`.
49. [ ] Define `Report` model per `dbschema.md`.
50. [ ] Create migrations for `moderation`.
51. [ ] Implement block/unblock endpoints.
52. [ ] Exclude blocked users from nearby results.
53. [ ] Implement report-user endpoint.

---

## Phase 7 — Admin & Quality

54. [x] Register all models in Django admin.
55. [x] Add sensible string representations (`__str__`).
56. [~] Add validation on enums (prayer, location_type, status).
57. [ ] Add input validation on lat/lng ranges.
58. [x] Write `requirements.txt` final versions.
59. [x] Add `DB` `.env`/`.env.example` for local setup.

---

## Phase 8 — Testing

60. [x] Unit tests: auth (sign-up, login, refresh).
61. [x] Unit tests: create/list/retrieve Jama'ah.
62. [x] Unit tests: join request accept/decline flow.
63. [x] Unit tests: nearby-distance queries.
64. [x] Unit tests: pray-need flow.
65. [ ] Unit tests: notifications + preferences.
66. [ ] Unit tests: block/report.
67. [ ] Integration test: full "create → request → accept → join" flow.
68. [ ] API smoke tests against a fresh migrated DB.

---

## Phase 9 — Finalize

69. [x] Run `migrate` on a fresh `jamatcall` database.
70. [ ] Create superuser.
71. [ ] Verify all endpoints via a seeded API client / Postman collection.
72. [ ] Lint/format the codebase.
73. [ ] Write brief `backend/README.md` with setup + run commands.
74. [ ] Mark the MVP backend as complete.

---

## Status Legend

- `[x]` — done
- `[~]` — partial / simplified for now
- `[ ]` — pending

---

## Current Status

- **Phases 1, 2, 3, 4 complete** — auth, Jama'ah core, and PrayNeed built and working.
- **Tests:** 26/26 passing against PostgreSQL (`python manage.py test tests`).
- Next: Phases 5 (Notifications), 6 (Moderation).