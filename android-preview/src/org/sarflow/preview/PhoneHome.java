package org.sarflow.preview;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** The launch screen is native: it remains usable before any network request succeeds. */
final class PhoneHome extends ScrollView {
  interface Open { void page(String path); }
  static final int INK = Color.rgb(17, 44, 63);
  static final int MUTED = Color.rgb(83, 108, 122);
  static final int TEAL = Color.rgb(14, 107, 123);
  static final int BACKGROUND = Color.rgb(245, 248, 250);
  private final Context context;
  private final Open open;

  PhoneHome(Context context, Open open) {
    super(context);
    this.context = context;
    this.open = open;
    setFillViewport(true);
    setBackgroundColor(BACKGROUND);
    LinearLayout page = column();
    page.setPadding(dp(20), dp(12), dp(20), dp(28));
    addView(page, new ScrollView.LayoutParams(-1, -2));
    addHero(page);
    TextView intro = text("Choose a place. Discover what satellites actually observed.", 16, MUTED, false);
    intro.setLineSpacing(dp(3), 1);
    add(page, intro, 18);
    add(page, action("Explore a place  →", "Search a city, river or coordinates", "/my-area", true), 16);
    LinearLayout tools = row();
    tools.addView(tile("NISAR Explorer", "Find dated products", "/nisar-explorer"), weighted(0, 0));
    tools.addView(tile("My evidence", "Sources and reader check", "/study"), weighted(12, 0));
    add(page, tools, 14);
    add(page, text("What interests you?", 22, INK, true), 26);
    add(page, text("Four starting points. Each shows its current capabilities.", 14, MUTED, false), 7);
    add(page, topic("Ecosystems & forests", "Landscape patterns and radar interpretation", "Learning guide", "/phenomena/forests", 0xffe7f3eb), 14);
    add(page, topic("Agriculture", "Fields, seasons and available observations", "Learning guide", "/phenomena/agriculture", 0xfff8f0df), 10);
    add(page, topic("Water & natural hazards", "River observations and the water workflow", "Analysis experimental", "/phenomena/hazards", 0xffe4f2f8), 10);
    add(page, topic("Ice & glaciers", "Polar observations and a real Arctic sample", "Observation exploration", "/phenomena/ice", 0xffebedf9), 10);
    add(page, text("New to radar?", 22, INK, true), 26);
    add(page, action("Start with the beginner guide  →", "Short explanations and the learner video", "/getting-started", false), 12);
    add(page, action("Science, sources & data  →", "Understand the measurements and their limits", "/data", false), 10);
    TextView note = text("An observation is a starting point, not proof of an event. SARFlow is for research and learning, not emergency warnings.", 13, MUTED, false);
    note.setLineSpacing(dp(3), 1);
    add(page, note, 24);
    add(page, text("Independent project · No NASA or ISRO endorsement", 11, MUTED, false), 10);
  }

