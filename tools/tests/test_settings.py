import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase

ROOT = Path(__file__).resolve().parents[2]


def load_settings(**env) -> subprocess.CompletedProcess:
    """Import the settings in a fresh interpreter with only the given environment."""
    clean = {k: v for k, v in os.environ.items() if not k.startswith(("DJANGO_", "VERCEL"))}
    return subprocess.run(
        [sys.executable, "-c", "import tidytext.settings as s; print(len(s.SECRET_KEY))"],
        cwd=ROOT,
        env={**clean, **env},
        capture_output=True,
        text=True,
        check=False,
    )


class SecretKeyTests(SimpleTestCase):
    def test_production_refuses_to_start_without_a_key(self):
        result = load_settings(DJANGO_DEBUG="0")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY is not set", result.stderr)

    def test_vercel_production_refuses_to_start_without_a_key(self):
        result = load_settings(DJANGO_DEBUG="0", VERCEL="1", VERCEL_ENV="production")
        self.assertNotEqual(result.returncode, 0)

    def test_vercel_previews_start_without_a_key(self):
        result = load_settings(DJANGO_DEBUG="0", VERCEL="1", VERCEL_ENV="preview")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertGreaterEqual(int(result.stdout), 50)
