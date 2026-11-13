package org.sarflow.preview;

public final class AppLinksTest {
  private static void check(boolean result, String message) {
    if (!result) throw new AssertionError(message);
  }
  public static void main(String[] args) {
    check(AppLinks.internal(AppLinks.HOME), "primary site stays inside the app");
    check(AppLinks.internal("https://sarflow-earth-rbhr.vercel.app/world?lat=28&lon=85.3"), "backup alias stays inside");
    check(!AppLinks.internal("http://sarflow-earth-rbhr.vercel.app/"), "HTTP is blocked");
    check(!AppLinks.internal("https://sarflow-earth-rbhr.vercel.app.evil.example/"), "host suffix spoof is not trusted");
    check(!AppLinks.internal("https://person@sarflow-earth-rbhr.vercel.app/"), "userinfo is rejected");
    check(!AppLinks.internal("https://sarflow-earth-rbhr.vercel.app:8443/"), "unexpected ports are rejected");
    check(!AppLinks.external("javascript:alert(1)"), "script URLs cannot launch");
    check(!AppLinks.external("file:///etc/passwd"), "file URLs cannot launch");
    check(!AppLinks.external("intent://settings"), "intent URLs cannot launch");
    check(!AppLinks.external("https://user:secret@example.com/"), "credential-bearing URL is rejected");
    check(!AppLinks.external("https://example.com/\n"), "control characters are rejected");
    check(AppLinks.external("https://science.nasa.gov/mission/nisar/"), "source links can use browser");
    check(AppLinks.requiresBrowser(AppLinks.HOME + "auth/signin/google"), "OAuth starts in browser");
    check(AppLinks.requiresBrowser(AppLinks.HOME + "api/auth/signin/google"), "API OAuth starts in browser");
    check(AppLinks.requiresBrowser(AppLinks.HOME + "downloads/sarflow-preview.apk"), "APK download uses browser");
    check(!AppLinks.requiresBrowser(AppLinks.HOME + "observatory"), "observation workspace remains embedded");
    check(!AppLinks.requiresBrowser(AppLinks.HOME + "author-guide"), "similar route prefix is not OAuth");
    check(!AppLinks.internal(null), "missing URL is rejected");
    System.out.println("18 Android navigation checks passed");
  }
}
