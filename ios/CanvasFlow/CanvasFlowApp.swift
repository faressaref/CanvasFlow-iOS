import SwiftUI
import WebKit

@main
struct CanvasFlowApp: App {
    var body: some Scene {
        WindowGroup {
            CanvasFlowWebView()
                .ignoresSafeArea()
        }
    }
}

struct CanvasFlowWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Always fetch the current Vercel web app instead of reusing an older WebView cache.
        let url = URL(string: "https://canvasios.vercel.app/?appbuild=ai-20260914-1")!
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
