# Firebase Setup Guide — Studio Color
## Non-Technical Step-by-Step for the CEO

---

## What is Firebase?
Firebase is Google's secure backend. We use it for:
- **Anonymous Sign-In**: Users are silently signed in on first launch — no account creation needed
- **Firestore**: Cloud database storing each user's credits, unlocked content, and purchase history
- **Security**: Our server is the *only* thing that can change a user's credit balance. The app cannot cheat itself.

---

## Step 1 — Create a Firebase Project
1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it **"studio-color"**
4. Disable Google Analytics (not needed now) → **Create project**

---

## Step 2 — Enable Anonymous Authentication
1. Left sidebar → **Build → Authentication**
2. Click **"Get started"**
3. Under **"Native providers"**, click **Anonymous**
4. Toggle the switch **ON** → **Save**

---

## Step 3 — Create Firestore Database
1. Left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose region: **`asia-south1`** (Mumbai, closest for India)
5. Click **Done**

---

## Step 4 — Set Firestore Security Rules
1. In Firestore, click the **"Rules"** tab
2. Delete all existing text and paste this exactly:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

3. Click **"Publish"**

> This means: users can only read their OWN data. Only our server can write credits.

---

## Step 5 — Get Your App Keys (for the player app)
1. Gear icon (top left) → **"Project settings"**
2. Scroll to **"Your apps"** → click the **`</>`** (Web) icon
3. App nickname: **"studio-color-web"** → **Register app**
4. You'll see a code block. Find these values and save them:

| Variable Name | Where to find it in Firebase |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

---

## Step 6 — Get Your Server Key (for the admin/API)
1. Still in **Project settings** → click **"Service accounts"** tab
2. Click **"Generate new private key"** → **Generate key**
3. A JSON file downloads. **Keep this file secret. Never share it.**
4. Open the JSON file and find these values:

| Variable Name | JSON field name |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | `project_id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `private_key` (the long string starting with `-----BEGIN...`) |

---

## Step 7 — Set Variables in Vercel
1. Go to **https://vercel.com** → your Studio Color project
2. Click **Settings → Environment Variables**
3. Add ALL variables from Steps 5 and 6
4. For `FIREBASE_ADMIN_PRIVATE_KEY`: paste the entire `private_key` value including the `-----BEGIN...` and `-----END...` lines
5. Also add:
   - `ADMIN_USER` = `haris` (or your chosen admin username)
   - `ADMIN_PASS` = a strong password (for the `/admin` panel login)
6. Click **Redeploy** after saving

---

## Step 8 — For Local Development
1. Copy `.env.local.example` to `.env.local` in the project root
2. Fill in all the values from Steps 5 and 6
3. **Never commit `.env.local` to GitHub**

---

## ✅ Done!
The app will now:
- Silently sign users in anonymously on first launch
- Create their credit ledger in Firestore
- Securely process all credit transactions through our server
