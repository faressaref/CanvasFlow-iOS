import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        CanvasFlowWebView()
            .ignoresSafeArea()
            .preferredColorScheme(.dark)
    }
}

struct CanvasFlowWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.preferences.javaScriptEnabled = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = false
        webView.backgroundColor = .black

        if let url = Bundle.main.url(forResource: "CanvasFlow", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
