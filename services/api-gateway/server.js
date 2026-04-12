require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 5400;

/**
 * API Gateway Bootstrap
 *
 * The gateway is now fully stateless — it does NOT connect to MongoDB or Kafka.
 * - JWT verification is done by verifying the signature with JWT_SECRET only.
 * - All auth logic (register, login, user storage) lives in auth-service.
 * - The gateway routes requests and injects trusted headers for downstream services.
 */
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  API Gateway running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Routing to:`);
  console.log(`    Auth Service:    ${process.env.AUTH_SERVICE_URL || 'http://localhost:5000'}`);
  console.log(`    Patient Service: ${process.env.PATIENT_SERVICE_URL || 'http://localhost:5001'}`);
  console.log(`    Audit Service:   ${process.env.AUDIT_SERVICE_URL || 'http://localhost:5002'}`);
  console.log(`${'='.repeat(60)}\n`);
});
