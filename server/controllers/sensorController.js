const Sensor = require('../models/Sensor');
const Device = require('../models/Device');
const ChangeRequest = require('../models/ChangeRequest');

// @desc    Get sensors (with optional device or site filtering)
// @route   GET /api/sensors
// @access  Private
exports.getSensors = async (req, res, next) => {
  try {
    const { device, site } = req.query;
    const filter = {};

    if (req.user && req.user.role === 'site_engineer') {
      const assignedSite = req.user.assignedSite;
      if (!assignedSite) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      const devicesAtSite = await Device.find({ site: assignedSite }).select('_id');
      filter.device = { $in: devicesAtSite.map(d => d._id) };
    } else if (device) {
      filter.device = device;
    } else if (site) {
      const devicesAtSite = await Device.find({ site }).select('_id');
      filter.device = { $in: devicesAtSite.map(d => d._id) };
    }

    const sensors = await Sensor.find(filter)
      .populate('device', 'device_id site status')
      .populate('parameter', 'key label unit valid_min valid_max');

    res.status(200).json({ success: true, count: sensors.length, data: sensors });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sensor
// @route   GET /api/sensors/:id
// @access  Private
exports.getSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.findById(req.params.id)
      .populate('device', 'device_id site status')
      .populate('parameter', 'key label unit valid_min valid_max');

    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }

    res.status(200).json({ success: true, data: sensor });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new sensor under a device
// @route   POST /api/sensors
// @access  Private (Admin or Site Engineer for target device's site)
exports.createSensor = async (req, res, next) => {
  try {
    const { device: deviceId, parameter, model_name, serial_number, calibration_date, status } = req.body;

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Target device not found' });
    }

    // --- SITE ENGINEER SCOPE CHECK ---
    if (req.user.role === 'site_engineer') {
      const engineerAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      const deviceSite = device.site ? device.site.toString() : null;

      if (!engineerAssignedSite || engineerAssignedSite !== deviceSite) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to add sensors to devices at your assigned site.'
        });
      }

      // Create ChangeRequest for site_engineer
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: device.site,
        entityType: 'sensor',
        action: 'create',
        payload: { form: req.body, targetSummary: model_name || 'New Sensor Probe' },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to register sensors.'
      });
    }

    const sensor = await Sensor.create({
      device: deviceId,
      parameter,
      model_name,
      serial_number,
      calibration_date,
      status
    });

    const populatedSensor = await Sensor.findById(sensor._id)
      .populate('device', 'device_id site status')
      .populate('parameter', 'key label unit');

    res.status(201).json({ success: true, data: populatedSensor });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sensor
// @route   PUT /api/sensors/:id
// @access  Private (Admin or Site Engineer for sensor's site)
exports.updateSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.findById(req.params.id).populate('device');
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }

    // Site engineer scope check
    if (req.user.role === 'site_engineer') {
      const engineerAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      const deviceSite = sensor.device && sensor.device.site ? sensor.device.site.toString() : null;

      if (!engineerAssignedSite || engineerAssignedSite !== deviceSite) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to update sensors at your assigned site.'
        });
      }

      // Compute diff
      const changes = {};
      Object.keys(req.body).forEach(key => {
        const oldVal = sensor[key] !== undefined ? sensor[key] : null;
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
        site: sensor.device.site,
        entityType: 'sensor',
        action: 'update',
        targetId: sensor._id,
        payload: { form: req.body, changes, targetSummary: `Sensor ${sensor.model_name}` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to update sensors.'
      });
    }

    const updatedSensor = await Sensor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('device', 'device_id site status').populate('parameter', 'key label unit');

    res.status(200).json({ success: true, data: updatedSensor });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete sensor
// @route   DELETE /api/sensors/:id
// @access  Private (Admin or Site Engineer for sensor's site)
exports.deleteSensor = async (req, res, next) => {
  try {
    const sensor = await Sensor.findById(req.params.id).populate('device');
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found' });
    }

    // Site engineer scope check
    if (req.user.role === 'site_engineer') {
      const engineerAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      const deviceSite = sensor.device && sensor.device.site ? sensor.device.site.toString() : null;

      if (!engineerAssignedSite || engineerAssignedSite !== deviceSite) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to delete sensors at your assigned site.'
        });
      }

      // Create ChangeRequest for site_engineer
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: sensor.device.site,
        entityType: 'sensor',
        action: 'delete',
        targetId: sensor._id,
        payload: { targetSummary: `Sensor ${sensor.model_name} (${sensor.serial_number || 'No SN'})` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete sensors.'
      });
    }

    await sensor.deleteOne();
    res.status(200).json({ success: true, message: 'Sensor deleted successfully' });
  } catch (error) {
    next(error);
  }
};
