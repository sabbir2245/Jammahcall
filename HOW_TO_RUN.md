# How to Run Jamatcall

## 1. Full pipeline (recommended)

Runs backend + migrations + seed data + compiles the frontend and installs it on a USB-connected Android device:

```bash
cd /home/s/aproject/Jamatcall
./ru.sh
```

What it does:
1. Applies Django migrations
2. Seeds the database (`seed_data`)
3. Starts the backend on `0.0.0.0:8000`
4. Sets up `adb reverse tcp:8000` so the phone reaches the local backend at `localhost:8000`
5. Runs `npx expo run:android` — compiles the APK, installs, and launches it on the connected phone

Stop with `Ctrl+C` (kills the backend too).

Requirements:
- Android phone connected via USB with USB debugging enabled (check with `adb devices`)
- Backend venv at `backend/venv`

## 2. Compile only (native Android build)

Useful for testing that the native build succeeds:

```bash
cd /home/s/aproject/Jamatcall/frontend/android
./gradlew app:assembleDebug --build-cache -PreactNativeArchitectures=arm64-v8a
```

## 3. Compile + install + launch via Expo CLI

```bash
cd /home/s/aproject/Jamatcall/frontend
npx expo run:android
```

## 4. Fast restarts after first successful build

Once the dev client app is installed on the phone, you don't need to recompile:

```bash
cd /home/s/aproject/Jamatcall/frontend
npx expo start --dev-client
```

Then open the dev client app on the phone — it connects to Metro and JS changes hot-reload.

## 5. Quick preview without any native build (Expo Go)

1. Install **Expo Go** from the Play Store on the phone
2. Run:
   ```bash
   cd /home/s/aproject/Jamatcall/frontend
   npx expo start
   ```
3. Phone must be on the same Wi-Fi as the computer — scan the QR code from the terminal

Note: the API URL in `frontend/.env` (`EXPO_PUBLIC_API_URL`) must point at your computer's LAN IP (e.g. `http://192.168.x.x:8000`), not localhost, when using Expo Go over Wi-Fi.

## Troubleshooting

- **Maven "Connection reset" during Gradle build** — network blocking `repo.maven.apache.org`. Retry, or add mirrors (`maven.aliyun.com`) to `frontend/android/build.gradle`.
- **"immutable workspace ... has been modified" Gradle error** — corrupted cache. Fix:
  ```bash
  cd frontend/android
  ./gradlew --stop
  rm -rf ~/.gradle/caches/9.3.1
  ```
  then rebuild.
- **Typecheck**: `cd frontend && npx tsc --noEmit`
