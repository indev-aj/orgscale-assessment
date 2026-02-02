# Leaderboard Score Update Module — Specification

## 1. Purpose

Before a user can appear on the leaderboard or have their score updated, they must first register an account and sign in. The Auth Service is responsible for handling registration, login, and issuing the signed tokens (JWTs) that every subsequent request relies on.

Once authenticated, the Score Update module handles everything that happens server-side when a user completes an action and their score needs to update. It receives the update request, validates the token, persists the new score, and pushes the live leaderboard to all connected clients.

The website never polls for scores. Instead, this module is responsible for pushing the updated top-10 leaderboard in real time via WebSockets after every successful score change.

---

## 2. Flow of Execution

The diagram below covers two flows. The top half is the **Auth flow** (register or sign in). The bottom half is the **Score Update flow**, which depends on a valid token from the Auth flow.
The left side of the *Score Update flow** is the HTTP score update triggered when a user completes an action. The right side is the persistent WebSocket connection the client opens on page load to receive live leaderboard updates. They meet at the end: the Event Publisher triggers the Broadcast service, which pushes down the WebSocket back to the client.

```
           ┌─────────────────────────────────────┐
           │           AUTH FLOW                 │
           └─────────────────────────────────────┘

                    ┌──────────┐
                    │  Client  │
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
    POST /auth/register     POST /auth/login
              │                     │
              ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │  Validate    │      │  Validate    │
    │  input &     │      │  credentials │
    │  check unique│      │  against DB  │
    └──────┬───────┘      └──────┬───────┘
           │                     │
           ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │  Create User │      │  401 Reject  │  Wrong email or password
    │  record in   │      └──────────────┘
    │  Database    │             │  Credentials OK
    └──────┬───────┘             ▼
           │              ┌──────────────┐
           ▼              │  Issue JWT   │
    ┌──────────────┐      └──────────────┘
    │  Issue JWT   │
    └──────────────┘

           ┌─────────────────────────────────────┐
           │         SCORE UPDATE FLOW           │
           └─────────────────────────────────────┘

HTTP Score Update                        WebSocket Connection
─────────────────                        ────────────────────

┌──────────────┐                              ┌──────────────┐
│    Client    │◀─────────────────────────────│    Client    │  Page loads;
│ (action done)│                              │ (listening)  │  opens WS
└──────┬───────┘                              └──────┬───────┘
       │  POST /api/scores/update                    │  WS handshake (GET /ws)
       ▼                                             ▼
┌──────────────┐                              ┌──────────────┐
│ API Gateway  │  Rate limiting, TLS          │ API Gateway  │  Upgrades
└──────┬───────┘                              │              │  HTTP → WS
       │                                      └──────┬───────┘
       ▼                                             │  Connection established
┌──────────────┐         ┌─────────────┐             ▼
│     Auth     │────────▶│  401 Reject │     ┌──────────────┐
│  Middleware  │         └─────────────┘     │  WebSocket   │  Holds open    connection
└──────┬───────┘                             │  Broadcast   │  for this client
       │  Token OK                           │  Service     │
       ▼                                     └──────▲───────┘
┌──────────────┐                                    │
│  Controller  │  Parses payload                    │  Push: updated top-10
└──────┬───────┘                                    │
       │                                            │
       ▼                                            │
┌──────────────┐         ┌─────────────┐            │
│  Validation  │────────▶│ 400 / 409   │            │
│   Service    │         └─────────────┘            │
└──────┬───────┘                                    │
       │  Validation OK                             │
       ▼                                            │
┌──────────────┐                                    │
│    Score     │  Computes new score server-side    │
│  Repository  │  Atomic write to DB                │
└──────┬───────┘                                    │
       │                                            │
       ▼                                            │
┌──────────────┐                                    │
│   Database   │  Persistent store                  │
└──────┬───────┘                                    │
       │  Write confirmed                           │
       ▼                                            │
┌──────────────┐                                    │
│    Event     │  Emits "score_updated" ────────────┘
│  Publisher   │
└──────────────┘
```

