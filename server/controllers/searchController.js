const Site = require('../models/Site');
const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const Parameter = require('../models/Parameter');
const Alert = require('../models/Alert');

const escapeRegex = (string) => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// @desc    Global search across sites, devices, sensors, parameters, and alerts
// @route   GET /api/search
// @access  Public / Private (role-aware: visitor, registered_user, site_engineer, admin)
exports.searchAll = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';

    if (!q) {
      return res.status(200).json({
        success: true,
        query: '',
        role: req.user?.role || 'visitor',
        results: { sites: [], devices: [], sensors: [], parameters: [], alerts: [] }
      });
    }

    const safeRegex = new RegExp(escapeRegex(q), 'i');
    const userRole = req.user?.role || 'visitor';

    // 1. Sites are always public and searchable by all levels (visitor, reg user, site admin, admin)
    const sites = await Site.find({
      $or: [{ name: safeRegex }, { location: safeRegex }, { region: safeRegex }]
    }).limit(10);

    // 2. Visitors only receive public sites
    if (userRole === 'visitor') {
      return res.status(200).json({
        success: true,
        query: q,
        role: 'visitor',
        results: { sites, devices: [], sensors: [], parameters: [], alerts: [] }
      });
    }

    // 3. Registered Users receive sites and environmental alerts
    if (userRole === 'registered_user') {
      const alerts = await Alert.find({
        $or: [{ parameter_name: safeRegex }, { severity_level: safeRegex }, { message: safeRegex }]
      }).populate({ path: 'device', select: 'device_id', populate: { path: 'site', select: 'name' } }).limit(10);

      return res.status(200).json({
        success: true,
        query: q,
        role: 'registered_user',
        results: { sites, devices: [], sensors: [], parameters: [], alerts }
      });
    }

    // 4. Site Engineers and Admins have access to system hardware, sensors, parameters, and alerts
    const [devices, sensors, parameters, alerts] = await Promise.all([
      Device.find({
        $or: [{ device_id: safeRegex }, { status: safeRegex }]
      }).populate('site', 'name location').limit(10),
      Sensor.find({
        $or: [{ model_name: safeRegex }, { serial_number: safeRegex }]
      }).populate('parameter', 'label key unit').populate('device', 'device_id').limit(10),
      Parameter.find({
        $or: [{ name: safeRegex }, { label: safeRegex }, { key: safeRegex }, { category: safeRegex }]
      }).limit(10),
      Alert.find({
        $or: [{ parameter_name: safeRegex }, { severity_level: safeRegex }, { message: safeRegex }]
      }).populate({ path: 'device', select: 'device_id', populate: { path: 'site', select: 'name' } }).limit(10)
    ]);

    res.status(200).json({
      success: true,
      query: q,
      role: userRole,
      results: { sites, devices, sensors, parameters, alerts }
    });
  } catch (error) {
    next(error);
  }
};
