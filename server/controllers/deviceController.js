const Device = require('../models/Device');
const Site = require('../models/Site');

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
exports.getDevices = async (req, res, next) => {
  try {
    const query = req.query.site ? { site: req.query.site } : {};
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
// @access  Private/Admin
exports.createDevice = async (req, res, next) => {
  try {
    const site = await Site.findById(req.body.site);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    const device = await Device.create(req.body);
    // Add device reference to site
    await Site.findByIdAndUpdate(req.body.site, { $push: { devices: device._id } });

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private/Admin
exports.updateDevice = async (req, res, next) => {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
    res.status(200).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};
// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private/Admin
exports.deleteDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
    // Remove device from site
    await Site.findByIdAndUpdate(device.site, { $pull: { devices: device._id } });
    await device.deleteOne();
    res.status(200).json({ success: true, message: 'Device removed' });
  } catch (error) {
    next(error);
  }
};
