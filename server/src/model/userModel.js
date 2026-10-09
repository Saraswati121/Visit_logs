const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    role: { type: String, default: null }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('users', userSchema);

module.exports = User;
