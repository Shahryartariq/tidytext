# Security

## Reporting a problem

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/Shahryartariq/tidytext/security/advisories/new)
instead of opening a public issue. If that link doesn't work for you, open an issue that says
you have a security report, without any details, and you'll be given a private way to send it.

## How TidyText is protected

- **No stored data.** There is no database, no file uploads, no sessions and no user accounts.
  Text cleaned with JavaScript never leaves the browser. Text posted by the no-JavaScript
  fallback is processed in memory and never saved or logged (Gunicorn logs paths only).
- **No cookies, so no CSRF surface.** The CSRF middleware is intentionally not used: the only
  form is a stateless formatter with no side effects and there are no credentials for an
  attacker to ride on. This also lets the CDN cache every page safely.
- **Content-Security-Policy** with `default-src 'self'`, no inline scripts or styles,
  `frame-ancestors 'none'`, `base-uri 'none'` and `object-src 'none'`.
- **Headers:** HSTS (production), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
  `Permissions-Policy` denying camera, microphone, location and similar features.
- **Output escaping.** All user text is rendered through Django's auto-escaping or set as
  `textarea.value` in JavaScript. Structured data is JSON-encoded with `<` escaped.
- **Bounded work per request.** 200,000 characters per request, a 4 MB request body cap, and a
  1,000,000 character cap on the result of find and replace. Every pattern is written to run in
  linear time, and CI times each option against 200,000 characters of worst-case input
  (`tools/tests/test_performance.py`), so no request can tie up a server worker.
- **Secrets from the environment.** The app refuses to start in production without
  `DJANGO_SECRET_KEY`. Debug mode is off unless explicitly enabled.
- **Small attack surface.** No Django admin and three runtime dependencies. The Docker image
  runs as a non-root user on a read-only filesystem with all Linux capabilities dropped.

## Third-party code

The page itself only runs TidyText's own scripts. Two optional features load outside code:

- **Paraphrase with AI** runs in a Web Worker, only after a visitor clicks its button. The
  worker imports a pinned version of Transformers.js from jsDelivr and downloads the model from
  Hugging Face. The CSP allows jsDelivr only as a worker source, and the worker has no access
  to the page. The visitor's text is passed to the worker and processed on their device.
- **Google Analytics** loads only when `GA_MEASUREMENT_ID` is set, from a static file so the
  CSP still forbids inline scripts. It never receives the text.

## Checks in CI

Every change runs Ruff (including security rules), the Python and JavaScript test suites, the
worst-case timing tests, `pip-audit` against the runtime dependencies,
`manage.py check --deploy`, browser tests of the main user flows, and a smoke test of the
production Docker image. Workflow actions are pinned to commit SHAs, and Dependabot proposes
updates for Python packages, GitHub Actions and the Docker base image.
