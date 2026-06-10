const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/error');

// The Express app is built here (separately from server.js) so tests can
// import it with Supertest without opening a real network port.
const app = express();

// Render/Heroku run the app behind a proxy; trust the first hop so the real
// client IP (from X-Forwarded-For) is used for rate limiting.
app.set('trust proxy', 1);

// Body parser
app.use(express.json());

// --- Security middleware ---
// Helmet sets safe HTTP headers. CSP is disabled because the bundled SPA +
// Google Fonts need a custom policy (a tailored CSP is a roadmap item); every
// other Helmet protection (HSTS, noSniff, frameguard, etc.) stays enabled.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize()); // strips `$` and `.` from input keys -> blocks NoSQL injection
app.use(cors());          // lets the React client (different origin) call the API
if (process.env.NODE_ENV !== 'test') {
  // basic abuse protection: 200 requests / 10 min / IP
  app.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 200 }));
}

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // request logging in dev
}

// --- API routes ---
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/transactions', require('./routes/transactions'));
app.use('/api/v1/accounts', require('./routes/accounts'));

// --- Serve the React build in production ---
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
  );
}

// Central error handler — must be registered last.
app.use(errorHandler);

module.exports = app;
