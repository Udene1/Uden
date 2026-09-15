# Uden desktop distribution

Uden uses one native Tauri application with separate distribution channels.

## Direct download

The release pipeline produces platform-native installers that can be hosted from Uden's own download surface:

- Windows: NSIS `.exe` and MSI
- macOS: `.dmg` and `.app`
- Linux: AppImage and `.deb`

The direct-download channel is independent of any app-store review. The website should expose stable platform-aware download links only to artifacts that have passed the distribution workflow.

## Microsoft Store

Uden uses Tauri's Microsoft Store path for Win32 applications: the Store listing links to an offline NSIS installer produced by the dedicated `tauri.microsoftstore.conf.json` profile.

The Store installer must remain an offline installer and must support silent installation. The Partner Center submission is intentionally not automated in this repository until the Microsoft developer account, product name reservation, signing/distribution credentials, and listing metadata are available.

The CI pipeline builds and verifies the exact installer that will be supplied to Partner Center. No store publication is claimed by CI.

## Release policy

1. Build the native artifacts on their target operating systems.
2. Verify that the expected installer/package exists before publishing an artifact.
3. Keep direct-download artifacts and the Microsoft Store installer separate because the Store installer has different WebView2 requirements.
4. Do not advertise a platform as downloadable until its artifact has passed CI.
5. Store submission remains a release/distribution step, not a build-success claim.

## Current scope

Microsoft Edge Add-ons and Chrome Web Store distribution are intentionally out of scope for this release batch.
