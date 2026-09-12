# PrettyCash — Add Transaction with AI Receipt Scan (Design)

**Date:** 2026-09-13
**Status:** Approved for implementation
**Implementation status:** Not started

---

## 1. Overview & Objective

Wire the tab bar **`+` button** (currently a no-op in `src/components/TabBar.tsx`) to a new **Add Transaction** flow. Users can add a transaction two ways:

1. **Scan receipt** — capture or pick a receipt image, send it to a vision backend, and have the AI extract the merchant, amount, date, time, note, and line items into an editable form.
2. **Enter manually** — fill the same form by hand.

The category is chosen **inside the form** (Expense/Income toggle + category list), not first. On save, the transaction appears in the Home list; rows that have line items are expandable.

The Gemini/vision API key lives on a **separate backend repo** (built later by the user). This app only calls a configurable endpoint via env vars.

---

## 2. Flow

```
Tap "+" (TabBar)
   └─ AddTransactionSheet (chooser)
        ├─ "Scan receipt"
        │     └─ image source picker: "Take photo" | "Choose from gallery"
        │           └─ analyzing… (spinner)
        │                 └─ TransactionForm (pre-filled from AI) → Save
        └─ "Enter manually"
              └─ TransactionForm (blank) → Save

Save → TransactionsContext.addTransaction() → Home list shows new transaction
```

- Category is selected inside `TransactionForm` (not a separate first step).
- If AI analysis fails, the user is dropped into the blank form with a visible error, so manual entry is still possible.
- The chosen image is retained in the form so the user can see what was scanned.

---

## 3. Data Model

### 3.1 Types

```ts
// src/types/transaction.ts (new)
export interface LineItem {
  id: string;
  name: string;
  quantity?: number;
  price: number;
}

export interface Transaction {
  id: string;
  name: string;
  date: string;          // YYYY-MM-DD, used for day grouping + sorting
  time: string;          // display string, e.g. "9:42 AM"
  categoryId: string;    // references CategoryItem.id (dynamic categories)
  type: TransactionType; // 'income' | 'expense'
  amount: number;
  icon: string;          // denormalized icon for quick render
  note?: string;
  items?: LineItem[];    // optional; presence enables expandable row
}
```

- `TransactionType` stays `'income' | 'expense'`.
- The old fixed `Category` union (`'Food' | 'Travel' | 'Fun' | 'Coffee' | 'Income' | 'Other'`) is **retired** in favor of `categoryId` + dynamic categories.
- `ReceiptDraft` (result of analysis) mirrors the form fields: `merchant`, `amount`, `date`, `time`, `note`, `items[]`.

### 3.2 TransactionsContext (new)

```ts
interface TransactionsContextType {
  transactions: TransactionGroup[]; // grouped by day, same shape as today's mockTransactions
  addTransaction: (input: Omit<Transaction, 'id'>) => void;
}
```

- Seeds from the current `mockTransactions` (migrated to use `categoryId` referencing the existing default categories, and given an explicit `date` per group label).
- In-memory only (`useState`). Persistence is added later (backend/database).
- `addTransaction` inserts the new transaction and re-groups by `date` into labels: `Today`, `Yesterday`, or a formatted date (e.g. `Sep 1`), preserving the existing grouping UI.
- The form's `date` (YYYY-MM-DD) and `time` (display) map directly to `Transaction.date` and `Transaction.time`. The AI `ReceiptDraft`'s `date`/`time` map the same way.
- `App.tsx` wraps the navigator with `TransactionsProvider` (alongside `CategoriesProvider`).

### 3.3 Category reconciliation

- `TransactionRow` currently resolves color via `CATEGORY_STYLES[transaction.category]` (fixed map). After this change, the row resolves the category's `icon`, `colorBg`, `colorFg` from `CategoriesContext` by `categoryId`, falling back to neutral styling if the category no longer exists.
- `Transaction.type` continues to drive income/expense sign and color.
- Existing `CATEGORY_STYLES` (`src/theme/categories.ts`) is retained for Insights/other consumers or removed if fully unused after migration.

---

## 4. AI Service & Config

### 4.1 Config (env)

| Var | Purpose |
|-----|---------|
| `EXPO_PUBLIC_VISION_BASE_URL` | Base URL of the backend, e.g. `https://api.example.com` |
| `EXPO_PUBLIC_VISION_API_KEY` | App→backend credential (NOT the Gemini key; that stays server-side) |

- Provided via `.env` / `.env.local` (gitignored) using Expo's `EXPO_PUBLIC_*` convention.
- A `.env.example` is added documenting both vars.

### 4.2 Service

`src/services/receiptAnalysis.ts`:

