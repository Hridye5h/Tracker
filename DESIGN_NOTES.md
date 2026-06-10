# Design Notes & Interview Defense

This document explains **how the app is built and why** — and ends with a list of
**likely interview questions with answers**. Read it before any interview where this
project is on the table; every claim here is backed by code you can point to.

---

## 1. Request lifecycle

```
Client (React/Axios)
   │  Authorization: Bearer <JWT>
   ▼
Express (app.js)
   │  helmet → mongo-sanitize → cors → rate-limit → json body parser
   ▼
Router (routes/*.js)
   │  router.use(protect)  ← JWT verified, req.user attached
   ▼
Controller (controllers/*.js)
   │  wrapped in asyncHandler → errors forwarded to central handler
   ▼
Model (models/*.js, Mongoose)
   ▼
MongoDB
```

Errors thrown anywhere in a controller are caught by `asyncHandler` and passed to
`middleware/error.js`, which maps Mongoose errors (bad ObjectId, duplicate key,
validation) to clean HTTP responses — no stack traces leak to clients.

## 2. Data model

- **User** — `name`, unique `email`, `password` (hashed, `select:false`).
- **Account** — a money bucket (Cash, Bank, UPI…) with a `balance`, owned by a user.
- **Transaction** — `description`, positive `amount`, `type` (`income`/`expense`),
  `category`, `date`, owned by a user, optionally linked to an account.

**Why `type` + positive `amount` instead of a signed amount?** The original approach
stored `+50`/`-20` and inferred direction from the sign. Splitting it into an explicit
`type` enum + a non-negative `amount` removes a whole class of sign bugs, makes schema
validation possible (`enum`, `min: 0`), and makes aggregation/filtering by direction trivial.

**Indexing.** `{ user: 1, date: -1 }` — a compound index matching the hot query
("this user's transactions, newest first") so it never does a collection scan.

## 3. Authentication

- Passwords are hashed with **bcrypt** (`genSalt(10)` → 2^10 rounds, unique salt per
  password) in a `pre('save')` hook, guarded by `isModified('password')` so editing
  other fields never re-hashes.
- `password` has `select: false`, so it's never returned by a query; login pulls it
  explicitly with `.select('+password')`.
- Login returns the **same** "Invalid credentials" message whether the email is unknown
  or the password is wrong — this prevents **account enumeration**.
- A **JWT** (`{ id }`, signed with `JWT_SECRET`) is issued on register/login. The
  `protect` middleware verifies it and loads `req.user` for downstream handlers.

**Authorization (data isolation):** every query is scoped with `user: req.user.id`, and
update/delete handlers re-check ownership and return `403` otherwise — so one user can
never read or modify another's data.

## 4. Atomic transfers (the MongoDB transaction)

`POST /accounts/transfer` debits one account, credits another, and writes two ledger
entries — **all inside one `session.startTransaction()`**. If anything fails (account not
found, insufficient funds, a crash), `abortTransaction()` rolls everything back; otherwise
`commitTransaction()` makes it all durable atomically. This guarantees money is never
debited without being credited.

> MongoDB multi-document transactions require a **replica set**. MongoDB Atlas is a
> replica set, so it works there; a standalone local `mongod` is not and will reject them.

## 5. The account-linked ledger (where money actually lives)

Every transaction belongs to an account. The invariant: **an account's balance
always equals its opening balance plus the sum of its transactions' effects**
(income adds, expense subtracts).

- **Create**: the ledger row is written and the account's balance is updated in
  the **same MongoDB transaction** — they can never disagree.
- **No account specified?** The server falls back to the user's first account,
  creating a default **"Cash"** account if they have none — so recording
  "salary ₹10,000" with zero setup still lands the money somewhere real.
- **Update**: the old effect is reversed and the new one applied (both via
  `$inc`, which composes correctly even when the old and new account are the
  same and avoids stale-document races).
- **Delete**: the effect is refunded to the account.
- **Deleting an account cascades** to its transactions (one transaction:
  account + rows go together, so no orphan ledger rows).

Two deliberate asymmetries worth defending in an interview:

