const SensorReading = require('../models/SensorReading');
const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const Alert = require('../models/Alert');
const Parameter = require('../models/Parameter');
const { processAlertSms } = require('../services/smsService');
const { processAlertEmail } = require('../services/emailAlertService');

// Helper: check reading against site thresholds and generate alerts
const generateAlertForReading = async (readingDoc, sensorDoc, deviceDoc, siteDoc, io) => {
  if (!sensorDoc || !sensorDoc.parameter || !siteDoc || !siteDoc.thresholds) {
    return null;
  }

  const parameter = sensorDoc.parameter;
  const value = readingDoc.value;

  // Find matching threshold for this parameter in site.thresholds
  const thresholdObj = siteDoc.thresholds.find(t => {
    const thresholdParamId = t.parameter._id ? t.parameter._id.toString() : t.parameter.toString();
    const sensorParamId = parameter._id ? parameter._id.toString() : parameter.toString();
    return thresholdParamId === sensorParamId;
  });

  if (!thresholdObj || value === undefined || value === null) {
    return { alert: null, nearThreshold: false };
  }

  const { min, max } = thresholdObj;
  let breached = null;
  let thresholdValue = null;

  if (value < min) {
    breached = 'min';
    thresholdValue = min;
  } else if (value > max) {
    breached = 'max';
    thresholdValue = max;
  }

  // Check adaptive sampling proximity (within ~20% of min or max boundary)
  const isNearMin = min !== 0 ? (value - min) / min <= 0.2 : value <= 1.2;
  const isNearMax = max !== 0 ? (max - value) / max <= 0.2 : false;
  const nearThreshold = breached !== null || isNearMin || isNearMax;

  if (!breached) {
    return { alert: null, nearThreshold };
  }

  // Calculate severity based on deviation percentage
  const deviation = thresholdValue !== 0 ? Math.abs(value - thresholdValue) / thresholdValue : 0.2;
  let severity = 'low';
  if (deviation > 0.3) severity = 'critical';
  else if (deviation > 0.2) severity = 'high';
  else if (deviation > 0.1) severity = 'medium';

  const unitStr = parameter.unit ? ` ${parameter.unit}` : '';
  const direction = breached === 'min' ? 'dropped below minimum' : 'exceeded maximum';
  const message = `${parameter.label} level of ${value}${unitStr} has ${direction} threshold of ${thresholdValue}${unitStr} at site ${siteDoc.name}.`;

  // Create Alert document (persisting denormalized parameter_name and unit)
  const alert = await Alert.create({
    reading: readingDoc._id,
    device: deviceDoc._id,
    sensor: sensorDoc._id,
    parameter: parameter._id,
    parameter_name: parameter.label,
    unit: parameter.unit || '',
    severity_level: severity,
    measured_value: value,
    message,
    status: 'unread'
  });

  // Process targeted SMS notifications (with DB-persisted cooldown check)
  await processAlertSms(alert, siteDoc, parameter);
  await processAlertEmail(alert, siteDoc, parameter);

  // Emit real-time alert via Socket.io if available
  if (io) {
    io.emit('new_alert', alert);
  }

  return { alert, nearThreshold };
};

