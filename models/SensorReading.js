const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  sensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: [true, 'Sensor reference is required']
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Device reference is required']
  },
  value: {
    type: Number,
    required: [true, 'Reading value is required']
  },
  recorded_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Index for efficient time-series queries
sensorReadingSchema.index({ device: 1, recorded_at: -1 });
sensorReadingSchema.index({ sensor: 1, recorded_at: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);