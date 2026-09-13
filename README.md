# CanvasFlow Capacitor V6

This version fixes the Capacitor 8 iOS build entry point for Codemagic.

Capacitor 8 uses Swift Package Manager, so the iOS build uses `ios/App/App.xcodeproj` rather than `App.xcworkspace`.

Codemagic flow:
1. npm install
2. npx cap add ios
3. npx cap sync ios
4. Resolve Swift Package dependencies
5. Xcode archive (unsigned)
6. Package CanvasFlow.ipa

The IPA is intentionally unsigned for later signing with a compatible iOS signing tool.
