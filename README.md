<a id="readme-top"></a>

<div align="center">

  <h1>Cab Booking Backend</h1>
  <p>
    Production-grade REST &amp; WebSocket backend for real-time ride-hailing, geospatial driver dispatch, dynamic fare estimation, and Razorpay split settlements.
  </p>

  <p>
    <a href="https://cab-booking-frontend-jade.vercel.app/">
      <img alt="Live Demo" src="https://img.shields.io/badge/Live_Demo-Online-10B981?logo=vercel&logoColor=white" />
    </a>
    <img alt="Node.js ESM" src="https://img.shields.io/badge/Node.js-ESM-339933?logo=nodedotjs&logoColor=white" />
    <img alt="Express 5" src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white" />
    <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white" />
    <img alt="Razorpay" src="https://img.shields.io/badge/Razorpay-Payments-0C2451?logo=razorpay&logoColor=white" />
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-blue.svg" />
  </p>

  <p>
    <a href="https://cab-booking-frontend-jade.vercel.app/"><strong>Live App</strong></a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#quickstart">Quickstart</a> ·
    <a href="#rest-api-reference">REST API</a> ·
    <a href="#websocket-protocol">WebSockets</a> ·
    <a href="#database-architecture">Database Schema</a> ·
    <a href="#pricing--settlement-engine">Pricing Engine</a>
  </p>

</div>

---

## Overview

