# 02 — Google OAuth Clients and Play App Signing

**Date:** 2026-11-14  
**Implementation status:** Documented and applied; Play internal-testing sign-in verification pending  
**Scope:** Why native Google Sign-In needs both a Web client and an Android client, why only one of them has a secret, and how to register the Google Play App Signing SHA-1.

---

## 1. The one-sentence version

The **Android client answers "is this APK allowed to ask?"**. The **Web client answers "who is the token for?"**. You need both, and only the Web client has a secret.

---

## 2. Two clients, two completely different jobs

It is tempting to think the Android client replaces the Web client on Android. It does not. They are used at different moments, by different parties, and neither one can do the other's job.

| | **Web client** | **Android client** |
|---|---|---|
| **Type** | Web application | Android |
| **Exists in** | Google Cloud, Supabase, and the app bundle | Google Cloud only |
| **Used by** | Google (to stamp the token) and Supabase (to verify it) | Google Play Services (to identify the installed app) |
| **Identity proof** | Client secret (server-side only) | Package name + SHA-1 signature |
| **Has a secret** | Yes | **No** |
| **Referenced in code** | Yes — `webClientId` | **Never** |
| **If it is missing** | Token rejected by Supabase (audience mismatch) | `DEVELOPER_ERROR` (code 10) |

The single most confusing fact:

> The Web client ID is the one you put in your Android app.

Supabase documents this explicitly: *"You have to create OAuth client IDs for both a Web and Android application. The Web client ID is the one used in your Android app."*

---

## 3. The full flow, step by step

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. App asks Google Play Services for a sign-in                  │
│    GoogleSignin.configure({ webClientId: <WEB CLIENT ID> })     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Google checks the installed app                              │
│    package name  +  SHA-1 of the signing certificate            │
│    → matched against the ANDROID client(s) in Google Cloud      │
│    ✗ no match → DEVELOPER_ERROR (code 10), no account sheet     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Google issues an ID token                                    │
│    the token's audience (aud) = the WEB CLIENT ID               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. App sends the token to Supabase                              │
│    supabase.auth.signInWithIdToken({ provider: 'google', token })│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Supabase verifies the token                                  │
│    signature ✔  issuer ✔  expiry ✔  aud == configured client ID │
│    ✗ aud mismatch → token rejected                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ✅ Supabase session created
```

**Key insight:** step 2 and step 5 fail with *completely different errors*. That is why reading the error message is faster than guessing. If the Google account sheet never opens, the problem is step 2. If it opens and then fails, the problem is step 5.

---

## 4. Why the Android client has no client secret

Google classifies OAuth clients into two categories:

- **Private clients** (web server apps) run on servers you control, so they *can* hold a secret.
- **Public clients** (native and JavaScript apps) run on the user's device. Google's own documentation says they *"cannot securely store secrets, as they reside on user devices and as such do not use client secrets."*

An APK is a zip file. Anyone can download it, unzip it, and read every string inside — including any "secret" you embedded. So a secret in a mobile app is not a secret; it is a published string.

Google substitutes a better proof for native apps:

| Instead of a password | Google uses |
|---|---|
| Client secret | Package name + SHA-1 of the signing certificate |

You cannot forge the SHA-1 without the private signing key. That is the actual security boundary.

**You can see this in the Google Cloud UI:** open a Web client and the sidebar shows a **Client secrets** panel. Open an Android client and that panel does not exist. Not hidden — it is never generated.

---

## 5. Why the Android client ID never appears in your code

A common mistake is to go looking for where to paste the Android client ID. There is nowhere to paste it.

| Value | Where it goes |
|---|---|
| Web client ID | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and Supabase's *Client IDs* field |
| Web client secret | Supabase's *Client Secret* field (never in the app) |
| Android client ID | **Nowhere.** It only has to exist in Google Cloud. |

Google Play Services resolves the Android client automatically at runtime, using the package name and the signature of the installed APK. It is a server-side lookup, not an app-side configuration.

> ⚠️ **Do not set `GCLOUD_CLIENT_ID` to the Android client ID.** That variable is the web-identity client used for browser OAuth and as the token audience. Pointing it at an Android client produces tokens Google will not let Supabase verify.

---

## 6. The signing key problem

This is where almost every `DEVELOPER_ERROR` comes from. Your app can be signed by **three or four different keys** in one week, and each one produces a different SHA-1.

| Build | Signed by | Where the key lives |
|---|---|---|
| Local debug (`expo run:android`) | Debug keystore | `~/.android/debug.keystore` |
| EAS development APK | **EAS keystore** | Expo's servers |
| AAB you upload to Play | **Upload key** | Your machine / EAS |
| App users actually install from Play | **Play App Signing key** | Google's servers |

The last two are the trap.

```text
You upload ──[signed with UPLOAD KEY]──► Google Play
                                              │
                                              │  re-signs
                                              ▼
                          [signed with APP SIGNING KEY] ──► user installs
