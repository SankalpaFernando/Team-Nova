const Device = require('../models/Device');
const Site = require('../models/Site');
const ChangeRequest = require('../models/ChangeRequest');
const crypto = require('crypto');

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
exports.getDevices = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.site) query.site = req.query.site;
    if (req.query.status) query.status = req.query.status;

    if (req.user && req.user.role === 'site_engineer') {
      if (!req.user.assignedSite) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.site = req.user.assignedSite;
    }

    const devices = await Device.find(query).populate('site', 'name location region');
    res.status(200).json({ success: true, count: devices.length, data: devices });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
exports.getDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id).populate('site', 'name location region');
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
    res.status(200).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};

// @desc    Create device
// @route   POST /api/devices
// @access  Private (Admin or Site Engineer for target site)
exports.createDevice = async (req, res, next) => {
  try {
    const { site: siteId, device_id, installation_date, status, sampling_interval_seconds } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ success: false, message: 'Target site not found' });

    // Site engineer scope check
    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== siteId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to add devices to your assigned site.'
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }

    // Generate unique API key for hardware authentication if not provided
    const apiKey = req.body.apiKey || `mgv_${crypto.randomBytes(16).toString('hex')}`;

    const device = await Device.create({
      device_id,
      apiKey,
      installation_date: installation_date || new Date(),
      status: status || 'active',
      site: siteId,
      sampling_interval_seconds: sampling_interval_seconds || 900
    });

    res.status(201).json({
      success: true,
      data: device,
      apiKeyNotice: 'Save this API key for firmware setup. It will be used as x-device-key header.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private (Admin or Site Engineer for device site)
exports.updateDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== device.site.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to update devices at your assigned site.'
        });
      }

      // Compute diff between current device and proposed changes
      const changes = {};
      Object.keys(req.body).forEach(key => {
        const oldVal = device[key] !== undefined ? device[key] : null;
        const newVal = req.body[key];
        const oldStr = oldVal && oldVal._id ? oldVal._id.toString() : String(oldVal ?? '');
        const newStr = newVal && newVal._id ? newVal._id.toString() : String(newVal ?? '');
        if (oldStr !== newStr) {
          changes[key] = { old: oldVal, new: newVal };
        }
      });

      // Create ChangeRequest for site_engineer
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: device.site,
        entityType: 'device',
        action: 'update',
        targetId: device._id,
        payload: { form: req.body, changes, targetSummary: `Device ${device.device_id}` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }

    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('site', 'name location region');

    res.status(200).json({ success: true, data: updatedDevice });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private (Admin or Site Engineer for device site)
exports.deleteDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== device.site.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to delete devices at your assigned site.'
        });
      }

      // Create ChangeRequest for site_engineer
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: device.site,
        entityType: 'device',
        action: 'delete',
        targetId: device._id,
        payload: { device_id: device.device_id },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }

    await device.deleteOne();
    res.status(200).json({ success: true, message: 'Device removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate API key for a device
// @route   PUT /api/devices/:id/regen-key
// @access  Private (Admin or Site Engineer)
exports.regenerateApiKey = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== device.site.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to manage devices at your assigned site.'
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }

    const newApiKey = `mgv_${crypto.randomBytes(16).toString('hex')}`;
    device.apiKey = newApiKey;
    await device.save();

    res.status(200).json({
      success: true,
      data: device,
      apiKey: newApiKey,
      message: 'New API key generated successfully'
    });
  } catch (error) {
    next(error);
  }
};