> **Live Application:** [https://cab-booking-frontend-jade.vercel.app/](https://cab-booking-frontend-jade.vercel.app/)

**Cab Booking Backend** is a modular Node.js (ES Modules) service built on **Express 5**, **PostgreSQL (`pg`)**, and **Socket.IO**. It orchestrates the complete lifecycle of an urban ride-hailing platform across **Riders**, **Drivers**, and **Administrators**—combining ACID-compliant relational transactions with low-latency bidirectional event streaming.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Identity &amp; Role-Based Access</h3>
      <ul>
        <li>Native email/password authentication with <code>bcrypt</code> hashing and signed JWTs.</li>
        <li>Seamless external identity synchronization via <strong>Clerk</strong> (<code>/sync-clerk</code>).</li>
        <li>Granular RBAC middleware enforcing <code>rider</code>, <code>driver</code>, and <code>admin</code> permissions across HTTP &amp; WebSocket handshakes.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>Geospatial Dispatch &amp; Trip State Machine</h3>
      <ul>
        <li>Spherical Haversine proximity search matching riders with verified, online drivers in the requested vehicle category.</li>
        <li>Multi-stop waypoint routing with urban road-curve and dwell-time adjustments.</li>
        <li>Atomic SQL state transitions with <strong>4-digit OTP</strong> pickup verification and conditional cancellation fees.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Dynamic Fares, Promos &amp; Razorpay Ledger</h3>
      <ul>
        <li>Category-specific base, distance, per-minute, minimum, and surge pricing rules.</li>
        <li>Percentage and flat-rate promo code validation with redemption caps and expiry guards.</li>
        <li><strong>HMAC-SHA256</strong> verified Razorpay checkout, GST-itemized receipts, and automated <strong>80/20</strong> driver payout ledger entries.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>Real-Time Telemetry, Safety &amp; Support</h3>
      <ul>
        <li>Live driver GPS coordinates, bearing, and speed streamed directly to active ride rooms.</li>
        <li>One-tap <strong>Emergency SOS</strong> alerts notifying ride rooms, emergency contacts, and global admin safety monitors.</li>
        <li>Categorized customer support ticketing and transactional driver rating recalculations.</li>
      </ul>
    </td>
  </tr>
</table>

---

## Architecture

### System Topology

```mermaid
flowchart LR
    subgraph Clients["Client Applications"]
        Rider["Rider App"]
        Driver["Driver App"]
        Admin["Admin Console"]
    end

    subgraph Server["Node.js / Express 5 + HTTP Server"]
        MW["Helmet · CORS · JWT Auth · RBAC"]
        REST["REST Controllers (/api/v1/*)"]
        WS["Socket.IO Engine (JWT Handshake)"]
        SVC["Domain Services (Auth · Ride · Fare · Map · Payment · SOS)"]
        DAL["Parameterized SQL Models & Transactions"]
    end

    subgraph Infra["External Services & Storage"]
        PG[("PostgreSQL Connection Pool")]
        RZP["Razorpay Orders & HMAC Verification"]
        CLK["Clerk Identity Sync"]
    end

    Rider & Driver & Admin -->|HTTPS JSON| MW --> REST --> SVC
    Rider & Driver & Admin <-->|WebSocket Events| WS <--> SVC
    SVC --> DAL --> PG
    SVC --> RZP
    SVC --> CLK
```

### Ride Lifecycle State Machine

Every trip progresses through strictly guarded SQL `WHERE status = ...` atomic updates so concurrent requests can never double-assign or corrupt a ride.

```mermaid
stateDiagram-v2
    [*] --> requested : POST /rides/request (Generates 4-digit OTP)
    requested --> driver_assigned : POST /rides/:id/accept (Verified & Online Driver)
    requested --> cancelled : POST /rides/:id/cancel (Fee ₹0)
    driver_assigned --> arrived : POST /rides/:id/arrive
    driver_assigned --> cancelled : POST /rides/:id/cancel (Fee ₹0)
    arrived --> in_progress : POST /rides/:id/start (Validates 4-digit OTP)
    arrived --> cancelled : POST /rides/:id/cancel (Rider Fee ₹50)
    in_progress --> completed : POST /rides/:id/complete (Locks Final Fare)
    completed --> [*] : Razorpay Settlement & Driver Rating
    cancelled --> [*]
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Tech Stack &amp; Directory Layout

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js (ESM `"type": "module"`) | Modern asynchronous JavaScript runtime |
| **HTTP Framework** | `express` `^5.3.0` | Routing, JSON body parsing (`10mb` limit), middleware pipeline |
| **Real-Time Engine** | `socket.io` `^4.8.4` | Room-based WebSocket dispatch, live telemetry, and SOS broadcasts |
| **Database Driver** | `pg` `^8.23.1` | PostgreSQL connection pooling, parameterized SQL, ACID transactions |
| **Authentication** | `jsonwebtoken` `^9.0.3`, `bcrypt` `^6.0.0` | Password salting/hashing (10 rounds) and stateless Bearer JWTs |
| **Payments** | `razorpay` `^2.9.8`, Node `crypto` | Order creation and HMAC-SHA256 payment signature verification |
| **Security** | `helmet` `^8.3.0`, `cors` `^2.8.6` | HTTP security headers and origin-allowlisted CORS policies |
| **Dev Tooling** | `nodemon` `^3.1.14`, `dotenv` `^18.0.8` | Hot-reloading development server and environment configuration |

```text
cab-booking-backend/
├── src/
│   ├── config/
│   │   ├── db.config.js               # PostgreSQL Pool (dev discrete vars / prod DATABASE_URL + SSL)
│   │   ├── env.config.js              # Centralized environment variable defaults
│   │   └── razorpay.config.js         # Razorpay SDK client initialization
│   ├── controllers/                   # HTTP request handlers (auth, user, driver, fare, ride, payment, review, sos, support)
│   ├── middleware/
│   │   ├── auth.middleware.js         # JWT verification & role-based authorize(...roles) guard
│   │   ├── error.middleware.js        # 404 handler & global error mapper (PG codes 23505, 23503, 22P02, JWT)
│   │   ├── socket_auth.middleware.js  # Socket.IO handshake JWT authenticator
│   │   └── validate.middleware.js     # Request payload validation helpers
│   ├── models/                        # Parameterized SQL queries & BEGIN/COMMIT/ROLLBACK transactions
│   ├── routes/                        # Express routers mounted under /api/v1/*
│   ├── services/                      # Core business logic, Haversine routing, promos, receipts, settlements
│   ├── socket/
│   │   ├── socket.server.js           # Socket.IO server bootstrap & room emit helpers
│   │   └── handlers/
│   │       ├── driver_location.handler.js  # Real-time GPS telemetry ingestion & broadcast
│   │       └── ride_dispatch.handler.js    # Ride room join/leave handlers
│   ├── utils/
│   │   ├── api_error.util.js          # Custom ApiError class & HTTP factory methods
│   │   ├── jwt.js                     # Token helper utilities
│   │   └── response.util.js           # Standardized JSON success/error response envelopes
│   └── server.js                      # Application entry point, CORS policy, health check, server bootstrap
└── package.json
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Quickstart

### Prerequisites

- **Node.js** `v18.0.0` or higher (`v20+` LTS recommended)
- **PostgreSQL** `v14` or higher (local instance or managed cloud Postgres)
- **Razorpay Account** (Test or Live API keys for payment order flows)

### 1. Install Dependencies

```bash
git clone <your-repository-url>
cd cab-booking-backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with safe credentials for your local or production environment:

```ini
# Server & Runtime
NODE_ENV=development
PORT=5213
FRONTEND_URL=http://localhost:5173

# PostgreSQL — Development (used when NODE_ENV != "production")
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_local_db_password
DB_NAME=cab_booking_db

# PostgreSQL — Production (used when NODE_ENV == "production" with SSL)
DATABASE_URL=postgresql://username:password@host:5432/cab_booking_db

# Authentication
JWT_SECRET=replace_with_a_strong_random_256_bit_secret
JWT_EXPIRES_IN=7d

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

> [!IMPORTANT]
> `src/config/db.config.js` switches connection strategies based on `NODE_ENV`. In `development`, it connects using `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. In `production`, it connects via `DATABASE_URL` with SSL (`rejectUnauthorized: false`).

<details>
<summary><strong>View Full Environment Variable Reference</strong></summary>

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | No | `development` | Execution mode (`development` logs SQL query durations; `production` enables SSL `DATABASE_URL` & strict WebSocket CORS). |
| `PORT` | No | `5213` | HTTP &amp; Socket.IO listening port (`src/server.js`). |
| `FRONTEND_URL` | Yes (Prod) | `http://localhost:5173` | Allowed client origin for REST CORS and Socket.IO handshakes. Localhost ports `3000`, `5173`, `5253` and `*.vercel.app` are also permitted on REST routes. |
| `DB_HOST` | Dev | — | PostgreSQL hostname in non-production environments. |
| `DB_PORT` | Dev | — | PostgreSQL port (typically `5432`). |
| `DB_USER` | Dev | — | PostgreSQL role/username. |
| `DB_PASSWORD` | Dev | — | PostgreSQL password. |
| `DB_NAME` | Dev | — | Target PostgreSQL database name. |
| `DATABASE_URL` | Prod | — | Full PostgreSQL connection URI used when `NODE_ENV=production`. |
| `JWT_SECRET` | **Yes** | — | Secret key used to sign and verify Bearer &amp; Socket JWTs. |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration window (e.g., `7d`, `24h`). |
| `RAZORPAY_KEY_ID` | Yes (Payments) | `rzp_test_placeholder` | Razorpay API Key ID (also accepts alias `RAZORPAY_API_KEY`). |
| `RAZORPAY_KEY_SECRET` | Yes (Payments) | `rzp_secret_placeholder` | Razorpay Key Secret for order creation &amp; HMAC verification (also accepts alias `RAZORPAY_SECRET`). |

</details>

### 3. Start the Server

```bash
# Development mode with hot-reload (nodemon)
npm run dev

# Production mode
npm start
```

### 4. Verify Health Check

Query the diagnostic endpoint to confirm Express, PostgreSQL, and Socket.IO are operational:

```bash
curl http://localhost:5213/api/v1/health
```

<samp>
{
  "success": true,
  "message": "Server, database, and socket engine are healthy",
  "data": {
    "server_status": "online",
    "uptime_seconds": 14,
    "timestamp": "2026-11-25T11:37:00.000Z",
    "database": {
      "connected": true,
      "db_time": "2026-11-25T11:37:00.000Z",
      "db_name": "cab_booking_db"
    },
    "websockets": {
      "enabled": true
    }
  }
}
</samp>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## REST API Reference

All REST endpoints are prefixed with `/api/v1` (plus `GET /` for basic liveness). Protected endpoints require an HTTP header:

```http
Authorization: Bearer <jwt_token>
```

### Standard Response Envelopes

<table>
  <tr>
    <td width="50%" valign="top">
      <strong>Success Envelope (<code>2xx</code>)</strong>
      <pre lang="json"><code>{
  "success": true,
  "message": "Resource processed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}</code></pre>
    </td>
    <td width="50%" valign="top">
      <strong>Error Envelope (<code>4xx</code> / <code>5xx</code>)</strong>
      <pre lang="json"><code>{
  "success": false,
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "message": "A resource with identical unique attributes already exists.",
    "details": []
  }
}</code></pre>
    </td>
  </tr>
</table>

### 1. Health &amp; Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | Public | Verifies server uptime, PostgreSQL connectivity, and WebSocket status. |
| `POST` | `/api/v1/auth/register` | Public | Registers a new account (`email`, `password`, `full_name`, optional `phone_number`, `role`) and returns `{ user, token }`. |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials (`email`, `password`), checks `is_active`, and issues a signed JWT. |
| `POST` | `/api/v1/auth/sync-clerk` | Public | Links or provisions a user from Clerk (`clerk_id`, `email`, `full_name`, `phone_number`, `avatar_url`, `role`) and returns `{ user, token }`. |

### 2. User Profile &amp; Emergency Contacts (`/api/v1/users`)

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/users/me` | Authenticated | Retrieves the current authenticated user's profile. |
| `PATCH` | `/api/v1/users/me` | Authenticated | Updates `full_name`, `phone_number`, or `avatar_url`. |
| `GET` | `/api/v1/users/emergency-contacts` | Authenticated | Lists saved emergency contacts for the current user. |
| `POST` | `/api/v1/users/emergency-contacts` | Authenticated | Adds an emergency contact (`contact_name`, `phone_number`, `relationship`; max **5** per user). |
| `DELETE` | `/api/v1/users/emergency-contacts/:id` | Authenticated | Deletes a saved emergency contact owned by the user. |

### 3. Drivers &amp; Fleet Administration (`/api/v1/drivers`)

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/drivers/register` | Authenticated | Transactionally upgrades user role to `driver`, creates `driver_profiles`, and registers `vehicle_details` (`license_number`, `make`, `model`, `plate_number`, `color`, `vehicle_category`). |
| `GET` | `/api/v1/drivers/me` | `driver`, `admin` | Fetches the authenticated driver's profile, telemetry, rating, and vehicle details. |
| `PATCH` | `/api/v1/drivers/status` | `driver`, `admin` | Toggles `is_online` (requires `is_verified = true`) and updates `current_latitude` / `current_longitude`. |
| `GET` | `/api/v1/drivers/pending` | `admin` | Lists unverified driver applications awaiting review (`page`, `limit`, `search`). |
| `GET` | `/api/v1/drivers` | `admin` | Lists all drivers with optional `is_verified`, `search`, `page`, and `limit` filters. |
| `GET` | `/api/v1/drivers/:id` | `admin` | Inspects full driver and vehicle details by `driver_id` or `user_id`. |
| `PATCH` | `/api/v1/drivers/:id/verify` | `admin` | Approves or revokes driver verification (`is_verified` / `status`) and emits `driver:verification_updated`. |

### 4. Fares &amp; Promotions (`/api/v1/fares`)

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/fares/estimate` | Public | Calculates route distance/duration and fare quotes across all (or a selected) `vehicle_category` for `pickup`, `dropoff`, and optional `stops`. |
| `POST` | `/api/v1/fares/apply-promo` | Authenticated | Validates `code` against `order_amount` (active flag, expiry, global usage cap, minimum fare) and returns discounted fare breakdown. |

### 5. Rides &amp; Dispatch (`/api/v1/rides`)

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/rides/request` | `rider`, `admin` | Creates a ride with optional `stops` and `promo_code`, generates a 4-digit OTP, and dispatches `ride:new_request` to nearby available drivers. |
| `GET` | `/api/v1/rides/history` | Authenticated | Paginated ride history (`page`, `limit` up to 50) scoped to the rider or driver. |
| `GET` | `/api/v1/rides/:id` | Authenticated | Retrieves full trip details, coordinates, ordered stops, driver/vehicle info, and fare. |
| `POST` | `/api/v1/rides/:id/accept` | `driver`, `admin` | Atomically assigns an online, verified driver to a `requested` ride and notifies the rider. |
| `POST` | `/api/v1/rides/:id/arrive` | `driver`, `admin` | Marks driver arrival at pickup (`driver_assigned` → `arrived`) and notifies the rider. |
| `POST` | `/api/v1/rides/:id/start` | `driver`, `admin` | Verifies the rider's `otp_code` and transitions `arrived` → `in_progress`. |
| `POST` | `/api/v1/rides/:id/complete` | `driver`, `admin` | Completes an `in_progress` ride, locks `final_fare`, increments driver trip count, and broadcasts completion. |
| `POST` | `/api/v1/rides/:id/cancel` | Authenticated | Cancels a pre-trip ride (`requested`, `driver_assigned`, or `arrived`); applies a ₹50 fee if a rider cancels after driver arrival. |

### 6. Payments, Receipts &amp; Driver Earnings (`/api/v1/payments`)

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/payments/create-order` | `rider`, `admin` | Creates a Razorpay order (in INR paise) for a `completed` ride and records `payments` status as `created`. |
| `POST` | `/api/v1/payments/verify` | `rider`, `admin` | Verifies Razorpay HMAC-SHA256 signature (`order_id`, `payment_id`, `signature`, `ride_id`), captures payment, and records `driver_earnings`. |
| `GET` | `/api/v1/payments/receipt/:ride_id` | Authenticated | Generates an itemized GST receipt (`RCPT-...`) with route stops, passenger/driver metadata, and payment status. |
| `GET` | `/api/v1/payments/earnings` | `driver`, `admin` | Returns cumulative gross, commission, and net earnings summary plus the 10 most recent settled trips. |

### 7. Reviews, Emergency SOS &amp; Support

| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/reviews` | `rider`, `admin` | Submits a `1.0`–`5.0` star `rating` and optional `comment` for a completed ride; atomically updates driver `rating_average`. |
| `GET` | `/api/v1/reviews/driver/:driver_id` | Authenticated | Lists paginated reviews (`page`, `limit`) for a specific driver. |
| `POST` | `/api/v1/sos/trigger` | Authenticated | Triggers an emergency alert (`ride_id`, `latitude`, `longitude`) for an active rider/driver and broadcasts to ride &amp; admin channels. |
| `GET` | `/api/v1/sos/active` | `admin` | Lists all `triggered` and `acknowledged` emergency SOS alerts. |
| `PATCH` | `/api/v1/sos/:id/resolve` | `admin` | Updates an SOS alert status to `acknowledged` or `resolved` with optional `notes`. |
| `POST` | `/api/v1/support` | Authenticated | Opens a support ticket (`category`, `subject`, `description`, optional `ride_id`). Categories: `fare_dispute`, `lost_item`, `driver_behavior`, `vehicle_condition`, `safety`, `other`. |
| `GET` | `/api/v1/support/my` | Authenticated | Lists all support tickets submitted by the authenticated user. |
| `GET` | `/api/v1/support/:id` | Authenticated | Views details of a ticket (restricted to ticket owner or `admin`). |
| `PATCH` | `/api/v1/support/:id` | `admin` | Updates ticket `status` (`open`, `in_progress`, `resolved`, `closed`) and `admin_response`. |

<details>
<summary><strong>Sample API Payloads (Request Ride &amp; Verify Payment)</strong></summary>

#### Request a Multi-Stop Ride (`POST /api/v1/rides/request`)

```json
{
  "pickup": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "MG Road Metro Station, Bengaluru"
  },
  "stops": [
    {
      "latitude": 12.9569,
      "longitude": 77.7011,
      "address": "Marathahalli Bridge, Bengaluru"
    }
  ],
  "dropoff": {
    "latitude": 12.9698,
    "longitude": 77.7500,
    "address": "ITPL Main Gate, Whitefield, Bengaluru"
  },
  "vehicle_category": "standard",
  "promo_code": "WELCOME50"
}
```

#### Verify Razorpay Payment (`POST /api/v1/payments/verify`)

```json
{
  "ride_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "order_id": "order_P9xYz123456789",
  "payment_id": "pay_P9xZa987654321",
  "signature": "generated_hmac_sha256_hex_signature"
}
```

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## WebSocket Protocol

Socket.IO runs on the same HTTP server port as Express (`pingInterval: 10000ms`, `pingTimeout: 5000ms`). Every connection is authenticated via `socket_auth_middleware` before joining rooms.

### Connecting &amp; Authenticating

Pass the JWT in `auth.token` (recommended) or via the `Authorization` header:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5213", {
  auth: { token: "<jwt_token>" },
  withCredentials: true,
});
```

### Room Topology

- `user:<user_id>` — Automatically joined on connection for targeted personal notifications.
- `drivers:available` — Automatically joined on connection when `socket.user.role === "driver"`.
- `ride:<ride_id>` — Dynamically joined by rider and driver during an active trip via `ride:join`.

### Event Catalog

#### Client → Server Events

| Event | Role | Payload | Ack Callback | Description |
| :--- | :---: | :--- | :---: | :--- |
| `driver:update_location` | `driver` | `{ latitude, longitude, bearing?, speed?, ride_id? }` | `{ success, message }` | Persists live telemetry to `driver_profiles` and, if `ride_id` is set, broadcasts `ride:location_broadcast` to `ride:<ride_id>`. |
| `ride:join` | Any | `{ ride_id }` | `{ success, message }` | Subscribes the socket to room `ride:<ride_id>`. |
| `ride:leave` | Any | `{ ride_id }` | `{ success, message }` | Unsubscribes the socket from room `ride:<ride_id>`. |

#### Server → Client Events

| Event | Target Channel | Triggered When | Key Payload Fields |
| :--- | :--- | :--- | :--- |
| `ride:new_request` | `user:<driver_user_id>` | Rider requests a trip | `ride_id`, `pickup`, `dropoff`, `estimated_fare`, `distance_km`, `duration_minutes` |
| `ride:driver_assigned` | `user:<rider_id>` | Driver accepts the trip | `ride_id`, `driver` (`name`, `phone`, `rating`), `vehicle`, `driver_location` |
| `ride:location_broadcast` | `ride:<ride_id>` | Driver streams GPS telemetry | `driver_id`, `latitude`, `longitude`, `bearing`, `speed`, `timestamp` |
| `ride:driver_arrived` | `ride:<ride_id>` &amp; `user:<rider_id>` | Driver marks arrival at pickup | `ride_id`, `arrived_at` |
| `ride:started` | `ride:<ride_id>` | Driver validates 4-digit OTP | `ride_id`, `started_at` |
| `ride:completed` | `ride:<ride_id>` | Driver completes trip | `ride_id`, `final_fare`, `completed_at` |
| `ride:cancelled` | `ride:<ride_id>` | Rider or driver cancels trip | `ride_id`, `cancelled_by`, `reason`, `cancellation_fee` |
| `payment:successful` | `ride:<ride_id>` | Razorpay signature is verified | `ride_id`, `payment_id`, `amount`, `currency` |
| `driver:verification_updated` | `user:<driver_user_id>` | Admin approves/updates driver | `driver_id`, `is_verified`, `message`, `timestamp` |
| `sos:alert_broadcast` | `ride:<ride_id>` | Rider or driver triggers SOS | `alert_id`, `ride_id`, `user_id`, `coordinates`, `triggered_at`, `contacts_notified_count` |
| `admin:emergency_alert` | Global broadcast | Rider or driver triggers SOS | Full SOS payload + `emergency_contacts` + `ride_details` (`pickup`, `dropoff`) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Database Architecture

The data layer uses native parameterized SQL via `pg.Pool` (up to `20` concurrent connections in development, `30s` idle timeout) and explicit `BEGIN` / `COMMIT` / `ROLLBACK` transactions for multi-table writes (driver onboarding, multi-stop ride creation, payment capture + ledger settlement, and review rating recalculation).

<details>
<summary><strong>Expand Entity-Relationship Diagram (13 Core Tables)</strong></summary>

```mermaid
erDiagram
    users ||--o{ emergency_contacts : "has up to 5"
    users ||--o| driver_profiles : "registers as"
    driver_profiles ||--|| vehicle_details : "operates"
    users ||--o{ rides : "requests (rider)"
    driver_profiles ||--o{ rides : "fulfills (driver)"
    promo_codes ||--o{ rides : "discounts"
    rides ||--o{ ride_stops : "includes waypoints"
    rides ||--o| payments : "settled via"
    rides ||--o| driver_earnings : "credits"
    payments ||--o| driver_earnings : "funds"
    rides ||--o| reviews : "rated in"
    rides ||--o{ sos_alerts : "triggers"
    users ||--o{ sos_alerts : "initiates"
    users ||--o{ support_tickets : "submits"
    rides ||--o{ support_tickets : "references"

    users {
        uuid id PK
        string clerk_id
        string email UK
        string password_hash
        string phone_number
        string full_name
        string role "rider | driver | admin"
        string avatar_url
        boolean is_active
    }
    driver_profiles {
        uuid id PK
        uuid user_id FK
        string license_number UK
        boolean is_verified
        boolean is_online
        numeric current_latitude
        numeric current_longitude
        numeric bearing
        numeric speed
        numeric rating_average
        int total_rides
    }
    vehicle_details {
        uuid id PK
        uuid driver_id FK
        string make
        string model
        string plate_number UK
        string color
        string vehicle_category
    }
    fare_rules {
        uuid id PK
        string vehicle_category UK
        numeric base_fare
        numeric per_km_rate
        numeric per_minute_rate
        numeric minimum_fare
        numeric cancellation_fee
        numeric surge_multiplier
    }
    promo_codes {
        uuid id PK
        string code UK
        string discount_type "percentage | flat"
        numeric discount_value
        numeric max_discount
        numeric min_order_amount
        int usage_limit
        int times_used
        boolean is_active
        timestamp expires_at
    }
    rides {
        uuid id PK
        uuid rider_id FK
        uuid driver_id FK
        uuid promo_code_id FK
        string vehicle_category
        string status
        numeric total_distance_km
        int total_duration_minutes
        numeric estimated_fare
        numeric final_fare
        string otp_code
        numeric cancellation_fee
    }
    ride_stops {
        uuid id PK
        uuid ride_id FK
        int stop_order
        numeric latitude
        numeric longitude
        string address
        string status
    }
    payments {
        uuid id PK
        uuid ride_id FK
        uuid rider_id FK
        string order_id
        string payment_id
        string signature
        numeric amount
        string currency
        string payment_status "created | captured"
    }
    driver_earnings {
        uuid id PK
        uuid driver_id FK
        uuid ride_id FK
        uuid payment_id FK
        numeric gross_amount
        numeric platform_commission
        numeric net_driver_earnings
        string payout_status
    }
    reviews {
        uuid id PK
        uuid ride_id FK
        uuid rider_id FK
        uuid driver_id FK
        numeric rating
        string comment
    }
    emergency_contacts {
        uuid id PK
        uuid user_id FK
        string contact_name
        string phone_number
        string relationship
    }
    sos_alerts {
        uuid id PK
        uuid ride_id FK
        uuid user_id FK
        numeric latitude
        numeric longitude
        string status "triggered | acknowledged | resolved"
    }
    support_tickets {
        uuid id PK
        uuid user_id FK
        uuid ride_id FK
        string category
        string subject
        string description
        string status "open | in_progress | resolved | closed"
        string admin_response
    }
```

</details>

---

## Pricing &amp; Settlement Engine

### 1. Route Metrics (`map.service.js`)

Waypoints (`pickup` → ordered `stops` → `dropoff`) are measured segment-by-segment using the spherical **Haversine** formula ($R = 6371\text{ km}$), adjusted by a **+25% urban road-curve factor** (minimum $0.5\text{ km}$), and converted to travel minutes assuming an average city speed of $25\text{ km/h}$ plus $3\text{ minutes}$ of dwell time per intermediate stop (minimum $3\text{ minutes}$):

$$
d_{\text{route}} = \max\left(1.25 \sum_{i=1}^{n-1} d_{\text{Haversine}}(P_i, P_{i+1}),\ 0.5\right), \qquad t_{\text{route}} = \max\left(\left\lceil \frac{d_{\text{route}}}{25} \times 60 + 3 \cdot N_{\text{stops}} \right\rceil,\ 3\right)
$$

### 2. Category Fare &amp; Surge Calculation (`fare.service.js`)

For each vehicle category rule in `fare_rules`, the raw fare combines base, distance, and duration charges, enforces `minimum_fare`, and applies `surge_multiplier`:

$$
F_{\text{estimated}} = \text{round}_2\Big(\max\big(F_{\text{base}} + d_{\text{route}} \cdot r_{\text{km}} + t_{\text{route}} \cdot r_{\text{min}},\ F_{\text{min}}\big) \times M_{\text{surge}}\Big)
$$

### 3. Settlement Split &amp; GST Receipt Breakdown (`payment.service.js`, `receipt.service.js`)

- **Razorpay Signature Check**: Computes `HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)` before capturing funds.
- **Platform / Driver Ledger Split**: Deducts a **20%** platform commission and credits **80%** net earnings to `driver_earnings`.
- **Tax-Inclusive Receipt**: Extracts **5% GST** from the total fare ($F_{\text{net}} = F_{\text{total}} / 1.05$, $\text{GST} = F_{\text{total}} - F_{\text{net}}$).

---

## Security &amp; Error Handling

- **HTTP Hardening**: `helmet()` sets secure HTTP response headers; JSON and URL-encoded payloads are capped at `10mb`.
- **SQL Injection Prevention**: Every query in `src/models/*.js` uses `$1, $2, ...` parameterized placeholders.
- **Centralized Error Interceptor**: `global_error_handler` normalizes application `ApiError` instances, JWT failures, and PostgreSQL constraint errors into consistent HTTP status codes:
  - `23505` → `409 Conflict` (`DUPLICATE_RESOURCE`)
  - `23503` → `400 Bad Request` (`FOREIGN_KEY_VIOLATION`)
  - `22P02` → `400 Bad Request` (`INVALID_DATA_TYPE` for malformed UUIDs/types)
  - `JsonWebTokenError` / `TokenExpiredError` → `401 Unauthorized` (`INVALID_TOKEN` / `TOKEN_EXPIRED`)

---

## License

Distributed under the **ISC License**. See [`package.json`](./package.json) for package metadata.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
