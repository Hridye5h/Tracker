const mongoose = require('mongoose');

// Connect to MongoDB. Mongoose 7+ no longer needs the old parser options
// (useNewUrlParser / useUnifiedTopology / useCreateIndex) — they're defaults.
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;
