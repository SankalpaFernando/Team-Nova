const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Device reference is required']
  },
  parameter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parameter',
    required: [true, 'Parameter reference is required']
  },
  model_name: {
    type: String,
    trim: true,
    default: 'Generic Probe'
  },
  serial_number: {
    type: String,
    trim: true,
    default: ''
  },
  calibration_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'faulty'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

sensorSchema.index({ device: 1 });
sensorSchema.index({ parameter: 1 });

module.exports = mongoose.model('Sensor', sensorSchema);
