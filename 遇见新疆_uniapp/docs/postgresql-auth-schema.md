# PostgreSQL auth schema

## Purpose

This project plans to connect the uni-app account system to a server-side PostgreSQL database.
The frontend already reserves these endpoints:

- `POST /auth/register`
- `POST /auth/login`

Current frontend placeholders live in:

- `config/auth.js`
- `services/auth.js`
- `common/auth-storage.js`
- `pages/auth/index.vue`

## Recommended tables

### `users`

Main account table for email/password registration.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `email` | `varchar(120)` | yes | Login email, unique |
| `password_hash` | `text` | yes | Hashed password, never store plaintext |
| `nickname` | `varchar(60)` | yes | Display name shown in account page |
| `avatar_url` | `text` | no | Optional avatar image |
| `status` | `varchar(20)` | yes | Suggested values: `active`, `disabled`, `pending` |
| `created_at` | `timestamptz` | yes | Record creation time |
| `updated_at` | `timestamptz` | yes | Last update time |
| `last_login_at` | `timestamptz` | no | Last successful login time |

### `user_sessions`

Optional session table if the backend wants refresh tokens, device tracking, or forced logout.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | References `users.id` |
| `token_id` | `varchar(120)` | yes | Session or refresh token identifier |
| `device_name` | `varchar(120)` | no | Optional device label |
| `ip_address` | `inet` | no | Login IP |
| `user_agent` | `text` | no | Request user agent |
| `expires_at` | `timestamptz` | yes | Expiration time |
| `revoked_at` | `timestamptz` | no | Filled when session is revoked |
| `created_at` | `timestamptz` | yes | Record creation time |

## API contract suggestion

### `POST /auth/register`

Request body:

```json
{
  "nickname": "丝路旅人",
  "email": "demo@example.com",
  "password": "123456"
}
```

Suggested success response:

```json
{
  "token": "jwt-or-session-token",
  "user": {
    "id": "uuid",
    "nickname": "丝路旅人",
    "email": "demo@example.com",
    "avatar_url": "",
    "status": "active"
  }
}
```

### `POST /auth/login`

Request body:

```json
{
  "email": "demo@example.com",
  "password": "123456"
}
```

Suggested success response is the same as register.

## Backend notes

- Hash passwords with `bcrypt`, `argon2`, or another vetted password hashing algorithm.
- Add unique index on `users.email`.
- Never return `password_hash` to the client.
- If JWT is used, keep signing secrets on the server only.
- If refresh tokens are used, store only identifiers or hashed refresh tokens in PostgreSQL.

## Frontend config to fill later

When server info is ready, update `config/auth.js`:

```js
export const AUTH_API_BASE_URL = 'https://your-domain-or-server/api'
```

## Current integration status

- `pages/auth/index.vue` already supports login/register form switching.
- `pages/account/index.vue` already reads local session state.
- `common/auth-storage.js` stores token and user info locally.
- The frontend is not yet connected to a live server.
