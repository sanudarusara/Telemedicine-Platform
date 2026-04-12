# API Gateway

**Centralized Entry Point for Smart Healthcare Microservices Platform**

## 🎯 Purpose

The API Gateway serves as the **single entry point** for all client requests in our microservices architecture. It handles:

- ✅ **Authentication** — JWT verification in one place
- ✅ **Authorization** — Role-based access control (RBAC)
- ✅ **Routing** — Intelligent forwarding to backend services
- ✅ **Security** — Service-to-service authentication via API keys
- ✅ **Header Injection** — Adds trusted user context headers for downstream services

## 📐 Architecture

```
┌─────────────┐
│   Clients   │ (Web, Mobile)
│  (Browser)  │
└──────┬──────┘
       │ JWT Token
       ▼
┌─────────────────────────────────────┐
│         API Gateway :5400           │
│  • Verifies JWT                     │
│  • Checks User Role                 │
│  • Injects Headers (x-user-*)       │
│  • Adds API Key (x-api-key)         │
└──────┬──────────────┬───────────────┘
       │              │
       ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Patient    │  │    Audit     │  │ Notification │
│  Management  │  │  Management  │  │   Service    │
│   :5001      │  │    :5000     │  │    :5002     │
└──────────────┘  └──────────────┘  └──────────────┘
   Validates         Validates         Validates
   x-api-key         x-api-key         x-api-key
   Trusts            Trusts            Trusts
   x-user-* headers  x-user-* headers  x-user-* headers
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd api-gateway
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
# CRITICAL: Must match Patient Management Service JWT_SECRET
JWT_SECRET=your_shared_jwt_secret

# Gateway connects to PMS database to verify users
MONGO_URI=mongodb://localhost:27017/patient-management

# Internal service URLs (not exposed to internet)
PATIENT_SERVICE_URL=http://localhost:5001
AUDIT_SERVICE_URL=http://localhost:5000
NOTIFICATION_SERVICE_URL=http://localhost:5002

# Shared secret for service-to-service auth
INTERNAL_API_KEY=gateway-secret-key-change-in-production

PORT=5400
```

### 3. Start the Gateway

```bash
npm run dev
```

Gateway runs on `http://localhost:5400`

## 📡 API Routes

### Public Routes (No Authentication)

| Method | Endpoint | Proxies To | Description |
|--------|----------|------------|-------------|
| POST | `/api/patients/auth/register` | PMS | Register new user |
| POST | `/api/patients/auth/login` | PMS | Login & get JWT |

### Protected Routes (Authentication Required)

#### Patient Management

| Method | Endpoint | Access | Proxies To |
|--------|----------|--------|------------|
| GET | `/api/patients/auth/me` | All authenticated | PMS |
| GET/POST | `/api/patients/*` | Role-based | PMS |

#### Audit Management

| Method | Endpoint | Access | Proxies To |
|--------|----------|--------|------------|
| GET | `/api/audit/*` | ADMIN, DOCTOR | Audit Service |
| DELETE | `/api/audit/:id` | ADMIN only | Audit Service |

#### Notifications

| Method | Endpoint | Access | Proxies To |
|--------|----------|--------|------------|
| ALL | `/api/notifications/*` | All authenticated | Notification Service |

## 🔐 Security Features

### 1. JWT Verification

The gateway verifies JWTs issued by Patient Management Service:

```javascript
// Client request
Authorization: Bearer <jwt_token>

// Gateway verifies:
// ✓ Valid signature
// ✓ Not expired
// ✓ User still exists
// ✓ Account is active
```

### 2. Header Injection

On successful authentication, gateway adds trusted headers:

```
x-user-id: 507f1f77bcf86cd799439011
x-user-role: DOCTOR
x-user-email: doctor@hospital.com
x-user-name: Dr. Smith
x-api-key: gateway-secret-key
x-gateway: true
```

### 3. Service-to-Service Authentication

Downstream services validate `x-api-key` to ensure requests came from gateway.

## 🧪 Testing

### 1. Register a User

```bash
curl -X POST http://localhost:5400/api/patients/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. John",
    "email": "doctor@example.com",
    "password": "password123",
    "role": "DOCTOR"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:5400/api/patients/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123"
  }'
```

Returns:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "role": "DOCTOR", ... }
  }
}
```

### 3. Access Protected Route

```bash
curl http://localhost:5400/api/audit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏗️ Project Structure

```
api-gateway/
├── config/
│   ├── db.js              # MongoDB connection
│   └── services.js        # Microservice URLs
├── middleware/
│   ├── authenticate.js    # JWT verification
│   ├── authorize.js       # Role-based access control
│   └── gatewayHeaders.js  # Inject trusted headers
├── models/
│   └── User.js           # User model (read-only)
├── routes/
│   ├── auditProxy.js     # Audit service routes
│   ├── patientProxy.js   # Patient service routes
│   └── notificationProxy.js
├── app.js                # Express app configuration
├── server.js             # Server bootstrap
├── package.json
├── .env.example
└── README.md
```

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Must match PMS JWT secret |
| `MONGO_URI` | ✅ | Same database as PMS |
| `PATIENT_SERVICE_URL` | ✅ | Patient Management Service URL |
| `AUDIT_SERVICE_URL` | ✅ | Audit Management Service URL |
| `NOTIFICATION_SERVICE_URL` | ⚠️ | Notification Service URL |
| `INTERNAL_API_KEY` | ✅ | Shared secret with services |
| `PORT` | ⚠️ | Gateway port (default: 5400) |

## 🔒 Production Deployment

### Security Checklist

- [ ] Change `INTERNAL_API_KEY` to a strong random string
- [ ] Use environment-specific `JWT_SECRET`
- [ ] Enable HTTPS/TLS termination
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS properly
- [ ] Use internal network for service URLs
- [ ] Never expose service ports (5000, 5001, 5002) to internet
- [ ] Add rate limiting middleware
- [ ] Enable request logging/monitoring
- [ ] Set up health checks and alerts

### Docker Deployment

```bash
# Build image
docker build -t api-gateway .

# Run container
docker run -p 5400:5400 \
  --env-file .env \
  api-gateway
```

## 🐛 Troubleshooting

### Gateway can't connect to services

- Verify service URLs in `.env`
- Ensure all services are running
- Check network connectivity

### Authentication fails

- Verify `JWT_SECRET` matches PMS
- Check user exists and is active
- Confirm MongoDB connection

### Services reject gateway requests

- Verify `INTERNAL_API_KEY` matches across services
- Check `x-api-key` header is being sent

## 📚 Related Documentation

- [Patient Management Service](../patient-management-service/README.md)
- [Audit Management Service](../audit-management-service/README.md)
- [Microservices Architecture Guide](../docs/architecture.md)

---

**🏥 Smart Healthcare Platform** | API Gateway v1.0.0
