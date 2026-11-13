package org.sarflow.preview;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.http.SslError;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

/** Native phone navigation around the existing hosted scientific tools; no native JS bridge. */
public final class MainActivity extends Activity {
  private final Handler handler = new Handler(Looper.getMainLooper());
  private FrameLayout content;
  private PhoneHome home;
  private WebView web;
  private LinearLayout message;
  private TextView messageTitle, messageBody, retry, title, back;
  private ProgressBar progress, spinner;
  private final TextView[] tabs = new TextView[4];
  private String currentUrl = AppLinks.HOME;
  private boolean showingHome = true;
  private boolean loadFailed;
  private boolean loading;
  private int generation;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
    else getWindow().getDecorView().setSystemUiVisibility(
        getWindow().getDecorView().getSystemUiVisibility()
        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(PhoneHome.BACKGROUND);
    root.setOnApplyWindowInsetsListener((v, insets) -> {
      v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
          insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
      return insets;
    });
    LinearLayout bar = new LinearLayout(this);
    bar.setGravity(Gravity.CENTER_VERTICAL);
    bar.setPadding(dp(8), 0, dp(8), 0);
    back = label("‹", 32, PhoneHome.INK);
    back.setGravity(Gravity.CENTER);
    back.setContentDescription("Go back");
    back.setOnClickListener(v -> handleBack());
    bar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(56)));
    title = label("SARFlow", 21, PhoneHome.INK);
    title.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
    bar.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
    TextView menu = label("⋮", 26, PhoneHome.INK);
    menu.setGravity(Gravity.CENTER);
    menu.setContentDescription("App options");
    menu.setOnClickListener(this::options);
    bar.addView(menu, new LinearLayout.LayoutParams(dp(48), dp(56)));
    root.addView(bar);
    progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
    progress.setProgressTintList(android.content.res.ColorStateList.valueOf(PhoneHome.TEAL));
    progress.setVisibility(View.INVISIBLE);
    root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
    content = new FrameLayout(this);
    root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
    home = new PhoneHome(this, this::open);
    content.addView(home, new FrameLayout.LayoutParams(-1, -1));
    createMessage();
    root.addView(bottomBar());
    setContentView(root);
    if (Build.VERSION.SDK_INT >= 33)
      getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::handleBack);
    showHome();
    if (state != null && !state.getBoolean("home", true)) {
      String saved = state.getString("url");
      if (AppLinks.internal(saved) && !AppLinks.requiresBrowser(saved)) load(saved);
    }
  }

  private View bottomBar() {
    LinearLayout row = new LinearLayout(this);
    row.setPadding(dp(8), dp(8), dp(8), dp(8));
    row.setBackgroundColor(Color.WHITE);
    row.setElevation(dp(8));
    String[] names = {"Home", "Explore", "Learn", "Account ↗"};
    for (int i = 0; i < names.length; i++) {
      final int tab = i;
      TextView item = label(names[i], 13, PhoneHome.MUTED);
      item.setGravity(Gravity.CENTER);
      item.setMinHeight(dp(48));
      item.setPadding(dp(2), dp(12), dp(2), dp(12));
      item.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
      item.setFocusable(true);
      item.setBackground(round(Color.WHITE, 12));
      item.setOnClickListener(v -> {
        if (tab == 0) showHome();
        else if (tab == 1) open("/my-area");
        else if (tab == 2) open("/getting-started");
        else external(AppLinks.HOME + "account");
      });
      if (i == 3) item.setContentDescription("Account, opens in browser for sign-in");
      tabs[i] = item;
      row.addView(item, new LinearLayout.LayoutParams(0, -2, 1));
    }
    return row;
  }

  private void selectTab(int index) {
    for (int i = 0; i < tabs.length; i++) {
      boolean active = i == index;
      tabs[i].setSelected(active);
      tabs[i].setTextColor(active ? PhoneHome.TEAL : PhoneHome.MUTED);
      tabs[i].setBackground(round(active ? 0xffe2f0f2 : Color.WHITE, 12));
    }
  }

  private void createMessage() {
    message = new LinearLayout(this);
    message.setOrientation(1);
    message.setGravity(Gravity.CENTER);
    message.setPadding(dp(28), dp(30), dp(28), dp(30));
    message.setBackgroundColor(PhoneHome.BACKGROUND);
    spinner = new ProgressBar(this);
    message.addView(spinner, new LinearLayout.LayoutParams(dp(36), dp(36)));
    messageTitle = label("Opening workspace", 22, PhoneHome.INK);
    messageTitle.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2); p.topMargin = dp(22);
    message.addView(messageTitle, p);
    messageBody = label("Connecting to SARFlow…", 15, PhoneHome.MUTED);
    messageBody.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-1, -2); bp.topMargin = dp(12);
    message.addView(messageBody, bp);
    retry = label("Try again", 16, Color.WHITE);
    retry.setGravity(Gravity.CENTER);
    retry.setBackground(round(PhoneHome.TEAL, 14));
    retry.setOnClickListener(v -> load(currentUrl));
    LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, dp(52)); rp.topMargin = dp(24);
    message.addView(retry, rp);
    TextView browser = label("Open this page in your browser ↗", 14, PhoneHome.TEAL);
    browser.setGravity(Gravity.CENTER); browser.setMinHeight(dp(52));
    browser.setOnClickListener(v -> external(currentUrl));
    message.addView(browser, new LinearLayout.LayoutParams(-1, dp(52)));
    message.setVisibility(View.GONE);
    content.addView(message, new FrameLayout.LayoutParams(-1, -1));
  }

  private void ensureWeb() {
    if (web != null) return;
    web = new WebView(this);
    web.setBackgroundColor(PhoneHome.BACKGROUND);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setUserAgentString(settings.getUserAgentString() + " SARFlowAndroid/0.2");
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onProgressChanged(WebView view, int value) {
        if (!showingHome && loading) progress.setProgress(value);
      }
    });
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        if (!request.isForMainFrame()) return !AppLinks.internal(url);
        if (AppLinks.internal(url) && !AppLinks.requiresBrowser(url)) return false;
        if (request.hasGesture() && AppLinks.external(url)) external(url);
        return true;
      }
      @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
        if (!AppLinks.internal(url)) { view.stopLoading(); showError("This address cannot open inside SARFlow."); return; }
        currentUrl = url;
        beginLoading();
      }
      @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
        if (AppLinks.internal(url) && !AppLinks.requiresBrowser(url)) {
          currentUrl = url;
          if (!showingHome) updateDestination();
        }
      }
      @Override public void onPageFinished(WebView view, String url) {
        if (showingHome || loadFailed || !AppLinks.internal(url) || !url.equals(currentUrl)) return;
        loading = false;
        progress.setVisibility(View.INVISIBLE);
        message.setVisibility(View.GONE);
        view.setVisibility(View.VISIBLE);
        // Keep one phone navigation surface. The website's scientific content and map credits remain intact.
        view.evaluateJavascript("(function(){if(!document.getElementById('sarflow-phone-shell')){var s=document.createElement('style');s.id='sarflow-phone-shell';s.textContent='.phone-nav,.site-header,.workspace-nav,footer{display:none!important}body{padding-bottom:0!important}';document.head.appendChild(s);}})()", null);
      }
      @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request.isForMainFrame()) showError("We could not reach this workspace. Check your connection and try again. Your home screen is still available.");
      }
      @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
        if (request.isForMainFrame() && response.getStatusCode() >= 400)
          showError("The workspace returned an error. Try again, or open the page in your browser.");
      }
      @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
        ssl.cancel();
        showError("A secure connection could not be verified. Try again later or check your connection.");
      }
      @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        content.removeView(view); view.destroy(); web = null;
        showError("The web view stopped. Tap Try again to reopen this workspace."); return true;
      }
    });
    web.setDownloadListener((url, agent, disposition, mime, size) -> {
      if (AppLinks.external(url)) external(url);
      else {
        Toast.makeText(this, "Open this page in your browser to export files.", Toast.LENGTH_LONG).show();
        external(currentUrl);
      }
    });
    content.addView(web, 0, new FrameLayout.LayoutParams(-1, -1));
  }

  private void beginLoading() {
    loading = true; loadFailed = false; int request = ++generation;
    if (showingHome) return;
    progress.setProgress(0); progress.setVisibility(View.VISIBLE);
    messageTitle.setText("Opening workspace");
    messageBody.setText("Satellite tools need an internet connection. This may take a moment.");
    spinner.setVisibility(View.VISIBLE); retry.setVisibility(View.GONE);
    message.setVisibility(View.VISIBLE); message.bringToFront();
    handler.postDelayed(() -> {
      if (loading && !showingHome && generation == request) {
        if (web != null) web.stopLoading();
        showError("This is taking longer than expected. Try again or use your browser.");
      }
    }, 20000);
  }

  private void showError(String text) {
    loading = false; loadFailed = true;
    if (showingHome) return;
    progress.setVisibility(View.INVISIBLE);
    messageTitle.setText("Let's reconnect"); messageBody.setText(text);
    spinner.setVisibility(View.GONE); retry.setVisibility(View.VISIBLE);
    message.setVisibility(View.VISIBLE); message.bringToFront();
  }

  private void open(String path) { load(AppLinks.HOME + (path.startsWith("/") ? path.substring(1) : path)); }

  private void load(String url) {
    if (!AppLinks.internal(url) || AppLinks.requiresBrowser(url)) { external(url); return; }
    showingHome = false;
    home.setVisibility(View.GONE); back.setVisibility(View.VISIBLE);
    currentUrl = url;
    try { ensureWeb(); }
    catch (RuntimeException error) {
      showError("Android System WebView is unavailable. Update it on your device, or use the browser.");
      return;
    }
    web.setVisibility(View.INVISIBLE);
    updateDestination();
    beginLoading(); web.loadUrl(url);
  }

  private void updateDestination() {
    String path = Uri.parse(currentUrl).getPath();
    boolean learn = "/getting-started".equals(path);
    title.setText(learn ? "Learn radar" : "/my-area".equals(path) ? "Explore a place" : "SARFlow");
    selectTab(learn ? 2 : 1);
  }

  private void showHome() {
    showingHome = true; loading = false; ++generation;
    if (web != null) { web.stopLoading(); web.setVisibility(View.GONE); }
    message.setVisibility(View.GONE); progress.setVisibility(View.INVISIBLE);
    home.setVisibility(View.VISIBLE); home.bringToFront();
    title.setText("SARFlow"); back.setVisibility(View.INVISIBLE); selectTab(0);
  }

  private void handleBack() {
    if (showingHome) { finish(); return; }
    if (web != null && web.canGoBack()) { loadFailed = false; web.goBack(); }
    else showHome();
  }

  private void external(String url) {
    if (!AppLinks.external(url)) return;
    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
    catch (ActivityNotFoundException error) { Toast.makeText(this, "No browser is available for this link.", Toast.LENGTH_LONG).show(); }
  }

  private void options(View anchor) {
    PopupMenu menu = new PopupMenu(this, anchor);
    menu.getMenu().add("Home");
    if (!showingHome) { menu.getMenu().add("Reload this page"); menu.getMenu().add("Open in browser / export"); }
    menu.getMenu().add("All topics"); menu.getMenu().add("About this app");
    menu.setOnMenuItemClickListener(item -> {
      String action = item.getTitle().toString();
      if (action.equals("Home")) showHome();
      else if (action.equals("Reload this page")) load(currentUrl);
      else if (action.equals("Open in browser / export")) external(currentUrl);
      else if (action.equals("All topics")) open("/phenomena");
      else new AlertDialog.Builder(this).setTitle("SARFlow · Android preview 0.2")
          .setMessage("A native phone home screen with online Earth-observation tools. Satellite data and processing require internet. Account sign-in and evidence exports use your browser.\n\nDevelopment-signed preview; not a Play Store release. Not an emergency-warning service.")
          .setPositiveButton("Close", null).show();
      return true;
    });
    menu.show();
  }

  @Override public void onBackPressed() { handleBack(); }
  @Override protected void onSaveInstanceState(Bundle state) {
    super.onSaveInstanceState(state); state.putBoolean("home", showingHome); state.putString("url", currentUrl);
  }
  @Override protected void onDestroy() {
    handler.removeCallbacksAndMessages(null);
    if (web != null) { content.removeView(web); web.destroy(); }
    super.onDestroy();
  }
  private TextView label(String value, float size, int color) {
    TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); return t;
  }
  private android.graphics.drawable.GradientDrawable round(int color, int radius) {
    android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
  }
  private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
