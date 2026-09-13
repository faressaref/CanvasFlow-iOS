# CanvasFlow + Capacitor

This package wraps the current CanvasFlow web app in Capacitor for a cloud iOS build.

## Windows
1. Extract this folder.
2. Run `setup-capacitor.bat` once.
3. Push the whole folder to GitHub.

Do not expect an `ios` folder to be generated on Windows. Codemagic creates the iOS project on macOS with `npx cap add ios`.

## Codemagic
The included `codemagic.yaml`:
- installs dependencies with `npm ci`
- creates a fresh Capacitor iOS project
- syncs `www/index.html`
- verifies the bundle ID and display name
- archives with Xcode
- packages the Xcode app bundle into `CanvasFlow.ipa`

Bundle ID: `com.canvasflow.study`
Display name: `CanvasFlow`

The resulting IPA is intentionally unsigned. It is intended to be signed with your own signing/provisioning method (for example KSign) before installation on an iPhone.
