from django.conf import settings

PERMISSIONS_POLICY = ", ".join(
    f"{feature}=()"
    for feature in (
        "accelerometer",
        "camera",
        "geolocation",
        "gyroscope",
        "magnetometer",
        "microphone",
        "payment",
        "usb",
        "interest-cohort",
        "browsing-topics",
    )
)


class SiteURLMiddleware:
    """
    Sets request.site_url: the public base URL for canonical links and the sitemap.

    When SITE_URL is set, every other host the app answers on (Vercel's per-deploy and
    per-branch addresses) is marked noindex, so search engines only list the real address.
    """

    LOCAL_HOSTS = ("localhost", "127.0.0.1")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.site_url = settings.SITE_URL or f"{request.scheme}://{request.get_host()}"
        response = self.get_response(request)
        site_host = settings.SITE_URL.split("://", 1)[-1].split("/", 1)[0].lower()
        host = request.get_host().split(":", 1)[0].lower()
        if site_host and host != site_host and host not in self.LOCAL_HOSTS:
            response.setdefault("X-Robots-Tag", "noindex")
        return response


class SecurityHeadersMiddleware:
    """Adds the security headers Django doesn't set by itself."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        response.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        response.setdefault("X-Permitted-Cross-Domain-Policies", "none")
        return response


class CacheControlMiddleware:
    """
    Lets the CDN cache every page. Pages are identical for every visitor (no cookies,
    no sessions), so a cached copy is always correct. Each deploy clears the CDN cache.
    Responses that already set Cache-Control (form results, health checks) are untouched.
    """

    PAGE = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if (
            not settings.DEBUG
            and request.method in ("GET", "HEAD")
            and response.status_code in (200, 301, 404)
            and not response.has_header("Cache-Control")
        ):
            response["Cache-Control"] = self.PAGE if response.status_code != 404 else "public, max-age=300"
        return response
