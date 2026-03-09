# App Store Release Setup Guide

## Overview

Three apps, two stores:

| App | Android Package | iOS Bundle ID |
|-----|-----------------|---------------|
| **Amogha Cafe** (customer app) | `com.amoghahotels.cafe` | `com.amoghahotels.cafe` |
| **Amogha Kiosk** (self-service) | `com.amoghahotels.kiosk` | — |
| **Amogha POS** (point of sale) | `com.amoghahotels.pos` | — |

> Kiosk and POS are Android-only (tablet apps). The customer app goes to both stores.

---

## Part 1: Android (Google Play)

### Step 1: Create a release keystore

Run this once on your machine to generate the signing key:

```bash
keytool -genkeypair \
  -v \
  -keystore amogha-release.keystore \
  -alias amogha \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Amogha Hotels, OU=Mobile, O=Amogha Hotels, L=Hyderabad, ST=Telangana, C=IN"
```

**Save this keystore file and passwords somewhere safe.** If you lose it, you can never update the app on Play Store.

### Step 2: Base64-encode the keystore

```bash
base64 -i amogha-release.keystore | pbcopy
```

This copies the encoded keystore to your clipboard.

### Step 3: Create a Google Play service account

1. Go to [Google Cloud Console](https://console.cloud.google.com) → IAM → Service Accounts
2. Create a service account (e.g., `play-deploy@amogha-cafe.iam.gserviceaccount.com`)
3. Download the JSON key file
4. In [Google Play Console](https://play.google.com/console) → Setup → API access → Link the service account
5. Grant it **Release manager** permissions for all 3 apps

### Step 4: Add GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value |
|-------------|-------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore from Step 2 |
| `KEYSTORE_PASSWORD` | The store password you chose |
| `KEY_ALIAS` | `amogha` (or whatever you used) |
| `KEY_PASSWORD` | The key password you chose |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Paste the entire JSON key file content |

### Step 5: Create apps on Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create 3 apps:
   - **Amogha Cafe** (package: `com.amoghahotels.cafe`)
   - **Amogha Kiosk** (package: `com.amoghahotels.kiosk`)
   - **Amogha POS** (package: `com.amoghahotels.pos`)
3. Complete the store listings, content ratings, and pricing for each
4. For the first release of each app, you must manually upload the AAB

### Step 6: Release!

Go to GitHub → Actions → **Release Android Apps** → Run workflow:
- Select which app (`all`, `main`, `kiosk`, or `pos`)
- Select track (`internal` for testing, `production` for public release)

---

## Part 2: iOS (App Store)

### Step 1: Apple Developer Account

1. Enroll at [developer.apple.com](https://developer.apple.com/programs/) ($99/year)
2. Note your **Team ID** from the membership page

### Step 2: Create App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Users & Access → Integrations → Keys
2. Create a new key with **App Manager** role
3. Download the `.p8` file
4. Note the **Key ID** and **Issuer ID**

### Step 3: Set up fastlane match (code signing)

Create a **private** GitHub repo for certificates (e.g., `amogha-certificates`), then run:

```bash
cd ios/App
bundle install
bundle exec fastlane match init
# Choose "git" storage, enter your certificates repo URL
bundle exec fastlane match appstore
# This creates and downloads signing certificates + provisioning profiles
```

### Step 4: Add GitHub Secrets

| Secret Name | Value |
|-------------|-------|
| `APP_STORE_KEY_ID` | Key ID from Step 2 |
| `APP_STORE_ISSUER_ID` | Issuer ID from Step 2 |
| `APP_STORE_KEY_CONTENT` | Base64 of the `.p8` file: `base64 -i AuthKey_XXXXX.p8 \| pbcopy` |
| `MATCH_PASSWORD` | Password for encrypting certificates in the match repo |
| `MATCH_GIT_URL` | URL of your private certificates repo |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |

### Step 5: Create app on App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → My Apps → New App
2. Bundle ID: `com.amoghahotels.cafe`
3. Complete app information, screenshots, description

### Step 6: Release!

Go to GitHub → Actions → **Release iOS to TestFlight** → Run workflow.
The IPA will be built on a Mac runner and uploaded to TestFlight automatically.

---

## Quick Reference: All GitHub Secrets Needed

### Android (5 secrets)
- `ANDROID_KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

### iOS (5 secrets)
- `APP_STORE_KEY_ID`
- `APP_STORE_ISSUER_ID`
- `APP_STORE_KEY_CONTENT`
- `MATCH_PASSWORD`
- `MATCH_GIT_URL`

### Already configured
- `FIREBASE_TOKEN` (for web deployment)

---

## Workflow Summary

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `deploy.yml` | Push to master | Test + deploy web to Firebase |
| `build-kiosk-apk.yml` | Push (kiosk changes) | Debug APK for testing |
| `build-pos-apk.yml` | Push (pos changes) | Debug APK for testing |
| **`release-android.yml`** | Manual | Signed AAB → Google Play |
| **`release-ios.yml`** | Manual | Signed IPA → TestFlight |
