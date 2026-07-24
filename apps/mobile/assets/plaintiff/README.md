# Plaintiff app branding assets

Drop plaintiff-specific branding here to override the shared (attorney) assets for
the `APP_VARIANT=plaintiff` build (`ClearCaseIQ` / `com.caseiq.client`).

`app.config.js` automatically uses any file present in this folder and falls back
to `../<file>` (the shared assets) when it is missing, so partial branding is fine.

Expected files (PNG):

| File                 | Purpose                        | Recommended size |
| -------------------- | ------------------------------ | ---------------- |
| `icon.png`           | App icon (iOS + base)          | 1024×1024        |
| `splash-icon.png`    | Splash screen logo             | ~1284×2778 safe  |
| `adaptive-icon.png`  | Android adaptive icon (fg)     | 1024×1024        |

After adding files, verify with:

```bash
APP_VARIANT=plaintiff npx expo config --type public --json
```
