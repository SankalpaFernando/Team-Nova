const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  reading: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SensorReading',
    required: true
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  },
  parameter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parameter',
    required: true
  },
  // Denormalized at write-time for backwards compatibility & persistence if parameter changes
  parameter_name: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  severity_level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  measured_value: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'active', 'pending_confirmation', 'resolved'],
    default: 'unread'
  },
  message: {
    type: String,
    required: true
  },
  sms_sent: {
    type: Boolean,
    default: false
  },
  sms_sent_at: {
    type: Date,
    default: null
  },
  email_sent: {
    type: Boolean,
    default: false
  },
  email_sent_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

alertSchema.index({ device: 1, created_at: -1 });
alertSchema.index({ device: 1, parameter: 1, sms_sent: 1, sms_sent_at: -1 });
alertSchema.index({ device: 1, parameter: 1, email_sent: 1, email_sent_at: -1 });
alertSchema.index({ status: 1 });


module.exports = mongoose.model('Alert', alertSchema);
