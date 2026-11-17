# Mission 5 backend contract

Server-only services: never import these modules into client components. Node runtime,
existing Prisma database, no new packages. This scope protects only the new source
endpoints. Legacy endpoints remain outside this change; do not expose the app publicly
until their authorization is reviewed.

Set SESSION_SECRET to an independently generated random secret of at least 32 bytes.
No fallback, checked before registration, login and session verification; absent/short
configuration yields 503 without account creation. Never put the value in NEXT_PUBLIC_*,
source control or logs. Rotation invalidates all cookies. The signed payload is readable,
contains user ID/timestamps and a keyed credential tag, never passwords or email.

Registration defaults to loopback requests in development. Production always requires
ALLOW_PUBLIC_REGISTRATION=true; enabling it accepts accounts without email verification.
There is no email verification, recovery, invitation or MFA in this MVP. Login remains
available when signup is disabled. Passwords: 12+ characters, at most 256 UTF-8 bytes;
scrypt N=32768/r=8/p=1, random 16-byte salt, 64-byte output. Existing users with no
compatible password hash cannot log in and are never adopted by first-user lookup.

POST /api/auth/register: JSON {name,email,password}; 201 {user:{id,name,email}}.
POST /api/auth/login: JSON {email,password}; 200 with the same user shape.
POST /api/auth/logout: clears the current browser cookie. Stateless signed tokens can
still be replayed until their eight-hour expiry; no durable per-session revocation.
Password changes or SESSION_SECRET rotation invalidate existing sessions.
GET /api/auth/session: 200 {user}, otherwise 401 (503 for secret/database failure).
Session cookies: HttpOnly, SameSite=Lax, Path=/; Secure and __Host- prefix in production.
Every mutation requires exact Origin=request protocol + Host; reverse proxies must
preserve the public Host and protocol. Forwarded headers are never trusted. JSON
bodies are capped at 16 KiB, unrecognized fields are rejected.

GET /api/internal/sources: {sources:[...]}, all nonremoved registrations owned by
authenticated user, newest first; existing records are never silently truncated.
POST: {username}, returns 201 {source}, pending_resolution. Each owner can have at
most 100 nonremoved registrations, counting all statuses/platforms. Counting and
inserting share one SQLite transaction, including concurrent creates. At the limit,
POST returns 409 with an explicit instruction to remove a source before adding
another. Pausing does not free a slot; soft removal does. A new username can use the
freed slot, but removed usernames remain reserved as described below. Imported/legacy
records above the cap remain visible and manageable; further creation is blocked.
Transaction contention returns 409 requesting retry, without inserting an extra row.
PATCH /api/internal/sources/:id: {action:"pause"}, returns {source}, inactive.
DELETE same URL: soft removal, status removed; linked owned DataSource is disabled and
removedAt is set in the same transaction. No rows or messages are deleted. Removed
usernames remain reserved for that owner (409 if added again). Other users' IDs return
404; ownerUserId/userId/status cannot be supplied by the caller. There is no activation
or resolution endpoint: pending_authorization/active/error states may be read once a
separately authorized resolver writes them. Pausing/removing never invents authorization.

Best-effort process-local throttling: combined signup/login 300 attempts per 15 minutes,
10 per normalized email, four simultaneous password derivations; source mutations 60
per user per 15 minutes. 429 includes Retry-After. These limits reset on restart and
are not shared across workers. Production needs a trusted ingress/shared limiter;
no spoofable forwarded IP headers are used. Email limits can temporarily deny a target
account login; registration conflicts also disclose availability via 409.

Tests: node --test src/lib/auth/auth.test.cjs src/lib/telegram/synthetic-adapter.test.cjs.
SQLite integration additionally needs AUTH_TEST_CLIENT (generated isolated Prisma
client absolute path) and AUTH_TEST_DATABASE_URL (dedicated auth-test.sqlite URL).
Without these, integration is explicitly skipped. Never use a development database.
The synthetic adapter accepts only platform=synthetic; missing delimitations become
candidateRecords:[], leaving validation/review to DATA. No Telegram network traffic.
