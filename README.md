# CanvasFlow Capacitor V4

This version fixes the Codemagic dependency-install failure by using `npm install` instead of `npm ci`. Codemagic documents that `npm ci` requires an existing `package-lock.json`/shrinkwrap, while `npm install` is the normal dependency step for Capacitor projects.

## Build flow

1. `npm install --no-audit --no-fund`
2. `npx cap add ios`
3. `npx cap sync ios`
4. Xcode archive (unsigned)
5. Package `CanvasFlow.ipa`

The IPA is intentionally unsigned so it can be processed by your own signing tool.