---

## 3. Component Breakdown

### 3.0 Auth Service (Register / Login)

This is the prerequisite to everything else in this module. Two endpoints live here:

**Register** (`POST /auth/register`) — accepts an email and password. The service validates that the input is well-formed and that the email is not already taken. If both pass, it creates a new User record in the database (password stored as a hash, never plaintext), and returns a signed JWT. The token embeds the `user_id` so that downstream services can identify the user without an extra DB lookup.

**Login** (`POST /auth/login`) — accepts an email and password. The service looks up the user by email, compares the provided password against the stored hash, and either issues a fresh JWT on success or rejects with `401` on failure.

The JWT issued by both endpoints is what the Score Update flow relies on. The Auth Middleware in the score update path does not re-authenticate the user from scratch — it simply verifies that the token's signature is valid and has not expired.

### 3.1 Auth Middleware

Every request must carry a signed token (JWT) issued by the system when the user legitimately completed an action. The middleware verifies the signature and expiry before anything else runs. This is the primary guard against unauthorised score inflation — no valid token, no score update.

### 3.2 Validation Service

Two checks happen here:

- **Input validation** — The request must be authenticated. The payload must contain a valid action_id. The user_id is not accepted from the client; it is derived from the authenticated session/JWT. Anything missing or malformed is rejected immediately.
- **Replay prevention** — Each `action_id` can only be redeemed once per user. If a user (or attacker) tries to submit the same action again, the request is rejected with `409 Conflict`. This is stored as a redemption record in the database.

### 3.3 Score Repository

This layer owns all reads and writes to scores. Critically, **the score value is never accepted from the client**. The repository looks up the point value mapped to the `action_id` on the server and computes the new total itself. This prevents any client-side tampering with score amounts.

The write is atomic — either the score updates and the redemption record is created, or neither happens.

### 3.4 Event Publisher and WebSocket Broadcast

After a confirmed write, the module does not return the leaderboard in the HTTP response and call it a day. It publishes an event, which the WebSocket broadcast service picks up. That service queries the current top-10 and pushes it to every connected client instantly.

This is what makes the leaderboard live as required.

---

## 4. API Contract

---

### Register

**Endpoint:** `POST /auth/register`

**Headers:**

| Header           | Required | Value                  |
|------------------|----------|------------------------|
| `Content-Type`   | Yes      | `application/json`     |

**Request Body:**

```json
{
  "email":    "user@example.com",
  "password": "plaintext password"
}
```

**Responses:**

| Code  | Meaning                                        |
|-------|------------------------------------------------|
| `201` | User created; JWT returned                     |
| `400` | Missing or invalid email / password            |
| `409` | Email is already registered                    |
| `500` | Unexpected server error                        |

**201 Response Body:**

```json
{
  "status": "success",
  "token":  "<JWT>"
}
```

---

### Login

**Endpoint:** `POST /auth/login`

**Headers:**

| Header           | Required | Value                  |
|------------------|----------|------------------------|
| `Content-Type`   | Yes      | `application/json`     |

**Request Body:**

```json
{
  "email":    "user@example.com",
  "password": "plaintext password"
}
```

**Responses:**

| Code  | Meaning                                        |
|-------|------------------------------------------------|
| `200` | Credentials valid; JWT returned                |
| `400` | Missing or invalid fields                      |
| `401` | Email not found or password incorrect          |
| `500` | Unexpected server error                        |

**200 Response Body:**

```json
{
  "status": "success",
  "token":  "<JWT>"
}
```

---

### Score Update

**Endpoint:** `POST /api/scores/update`

**Headers:**

| Header            | Required | Value                  |
|-------------------|----------|------------------------|
| `Authorization`   | Yes      | `Bearer <JWT>`         |
| `Content-Type`    | Yes      | `application/json`     |