// @desc    Submit a batch of new sensor readings
// @route   POST /api/readings
// @access  Private (Device API Key or User JWT)
exports.createReading = async (req, res, next) => {
  try {
    let deviceDoc = req.device;
    const { device: deviceIdPayload, readings: rawReadings } = req.body;

    if (!deviceDoc) {
      const deviceIdentifier = deviceIdPayload || req.body.device_id;
      if (!deviceIdentifier) {
        return res.status(400).json({ success: false, message: 'Device ID is required in body or x-device-key header' });
      }

      deviceDoc = await Device.findById(deviceIdentifier).populate({
        path: 'site',
        populate: { path: 'thresholds.parameter' }
      });

      if (!deviceDoc) {
        deviceDoc = await Device.findOne({ device_id: deviceIdentifier.toUpperCase() }).populate({
          path: 'site',
          populate: { path: 'thresholds.parameter' }
        });
      }
    } else if (!deviceDoc.site || !deviceDoc.site.thresholds) {
      // Ensure site and thresholds are populated
      deviceDoc = await Device.findById(deviceDoc._id).populate({
        path: 'site',
        populate: { path: 'thresholds.parameter' }
      });
    }

    if (!deviceDoc) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    if (deviceDoc.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Device is not active' });
    }

    // Support single reading object or array of readings
    const readingList = Array.isArray(rawReadings) ? rawReadings : [req.body];

    if (!readingList || readingList.length === 0) {
      return res.status(400).json({ success: false, message: 'No readings provided' });
    }

    const createdReadings = [];
    const generatedAlerts = [];
    let adaptiveSamplingTriggered = false;

    const io = req.app.get('io');

    for (const item of readingList) {
      if (!item.sensor || item.value === undefined) continue;

      const sensorDoc = await Sensor.findById(item.sensor).populate('parameter');
      if (!sensorDoc) continue;

      const readingDoc = await SensorReading.create({
        sensor: sensorDoc._id,
        device: deviceDoc._id,
        value: item.value,
        recorded_at: item.recorded_at ? new Date(item.recorded_at) : new Date()
      });

      createdReadings.push(readingDoc);

      const alertResult = await generateAlertForReading(readingDoc, sensorDoc, deviceDoc, deviceDoc.site, io);
      if (alertResult) {
        if (alertResult.alert) generatedAlerts.push(alertResult.alert);
        if (alertResult.nearThreshold) adaptiveSamplingTriggered = true;
      }

      if (io) {
        io.emit('new_reading', {
          ...readingDoc.toObject(),
          sensor: sensorDoc,
          device: deviceDoc
        });
      }
    }

    // Update device lastSeen timestamp
    await Device.findByIdAndUpdate(deviceDoc._id, { lastSeen: new Date() });

    // Adaptive sampling interval calculation:
    // If value is within ~20% of threshold, suggest 60s sample rate; otherwise default sampling_interval_seconds
    const defaultInterval = deviceDoc.sampling_interval_seconds || 900;
    const next_sample_in_seconds = adaptiveSamplingTriggered ? Math.min(60, defaultInterval) : defaultInterval;

    res.status(201).json({
      success: true,
      count: createdReadings.length,
      data: createdReadings,
      alertsGenerated: generatedAlerts.length,
      next_sample_in_seconds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all readings (with filters)
// @route   GET /api/readings
// @access  Private
exports.getReadings = async (req, res, next) => {
  try {
    const { device, sensor, limit = 50, from, to, page = 1 } = req.query;

    const query = {};
    if (device) query.device = device;
    if (sensor) query.sensor = sensor;
    if (from || to) {
      query.recorded_at = {};
      if (from) query.recorded_at.$gte = new Date(from);
      if (to) query.recorded_at.$lte = new Date(to);
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 1000);
    const skip = (pageNum - 1) * limitNum;

    const [readings, total] = await Promise.all([
      SensorReading.find(query)
        .populate('device', 'device_id site status')
        .populate({
          path: 'sensor',
          populate: { path: 'parameter', select: 'key label unit' }
        })
        .sort({ recorded_at: -1 })
        .skip(skip)
        .limit(limitNum),
      SensorReading.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: readings.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: readings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest reading per sensor
// @route   GET /api/readings/latest
// @access  Private
exports.getLatestReadings = async (req, res, next) => {
  try {
    const latestReadings = await SensorReading.aggregate([
      { $sort: { recorded_at: -1 } },
      { $group: { _id: '$sensor', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } }
    ]);

    const populated = await SensorReading.populate(latestReadings, [
      { path: 'device', select: 'device_id status site', populate: { path: 'site', select: 'name location region' } },
      { path: 'sensor', populate: { path: 'parameter', select: 'key label unit' } }
    ]);

    res.status(200).json({
      success: true,
      count: populated.length,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reading stats for dashboard
// @route   GET /api/readings/stats
// @access  Private
exports.getStats = async (req, res, next) => {
  try {
    const { device, hours = 24 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const matchStage = { recorded_at: { $gte: since } };
    if (device) matchStage.device = new Device.base.Types.ObjectId(device);

    const stats = await SensorReading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$sensor',
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 }
        }
      }
    ]);

    const populatedStats = await Sensor.populate(stats, {
      path: '_id',
      select: 'model_name parameter device',
      populate: { path: 'parameter', select: 'key label unit' }
    });

    res.status(200).json({
      success: true,
      data: populatedStats,
      hours: parseInt(hours)
    });
  } catch (error) {
    next(error);
  }
};