```

Google Play **strips your signature and re-signs the artifact** with its own app signing key. So:

- The AAB you uploaded carries your upload key's SHA-1.
- The APK on the user's phone carries **Google's app signing key SHA-1**.
- Google Play Services checks the *installed* APK — therefore the **app signing key SHA-1** is the one that must be registered.

If you register the upload key's SHA-1 instead, everything looks correct in the console and sign-in still fails. This is the single most common cause of "it worked as an APK but broke after Play internal testing".

### One Android client per signing certificate

The Cloud Console gives each Android client a **single** SHA-1 field. So the practical approach is:

```text
Android client #1  → com.example.app  → 17:DB:2C:70:...  (EAS keystore)
Android client #2  → com.example.app  → A1:B2:C3:D4:...  (Play app signing key)
Android client #3  → com.example.app  → 2C:A1:6D:AE:...  (local debug)
```

Same package name, different SHA-1, one client each. All of them stay valid; they do not overwrite each other.

**Do not edit an existing Android client to change its SHA-1** — that revokes it for every build that was using it.

---

## 7. How to get each SHA-1

### From Google Play Console (the one users have)

1. Open [Google Play Console](https://play.google.com/console) → your app.
2. Left menu: **Release** (or *Test and release*) → **Setup** → **App integrity**.
3. Read the **App signing key certificate** block.
4. Copy the **SHA-1 certificate fingerprint**.

> Use **App signing key certificate**, not **Upload key certificate**. They are shown on the same page and look almost identical.

### From EAS (the direct-install APK)

```bash
npx eas-cli credentials --platform android
```

Choose the project → *Keystore* → view the SHA-1 fingerprint. It is also printed on the build's detail page.

### From a local debug build

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

### From the app already installed on a phone (most reliable)

```bash
npx @react-native-google-signin/config-doctor
```

This reads the certificate off the installed app and tells you exactly which SHA-1 needs to be registered — no guessing about which key produced the build you are testing.

---

## 8. Worked example: the bug this lesson came from

| Step | What changed | Result |
|---|---|---|
| 1 | Installed the EAS development APK, registered the EAS keystore SHA-1 | ✅ Sign-in worked |
| 2 | Uploaded the AAB to Play internal testing, installed from Play | ❌ `DEVELOPER_ERROR` (code 10) |
| 3 | Registered the **Play App Signing** SHA-1 as a second Android client | Pending propagation |

The code, the Web client, Supabase, and the environment variables were **correct the entire time**. Nothing in the app changed. The only thing that changed was *which private key signed the installed binary*.

**The fix required zero code changes, zero rebuilds, and zero environment-variable updates.** That is the tell: when the JS is identical and only the installed artifact differs, the problem is always at the signature layer.

---

## 9. Propagation is not instant

Google's own documentation:

> It may take **5 minutes to a few hours** for changes made to these settings to take effect.

Practical procedure:

1. Create or edit the client in Google Cloud.
2. Compare the two SHA-1 strings character-for-character (see §10) instead of retrying in a loop.
3. Wait ~10 minutes.
4. On the phone: **Settings → Apps → Your App → Force stop** (this drops Google Play Services' cached identity).
5. Reopen and retry.

Retrying repeatedly does not speed up propagation.

### Comparing SHA-1 values

Google Cloud strips colons and uppercases the value. Both forms are the same fingerprint:

```text
17:DB:2C:70:69:74:15:4B:46:65:1F:3D:0C:24:C8:67:83:49:D3:CD
17DB2C706974154B46651F3D0C24C8678349D3CD
```

---

## 10. Error triage: let the error tell you which layer failed

| Symptom | Layer | Cause |
|---|---|---|
| `DEVELOPER_ERROR` (code 10), account sheet never appears | Step 2 — app identity | No Android client matches this package + SHA-1. Wrong key, typo in package, or propagation pending. |
| Sheet appears, then Supabase rejects the token | Step 5 — audience | Web client ID mismatch between the app and Supabase. |
| `Unacceptable audience in id_token` | Step 5 — audience | `webClientId` is not the client ID configured in Supabase. Often the Android client ID was used by mistake. |
| `Access blocked: app has not completed verification` | Consent screen | App is in **Testing** and the signed-in Gmail is not in **Test users**. |
| `SIGN_IN_CANCELLED` | None | User dismissed the sheet. Not a bug. |
| `PLAY_SERVICES_NOT_AVAILABLE` | Device | No/outdated Google Play Services (common on emulators). |

**Rule:** if the Google account sheet opens at all, the signature layer already passed. Stop looking at SHA-1s and start looking at the Web client and Supabase.

---

## 11. Checklist for a new Play release

- [ ] Android client exists for the **EAS keystore** SHA-1 (development builds).
- [ ] Android client exists for the **Play App Signing key** SHA-1 (Play builds).
- [ ] Both use the exact package name, character for character.
- [ ] The **App signing key** SHA-1 was copied, not the upload key's.
- [ ] Web client still exists and its ID matches `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- [ ] Supabase's Google provider has the Web client ID **first** in the client ID list.
- [ ] `GCLOUD_CLIENT_ID` was **not** changed to an Android client ID.
- [ ] If the app is in **Testing** mode, the tester's Gmail is in **Test users**.
- [ ] Waited at least ~10 minutes, force-stopped the app, then retried once.

