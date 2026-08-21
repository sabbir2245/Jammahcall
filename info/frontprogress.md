# Frontend Progress — MVP

> Step-by-step breakdown of building the Expo + React Native (TypeScript) frontend
> for the Jama'at MVP, based on `spec.md` and `api_schema.md`.

---

## Phase 1 — Project Setup

1. [x] Scaffold Expo project with TypeScript + Expo Router (SDK 57) in `frontend/`.
2. [x] Install core deps: `axios`, `expo-secure-store`.
3. [x] Set up `src/` structure (`app/`, `components/`, `lib/`, `contexts/`, `constants/`, `hooks/`).
4. [x] Generate `expo-env.d.ts` (CSS module types) so TypeScript passes.
5. [x] Verify: `tsc --noEmit` clean + `expo export --platform web` bundles with all routes.

---

## Phase 2 — API Layer & Config

6. [x] `lib/config.ts` — `API_URL` (localhost on web; `EXPO_PUBLIC_API_URL` for a device).
7. [x] `lib/api.ts` — axios client with:
     - JWT storage in `expo-secure-store` (`access` + `refresh`).
     - `Authorization: Bearer <access>` request interceptor.
     - Auto token refresh on `401` response interceptor.
     - `register`, `login`, `fetchMe`, `fetchJamaahs`, `createJamaah`, `createJoinRequest`.
8. [x] `frontend/.env` — set `EXPO_PUBLIC_API_URL` to LAN IP for device testing.

---

## Phase 3 — Auth

9. [x] `contexts/auth.tsx` — `AuthProvider` + `useAuth()` (user, loading, login, register, logout).
10. [x] `app/login.tsx` — login form → `/api/auth/login/`; redirect to `/` on success.
11. [x] `app/register.tsx` — registration form → `/api/auth/register/`.
12. [x] Root `app/_layout.tsx` — auth gate: show login until a valid token/user exists.
13. [x] `(tabs)/_layout.tsx` — redirect to `/login` when logged out.
14. [x] Descriptive error messages on auth failure (network vs API detail).

---

## Phase 4 — Navigation (5 Tabs)

15. [x] `(tabs)/_layout.tsx` — 5-tab layout via `NativeTabs` (expo-router).
16. [x] Tabs: `index` (Home), `explore` (Explore), `create` (Create), `activity` (Activity), `profile` (Profile).
17. [x] Tab icons via SF Symbols (`sf`) / Material Symbols (`md`) — no image assets needed.
18. [x] Web tab variant in `components/app-tabs.web.tsx`.
19. [x] `app/jamaah/[id].tsx` — Jama'ah detail route (placeholder).

---

## Phase 5 — Screens

20. [x] Home (`(tabs)/index.tsx`) — fetches & lists nearby Jama'ahs from `/api/jamaah/`.
21. [x] Explore (`(tabs)/explore.tsx`) — map view showing nearby Jama'ahs.
22. [x] Create (`(tabs)/create.tsx`) — prayer picker + creates a Jama'ah.
23. [x] Activity (`(tabs)/activity.tsx`) — placeholder for requests/notifications.
24. [x] Profile (`(tabs)/profile.tsx`) — shows user info + logout.
25. [ ] Jama'ah detail screen — members list, join/request button.
26. [ ] Create screen — full fields (location, time, max participants).
27. [x] Explore — `react-native-maps` map with current-location marker + Jama'ah markers/callouts (native), list fallback on web (`ExploreMap.web.tsx`).

---

## Phase 6 — Theming (modular)

28. [x] `constants/theme.ts` — full semantic palette (light + dark):
     `text, textSecondary, background, backgroundElement, backgroundSelected, card,
     border, inputBackground, primary, primaryContrast, secondary, accent, success,
     danger, warning`.
29. [x] `navigationTheme()` — maps palette into React Navigation theme (headers + tab bar), including required `fonts`.
30. [x] Root `_layout.tsx` — `ThemeProvider` uses `navigationTheme()` (auto light/dark).
31. [x] `components/Button.tsx` — token-driven button (`primary`/`secondary`/`danger`, `loading`).
32. [x] `components/ThemedTextInput.tsx` — token-driven input (readable text in dark mode).
33. [x] `components/PasswordInput.tsx` — password input with Show/Hide toggle.
34. [x] Removed hardcoded colors from screens (`login`, `register`, `create`, `profile`, `themed-text`).
35. [x] Splash/logo intentionally left branded (not theme-driven).

> **Re-theme note:** change one file — `src/constants/theme.ts` — to re-theme the whole app.

---

## Phase 7 — Dev Build / Push Notifications (later)

36. [ ] Add `expo-dev-client` for a development build (needed for `expo-secure-store` on iOS).
37. [ ] Set up push notifications (`expo-notifications`) → backend `device_token`.
38. [ ] Activity tab — fetch join requests / notifications from `/api/`.
39. [ ] Location access — capture lat/lng for create/explore.
40. [ ] Prayer times feed.

---

## Phase 8 — Finalize

41. [ ] `tsc --noEmit` clean (done as of latest).
42. [ ] Web export bundle passes (done as of latest).
43. [ ] End-to-end test: register → login → create Jama'ah → list on Home.
44. [ ] Brief `frontend/README.md` with run + connect-to-backend instructions.

---

## Status Legend

- `[x]` — done
- `[~]` — partial / simplified for now
- `[ ]` — pending

---

## Current Status

- **Core scaffold complete:** Expo Router + TS, 5 tabs, auth (login/register/logout), API layer with JWT + auto-refresh, connected to the backend over LAN.
- **Theming fully modular** — re-theme via `src/constants/theme.ts`.
- Next: Jama'ah detail screen, richer Create form, dev build + push, Activity tab.