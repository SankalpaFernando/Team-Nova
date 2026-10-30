const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  installation_date: {
    type: Date,
    required: [true, 'Installation date is required']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'faulty'],
    default: 'active'
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: [true, 'Site is required']
  },
  // Default is 900 seconds (15 min) for field deployment (battery/solar).
  // For wall-powered prototype/demo devices, can be set lower (e.g. 30s).
  sampling_interval_seconds: {
    type: Number,
    default: 900
  },
  lastSeen: { type: Date, default: null },
  fault_reason: { type: String, default: null },
  faulty_since: { type: Date, default: null },
  auto_flagged: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Device', deviceSchema);
