# Smart Healthcare Platform - Microservices

A production-ready microservices architecture for healthcare management with API Gateway, MongoDB, and Kafka.

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd DS

# 2. Copy environment file
cp .env.docker .env
# Edit .env and set JWT_SECRET and INTERNAL_API_KEY

# 3. Start all services
docker-compose up -d

# 4. Check services are running
docker-compose ps

# 5. Test the API
curl http://localhost:3000/health
```

**Access:** http://localhost:3000 (API Gateway)

### Manual Setup (Development)

```bash
# 1. Install dependencies for each service
cd api-gateway && npm install
cd ../patient-management-service && npm install
cd ../audit-management-service && npm install

# 2. Start infrastructure
docker-compose up -d mongodb kafka

# 3. Start services (in separate terminals)
cd api-gateway && npm run dev
cd patient-management-service && npm run dev
cd audit-management-service && npm run dev
```

## 📁 Project Structure

```
DS/
├── api-gateway/                 # Authentication & routing (Port 3000)
├── patient-management-service/  # Patient data & reports (Port 5001)
├── ai-symptom-service/          # Symptom analysis (Port 5010)
├── payment-service/             # Payments + webhooks (Port 5020)
├── audit-management-service/    # Audit logs (Port 5002)
├── docker-compose.yml           # Orchestrates all services
├── .env.docker                  # Environment template
├── ARCHITECTURE.md              # Detailed architecture docs
├── DOCKER.md                    # Docker usage guide
└── QUICKSTART.md                # Getting started guide
```

## 🏗️ Architecture

```
Client → API Gateway (Auth) → Microservices
                ↓
            MongoDB + Kafka
```

- **API Gateway**: Handles authentication, JWT verification, request routing
- **Patient Service**: Manages patient profiles, medical records, reports
- **AI Symptom Service**: Analyze symptom input and return suggested conditions
- **Payment Service**: Handles payment intents, verification, and webhooks
- **Audit Service**: Logs all system events for compliance
- **MongoDB**: Shared database for users + patient data
- **Kafka**: Event streaming for async communication

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams and flow.

## 🔑 API Endpoints

### Authentication (Public)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile

### AI Symptom (Authenticated / Public)
- `POST /api/symptoms/analyze` - Analyze symptoms, returns structured findings
- `GET /api/symptoms/:id` - Retrieve symptom analysis result (optional)

### Patients (Authenticated)
- `GET /api/patients/profile` - Get patient profile
- `PUT /api/patients/profile` - Update patient profile
- `GET /api/patients` - List all patients (ADMIN only)

### Reports (Authenticated)
- `POST /api/reports/upload/:userId` - Upload medical report
- `GET /api/reports/:userId` - Get patient reports

### Payments
- `POST /api/payments/create` - Create a payment intent (gateway → payment-service)
- `POST /api/payments/webhook` - Payment provider webhook (public, verify signature)
- `GET /api/payments/:id` - Get payment status (internal)

### Audit (ADMIN/DOCTOR)
- `GET /api/audit` - View audit logs
- `GET /api/audit/user/:userId` - User's audit trail

Full API documentation in [ARCHITECTURE.md](ARCHITECTURE.md#api-documentation).

## 🧪 Testing

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"PATIENT"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Use the returned token for authenticated requests
curl http://localhost:3000/api/patients/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔒 Security

- **Centralized Authentication**: JWT verification at API Gateway
- **Service Isolation**: Internal services not publicly exposed
- **API Key Validation**: Services validate `x-api-key` header
- **Password Security**: bcrypt hashing with 12 salt rounds
- **RBAC**: Role-based access control (PATIENT/DOCTOR/ADMIN)

## 🛠️ Development

```bash
# Install dependencies
npm run install:all

# Run in development mode
npm run dev:gateway
npm run dev:patient
npm run dev:audit

# Build Docker images
docker-compose build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Monitoring

```bash
# Check service health
curl http://localhost:3000/health
curl http://localhost:5001/health
curl http://localhost:5002/health

# View Docker stats
docker stats

# View logs
docker-compose logs -f [service-name]
```

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Complete architecture documentation
- [DOCKER.md](DOCKER.md) - Docker commands and troubleshooting
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Add your license here]

## 👥 Team

[Add team members here]

---

**Built with:** Node.js, Express, MongoDB, Apache Kafka, Docker