1. **Expenses may overdraw an account; transfers may not.** An expense records
   money *already spent in the real world* — refusing to record it wouldn't
   make the user richer, it would just make the ledger lie. A transfer is the
   app itself *moving* money, so it validates funds first.
2. **Transfers are excluded from income/expense displays.** Moving money
   between your own accounts is neither income nor expense; excluding the
   transfer legs keeps `income − expense = change in total balance` exactly.

## 6. Analytics

`GET /transactions/summary` uses a **MongoDB aggregation pipeline**:
`$match` (this user) → `$group` by `{category, type}` with `$sum: '$amount'` → `$sort`.
Totals are computed in the database, not by pulling every row into Node.

## 7. Security middleware

| Middleware | What it does |
|---|---|
| `helmet` | Sets safe HTTP headers (removes `X-Powered-By`, adds protective defaults) |
| `express-mongo-sanitize` | Strips `$` / `.` from input keys → blocks NoSQL-injection (e.g. `{ "email": { "$gt": "" } }`) |
| `express-rate-limit` | Caps requests per IP → mitigates brute-force / abuse |
| `cors` | Controls which origins may call the API |

## 8. Testing

Jest + Supertest exercise the **real Express app** against an **in-memory MongoDB**
(`mongodb-memory-server`) — fast, isolated, and needs no external database. Coverage
includes register/login, duplicate-email and wrong-password rejection, full transaction
CRUD, schema validation, the auth gate (401 when unauthenticated), and the summary
aggregation.

---

## 9. Likely interview questions (with answers)

**Q: Why JWT instead of server-side sessions?**
Stateless — the token itself carries the user id and is verified with a secret, so no
session store is needed and it scales horizontally. Trade-off: you can't easily revoke a
token before it expires; mitigations are short expiry, rotation, or a denylist.

**Q: How are passwords stored, and why bcrypt?**
As a bcrypt hash with a unique per-password salt (cost factor 10). bcrypt is deliberately
slow and salted, which defeats rainbow tables and slows brute-force. Plaintext is never
stored or returned (`select:false`).

**Q: Where does the money go when I record income with no account?**
The server resolves an account for every transaction: an explicit one is
ownership-checked; otherwise it uses the user's first account, auto-creating a
default "Cash" account when none exists. The ledger row and the balance update
commit in one MongoDB transaction, so the books always balance.

**Q: Why can an expense make a balance negative when a transfer can't?**
An expense records something that already happened — the ledger's job is to
reflect reality, not gate it. A transfer is the app moving money itself, so it
validates sufficient funds and runs atomically. Different roles, different rules.

**Q: Walk me through the atomic transfer.**
Open a session, `startTransaction`, debit/credit the two accounts and write two ledger
rows under that session, then `commitTransaction`. Any error triggers `abortTransaction`,
rolling back every write. It's a real ACID multi-document transaction, which is why it
needs a replica set.

**Q: How do you stop user A from seeing user B's data?**
Every query is scoped by `user: req.user.id` (the id comes from the verified JWT, not the
request body), and update/delete re-check ownership before acting.

**Q: What's an aggregation pipeline and where do you use one?**
A staged data-processing query that runs in the DB. The summary endpoint `$match`es the
user's rows, `$group`s by category/type summing amounts, and `$sort`s — far cheaper than
loading everything into Node.

**Q: How do you handle errors without repeating try/catch everywhere?**
Controllers are wrapped in an `asyncHandler` that forwards rejected promises to a single
error-handling middleware, which translates Mongoose errors into consistent HTTP codes.

**Q: What would you improve next / how would this scale?**
Pagination on listing, refresh-token rotation, computing balances from an immutable ledger
(event-sourcing) instead of a stored field, optimistic concurrency on transfers, per-user
rate limits, and a Redis cache for the summary.

**Q: Did you use AI to build it?**
Honest answer: I used AI to move faster on boilerplate, but the architecture — the auth
flow, the atomic-transfer design, the data model, the security layer, and the tests — I
understand and can change live. Happy to whiteboard any part of it.
