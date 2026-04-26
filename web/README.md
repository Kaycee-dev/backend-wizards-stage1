# Insighta Web Portal

Next.js web portal for Insighta Labs+ Stage 3.

Required environment:

```bash
BACKEND_API_URL=https://<backend-host>
NEXT_PUBLIC_WEB_APP_URL=https://<web-host>
SESSION_COOKIE_SECURE=true
CSRF_SECRET=<random-secret>
```

The portal uses GitHub OAuth through the backend, stores app tokens in
HTTP-only cookies, and sends authenticated server-side requests to the shared
backend API with `X-API-Version: 1`.
