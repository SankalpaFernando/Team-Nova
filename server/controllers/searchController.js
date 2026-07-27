const Site = require('../models/Site');
const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const Parameter = require('../models/Parameter');
const Alert = require('../models/Alert');

// @desc    Global search across sites, devices, sensors, parameters, and alerts
// @route   GET /api/search
// @access  Public / Private
exports.searchAll = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';

    if (!q) {
      return res.status(200).json({
        success: true,
        query: '',
        results: { sites: [], devices: [], sensors: [], parameters: [], alerts: [] }
      });
    }

    const regex = new RegExp(q, 'i');

    const [sites, devices, sensors, parameters, alerts] = await Promise.all([
      Site.find({
        $or: [{ name: regex }, { location: regex }, { region: regex }]
      }).limit(10),
      Device.find({
        $or: [{ device_id: regex }, { status: regex }]
      }).populate('site', 'name location').limit(10),
      Sensor.find({
        $or: [{ model_name: regex }, { serial_number: regex }]
      }).populate('parameter', 'label key unit').populate('device', 'device_id').limit(10),
      Parameter.find({
        $or: [{ name: regex }, { label: regex }, { key: regex }, { category: regex }]
      }).limit(10),
      Alert.find({
        $or: [{ parameter_name: regex }, { severity_level: regex }, { message: regex }]
      }).populate({ path: 'device', select: 'device_id', populate: { path: 'site', select: 'name' } }).limit(10)
    ]);

    res.status(200).json({
      success: true,
      query: q,
      results: { sites, devices, sensors, parameters, alerts }
    });
  } catch (error) {
    next(error);
  }
};
