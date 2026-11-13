package org.sarflow.preview;

import java.net.URI;
import java.net.URISyntaxException;

/** Shared routing policy, independent of Android so it can be tested on the JVM. */
public final class AppLinks {
  public static final String HOME = "https://sarflow-one.vercel.app/";

  private AppLinks() {}

  private static URI safeUri(String value) {
    if (value == null) return null;
    try {
      URI uri = new URI(value);
      if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
          || uri.getRawUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) return null;
      return uri;
    } catch (URISyntaxException error) {
      return null;
    }
  }

  public static boolean internal(String value) {
    URI uri = safeUri(value);
    return uri != null && ("sarflow-earth-rbhr.vercel.app".equalsIgnoreCase(uri.getHost())
        || "sarflow-one.vercel.app".equalsIgnoreCase(uri.getHost()));
  }

  public static boolean external(String value) {
    return safeUri(value) != null;
  }

  public static boolean requiresBrowser(String value) {
    URI uri = safeUri(value);
    if (uri == null) return false;
    String path = uri.getPath();
    return path != null && (path.equals("/auth") || path.startsWith("/auth/")
        || path.equals("/api/auth") || path.startsWith("/api/auth/")
        || path.startsWith("/downloads/"));
  }
}
