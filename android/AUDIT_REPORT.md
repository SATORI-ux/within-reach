# Within Reach Android Audit Report

## Requested checks

### 1. Secret page memories image uploader
Confirmed in the Android wrapper code.

`MainActivity.kt` still installs a `WebChromeClient` and overrides `onShowFileChooser(...)`. It stores the `ValueCallback<Array<Uri>>`, launches Android's system file chooser through `ActivityResultContracts.StartActivityForResult()`, parses the selected file URI through `WebChromeClient.FileChooserParams.parseResult(...)`, and returns the result to the WebView.

This is the Android-side support needed for a web `<input type="file">` image uploader inside the WebView, including the secret page memories uploader if that uploader is present in the hosted web app.

Scope note: this confirms the native Android WebView/file-picker bridge is present. The actual memories upload UI and Supabase/storage behavior live in the hosted web app/backend, not in this Android wrapper folder.

### 2. App icon replacement
Updated the Android launcher icon resources from `WRicon.png`.

Updated files:
- `app/src/main/res/drawable/ic_launcher_art.png` — 432x432, RGBA, transparent corners preserved
- `app/src/main/res/mipmap-mdpi/ic_launcher.png` — 48x48, RGBA
- `app/src/main/res/mipmap-hdpi/ic_launcher.png` — 72x72, RGBA
- `app/src/main/res/mipmap-xhdpi/ic_launcher.png` — 96x96, RGBA
- `app/src/main/res/mipmap-xxhdpi/ic_launcher.png` — 144x144, RGBA
- `app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` — 192x192, RGBA
- `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` — now uses a transparent adaptive icon background and the new `ic_launcher_art.png`
- `app/src/main/res/values/colors.xml` — added `icon_adaptive_background` as transparent

Removed stale unused old-icon file:
- `app/src/main/res/drawable/ic_launcher_foreground.xml`

Generated build outputs were removed from the updated source package so an old debug APK cannot be accidentally shared.
