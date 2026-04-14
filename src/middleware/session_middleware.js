// src/middleware/session_middleware.js
const session = require("express-session");
const MongoStore = require("connect-mongo").default;  // Use the default export

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your_secret_key",  // Use SESSION_SECRET from .env
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,  // 1 day
    secure: false,  // Set true if using HTTPS
    httpOnly: true,
    sameSite: "lax",
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,  // MongoDB URI from .env file
    collectionName: "sessions",  // Store sessions in the "sessions" collection
  }),
});

module.exports = sessionMiddleware;