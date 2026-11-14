const ChangeRequest = require('../models/ChangeRequest');
const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const Parameter = require('../models/Parameter');
const Site = require('../models/Site');
const User = require('../models/User');
const crypto = require('crypto');

// @desc    Get change requests (Admin gets all, Site Engineer gets their own or site-scoped)
// @route   GET /api/change-requests
// @access  Private
exports.getChangeRequests = async (req, res, next) => {
  try {
    const { status, site, entityType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (site) filter.site = site;
    if (entityType) filter.entityType = entityType;

    if (req.user.role === 'site_engineer') {
      filter.requestedBy = req.user._id;
    }

    const requests = await ChangeRequest.find(filter)
      .populate('requestedBy', 'name email role')
      .populate('site', 'name location region')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get count of pending change requests (Admin only)
// @route   GET /api/change-requests/pending-count
// @access  Private/Admin
exports.getPendingCount = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const count = await ChangeRequest.countDocuments({ status: 'pending' });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a change request and apply payload to real entity (Admin only)
// @route   PUT /api/change-requests/:id/approve
// @access  Private/Admin
exports.approveChangeRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const request = await ChangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Change request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Change request has already been ${request.status}`
      });
    }

    const { entityType, action, targetId, payload } = request;
    const dataToApply = (payload && payload.form) ? payload.form : payload;

    // Apply payload based on entityType and action
    if (entityType === 'device') {
      if (action === 'create') {
        const apiKey = dataToApply.apiKey || `mgv_${crypto.randomBytes(16).toString('hex')}`;
        await Device.create({ ...dataToApply, apiKey, site: request.site });
      } else if (action === 'update') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for update action' });
        await Device.findByIdAndUpdate(targetId, dataToApply, { new: true, runValidators: true });
      } else if (action === 'delete') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for delete action' });
        await Promise.all([
          Sensor.deleteMany({ device: targetId }),
          SensorReading.deleteMany({ device: targetId }),
          Alert.deleteMany({ device: targetId }),
          Device.findByIdAndDelete(targetId)
        ]);
      }
    } else if (entityType === 'sensor') {
      if (action === 'create') {
        await Sensor.create(dataToApply);
      } else if (action === 'update') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for update action' });
        await Sensor.findByIdAndUpdate(targetId, dataToApply, { new: true, runValidators: true });
      } else if (action === 'delete') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for delete action' });
        await Sensor.findByIdAndDelete(targetId);
      }
    } else if (entityType === 'parameter') {
      if (action === 'create') {
        await Parameter.create(dataToApply);
      } else if (action === 'update') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for update action' });
        await Parameter.findByIdAndUpdate(targetId, dataToApply, { new: true, runValidators: true });
      } else if (action === 'delete') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for delete action' });
        // Deactivate parameter
        await Parameter.findByIdAndUpdate(targetId, { active: false }, { new: true });
      }
    } else if (entityType === 'site') {
      if (action === 'create') {
        const siteData = { ...dataToApply, createdBy: request.requestedBy };
        const newSite = await Site.create(siteData);
        const io = req.app.get('io');
        if (io) io.emit('site_created', newSite);
      } else if (action === 'update') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for update action' });
        // Handle threshold-only updates
        const updatePayload = payload.isThresholdUpdate
          ? { thresholds: dataToApply.thresholds }
          : dataToApply;
        const updatedSite = await Site.findByIdAndUpdate(targetId, updatePayload, { new: true, runValidators: true })
          .populate('thresholds.parameter', 'key label unit');
        const io = req.app.get('io');
        if (io) io.emit('site_updated', updatedSite);
      } else if (action === 'delete') {
        if (!targetId) return res.status(400).json({ success: false, message: 'Missing targetId for delete action' });
        const siteToDelete = await Site.findById(targetId);
        if (siteToDelete) {
          if (siteToDelete.assignedEngineer) {
            await User.findByIdAndUpdate(siteToDelete.assignedEngineer, { assignedSite: null, role: 'registered_user' });
          }
          const siteDevices = await Device.find({ site: targetId }).select('_id');
          const siteDevIds = siteDevices.map(d => d._id);
          await Promise.all([
            Sensor.deleteMany({ device: { $in: siteDevIds } }),
            SensorReading.deleteMany({ device: { $in: siteDevIds } }),
            Alert.deleteMany({ device: { $in: siteDevIds } }),
            Device.deleteMany({ site: targetId }),
            siteToDelete.deleteOne()
          ]);
        }
        const io = req.app.get('io');
        if (io) io.emit('site_deleted', targetId);
      }
    }

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const io = req.app.get('io');
    if (io && (entityType === 'device' || entityType === 'sensor')) {
      io.emit('device_status_changed', {
        targetType: entityType,
        targetId,
        action
      });
    }

    const updatedRequest = await ChangeRequest.findById(request._id)
      .populate('requestedBy', 'name email role')
      .populate('site', 'name location region')
      .populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Request approved and changes applied successfully.',
      data: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a change request (Admin only)
// @route   PUT /api/change-requests/:id/reject
// @access  Private/Admin
exports.rejectChangeRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const request = await ChangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Change request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Change request has already been ${request.status}`
      });
    }

    const { adminNote } = req.body;

    request.status = 'rejected';
    request.adminNote = adminNote || 'Rejected by administrator.';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const updatedRequest = await ChangeRequest.findById(request._id)
      .populate('requestedBy', 'name email role')
      .populate('site', 'name location region')
      .populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Change request rejected.',
      data: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};
