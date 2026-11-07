package org.sarflow.preview;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.*;

/** Online preview shell. No native JavaScript bridge, credentials or local-file access. */
public final class MainActivity extends Activity {
  private static final String SITE = "https://sarflow-one.vercel.app/";
  private WebView web;
  private TextView status;
  private void external(Uri uri) {
    if (!"https".equals(uri.getScheme())) return;
    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
    catch (android.content.ActivityNotFoundException e) { status.setText("No browser available to open this link."); }
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
    layout.setOnApplyWindowInsetsListener((v, insets) -> {
      v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()); return insets;
    });
    status = new TextView(this); status.setText("SARFlow Preview · Internet required"); status.setPadding(20, 12, 20, 12); layout.addView(status);
    LinearLayout actions = new LinearLayout(this);
    Button retry = new Button(this); retry.setText("Reload"); retry.setOnClickListener(v -> web.loadUrl(SITE)); actions.addView(retry);
    Button browser = new Button(this); browser.setText("Open in browser / export"); browser.setOnClickListener(v -> external(Uri.parse(web.getUrl() == null ? SITE : web.getUrl()))); actions.addView(browser); layout.addView(actions);
    web = new WebView(this); web.getSettings().setJavaScriptEnabled(true); web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false); web.getSettings().setAllowContentAccess(false);
    web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if ("https".equals(uri.getScheme()) && "sarflow-one.vercel.app".equals(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443)) return false;
        external(uri); return true;
      }
      @Override public void onPageFinished(WebView view, String url) { if (view.getProgress() == 100) status.setText("SARFlow Preview · Hosted website"); }
      @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if(request.isForMainFrame()) status.setText("Could not connect. Check internet, then tap Reload.");
      }
    });
    web.setDownloadListener((url, agent, disposition, mime, size) -> { status.setText("Use Open in browser / export to download evidence."); });
    layout.addView(web, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(layout); web.loadUrl(SITE);
  }
  @Override public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
  @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
