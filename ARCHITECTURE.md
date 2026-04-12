# Smart Healthcare Platform - Microservices Architecture

## Overview

A production-ready microservices architecture with proper separation of concerns:
- **Auth Service** owns all user authentication and identity
- **API Gateway** is stateless — verifies JWTs and routes requests
- **Patient Service** owns medical records only
- **Audit Service** receives all events via Kafka and stores audit logs
- **Event-Driven** communication via Apache Kafka
- **Database per Service** — each service owns its own MongoDB database

**Last Updated:** March 30, 2026

---

## Architecture Flow

A simplified request and event flow between platform components:

```
Client (Web / Mobile / CLI)
  |
  |---> API Gateway (stateless auth, header injection)
                |
                |---> Auth Service (register / login / tokens)
                |---> Patient Service (profiles, reports)
                |---> AI Symptom Service (symptom analysis)
                |---> Payment Service (create payments, webhooks)
                |
                +---> Kafka (events: user-registered, auth-events, patient-updated, symptom-analysis, payment-events)
                            |
                            +---> Audit Service (consume all topics, persist audit logs)

Databases:
  - auth-management (Auth Service)
  - patient-management (Patient Service)
  - ai-symptom (AI Symptom Service, optional)
  - payment (Payment Service, optional)
  - audit-management (Audit Service)
```

---

## Service Summary

| Service | Port | Database | Responsibilities |
|---------|------|----------|-----------------|
| **API Gateway** | 5400 (ext: 6000) | None | JWT verification, request routing, header injection |
| **Auth Service** | 5000 | `auth-management` | Registration, login, password hashing, JWT signing, user deactivation |
| **Patient Service** | 5001 | `patient-management` | Patient profiles, prescriptions, medical history, report uploads |
| **Audit Service** | 5002 | `audit-management` | Consuming all Kafka events, storing audit logs, querying logs |
| **AI Symptom Service** | 5010 | `ai-symptom` (optional) | Analyze symptom input, suggest likely conditions, provide structured findings |
| **Payment Service** | 5020 | `payment` (optional) | Create and verify payments, handle payment webhooks, publish payment events |

---

## Authentication & Authorization Flow

### Registration

```
Client → POST /api/auth/register
         ↓
    API Gateway (proxy — no auth needed)
         ↓
    Auth Service
    1. Validate input
    2. Check email uniqueness
    3. Hash password (bcrypt, 12 rounds)
    4. Create User in auth-management DB
    5. Sign JWT { id, role, email, name }
    6. Publish Kafka event: user-registered
         ↓ (async via Kafka)
    Patient Service (consumer)
    — If role === PATIENT: create empty Patient profile
         ↓
    Audit Service (consumer)
    — Store USER_REGISTERED audit log
```

### Login

```
Client → POST /api/auth/login
         ↓
    API Gateway (proxy — no auth needed)
         ↓
    Auth Service
    1. Find user by email
    2. Compare password with bcrypt
    3. Check isActive === true
    4. Sign JWT { id, role, email, name }
    5. Publish Kafka event: auth-events (LOGIN_SUCCESS)
         ↓
    Response: { token, user: { id, name, email, role } }
```

### Accessing a Protected Resource

```
Client → GET /api/patients/profile
         Authorization: Bearer <JWT>
         ↓
    API Gateway — authenticate middleware (STATELESS)
    1. Verify JWT signature with JWT_SECRET
    2. Decode payload: { id, role, email, name }
    3. Attach req.user — NO database lookup
    4. Inject trusted headers:
         x-user-id    = decoded.id
         x-user-role  = decoded.role
         x-user-email = decoded.email
         x-user-name  = decoded.name
         x-api-key    = INTERNAL_API_KEY
         x-gateway    = true
    5. Proxy to Patient Service
         ↓
    Patient Service — validateGatewayRequest middleware
    1. Verify x-gateway === 'true'
    2. Verify x-api-key === INTERNAL_API_KEY
    3. Extract req.user from headers
    4. Apply requireRole('PATIENT') check
    5. Execute business logic
```

---

## Role-Based Access Control (RBAC)

Three roles are defined in `auth-service/models/User.js`:

| Role | Description | Permissions |
|------|-------------|-------------|
| `PATIENT` | End-user patient | Own profile, own reports, own prescriptions |
| `DOCTOR` | Medical staff | Add prescriptions/history, view patients, view audit logs |
| `ADMIN` | Administrator | Full access — all patients, delete reports, delete audit logs |

