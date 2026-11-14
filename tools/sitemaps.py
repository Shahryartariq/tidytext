from django.conf import settings
from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from tools.catalog import TOOLS


class PageSitemap(Sitemap):
    changefreq = "monthly"

    @property
    def protocol(self):
        return "http" if settings.DEBUG else "https"

    def get_domain(self, site=None):
        # List the public address (SITE_URL), whichever host the sitemap was fetched from.
        if settings.SITE_URL:
            return settings.SITE_URL.split("://", 1)[-1].split("/", 1)[0]
        return super().get_domain(site)

    def items(self):
        return (
            [("home", None, 1.0)]
            + [("tool", t.slug, 0.8) for t in TOOLS]
            + [
                ("about", None, 0.3),
                ("privacy", None, 0.3),
            ]
        )

    def location(self, item):
        name, slug, _ = item
        return reverse(name, args=[slug]) if slug else reverse(name)

    def priority(self, item):
        return item[2]


SITEMAPS = {"pages": PageSitemap}
