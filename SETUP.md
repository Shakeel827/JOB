# Career Compass / JobVerse – Setup & Deploy

## 1. Environment variables

Copy `.env.example` to `.env` and set your OpenRouter API key for AI features:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

Get a key at [OpenRouter](https://openrouter.ai). The app uses a free model by default.

## 2. Firebase

The app uses your existing Firebase project (`jobs-c44e0`).

### Firestore

- In [Firebase Console](https://console.firebase.google.com) → Firestore Database, create the database if needed.
- Deploy rules: run `firebase deploy --only firestore:rules` (or paste the contents of `firestore.rules` into the Console → Firestore → Rules).

### Create the first admin

1. **Sign up or sign in** with the account you want to make admin (normal auth page).
2. In **Firebase Console** → **Firestore Database** → open the `users` collection.
3. Find the document whose **document ID is that user’s UID** (same as in Authentication → Users).
4. Edit the document and set the **`role`** field to **`"admin"`** (replace `"user"` or `"employer"`). Save.
5. Use **Admin login**: go to **`/admin-login`** in the app.
6. Enter the **admin PIN** (from `.env`: `VITE_ADMIN_PIN`, default `723899`), then sign in with that account’s **email and password**.
7. You’ll be taken to the admin dashboard; the Admin area is only available to users with `role === "admin"`.

### Firebase Storage (resumes)

So that only the signed-in user can upload to their own resume folder:

- In Firebase Console → **Storage** → **Rules**, paste (or deploy) the contents of **`storage.rules`** in this repo.
- Deploy from CLI: if your project uses `firebase.json`, add a `storage` section pointing to `storage.rules`, then run:
  ```bash
  firebase deploy --only storage
  ```
- Rule in short: only `request.auth.uid == userId` can read/write under `resumes/{userId}/*`.

## 3. Run and build

```bash
npm i
npm run dev
```

Build for production:

```bash
npm run build
npm run preview   # optional: test production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Firebase Hosting, etc.).
