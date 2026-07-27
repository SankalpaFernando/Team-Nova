const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
    maxlength: [150, 'Name cannot exceed 150 characters'],
    unique: [true, 'Site name must be unique']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true,
    enum: ['Northern', 'Southern', 'Eastern', 'Western']
  },
  assignedEngineer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  thresholds: [{
    parameter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parameter',
      required: true
    },
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Site', siteSchema);
