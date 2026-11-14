const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Parameter key is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  label: {
    type: String,
    required: [true, 'Parameter label is required'],
    trim: true
  },
  unit: {
    type: String,
    default: '',
    trim: true
  },
  valid_min: {
    type: Number,
    default: null
  },
  valid_max: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    trim: true
  },
  scope: {
    type: String,
    enum: ['global', 'site'],
    default: 'global'
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Parameter', parameterSchema);
