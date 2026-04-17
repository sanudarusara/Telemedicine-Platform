const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Environment detection
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.MONGODB_URI !== undefined;
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service';

// Database connection
mongoose.connect(mongoURI)
    .then(() => console.log(`✅ MongoDB Connected: ${mongoURI}`))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// Routes
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'notification-service', environment: isDocker ? 'docker' : 'local' });
});

app.get('/', (req, res) => {
    res.json({ service: 'Notification Service', version: '1.0.0' });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
    console.log(`\nNotification Service running on port ${PORT}`);
});

module.exports = app;
