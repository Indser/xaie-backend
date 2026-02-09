# Backend

Backend for XAIE Chat Application.

## 🚀 One-Click update (Automatic)
I have created a script that handles everything for you (building, moving APK, and updating version).

1. Open PowerShell.
2. Run: `./deploy_update.ps1`
3. Follow the prompts (enter version, build number, and notes).

## 🛠 Manual Updates
Whenever you have a new version manually:

1. Build your APK: `flutter build apk --release`.
2. Upload the APK to `backend/uploads/apks/xaie-latest.apk`.
3. Update the values in `backend/src/controllers/update.controller.js` to match your new version and build number.
