# Cyberball Android TWA

This Android project wraps the production PWA at `https://ball.boyzi.fun/` as a Trusted Web Activity.

Package name:

```text
fun.boyzi.cyberball
```

Release APK signing is driven by environment variables:

```text
ANDROID_KEYSTORE_PATH
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

After creating a release keystore, add the certificate SHA-256 fingerprint to `public/.well-known/assetlinks.json` so Android can verify the TWA relationship with `ball.boyzi.fun`.
