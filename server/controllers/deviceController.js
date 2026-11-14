const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const Site = require('../models/Site');
const ChangeRequest = require('../models/ChangeRequest');
const crypto = require('crypto');

// @desc    Get all devices (with populated sensors for health & status monitoring)
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

    const devices = await Device.find(query).populate('site', 'name location region').lean();

    // Attach sensors to each device
    const deviceIds = devices.map(d => d._id);
    const sensors = await Sensor.find({ device: { $in: deviceIds } })
      .populate('parameter', 'key label unit')
      .lean();

    const sensorsByDevice = {};
    for (const sensor of sensors) {
      const devId = sensor.device.toString();
      if (!sensorsByDevice[devId]) sensorsByDevice[devId] = [];
      sensorsByDevice[devId].push(sensor);
    }

    const devicesWithSensors = devices.map(dev => ({
      ...dev,
      sensors: sensorsByDevice[dev._id.toString()] || []
    }));

    // Never expose device apiKey to non-admin users
    if (req.user && req.user.role !== 'admin') {
      devicesWithSensors.forEach(d => { delete d.apiKey; });
    }

    res.status(200).json({ success: true, count: devicesWithSensors.length, data: devicesWithSensors });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single device (with sensors attached)
// @route   GET /api/devices/:id
// @access  Private
exports.getDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id).populate('site', 'name location region').lean();
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    const sensors = await Sensor.find({ device: device._id })
      .populate('parameter', 'key label unit')
      .lean();
    device.sensors = sensors;

    // Never expose device apiKey to non-admin users
    if (req.user && req.user.role !== 'admin') {
      delete device.apiKey;
    }

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

    // Site engineer scope check — goes through ChangeRequest
    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== siteId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to add devices to your assigned site.'
        });
      }

      // Submit as ChangeRequest for admin approval
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: siteId,
        entityType: 'device',
        action: 'create',
        payload: { form: req.body, targetSummary: `New Device: ${device_id}` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Device creation request submitted for admin approval.',
        data: changeRequest
      });
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

    const io = req.app.get('io');
    if (io) {
      io.emit('device_status_changed', {
        targetType: 'device',
        deviceId: device._id,
        action: 'create',
        device: {
          _id: device._id,
          device_id: device.device_id,
          status: device.status,
          site: device.site
        }
      });
    }

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

    // Handle fault metadata on status changes
    if (req.body.status) {
      if (req.body.status === 'active') {
        req.body.fault_reason = null;
        req.body.faulty_since = null;
        req.body.auto_flagged = false;
      } else if (['faulty', 'inactive', 'maintenance'].includes(req.body.status)) {
        if (!req.body.fault_reason) {
          req.body.fault_reason = req.body.status === 'faulty'
            ? 'Manually set to faulty'
            : req.body.status === 'maintenance'
              ? 'Scheduled maintenance'
              : 'Manually set to inactive';
        }
        if (!req.body.faulty_since) {
          req.body.faulty_since = new Date();
        }
        if (req.body.auto_flagged === undefined) {
          req.body.auto_flagged = false;
        }
      }
    }

    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('site', 'name location region');

    const io = req.app.get('io');
    if (io) {
      io.emit('device_status_changed', {
        targetType: 'device',
        deviceId: updatedDevice._id,
        action: 'update',
        device: {
          _id: updatedDevice._id,
          device_id: updatedDevice.device_id,
          status: updatedDevice.status,
          site: updatedDevice.site
        }
      });
    }

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
        payload: { 
          device_id: device.device_id,
          targetSummary: `Device ${device.device_id}`
        },
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

    // Cascade cleanup: delete associated sensors, readings, and alerts for this device
    await Promise.all([
      Sensor.deleteMany({ device: device._id }),
      SensorReading.deleteMany({ device: device._id }),
      Alert.deleteMany({ device: device._id }),
      device.deleteOne()
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('device_status_changed', {
        targetType: 'device',
        deviceId: device._id,
        action: 'delete'
      });
    }

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
