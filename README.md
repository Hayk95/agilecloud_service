# Midas Backend (Express + MongoDB)

Standalone Node.js Express backend with MongoDB. Same quote logic as the Next.js app and Firebase: create quote, list by user, update price. Optionally syncs to Firestore when `FIREBASE_SERVICE_ACCOUNT_JSON` is set.

## Setup

1. **Install dependencies**
   ```bash
   cd backend && npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `MONGODB_URI` (e.g. `mongodb://localhost:27017/midas` or Atlas connection string)
   - Set `FIREBASE_SERVICE_ACCOUNT_JSON` (minified one-line JSON) to verify Firebase ID tokens and sync quotes to Firestore

3. **Run**
   ```bash
   npm run dev   # development (with --watch)
   npm start    # production
   ```

Server runs at `http://localhost:4000` by default (`PORT` in `.env`).

## API (same logic as Next.js / Firebase)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/quotes`        | Optional (Bearer token) | Create quote. If token present, sets `userId`. |
| GET    | `/api/quotes`        | Required (Bearer token) | List quotes for the authenticated user. |
| PATCH  | `/api/quotes/:quoteId/price` | None | Update quote price (e.g. for Telegram webhook). |

- **POST body:** `{ formData, vehicles }`
- **PATCH body:** `{ price: number }`
- **GET** returns `{ quotes }` (array, newest first).

## Using this backend with the Next.js frontend

Point the frontend to the Express API base URL:

- In `useQuotes.js` and `QuoteForm.js`, use `process.env.NEXT_PUBLIC_API_URL || ''` so requests go to `http://localhost:4000` when set (e.g. `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env.local`).  
- Or keep using the Next.js API routes (`/api/quotes`) and run only the Next.js app; the Express backend is an alternative deployment of the same logic.

## Auth (same logic as Firebase, saved in MongoDB)

- Auth is still **Firebase** (sign in with Google / email on the frontend; backend verifies ID tokens).
- On every request that sends `Authorization: Bearer <token>`, the backend verifies the token and **upserts the user into MongoDB** (`users` collection: `uid`, `email`, `displayName`, `photoURL`, `createdAt`, `updatedAt`). So all users who sign in are stored in MongoDB with the same identity as Firebase.

## Firestore sync

When `FIREBASE_SERVICE_ACCOUNT_JSON` is set, the backend:

- Verifies Firebase ID tokens for GET (and optional POST)
- After creating a quote (POST), writes the same quote to Firestore
- After updating price (PATCH), updates the same quote in Firestore

So MongoDB and Firestore stay in sync, same as the Next.js `quotes-backend` logic.