  private void addHero(LinearLayout page) {
    FrameLayout hero = new FrameLayout(context);
    hero.setBackground(round(INK, 22));
    hero.setClipToOutline(true);
    ImageView image = new ImageView(context);
    image.setImageResource(R.drawable.home_radar);
    image.setScaleType(ImageView.ScaleType.CENTER_CROP);
    image.setContentDescription("NISAR radar visualization of Seattle, credited to NASA/JPL-Caltech");
    hero.addView(image, new FrameLayout.LayoutParams(-1, -1));
    View shade = new View(context);
    shade.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
        new int[] {0xee102c3f, 0x9a102c3f, 0xf2102c3f}));
    hero.addView(shade, new FrameLayout.LayoutParams(-1, -1));
    LinearLayout copy = column();
    copy.setPadding(dp(22), dp(22), dp(22), dp(18));
    copy.setMinimumHeight(dp(256));
    copy.addView(text("EXPLORE · UNDERSTAND · INVESTIGATE", 10, 0xffa8e5eb, true));
    TextView title = text("See Earth.\nFollow the evidence.", 30, Color.WHITE, true);
    title.setLineSpacing(0, 1.02f);
    add(copy, title, 14);
    TextView source = text("Seattle · NASA/JPL-Caltech\nRadar visualization, not an optical photo", 11, 0xffe3f2f4, false);
    add(copy, source, 28);
    hero.addView(copy, new FrameLayout.LayoutParams(-1, -2));
    hero.setOnClickListener(v -> open.page("/observatory?region=seattle"));
    hero.setContentDescription("Explore the Seattle radar observation. Radar visualization, not an optical photograph.");
    hero.setFocusable(true);
    page.addView(hero, new LinearLayout.LayoutParams(-1, -2));
  }

  private View topic(String title, String detail, String status, String path, int accent) {
    LinearLayout card = row();
    card.setPadding(dp(16), dp(16), dp(16), dp(16));
    card.setGravity(Gravity.CENTER_VERTICAL);
    card.setBackground(round(Color.WHITE, 16));
    TextView badge = text(title.substring(0, 1), 22, TEAL, true);
    badge.setGravity(Gravity.CENTER);
    badge.setBackground(round(accent, 14));
    card.addView(badge, new LinearLayout.LayoutParams(dp(46), dp(46)));
    LinearLayout copy = column();
    LinearLayout.LayoutParams body = new LinearLayout.LayoutParams(0, -2, 1);
    body.setMargins(dp(14), 0, dp(8), 0);
    card.addView(copy, body);
    copy.addView(text(title, 16, INK, true));
    add(copy, text(detail, 12, MUTED, false), 5);
    add(copy, text(status, 11, TEAL, true), 7);
    card.addView(text("›", 24, MUTED, false));
    clickable(card, () -> open.page(path));
    return card;
  }

  private View tile(String title, String detail, String path) {
    LinearLayout card = column();
    card.setMinimumHeight(dp(100));
    card.setPadding(dp(15), dp(17), dp(12), dp(17));
    card.setBackground(round(Color.WHITE, 16));
    card.addView(text(title, 15, INK, true));
    add(card, text(detail, 12, MUTED, false), 7);
    clickable(card, () -> open.page(path));
    return card;
  }

  private View action(String title, String detail, String path, boolean primary) {
    LinearLayout card = column();
    card.setPadding(dp(18), dp(17), dp(18), dp(17));
    card.setBackground(round(primary ? TEAL : Color.WHITE, 16));
    card.addView(text(title, 16, primary ? Color.WHITE : INK, true));
    add(card, text(detail, 12, primary ? 0xffd8eff1 : MUTED, false), 5);
    clickable(card, () -> open.page(path));
    return card;
  }

  private void clickable(View view, Runnable action) {
    view.setFocusable(true);
    view.setOnClickListener(v -> action.run());
    view.setMinimumHeight(dp(56));
    view.setElevation(dp(1));
    view.setForeground(new android.graphics.drawable.RippleDrawable(
        android.content.res.ColorStateList.valueOf(0x280e6b7b), null, round(Color.WHITE, 16)));
  }

  private LinearLayout column() { LinearLayout v = new LinearLayout(context); v.setOrientation(1); return v; }
  private LinearLayout row() { LinearLayout v = new LinearLayout(context); v.setOrientation(0); return v; }
  private TextView text(String value, float size, int color, boolean bold) {
    TextView t = new TextView(context); t.setText(value); t.setTextSize(size); t.setTextColor(color);
    t.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
    t.setIncludeFontPadding(false); return t;
  }
  private void add(LinearLayout parent, View child, int top) {
    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2); p.topMargin = dp(top); parent.addView(child, p);
  }
  private LinearLayout.LayoutParams weighted(int left, int top) {
    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1); p.setMargins(dp(left), dp(top), 0, 0); return p;
  }
  private GradientDrawable round(int color, int radius) {
    GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
  }
  private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