RBAC is enforced in two places:

1. **API Gateway** (`middleware/authorize.js`) — for coarse-grained route protection (e.g., audit routes require DOCTOR or ADMIN)
2. **Individual Services** (`middleware/gatewayAuth.js` → `requireRole()`) — for fine-grained endpoint protection

---

## Kafka Event Flow

```
Auth Service                  Patient Service               Audit Service
     │                              │                             │
     │── user-registered ──────────►│ Creates Patient profile     │
     │                              │                             │
     │── user-registered ──────────────────────────────────────►│ Stores audit log
     │── user-deactivated ──────────────────────────────────────►│ Stores audit log
     │── auth-events ───────────────────────────────────────────►│ Stores audit log
     │                              │                             │
     │                 patient-updated ─────────────────────────►│ Stores audit log
```

**Topics used:**

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `user-registered` | Auth Service | Patient Service, Audit Service |
| `user-deactivated` | Auth Service | Patient Service, Audit Service |
| `auth-events` | Auth Service | Audit Service |
| `patient-updated` | Patient Service | Audit Service |

---

## Database Isolation

Each service connects to its own logical database on the shared MongoDB instance:

```
MongoDB :27017
├── auth-management       ← owned by auth-service
│   └── users
├── patient-management    ← owned by patient-service
│   ├── patients
│   └── reports
└── audit-management      ← owned by audit-service
    └── auditlogs
```

Services never query across database boundaries. Cross-service data is exchanged via Kafka events or the API gateway.

---

## Service Responsibilities (Detailed)

### API Gateway (:5400)

**Role:** Stateless request router and JWT verifier.

The gateway does **not** connect to MongoDB or Kafka. It only:
- Verifies the JWT signature using `JWT_SECRET`
- Extracts user claims from the token payload (id, role, email, name)
- Injects trusted headers into all forwarded requests
- Routes to the appropriate downstream service

**Endpoints:**
```
POST /api/auth/register      → proxy to auth-service (public)
POST /api/auth/login         → proxy to auth-service (public)
GET  /api/auth/me            → authenticate → proxy to auth-service
POST /api/auth/deactivate    → authenticate → proxy to auth-service
ALL  /api/patients/*         → authenticate → proxy to patient-service
ALL  /api/reports/*          → authenticate → proxy to patient-service
ALL  /api/audit/*            → authenticate + authorize(ADMIN,DOCTOR) → proxy to audit-service
```

**Files:**
```
api-gateway/
├── app.js                      routes wiring
├── server.js                   plain HTTP bootstrap (no DB/Kafka)
├── routes/
│   ├── authProxy.js            proxy to auth-service
│   ├── patientProxy.js         proxy to patient-service
│   ├── auditProxy.js           proxy to audit-service
│   └── notificationProxy.js   proxy to notification-service
├── middleware/
│   ├── authenticate.js         stateless JWT verification
│   ├── authorize.js            role check on req.user
│   └── gatewayHeaders.js       inject x-user-* and x-api-key headers
└── config/
    └── services.js             service URL constants
```

---

### Auth Service (:5000)

**Role:** Single source of truth for user identity.

Owns the `users` collection exclusively. Issues and signs all JWTs. Publishes auth events to Kafka.

**Endpoints:**
```
POST /api/auth/register      create user, return JWT
POST /api/auth/login         verify credentials, return JWT
GET  /api/auth/me            return profile (via gateway headers)
POST /api/auth/deactivate    soft-delete account (via gateway headers)
```

The `/me` and `/deactivate` routes require the gateway's `x-api-key` and `x-user-id` headers (set by the gateway after JWT verification).

**JWT Payload:**
```json
{ "id": "...", "role": "PATIENT", "email": "user@example.com", "name": "John Doe" }
```

Including `email` and `name` in the payload lets the gateway inject user headers into downstream requests without a DB lookup.

**Files:**
```
auth-service/
├── app.js
├── server.js
├── Dockerfile
├── .env.example
├── config/
│   ├── db.js               connects to auth-management
│   └── kafka.js            Kafka producer
├── models/User.js          User schema with bcrypt pre-save hook
├── repositories/userRepository.js
├── services/authService.js token generation + business logic
├── controllers/authController.js
├── routes/authRoutes.js
└── middleware/gatewayAuth.js   validates x-api-key + x-gateway headers
```

