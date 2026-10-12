# Daily Tasks

Simple daily task app with carry-forward, routines and a calendar overview. See `SPEC.md` for the full Phase 1 behaviour.

## Run it on your phone (one-time setup)

1. Install **Node.js LTS** on your PC from nodejs.org (Next, Next, Finish).
2. Install **Expo Go** on your Android phone from the Play Store.
3. Unzip this folder, for example to `Documents\daily-tasks`.
4. Open the folder in File Explorer, click the address bar, type `cmd` and press Enter. A terminal opens in that folder.
5. Run these two commands:

```
npm install
npx expo start
```

6. A QR code appears. Open **Expo Go** on your phone and tap **Scan QR code**. Phone and PC must be on the same Wi-Fi.

If the phone can't connect (office Wi-Fi often blocks it), stop with Ctrl+C and run `npx expo start --tunnel` instead.

Next time you only need step 4 and `npx expo start`.

## Get a real installable APK (when you're happy with it)

```
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

This builds in Expo's cloud (free account) and gives you a download link for the APK. Install it on your phone and it works without the PC or Expo Go. Daily reminders are most reliable in the APK version.

## Notes

- Data is stored only on the phone. Use Settings > Export backup now and then.
- Data in Expo Go and in the installed APK are separate. Export a backup from one and import it into the other.
