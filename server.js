const dotenv = require('dotenv');

// Load environment variables before anything else needs them.
dotenv.config({ path: './config/config.env' });

const connectDB = require('./config/db');
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Fail loudly on an unhandled rejection instead of dying silently.
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
