# Apple App Store Submission Guide - Amogha Cafe

## Prerequisites

Before submitting, ensure you have:

1. **Apple Developer Account** (paid, $99/year)
2. **App Store Connect** access with Admin or App Manager role
3. **App Store Connect API Key** (for Fastlane automation)
4. **Code Signing** certificates and provisioning profiles set up via `fastlane match`

---

## Step 1: App Store Connect Setup

### Create the App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** > **+** > **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: `Amogha Cafe & Restaurant`
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: `com.amoghahotels.cafe`
   - **SKU**: `amogha-cafe-ios`
   - **User Access**: Full Access

### App Information

| Field | Value |
|-------|-------|
| Name | Amogha Cafe & Restaurant |
| Subtitle | Order Food, Earn Rewards & More |
| Primary Category | Food & Drink |
| Secondary Category | Lifestyle |
| Content Rights | Yes, contains third-party content (with rights) |
| Age Rating | 4+ (no objectionable content) |

---

## Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Description |
|---|---|
| `APP_STORE_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_ISSUER_ID` | App Store Connect API Issuer ID |
| `APP_STORE_KEY_CONTENT` | Base64-encoded `.p8` API key file |
| `MATCH_PASSWORD` | Password for fastlane match encryption |
| `MATCH_GIT_URL` | Git URL for match certificates repo |

### Generating the API Key

1. Go to **App Store Connect** > **Users and Access** > **Integrations** > **App Store Connect API**
2. Click **Generate API Key**
3. Name: `Fastlane CI`
4. Access: `App Manager`
5. Download the `.p8` file
6. Base64-encode it: `base64 -i AuthKey_XXXXXXXX.p8`
7. Store as `APP_STORE_KEY_CONTENT` secret

---

## Step 3: Screenshots

Upload screenshots in App Store Connect for these device sizes:

| Device | Size (pixels) | Required |
|--------|--------------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Yes |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Optional |
| iPad Pro 12.9" (6th gen) | 2048 x 2732 | If supporting iPad |

**Recommended screenshots** (in order):
1. Menu browsing with categories
2. AR dish preview feature
3. Cart and checkout flow
4. Loyalty rewards dashboard
5. Order tracking screen
6. Voice ordering feature

---

## Step 4: App Privacy (Nutrition Labels)

In App Store Connect, go to **App Privacy** and fill in:

### Data Collected

| Data Type | Linked to User | Used for Tracking | Purpose |
|-----------|---------------|-------------------|---------|
| Phone Number | Yes | No | App Functionality |
| Purchase History | Yes | No | App Functionality |
| Location (Approximate) | No | No | App Functionality |
| Usage Data | No | No | Analytics |

### Data NOT Collected
- Financial Info (payments handled by Razorpay)
- Health & Fitness
- Sensitive Info
- Contacts
- Browsing History
- Search History (local only)

Refer to `ios/App/fastlane/metadata/app_privacy_details.json` for full details.

---

## Step 5: Submit for Review

### Option A: Automated (via GitHub Actions)

1. Go to **Actions** > **Release iOS** workflow
2. Click **Run workflow**
3. Select `release_type`: **app_store_review**
4. Click **Run workflow**

This will:
- Build the web content
- Build the signed IPA
- Upload to TestFlight
- Wait for processing
- Upload metadata
- Submit for App Store review

### Option B: Manual (via Fastlane locally)

```bash
cd ios/App
bundle exec fastlane release
```

### Option C: Manual (via App Store Connect)

1. First upload to TestFlight (GitHub Actions or `fastlane beta`)
2. Go to App Store Connect > your app > App Store tab
3. Click **+** next to iOS App version
4. Select the build from TestFlight
5. Fill in all metadata fields
6. Click **Submit for Review**

---

## Step 6: Export Compliance

The app uses only standard HTTPS (TLS) encryption:
- **Uses encryption**: Yes (HTTPS)
- **Qualifies for exemption**: Yes (standard HTTPS only)
- **`ITSAppUsesNonExemptEncryption`**: Set to `false` in Info.plist

No additional export compliance documentation is needed.

---

## Step 7: Post-Submission

### Review Timeline
- Typical review: 24-48 hours
- First submission may take longer

### Common Rejection Reasons to Avoid
1. **Broken links** - Ensure privacy policy and support URLs are live
2. **Login issues** - Demo account must work for reviewers
3. **Incomplete features** - All visible features must be functional
4. **Missing permissions descriptions** - Already added to Info.plist
5. **Payment issues** - Razorpay must work in test mode for review

### If Rejected
1. Read the rejection reason in Resolution Center
2. Fix the issues
3. Resubmit through App Store Connect or run the workflow again

---

## File Reference

| File | Purpose |
|------|---------|
| `ios/App/App/Info.plist` | iOS app configuration + privacy descriptions |
| `ios/App/fastlane/Fastfile` | Build & submission automation |
| `ios/App/fastlane/Appfile` | App Store credentials |
| `ios/App/fastlane/metadata/en-US/` | App Store listing metadata |
| `ios/App/fastlane/metadata/review_information/` | Review team notes & demo credentials |
| `ios/App/fastlane/metadata/app_privacy_details.json` | Privacy nutrition label reference |
| `.github/workflows/release-ios.yml` | CI/CD workflow for iOS releases |
| `capacitor.config.ts` | Capacitor native configuration |
