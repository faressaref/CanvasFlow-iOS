# CanvasFlow iOS IPA

This project wraps the existing CanvasFlow web app (`CanvasFlow.html`) in a native WKWebView.

## Build IPA without a Mac
1. Upload this project to GitHub.
2. Open Actions → Build CanvasFlow IPA.
3. Run the workflow manually.
4. Download the `CanvasFlow-IPA` artifact.

The generated IPA is **unsigned**. A real iPhone installation requires Apple signing/provisioning (unless you use a signing service that handles this).

The web app uses its existing HTTPS CDN/Firebase dependencies, so the device needs internet access for those services.
