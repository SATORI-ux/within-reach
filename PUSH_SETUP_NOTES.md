Push notification files added in this package:

- manifest.webmanifest
- service-worker.js
- sql/push_subscriptions.sql
- js/app.js updates for the Enable gentle notifications button
- js/api.js savePushSubscription helper
- js/config.js VAPID_PUBLIC_KEY placeholder
- index.html button + manifest meta/link
- supabase/functions/save-push-subscription/index.ts
- supabase/functions/save-push-subscription/deno.json
- assets/icons/icon-192.png
- assets/icons/icon-512.png
- .vscode/settings.json

What you still need to do:

1. Paste your real VAPID public key into js/config.js
2. Run sql/push_subscriptions.sql in the Supabase SQL editor
3. Deploy the new function:
   npx supabase functions deploy save-push-subscription --no-verify-jwt
4. Deploy the site over HTTPS and test from an installed Home Screen web app on iPhone
