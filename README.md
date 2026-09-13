# CanvasFlow + Capacitor

CanvasFlow web app packaged with Capacitor for cloud iOS builds.

## Codemagic

The workflow installs dependencies with `npm install`, creates the Capacitor iOS project from the JSON config, syncs the `www` web app, archives with Xcode, and packages an unsigned IPA.

The Capacitor config is intentionally JSON (`capacitor.config.json`) so the build does not require TypeScript to load the config.
