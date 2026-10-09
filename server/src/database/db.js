const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/visit_log';

const connectDb = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`DB connected successfully to ${MONGO_URI}`);
  } catch (error) {
    console.error('Unable to connect to DB:', error.message);
  }
};

module.exports = connectDb;