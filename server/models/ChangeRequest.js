const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester is required']
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    default: null
  },
  entityType: {
    type: String,
    enum: ['device', 'sensor', 'parameter', 'site'],
    required: [true, 'Entity type is required']
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: [true, 'Action is required']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: false
});

changeRequestSchema.index({ status: 1, createdAt: -1 });
changeRequestSchema.index({ requestedBy: 1, createdAt: -1 });
changeRequestSchema.index({ site: 1 });

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