---

### Patient Management Service (:5001)

**Role:** Medical records and patient profiles.

The service does **not** hold a User model. User IDs are stored as plain ObjectIds (foreign key to auth-service). No cross-service joins are performed.

**Endpoints:**
```
GET  /api/patients/profile               PATIENT
PUT  /api/patients/profile               PATIENT
GET  /api/patients                       ADMIN
POST /api/patients/:userId/prescriptions DOCTOR, ADMIN
GET  /api/patients/:userId/prescriptions PATIENT, DOCTOR, ADMIN
POST /api/patients/:userId/history       DOCTOR, ADMIN
GET  /api/patients/:userId/history       PATIENT, DOCTOR, ADMIN
POST /api/reports/upload/:userId         PATIENT, DOCTOR, ADMIN
GET  /api/reports/:userId                PATIENT, DOCTOR, ADMIN
GET  /api/reports/single/:reportId       PATIENT, DOCTOR, ADMIN
DELETE /api/reports/:reportId            ADMIN
```

**Files:**
```
patient-management-service/
├── app.js
├── server.js
├── Dockerfile
├── .env.example
├── config/
│   ├── db.js               connects to patient-management
│   └── multerConfig.js     file upload config
├── models/
│   ├── Patient.js          no User ref (userId stored as plain ObjectId)
│   └── Report.js
├── repositories/
│   ├── patientRepository.js  no populate() calls
│   └── reportRepository.js
├── services/
│   ├── patientService.js
│   └── reportService.js
├── controllers/
│   ├── patientController.js
│   └── reportController.js
├── routes/
│   ├── patientRoutes.js
│   └── reportRoutes.js
├── kafka/consumer.js         user-registered → create Patient profile
├── kafka.js                  Kafka producer
└── middleware/gatewayAuth.js
```

---

### Audit Management Service (:5002)

**Role:** Compliance and audit logging.

Listens to every Kafka topic and persists a structured audit log entry. Exposes query endpoints for ADMIN and DOCTOR roles.

**Files:**
```
audit-management-service/
├── app.js
├── server.js
├── Dockerfile
├── config/
│   ├── db.js               connects to audit-management
│   └── kafka.js
├── models/AuditLog.js
├── controllers/auditController.js
├── routes/auditRoutes.js
├── kafka/consumer.js         subscribes to ALL topics
└── middleware/gatewayAuth.js

---

### AI Symptom Service (:5010)

**Role:** Analyze free-text or structured symptom input using heuristic or ML models to return likely conditions and suggested next steps. Publishes `symptom-analysis` events to Kafka and can be called by the client (via gateway) or by other services.

**Endpoints:**
```
POST /api/symptoms/analyze    → analyze symptoms, return structured findings
GET  /api/symptoms/:id        → get previous analysis (optional)
```

**Files (approx):**
```
ai-symptom-service/
├── app.js
├── server.js
├── routes/symptomRoutes.js
├── services/analysisService.js
├── models/Analysis.js
├── config/kafka.js
└── Dockerfile
```

**Kafka:** publishes `symptom-analysis` topic; Audit Service consumes for logging.

---

### Payment Service (:5020)

**Role:** Create and verify payments, expose webhook endpoints for payment provider notifications, and publish `payment-events` to Kafka for downstream processing and auditing.

**Endpoints:**
```
POST /api/payments/create     → create payment intent
POST /api/payments/webhook    → payment provider webhook (verify and process)
GET  /api/payments/:id        → payment status (internal)
```

**Files (approx):**
```
payment-service/
├── app.js
├── server.js
├── routes/paymentRoutes.js
├── services/paymentService.js
├── models/Payment.js
├── config/kafka.js
└── Dockerfile
```

**Kafka:** publishes `payment-events` (payment-created, payment-confirmed); Audit Service consumes for logging.
```

---

## Security Model

### Layer 1 — Public HTTPS boundary (API Gateway :5400)
- Only port 5400 is exposed to the internet
- `POST /register` and `POST /login` are the only unauthenticated endpoints
- All other endpoints require a valid `Authorization: Bearer <JWT>` header

### Layer 2 — JWT Verification (Gateway middleware)
- Signature verified against `JWT_SECRET`
- Expiry enforced — expired tokens return 401
- User claims read from token payload — no DB lookup
- Decoded claims injected as trusted headers for downstream services

