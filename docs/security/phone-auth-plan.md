# Phone Auth Migration Plan (Firebase Phone Auth / OTP)

## Objective

Migrate from the current custom phone+PIN authentication system to Firebase Phone Auth (OTP-based). This will populate `request.auth` in Firestore security rules, enabling true row-level security.

## Current State

- Users authenticate with a 10-digit phone number and a 4-digit PIN.
- PIN hashes are stored in the `users/{phone}` Firestore document.
- Authentication is entirely client-side: the app reads the user doc and compares hashes.
- `request.auth` is always `null` in Firestore rules, so row-level security is not enforceable.
- Kiosk and delivery partner auth goes through Cloud Functions (server-side validation).

## Target State

- Users authenticate via Firebase Phone Auth (SMS OTP).
- `request.auth.uid` is populated on every authenticated request.
- Firestore rules can enforce row-level access (e.g., user can only read their own orders).
- Admin roles are enforced via Firebase Custom Claims.

## User Data Model Changes

### Current `users/{phone}` document

```
{
  name: string,
  phone: string,         // 10-digit, also used as doc ID
  pin: string,           // SHA-256 hash of PIN
  pinSalt: string,       // per-user random salt (new)
  loyaltyPoints: number,
  dob: string,
  createdAt: string,
  ...
}
```

### Target `users/{uid}` document

```
{
  name: string,
  phone: string,         // 10-digit, indexed for lookup
  uid: string,           // Firebase Auth UID
  loyaltyPoints: number,
  dob: string,
  createdAt: string,
  migratedAt: string,    // timestamp of migration from PIN to Phone Auth
  legacyPhone: string,   // original phone doc ID (for cross-reference)
  ...
}
```

- The `pin`, `pinSalt`, and `password` fields are removed after migration.
- Doc ID changes from `{phone}` to `{uid}` (Firebase Auth UID).
- A secondary index on `phone` supports lookup during transition.

## Migration Strategy for Existing PIN Users

### Phase 1: Dual-auth (PIN + OTP coexist)

1. Enable Firebase Phone Auth in the Firebase Console.
2. Update the sign-in flow to offer both PIN login (legacy) and OTP login (new).
3. When a legacy user logs in with PIN:
   - Prompt them to verify their phone via OTP.
   - On successful OTP verification, link the Firebase Auth account to their user doc.
   - Copy user data from `users/{phone}` to `users/{uid}`.
   - Mark the old doc as `migrated: true` with a pointer to the new UID.
   - Remove the `pin` and `pinSalt` fields from the new doc.
4. New sign-ups use OTP only (no PIN creation).

### Phase 2: PIN deprecation

1. After a rollout period (suggest 90 days), disable PIN-based login for new sessions.
2. Users who haven't migrated see a mandatory OTP verification flow on next login.
3. The legacy `hashPin` / `hashValue` code paths remain for read-only backwards compat but are not used for new auth.

### Phase 3: PIN removal

1. Remove PIN-related fields from all user documents.
2. Remove legacy PIN code paths from client and server.
3. Delete the old `users/{phone}` documents (after data is confirmed migrated).

## Firestore Rule Rewrite Checklist

Once `request.auth` is available, rewrite rules for each collection:

- [ ] **users**: `allow read: if request.auth.uid == userId;` (user can only read own doc)
- [ ] **orders**: `allow read: if request.auth != null && resource.data.userId == request.auth.uid;`
- [ ] **orders create**: Validate `request.resource.data.userId == request.auth.uid`
- [ ] **reservations**: Scope to `request.auth.uid`
- [ ] **subscriptions**: Scope to `request.auth.uid`
- [ ] **notifications**: Scope to `request.auth.uid`
- [ ] **chatHistory**: Scope to `request.auth.uid`
- [ ] **mealPlans**: Scope to `request.auth.uid`
- [ ] **groupCarts**: Scope host to `request.auth.uid`
- [ ] **menu / specials / heroSlides / addons / testimonials / socialPosts**: Keep `allow read: if true` (public data)
- [ ] **settings**: Keep `allow read: if true`; gate writes on admin Custom Claim
- [ ] **kiosks / deliveryPersons**: Keep `allow read: if false` (server-only via Cloud Functions)
- [ ] **Admin-only collections** (menu write, expenses, staff, etc.): Gate on `request.auth.token.admin == true` (Custom Claim)
- [ ] **coupons / giftCards**: Keep current rules; optionally scope to authenticated users

## Admin Role via Custom Claims

1. Use the Firebase Admin SDK to set Custom Claims: `admin.auth().setCustomClaimss(uid, { admin: true })`.
2. Create a Cloud Function endpoint (e.g., `POST /auth/set-admin`) protected by a super-admin key.
3. Update Firestore rules to check `request.auth.token.admin == true` for admin-only operations.
4. Migrate admin panel to use Firebase Auth login (email/password or phone) instead of raw API key.

## Rollout Sequencing

1. **Week 1-2**: Enable Firebase Phone Auth; deploy dual-auth client code. No rule changes yet.
2. **Week 3-4**: Begin prompting existing PIN users to migrate on login. Monitor migration rate.
3. **Week 5-8**: Gradually tighten Firestore rules for migrated users (feature-flag by `uid` presence).
4. **Week 9-12**: Deprecate PIN login. Mandate OTP for all users.
5. **Week 13+**: Remove PIN code paths. Deploy final Firestore rules with full row-level security.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Users without reliable SMS delivery | Support WhatsApp OTP (Firebase supports this) or email fallback |
| Data loss during user doc migration | Run migration in a transaction; keep old docs until confirmed |
| Admin panel breaks during rule tightening | Roll out admin Custom Claims before tightening admin rules |
| Cloud Function cold starts during OTP flow | Use min-instances configuration for auth functions |
| International phone numbers | Firebase Phone Auth handles international formats natively |

## Cost Considerations

- Firebase Phone Auth: free tier includes 10K verifications/month (SMS). Beyond that, standard SMS rates apply.
- Consider using reCAPTCHA verification to reduce SMS abuse.
- OTP rate limiting is built into Firebase Auth.
