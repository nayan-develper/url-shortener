# Write-Up

## 1. What did I ask the AI to do, and what did I decide myself?

I used Claude Code throughout this exercise as a pair programmer — not as an autopilot.

**AI handled:**
- Boilerplate scaffolding: Express app setup, Mongoose connection, Jest config
- Test structure and supertest wiring
- The `.env.example` and `.gitignore` content

**I decided:**
- **Base62 over nanoid/UUID**: I chose to encode `Date.now()` in base62 rather than use a random string generator. The reason is that base62 encoding of a monotonically increasing timestamp is provably collision-free within a millisecond window — no retry loops, no probability math. The DB unique index on `code` acts as a safety net for the rare same-millisecond case.
- **Idempotent duplicate handling**: When the same URL is shortened twice without an alias, return the existing code rather than generating a new one. This keeps the database clean and gives callers predictable behaviour — same input, same output.
- **301 over 302**: A 301 (permanent) redirect lets browsers cache the result, reducing load on the server. The trade-off is that if the mapping changes, cached clients won't see the update — acceptable for a shortener where mappings are immutable.
- **DB-level conflict detection**: Rather than checking for alias conflicts in application code and risking a race condition, I put unique indexes on both `code` and `originalUrl` in MongoDB. The DB enforces uniqueness atomically.
- **mongodb-memory-server for tests**: I chose not to require a live MongoDB instance to run tests. This makes the test suite runnable anywhere (`npm test`) without setup, which matters for a reviewer.

## 2. Where did I override or correct the AI?

- **Code generation strategy**: The AI initially scaffolded a `nanoid`-based random code generator. I replaced it with base62 encoding of a timestamp because I wanted to be able to explain the collision-resistance guarantee without relying on probability arguments.
- **Conflict detection**: The AI wrote an app-level check (`findOne` then `create`) for alias conflicts. I kept this for the custom alias flow (to return a clean 409 before hitting the DB) but ensured the unique index is the true enforcement layer — so even concurrent requests can't produce duplicates.
- **Test database**: The AI's initial test file connected to `localhost:27017`. I replaced this with `mongodb-memory-server` so tests are self-contained.

## 3. The two or three biggest trade-offs

**a) Base62(Date.now()) vs. a counter collection**

`Date.now()` is simple and needs no extra DB round-trip, but two requests arriving within the same millisecond would produce the same code — handled by the unique index (the second write fails and could be retried). A dedicated atomic counter in MongoDB would be strictly collision-free, at the cost of an extra read/write per shorten request. For this exercise, the timestamp approach is sufficient and easier to reason about.

**b) Idempotent duplicates vs. always generating a new code**

Idempotent behaviour (same URL → same code) keeps the database clean and is intuitive for users, but it means one user can discover another user's short code for the same URL. In a multi-tenant system this could be a privacy concern. The alternative — always generating a new code — avoids this but inflates the database. I chose idempotent and documented the trade-off.

**c) SQLite vs. MongoDB**

SQLite would have been simpler to set up (no daemon, single file). I chose MongoDB because it scales horizontally, its document model is natural for this use case, and Mongoose's unique indexes handle conflict detection cleanly. The cost is that reviewers need a running MongoDB instance (mitigated by `mongodb-memory-server` for tests).

## 4. What's missing, or what I'd do with another day?

- **Rate limiting**: The `/shorten` endpoint has no rate limiting. A simple `express-rate-limit` middleware would prevent abuse.
- **Link expiry / TTL**: MongoDB supports TTL indexes — adding an `expiresAt` field and a TTL index would be straightforward.
- **Click analytics endpoint**: The `clicks` field is already incremented on every redirect. A `GET /stats/:code` endpoint returning click count and creation date would be a natural addition.
- **Authentication**: Currently anyone can create or claim aliases. An API key or JWT layer would be needed in production.
- **Alias validation**: Custom aliases currently accept any string. Sanitising for URL-safe characters and setting a max length would be a small but important addition.
