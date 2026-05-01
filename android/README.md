# Within Reach Android wrapper

This is a small native Android shell for Within Reach. It keeps the product UI in the existing web app, but moves Android notifications to Firebase Cloud Messaging so `Can you talk?` no longer depends on Chrome web push.

## What the wrapper owns

- A WebView pointed at `https://kept.satori-ux.com/`.
- A tiny JavaScript bridge named `WithinReachAndroid`.
- FCM token retrieval and notification permission prompts.
- Two notification channels:
  - `Gentle check-ins`
  - `Can you talk?`
- Native notification icon, color, and tap handling.

The backend still owns identity, urgent signal validity, and all writes.

## Firebase setup

1. Create a Firebase Android app with package name `com.satori.withinreach`.
2. Download `google-services.json`.
3. Put it at `android/app/google-services.json`.
4. Add these Supabase Edge Function secrets from a Firebase service account:

```powershell
npx.cmd supabase secrets set FIREBASE_PROJECT_ID="your-firebase-project-id"
npx.cmd supabase secrets set FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
npx.cmd supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Build

Open `android/` in Android Studio, sync Gradle, then run the `app` target on the recipient's Android device.

To point at a different deployment:

```powershell
.\gradlew.bat :app:assembleDebug -PwithinReachAppUrl=https://your-domain.example/
```

## Notification assets

The launcher icon is `app/src/main/res/drawable/ic_launcher_foreground.xml`.
The notification tray icon is `app/src/main/res/drawable/ic_notification.xml`.
Android notification tray icons are treated as monochrome masks, so keep the small icon simple and solid.
