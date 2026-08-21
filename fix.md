The crash occurs because the development build APK installed on your Android device/emulator was compiled without a Google Maps API Key in its native AndroidManifest.xml file.

Because react-native-maps uses the native Google Maps SDK on Android, the API key must be compiled directly into the binary's manifest; it cannot be injected dynamically at runtime via JavaScript.

What has been done:
Verified that the API key AIzaSyCtSTpepvaDYjlUlepuCv3hv1fa_1tIuNc is defined in 
frontend/.env
.
Verified that 
app.config.js
 is correctly passing the key to the react-native-maps plugin.
Generated the native android folder by running npx expo prebuild --platform android --no-install.
Checked the generated 
AndroidManifest.xml
 and confirmed the key is now correctly injected:
xml


<meta-data android:name="com.google.android.geo.API_KEY" android:value="AIzaSyCtSTpepvaDYjlUlepuCv3hv1fa_1tIuNc"/>
How to resolve:
To package this manifest update into the app and stop the crash, you need to rebuild and install the new native development binary.

Run the following command from the root of your project:

bash


cd frontend
npx expo run:android
(Note: If you are using EAS to build your development client, trigger a new EAS build using npx eas build --platform android --profile development and install the resulting APK.)

