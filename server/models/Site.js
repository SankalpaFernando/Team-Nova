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
  thresholds: {
    pH: { min: { type: Number, default: 6.5 }, max: { type: Number, default: 8.5 } },
    temperature: { min: { type: Number, default: 20 }, max: { type: Number, default: 35 } },
    salinity: { min: { type: Number, default: 0 }, max: { type: Number, default: 45 } },
    dissolved_o2: { min: { type: Number, default: 4 }, max: { type: Number, default: 15 } }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Site', siteSchema);
