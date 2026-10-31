const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  codeHash: {
    type: String,
    required: [true, 'Code hash is required']
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  },
  hourlyCount: {
    type: Number,
    default: 1
  },
  hourlyResetAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 60 * 1000)
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index: MongoDB deletes expired documents automatically
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);