---

## 12. Project-specific values (PrettyCash)

| Item | Value |
|---|---|
| Android package | `com.mohamedahshik.prettycash` |
| Web client ID | `225248900341-5ab7orcbv0rerml79cq4knt7qt1nen6n.apps.googleusercontent.com` |
| EAS keystore SHA-1 | `17:DB:2C:70:69:74:15:4B:46:65:1F:3D:0C:24:C8:67:83:49:D3:CD` |
| Local debug SHA-1 | `2C:A1:6D:AE:7D:95:F9:18:C0:A7:17:98:96:B5:2F:22:E3:A4:98:7A` |
| Play App Signing SHA-1 | *copy from Play Console → App integrity → App signing key certificate* |
| Android client ID | `225248900341-5ac39ff2vnbceg1eqrmadide0l5ak03r.apps.googleusercontent.com` — **reference only, never used in code** |

Relevant files:

- `src/services/googleAuth.ts` — `GoogleSignin.configure({ webClientId })` and `signInWithIdToken`
- `src/context/AuthContext.tsx` — routes Google sign-in to the native flow
- `app.config.ts` — Google plugin, iOS URL scheme, `googleServicesFile`
- `.env` — `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

> `google-services.json` is **not** part of this. It configures Firebase/FCM only. It plays no role in Google Sign-In authorization, and adding it or removing it will not fix `DEVELOPER_ERROR`.

---

## 13. Sources

- [Supabase — Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) — "You have to create OAuth client IDs for both a Web and Android application."
- [react-native-google-signin — Collecting configuration information](https://react-native-google-signin.github.io/docs/setting-up/get-config-file) — multiple SHA-1s required; Play Store re-signs.
- [Google — Manage OAuth Clients](https://support.google.com/cloud/answer/6158849) — public clients do not use client secrets; 5 minutes to a few hours for propagation.

---

## 14. See also

- [01 — Native Google Sign-In with Supabase](./01-native-google-signin.md) — why the browser OAuth flow was replaced by the native ID-token flow.