**Request Body:**

```json
{
    "action_id": "<UUID>"
}
```
- Server extracts `userId` from token and ignores any user_id if provided.

**Responses:**

| Code  | Meaning                                        |
|-------|------------------------------------------------|
| `200` | Score updated; leaderboard pushed via WS       |
| `400` | Missing or invalid fields in the payload       |
| `401` | Token is missing, expired, or invalid          |
| `409` | This action has already been redeemed by user  |
| `500` | Unexpected server error                        |

**200 Response Body:**

```json
{
  "status":    "success",
  "user_id":   "<UUID>",
  "new_score": 250
}
```

> Note: The updated leaderboard is delivered over the WebSocket connection, not in this response body.

---

## 5. Security Summary

| Threat                                   | How it is handled                                                             |
|------------------------------------------|-------------------------------------------------------------------------------|
| Unauthorised score inflation             | Signed JWT required; verified server-side before any logic runs               |
| Replay attacks (resubmitting an action)  | Each action_id + user_id pair is marked as redeemed after first use           |
| Client-manipulated score values          | Score is computed server-side from the action point value, never from input   |
| Brute-force / high-volume abuse          | Rate limiting at the API gateway                                              |
| Token forgery                            | JWT signed with a server-held secret; signature verified on every request     |
| Password exposure                        | Passwords are hashed (e.g. bcrypt) before storage; plaintext is never saved   |
| Brute-force login attempts               | Rate limiting on `/auth/login`; consider account lockout after N failures     |
| Duplicate registration                   | Email uniqueness enforced at the DB level; returns 409 if already taken       |

---

## 6. Suggestions for Improvement

**Idempotency keys** — The client could send an optional idempotency key with the request. If the same key is seen twice (e.g. due to a network retry), the server returns the original result instead of processing it again. This prevents accidental double-counting without needing the client to know whether the first request actually succeeded.

**Async score writes** — Currently the write blocks the HTTP response. Under high load, pushing the write to a message queue (e.g. Kafka) would decouple persistence latency from the response time. The event publisher already sits downstream, so this is a natural extension point.

**Caching the top-10** — Every successful update triggers a top-10 query. A Redis sorted set could cache the leaderboard and be updated inline on each write, avoiding repeated full-table queries as the user base scales.

**Action expiry** — Actions could carry a TTL. If a user does not complete and redeem an action within the window, it becomes invalid. This limits the attack surface of stolen or stale tokens tied to actions.

**Audit trail** — Every score mutation should be logged with a timestamp, user ID, action ID, and resulting score. This is essential for debugging, support cases, and detecting any anomalies in score distribution.

---

## 7. Entity Relationship Diagram

Three tables. `User` now carries the credentials needed for registration and login. `Redemption` is the join table that ties a User to an Action and enforces the one-time-per-user constraint.

```
┌───────────────────┐                ┌───────────────────┐
│      User         │                │     Action        │
├───────────────────┤                ├───────────────────┤
│ PK  id        UUID│                │ PK  id        UUID│
│     email     TEXT│  ← unique      │     name      TEXT│
│     password_hash │                │     points    INT │
│     score     INT │                │     created_at    │
│     created_at    │                └────────┬──────────┘
└────────┬──────────┘                         │ 1
         │ 1                                  │
         │                                    │ many
         │ many                               │
         │                                    │
┌────────┴──────────────────────────────┬─────┘
│              Redemption               │
├───────────────────────────────────────┤
│ PK  id                            UUID│
│ FK  user_id   → User.id           UUID│
│ FK  action_id → Action.id         UUID│
│     redeemed_at              TIMESTAMP│
└───────────────────────────────────────┘

Constraints:
  UNIQUE (User.email)
    → one account per email address; enforces at DB level for registration
  UNIQUE (Redemption.user_id, Redemption.action_id)
    → each action can only be redeemed once per user
```