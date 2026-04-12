# 🚀 Quick Start Guide - API Gateway Architecture

## What Changed?

You now have a **proper microservices architecture** where:
- ✅ All client requests go through the **API Gateway** (port 3000)
- ✅ Authentication (JWT verification) happens **once** at the gateway
- ✅ Services trust the gateway and read user info from headers
- ✅ No more duplicate auth code in each service

## Setup Steps

### 1. Update All .env Files

#### API Gateway (.env)
```bash
cd api-gateway
cp .env.example .env
```

Edit and set:
```env
JWT_SECRET=same-secret-as-patient-service
MONGO_URI=mongodb://localhost:27017/patient-management
INTERNAL_API_KEY=gateway-secret-key-123
```

#### Audit Service (.env)
```bash
cd ../audit-management-service
```

Edit `.env` and add:
```env
INTERNAL_API_KEY=gateway-secret-key-123
```

#### Patient Service (.env)
```bash
cd ../patient-management-service
```

Verify `.env` has:
```env
JWT_SECRET=same-secret-as-gateway
```

### 2. Start Services (Correct Order)

```bash
# Terminal 1: MongoDB & Kafka
docker-compose up -d

# Terminal 2: Patient Management Service
cd patient-management-service
npm run dev

# Terminal 3: Audit Management Service  
cd audit-management-service
npm run dev

# Terminal 4: API Gateway (NEW!)
cd api-gateway
npm run dev
```

## ⚠️ IMPORTANT: Change Your Client URLs

### ❌ OLD (Direct service access)
```javascript
// DON'T use anymore:
POST http://localhost:5001/api/auth/login
GET  http://localhost:5000/api/audit
```

### ✅ NEW (Through gateway)
```javascript
// Use gateway URL for everything:
POST http://localhost:3000/api/patients/auth/login
GET  http://localhost:3000/api/audit
```

## Testing the Setup

### Step 1: Register a Doctor
```bash
curl -X POST http://localhost:3000/api/patients/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "doctor@test.com",
    "password": "password123",
    "role": "DOCTOR"
  }'
```

### Step 2: Login
```bash
curl -X POST http://localhost:3000/api/patients/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "password123"
  }'
```

Copy the `token` from the response.

### Step 3: Access Audit Logs
```bash
curl http://localhost:3000/api/audit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected result: ✅ See audit logs (if DOCTOR or ADMIN role)

### Step 4: Try as Patient (Should Fail)
```bash
# Register a patient
curl -X POST http://localhost:3000/api/patients/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Patient",
    "email": "patient@test.com",
    "password": "password123",
    "role": "PATIENT"
  }'

# Login as patient
curl -X POST http://localhost:3000/api/patients/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "password123"
  }'

# Try to access audit logs
curl http://localhost:3000/api/audit \
  -H "Authorization: Bearer PATIENT_TOKEN_HERE"
```

Expected result: ❌ 403 Forbidden (correct! Patients can't access audit logs)

## Port Summary

| Service | Port | Access |
|---------|------|--------|
| **API Gateway** | 3000 | ✅ **Public** - Use this! |
| Patient Service | 5001 | ⚠️ Internal only |
| Audit Service | 5000 | ⚠️ Internal only |
| Notification | 5002 | ⚠️ Internal only |
| MongoDB | 27017 | ⚠️ Internal only |
| Kafka | 9092 | ⚠️ Internal only |

## Troubleshooting

### Gateway won't start
```bash
# Check if PMS database is running
mongosh mongodb://localhost:27017/patient-management

# Check if JWT_SECRET matches PMS
# Compare .env files in api-gateway and patient-management-service
```

### Can't access audit logs
```bash
# Verify user role
curl http://localhost:3000/api/patients/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show role: DOCTOR or ADMIN
```

### "Invalid API key" error
```bash
# Verify INTERNAL_API_KEY is the same in:
# - api-gateway/.env
# - audit-management-service/.env
```

## What to Tell Your Team

1. **Frontend developers**: Change all API URLs to `http://localhost:3000`
2. **Mobile developers**: Use gateway URL for all requests
3. **Backend developers**: Services now trust gateway headers, no JWT verification needed in services
4. **DevOps**: Only expose port 3000 publicly, keep 5000-5002 internal

## Next Steps

- [ ] Update frontend configuration to use gateway URL
- [ ] Add rate limiting to gateway
- [ ] Set up monitoring/logging on gateway
- [ ] Configure CORS on gateway
- [ ] Add more services (notification, etc.)
- [ ] Deploy to production with HTTPS

---

**Questions?** Check:
- [Gateway README](api-gateway/README.md)
- [Architecture Documentation](ARCHITECTURE.md)
