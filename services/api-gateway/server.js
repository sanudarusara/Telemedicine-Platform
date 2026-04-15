require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 5400;

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  API Gateway running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Routing to:`);
  console.log(`    Auth Service:       ${process.env.AUTH_SERVICE_URL || 'http://localhost:5000'}`);
  console.log(`    Patient Service:    ${process.env.PATIENT_SERVICE_URL || 'http://localhost:5001'}`);
  console.log(`    Audit Service:      ${process.env.AUDIT_SERVICE_URL || 'http://localhost:5002'}`);
  console.log(`    Notification Service:${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003'}`);
  console.log(`    Payment Service:    ${process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004'}`);
  console.log(`    AI Symptom Service: ${process.env.AI_SYMPTOM_SERVICE_URL || 'http://localhost:5005'}`);
  console.log(`${'='.repeat(60)}\n`);
});