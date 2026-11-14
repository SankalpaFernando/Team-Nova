const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['threshold', 'sensor_offline', 'device_offline', 'system_offline'],
    default: 'threshold'
  },
  reading: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SensorReading',
    required: function() { return !this.type || this.type === 'threshold'; }
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: function() { return this.type !== 'system_offline'; }
  },
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: function() { return !this.type || this.type === 'threshold'; }
  },
  parameter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parameter',
    required: function() { return !this.type || this.type === 'threshold'; }
  },
  // Denormalized at write-time for backwards compatibility & persistence if parameter changes
  parameter_name: {
    type: String,
    required: function() { return !this.type || this.type === 'threshold'; }
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
    required: function() { return !this.type || this.type === 'threshold'; }
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
alertSchema.index({ type: 1, status: 1 });
alertSchema.index({ status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
