# Android preview

The Android preview is generated from the Expo project with `expo prebuild` and built as a real debug APK.

The Expo SDK 52 / React Native 0.76 toolchain requires Kotlin 1.9.25 for the Compose compiler used by `expo-modules-core`. The repository pins the Kotlin Gradle plugin during prebuild through `plugins/with-android-kotlin-version.js` so generated native projects use the same toolchain rather than relying on CI-time dependency rewriting.

Preview artifacts are published as GitHub prereleases with a SHA-256 checksum. They are debug/sideloadable builds and are not production-signed Play Store artifacts.
