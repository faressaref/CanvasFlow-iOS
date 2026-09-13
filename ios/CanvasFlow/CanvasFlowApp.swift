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
        webView.load(URLRequest(url: URL(string: "https://canvasios.vercel.app")!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
