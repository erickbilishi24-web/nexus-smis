# NEXUS Software Android release

`NEXUS-Software-Android.apk` is rebuilt from the supplied `app-debug.apk` WebView wrapper and keeps package `ke.nexus.smis`, launcher activity `ke.nexus.smis.MainActivity`, and the existing NEXUS website URL. It includes:

- NEXUS Software Education Badge as the phone launcher and Android 12+ splash icon.
- A centered native NEXUS logo splash screen for Android API 24–30.
- NEXUS Software application label and white branded launch background.
- Zip alignment and v2/v3 debug signing for installation/testing.

The APK is a WebView wrapper; the live NEXUS web interface supplies the in-app screens and branding. For production distribution, sign with the product keystore rather than the embedded debug certificate.
