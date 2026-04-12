const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const appointmentRoutes = require('./routes/appointmentRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ========== ENVIRONMENT DETECTION ==========
const isDocker = process.env.DOCKER_ENV === 'true' || 
         process.env.MONGODB_URI !== undefined ||
         process.env.RUNNING_IN_DOCKER === 'true';

let mongoURI;
if (process.env.MONGODB_URI) {
  mongoURI = process.env.MONGODB_URI;
  console.log('📌 Using MongoDB URI from environment variable');
} else if (isDocker) {
  mongoURI = 'mongodb://mongodb:27017/appointment-service';
  console.log('🐳 Running in Docker, using service name: mongodb');
} else {
  mongoURI = 'mongodb://localhost:27017/appointment-service';
  console.log('💻 Running locally, using localhost');
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (!isDocker) {
      console.error('For local MongoDB: run "docker run -d -p 27017:27017 --name mongodb mongo:6"');
    }
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/appointments', appointmentRoutes);

// Health checks
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'appointment-service',
    environment: isDocker ? 'docker' : 'local',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/health/detailed', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
  res.status(200).json({
    service: 'appointment-service',
    status: 'running',
    environment: isDocker ? 'docker' : 'local',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus[dbState],
      name: mongoose.connection.name || 'not connected',
      host: mongoose.connection.host || 'not connected'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'Appointment Service',
    version: '1.0.0',
    description: 'Manages doctor appointments, scheduling, and tracking',
    environment: isDocker ? 'Docker Container' : 'Local Development',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      appointments: '/api/appointments',
      searchDoctors: '/api/appointments/doctors/search',
      availableSlots: '/api/appointments/doctors/available-slots'
    }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/', '/health', '/health/detailed', '/api/appointments', '/api/appointments/doctors/search', '/api/appointments/doctors/available-slots'
    ]
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`\nAppointment Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Closing HTTP server and MongoDB connection...');
  server.close(async () => {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Closing HTTP server and MongoDB connection...');
  server.close(async () => {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