```ts
export interface ReceiptDraft {
  merchant: string;
  amount: number;
  date: string;  // YYYY-MM-DD
  time: string;  // HH:mm (24h)
  note: string;
  items: { name: string; quantity?: number; price: number }[];
}

export async function analyzeReceipt(imageBase64: string, mimeType: string): Promise<ReceiptDraft>;
```

- Reads `EXPO_PUBLIC_VISION_BASE_URL` / `EXPO_PUBLIC_VISION_API_KEY`.
- Throws a descriptive error when config is missing ("Vision backend not configured").
- Performs the request per §5 contract and normalizes the response into `ReceiptDraft`.

---

## 5. Backend API Contract (for the separate backend repo)

This section is the authoritative request/response model. The app calls this endpoint; the backend is responsible for calling Gemini (or another vision model), validating auth, and returning the structured JSON below. **The Gemini key never leaves the backend.**

### 5.1 Endpoint

```
POST {VISION_BASE_URL}/analyze-receipt
```

### 5.2 Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {VISION_API_KEY}` |

### 5.3 Request body

```json
{
  "image": {
    "base64": "<base64-encoded image bytes, WITHOUT the data URI prefix>",
    "mimeType": "image/jpeg"
  }
}
```

- `base64`: raw base64 of the image (JPEG/PNG/HEIC/WebP as produced by `expo-image-picker`).
- `mimeType`: the image MIME type, e.g. `image/jpeg`, `image/png`, `image/webp`.

### 5.4 Success response — `200 OK`

```json
{
  "merchant": "Whole Foods Market",
  "amount": 42.75,
  "date": "2026-09-13",
  "time": "14:30",
  "note": "Weekly groceries",
  "items": [
    { "name": "Almond Milk", "quantity": 2, "price": 6.98 },
    { "name": "Avocados", "quantity": 1, "price": 5.50 }
  ]
}
```

Field rules:
- `merchant` (string): store/merchant name. Required, may be empty string if unreadable.
- `amount` (number, positive): transaction **total** (sum of items, or the receipt grand total). Required.
- `date` (string): `YYYY-MM-DD` from the receipt, or `null`/omitted if absent (app defaults to today).
- `time` (string): `HH:mm` 24h, or `null`/omitted if absent (app defaults to now).
- `note` (string): any additional context; may be empty string.
- `items` (array): extracted line items; may be `[]`.
  - `name` (string): item description.
  - `quantity` (number, optional): quantity when meaningful.
  - `price` (number): the line-item **total price** (unit × quantity).

### 5.5 Error response

Non-2xx returns a JSON body the app can surface:

```json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Could not read the receipt image."
  }
}
```

Suggested `code` values: `UNAUTHORIZED`, `INVALID_IMAGE`, `UNPROCESSABLE`, `RATE_LIMITED`, `INTERNAL`.

### 5.6 Backend responsibilities (implementation note for the other repo)

- Validate `Authorization` header against the configured app credential.
- Enforce rate limits / quotas per caller.
- Base64-decode the image, downscale/compress if needed, then send to Gemini with a vision prompt instructing it to return strict JSON matching the §5.4 schema.
- Return exactly the §5.4 shape (or §5.5 on failure). Never expose provider keys or raw provider errors to the app.

---

## 6. UI Components

- **`AddTransactionSheet`** — root modal; holds flow state (`idle` → `chooser` → `scan`/`manual`).
- **`ReceiptImagePicker`** — two buttons ("Take photo", "Choose from gallery") using `expo-image-picker`.
- **`TransactionForm`** — shared form: name, amount, date, time, note, category picker (Expense/Income toggle + list), and a line-items editor (add/remove `{name, quantity, price}` rows). Used pre-filled (scan) and blank (manual).
- **`ExpandableTransactionRow`** — replaces `TransactionRow`: tappable, shows a chevron when `items` present, expands to list line items (name, qty, price).
- **`TabBar`** — wire the `+` button `onPress` to open `AddTransactionSheet`.

Styling follows the existing design system (`colors`, `fonts`, `radii`, `spacing` from `src/theme`), matching `AddCategoryModal`'s bottom-sheet pattern.

---

## 7. Dependencies, Error Handling, Testing

### 7.1 Dependencies
- Add `expo-image-picker` at the SDK 57-compatible version (verify exact version against https://docs.expo.dev/versions/v57.0.0/ before installing).
- No new AI/LLM client dependency — the app only makes a `fetch` call.

### 7.2 Error handling
- Missing env config → clear "not configured" state in the flow.
- Analysis failure / bad response / network error → fall back to blank form with an error banner; user can still save manually.
- Unknown/deleted category at render time → neutral fallback styling.

### 7.3 Testing
- Unit tests for `receiptAnalysis` (valid, malformed, and error responses) and for day-grouping in `TransactionsContext`.
- Manual verification on web of: scan flow (with a mock/stub backend), manual flow, expandable rows, and save-into-list.
