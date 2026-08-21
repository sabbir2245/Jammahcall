# Get the Explore map working (react-native-maps)

Status: **native Android map shows a grey/blank screen**. The reason is that
`react-native-maps` uses the **Google Maps SDK for Android**, which requires a
valid **Google Maps API key** to render tiles. This project has **no API key**
configured. Expo Go can't load a custom key, so we must switch to a
**development build** with our own key.

Read the official docs while following this:
https://docs.expo.dev/versions/latest/sdk/map-view/

---

## How maps work here (brief)

- **Android**: `react-native-maps` renders via the Google Maps SDK (from Google
  Play services). Needs an API key. Without it → grey screen, but markers and
  `onMapReady` still work (that's exactly the symptom we saw).
- **iOS**: uses Apple Maps (MapKit). No key needed.
- **Web**: uses `ExploreMap.web.tsx` (a plain list). No key needed.
- Custom OSM tiles (`UrlTile`) do **not** avoid the key on Android — the Google
  Maps SDK is still the base renderer and demands a key.

Cost: the **Maps SDK for Android/iOS** is a **no-cost, unlimited** SKU. You must
enable billing on the project, but a map-only app bills **$0**. Only paid SKUs
(Geocoding, Directions, Places) have free monthly thresholds.

---

## Part A — Create a Google Maps API key

1. Go to https://console.cloud.google.com and create a project (or pick one).
2. **Enable billing** on the project (required even at $0):
   https://console.cloud.google.com/billing
3. Enable the **Maps SDK for Android** for the project:
   - https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com
   - Click **Enable**.
4. Open **Credentials** → **Create Credentials** → **API Key**:
   https://console.cloud.google.com/apis/credentials
5. Copy the key (starts with `AIza...`). Keep it secret.
6. **Restrict the key** (important for production):
   - In the key, choose **Restrict key**.
   - Under **Application restrictions** → **Android apps** → **Add an item**.
   - Enter your **package name** (see Part B) and the **SHA-1** of the signing
     key (see Part C).

> Until you restrict it, the key works for everyone with your package. For a
> production app you **must** restrict it, or anyone could reuse it.

---

## Part B — Configure the project

1. Open `frontend/app.json` and **add a package name** (there isn't one yet).
   It's required for Android maps. Example:
   ```json
   "android": {
     "package": "com.yourname.jamatcall",
     "adaptiveIcon": { ... }
   }
   ```
   Write down this package name — you'll use it in the key restrictions.

2. Add the `react-native-maps` config plugin with your key. Two equivalent
   ways:

   **Option B1 — direct string (simplest):**
   ```json
   "plugins": [
     [
       "react-native-maps",
       { "androidGoogleMapsApiKey": "AIzaSy..." }
     ]
   ]
   ```

   **Option B2 — env var via app.config.js (recommended for git safety):**
   Create `frontend/app.config.js`:
   ```js
   export default ({ config }) => ({
     ...config,
     plugins: [
       ...(config.plugins ?? []),
       [
         'react-native-maps',
         { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY },
       ],
     ],
   });
   ```
   And put the key in `frontend/.env`:
   ```
   GOOGLE_MAPS_API_KEY=AIzaSy...
   ```
   > Do **not** write the literal string `"process.env.GOOGLE_MAPS_API_KEY"` in
   > `app.json` — it gets embedded verbatim and produces a blank map.

3. Set the provider explicitly in the map component. In
   `frontend/src/components/ExploreMap.tsx`, use Google on Android/iOS:
   ```tsx
   import { PROVIDER_GOOGLE } from 'react-native-maps';
   // ...
   <MapView provider={PROVIDER_GOOGLE} ...>
   ```
   (The minimal test screen `frontend/src/app/(tabs)/map.tsx` should get the
   same provider.)

4. Make sure `expo-location` permission is declared. Add the plugin in
   `app.json` if not present:
   ```json
   "plugins": [
     ["expo-location", { "locationWhenInUsePermission": "Allow Jamatcall to use your location." }]
   ]
   ```

---

## Part C — Get the SHA-1 fingerprints (for key restriction)

Different build paths use different signing keys. Restrict the Google key to
the ones you actually build with.

**Debug builds (during development):**
```
cd frontend
npx expo prebuild --platform android   # generates android/ (once)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -storepass android -keypass android | grep SHA1
```

**EAS Build (cloud builds):**
```
cd frontend
npx eas credentials   # follow prompts to create a keystore
npx eas build:inspect  # or read the SHA-1 it prints
```

**Google Play release (production):**
- Play Console → your app → **Release** → **Setup** → **App integrity** →
  **App signing** → copy the **SHA-1 certificate fingerprint**.
- Use this Play App Signing SHA-1 in the key restrictions (NOT the upload key).

Add each SHA-1 to the API key's **Android apps** restriction together with the
package name.

---

## Part D — Build a development build (replaces Expo Go)

Expo Go cannot use a custom Google key, so install a dev client:

1. Install the dev client package (if not present):
   ```
   cd frontend
   npx expo install expo-dev-client
   ```
2. Build it. Either **cloud (EAS)**:
   ```
   npx eas build --platform android --profile development
   ```
   Then scan/install the `.apk`/`.aab` on your phone.
   Or **local** (needs Android SDK + a connected device/emulator):
   ```
   npx expo run:android
   ```
3. Launch the app from the dev client (it's a full app, not Expo Go). Metro
   still hot-reloads over LAN.

> On the first build, EAS will ask you to create an Android keystore. Keep the
> credentials safe — you'll need them for every future build.

---

## Part E — Verify

1. With the dev build installed, open the **Map** tab
   (`frontend/src/app/(tabs)/map.tsx`).
2. Grant location permission. You should see your location as a **circle**
   (`<Circle>`) + a marker, over real Google tiles.
3. Open **Explore** — nearby Jama'ahs should now show as markers on the map.
4. Check the backend logs / debug panel: it should still report
   `permission: granted` and `loaded N jamaah(s)`.

---

## Production checklist (before publishing)

- [ ] Google Cloud billing enabled (map-only stays $0).
- [ ] Maps SDK for Android enabled.
- [ ] API key restricted to your package + the **Play App Signing SHA-1**.
- [ ] Package name set in `app.json` (`android.package`).
- [ ] `provider={PROVIDER_GOOGLE}` set on the map.
- [ ] Real key in `app.json` or via `app.config.js` + `.env` (never a literal
      `process.env.X`).
- [ ] Do **not** call Google paid APIs (Geocoding/Directions/Places) server-side
      for nearby search — filter by distance yourself (the app already does a
      `lat/lng/radius` query) to stay at $0.

---

## Troubleshooting

- **Still grey after adding key + dev build:** the key isn't being read.
  Rebuild clean (uninstall + reinstall). Verify the key in the generated
  `android/app/src/main/AndroidManifest.xml` under
  `com.google.android.geo.API_KEY`.
- **Key works in debug but not release:** the release uses the Play App Signing
  SHA-1, which differs from the debug/upload keystore. Add that SHA-1 to the
  key restriction.
- **"This API key is not authorized for this project/app" error:** package name
  or SHA-1 mismatch in the restriction. Double-check both.
- **On iOS it's still blank:** make sure `provider={PROVIDER_GOOGLE}` is set
  (otherwise iOS uses Apple Maps, which is fine — blank usually means the key is
  restricted to Android only).