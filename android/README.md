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

For a private sideloaded build that opens directly through a recipient tile key, create `android/local.properties` and add:

```properties
withinReachStartUrl=https://kept.satori-ux.com/?key=REPLACE_WITH_RECIPIENT_TILE_KEY
```

`local.properties` is ignored by git. This is convenient for a private APK, but remember that a baked-in key is not a strong secret if the APK is shared or decompiled.

To point at a different deployment:

```powershell
.\gradlew.bat :app:assembleDebug -PwithinReachAppUrl=https://your-domain.example/
```

You can also pass the private start URL only for one build:

```powershell
.\gradlew.bat :app:assembleDebug -PwithinReachStartUrl="https://kept.satori-ux.com/?key=REPLACE_WITH_RECIPIENT_TILE_KEY"
```

## Notification assets

The launcher icon art is `app/src/main/res/drawable/ic_launcher_art.png`.
The notification tray icon is `app/src/main/res/drawable/ic_notification.xml`.
Android notification tray icons are treated as monochrome masks, so keep the small icon simple and solid.