### Layer 3 — Service-to-Service trust (Internal API key)
- Every downstream service validates `x-gateway: true` and `x-api-key`
- Requests not coming through the gateway are rejected with 401
- `INTERNAL_API_KEY` is shared via environment variables only

### Layer 4 — Role-Based Access Control
- Roles encoded in JWT: `PATIENT`, `DOCTOR`, `ADMIN`
- Enforced at gateway level (coarse): `authorize('ADMIN', 'DOCTOR')`
- Enforced at service level (fine): `requireRole('PATIENT')` per route

---

## Environment Variables

| Variable | Services | Description |
|----------|----------|-------------|
| `JWT_SECRET` | api-gateway, auth-service | Shared secret for JWT signing/verification |
| `JWT_EXPIRES_IN` | auth-service | Token TTL (default: 7d) |
| `MONGO_URI` | auth-service, patient-service, audit-service | Database connection string (per-service DB) |
| `KAFKA_BROKER` | auth-service, patient-service, audit-service | Internal Kafka broker (`kafka:29092` in Docker) |
| `INTERNAL_API_KEY` | all services | Shared secret for service-to-service auth |
| `AUTH_SERVICE_URL` | api-gateway | URL of auth-service |
| `PATIENT_SERVICE_URL` | api-gateway, audit-service | URL of patient-service |
| `AUDIT_SERVICE_URL` | api-gateway | URL of audit-service |
| `PORT` | all services | HTTP port each service listens on |

---

## Running with Docker Compose

```bash
# 1. Clone and configure secrets
cp api-gateway/.env.example api-gateway/.env
cp auth-service/.env.example auth-service/.env
cp patient-management-service/.env.example patient-management-service/.env

# 2. Set JWT_SECRET and INTERNAL_API_KEY in your shell (or a root .env file)
export JWT_SECRET=a_long_random_secret_at_least_32_chars
export INTERNAL_API_KEY=a_different_long_random_key

# 3. Build and start all services
docker compose up --build

# 4. Verify health endpoints
curl http://localhost:6000/health           # API Gateway
curl http://localhost:6000/api/auth/register -d '{}' -H 'Content-Type: application/json'
```

Startup order (enforced by healthcheck dependencies):
```
MongoDB + Zookeeper → Kafka → Auth Service → API Gateway
                           → Patient Service
                           → Audit Service
```

---

## Testing Checklist

### 1. Register a new patient
```http
POST http://localhost:6000/api/auth/register
Content-Type: application/json

{ "name": "Alice Patient", "email": "alice@test.com", "password": "pass1234", "role": "PATIENT" }
```
Expected: `201` with `token` and `user` object.

---

### 2. Login and capture the JWT
```http
POST http://localhost:6000/api/auth/login
Content-Type: application/json

{ "email": "alice@test.com", "password": "pass1234" }
```
Expected: `200` with JWT in `data.token`. Save this token.

---

### 3. Get current user profile
```http
GET http://localhost:6000/api/auth/me
Authorization: Bearer <token>
```
Expected: `200` with user details returned from auth-service.

---

### 4. View patient profile (PATIENT role)
```http
GET http://localhost:6000/api/patients/profile
Authorization: Bearer <token>
```
Expected: `200` — patient profile (auto-created by Kafka consumer when registering).

---

### 5. Register a doctor and add a prescription
```http
POST http://localhost:6000/api/auth/register
{ "name": "Dr. Bob", "email": "bob@hospital.com", "password": "doc1234", "role": "DOCTOR" }
```
Then login as doctor and:
```http
POST http://localhost:6000/api/patients/<alice_user_id>/prescriptions
Authorization: Bearer <doctor_token>
Content-Type: application/json

{ "medication": "Amoxicillin", "dosage": "500mg", "frequency": "3x daily" }
```
Expected: `200` with updated patient object.

---

### 6. View audit logs (DOCTOR role)
```http
GET http://localhost:6000/api/audit
Authorization: Bearer <doctor_token>
```
Expected: `200` — list of audit log entries from all Kafka events.

---

### 7. Try accessing audit logs as a PATIENT (should fail)
```http
GET http://localhost:6000/api/audit
Authorization: Bearer <patient_token>
```
Expected: `403 Forbidden`.

---

### 8. Test invalid token
```http
GET http://localhost:6000/api/patients/profile
Authorization: Bearer invalid.token.here
```
Expected: `401 Unauthorized`.
