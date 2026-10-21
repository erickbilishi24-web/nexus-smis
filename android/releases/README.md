# NEXUS Software Android release

`NEXUS-Software-Android.apk` is rebuilt from the supplied `app-debug.apk` wrapper and keeps package `ke.nexus.smis`, launcher activity `ke.nexus.smis.MainActivity`, and the existing WebView URL. It adds the NEXUS Software Education Badge as the application and launcher icon, updates the application label to `NEXUS Software`, and is zip-aligned and signed with a debug release certificate for installation/testing.

The APK is a WebView wrapper; the live NEXUS web interface supplies the in-app screens and branding. For a production release, sign with the product keystore rather than the embedded debug certificate.
