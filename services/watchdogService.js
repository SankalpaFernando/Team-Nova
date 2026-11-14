const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const Alert = require('../models/Alert');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { processAlertSms } = require('./smsService');
const { processAlertEmail } = require('./emailAlertService');

const DEVICE_SILENCE_LIMIT_SECONDS = 9 * 3600; // 32,400 seconds (9 hours)
const SYSTEM_OFFLINE_COOLDOWN_MS = 9 * 60 * 60 * 1000; // 9 hours

let serverStartTime = Date.now();
let lastSystemOfflineNotice = 0;
let watchdogTimer = null;
let cachedIo = null;

/**
 * Format duration in human-readable format, e.g. "9 h", "15 min", "90 s"
 */
function formatDuration(seconds) {
  if (seconds >= 3600) {
    const hrs = Math.round((seconds / 3600) * 10) / 10;
    return `${hrs} h`;
  }
  if (seconds >= 60) {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  }
  return `${Math.round(seconds)} s`;
}

/**
 * Calculate the silent limit: fixed at 9 hours (32,400 seconds)
 * Ensures devices are never falsely marked faulty after just 55 minutes.
 */
function getLimitSeconds(_samplingIntervalSeconds) {
  return DEVICE_SILENCE_LIMIT_SECONDS;
}

/**
 * Core watchdog check logic
 */
async function runWatchdogCheck() {
  try {
    const now = Date.now();

    // 1. Fetch all active devices that have reported at least once
    const activeDevices = await Device.find({
      status: 'active',
      lastSeen: { $ne: null }
    }).populate('site');

    if (activeDevices.length === 0) {
      return;
    }

    // 2. Filter devices that have passed the server restart grace period (one full sampling interval)
    const evaluableDevices = activeDevices.filter(d => {
      const intervalMs = (d.sampling_interval_seconds || 10800) * 1000;
      return (now - serverStartTime) >= intervalMs;
    });

    if (evaluableDevices.length === 0) {
      return;
    }

    // 3. Determine if each device is silent (exceeded limit seconds)
    const deviceSilenceMap = new Map();
    for (const d of evaluableDevices) {
      const limitSeconds = getLimitSeconds(d.sampling_interval_seconds);
      const limitMs = limitSeconds * 1000;
      const timeSinceLastSeen = now - new Date(d.lastSeen).getTime();
      const isSilent = timeSinceLastSeen > limitMs;
      deviceSilenceMap.set(d._id.toString(), { isSilent, limitSeconds, timeSinceLastSeen });
    }

    // 4. Global Outage Check:
    // If EVERY active device is silent at the same time (when multiple devices exist),
    // do not mark them all faulty. Notify admin directly every 55 minutes without polluting the Alert table.
    const allSilent = evaluableDevices.length > 1 && evaluableDevices.every(d => deviceSilenceMap.get(d._id.toString())?.isSilent);

    if (allSilent) {
      if (now - lastSystemOfflineNotice > SYSTEM_OFFLINE_COOLDOWN_MS) {
        lastSystemOfflineNotice = now;
        console.log('⚠️ [WATCHDOG] Every active device is silent. Dispatching 9-hour outage notice to admin.');
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          if (admin.email) {
            await sendEmail({
              to: admin.email,
              subject: '[MangroveGuard Alert] CRITICAL - System Offline',
              text: 'No data from any device - check the base station, radio link and network.',
              html: '<p><strong>CRITICAL ALERT: System Offline</strong></p><p>No data from any device - check the base station, radio link and network.</p>'
            }).catch(err => console.error('Watchdog notification error:', err.message));
          }
        }
      }
      return;
    }

    // 5. Evaluate individual devices and their sensors
    for (const d of evaluableDevices) {
      const { isSilent: deviceIsSilent, limitSeconds } = deviceSilenceMap.get(d._id.toString());

      if (deviceIsSilent) {
        // The WHOLE DEVICE is silent: mark device faulty, sensors are not flagged separately
        const reason = `No data received for over 9 hours`;
        d.status = 'faulty';
        d.fault_reason = reason;
        d.faulty_since = new Date();
        d.auto_flagged = true;
        await d.save();

        console.log(`🚨 [WATCHDOG] Device ${d.device_id} flagged as faulty: ${reason}`);

        // Raise device_offline alert if no unresolved one exists
        const existingAlert = await Alert.findOne({
          device: d._id,
          type: 'device_offline',
          status: { $ne: 'resolved' }
        });

        if (!existingAlert) {
          const deviceAlert = await Alert.create({
            type: 'device_offline',
            device: d._id,
            parameter_name: 'Device Offline',
            measured_value: null,
            severity_level: 'critical',
            message: `Device ${d.device_id} at ${d.site?.name || 'monitoring site'} has been silent for over 9 hours. No data received. Please inspect power, solar panel, and LoRa gateway connection.`,
            status: 'unread'
          });

          if (cachedIo) {
            cachedIo.emit('new_alert', deviceAlert);
          }

          await processAlertSms(deviceAlert, d.site, null);
          await processAlertEmail(deviceAlert, d.site, null);
        }

        if (cachedIo) {
          cachedIo.emit('device_status_changed', {
            targetType: 'device',
            deviceId: d._id,
            action: 'faulty',
            device: {
              _id: d._id,
              device_id: d.device_id,
              status: d.status,
              site: d.site ? (d.site._id ? { _id: d.site._id, name: d.site.name } : d.site) : null
            }
          });
        }
      } else {
        // Device is active and reported recently: check individual sensors
        // Only evaluate sensors that have reported at least once and are currently active
        const sensors = await Sensor.find({
          device: d._id,
          status: 'active',
          lastReadingAt: { $ne: null }
        }).populate('parameter');

        for (const sensor of sensors) {
          const sensorLimitSeconds = getLimitSeconds(d.sampling_interval_seconds);
          const sensorLimitMs = sensorLimitSeconds * 1000;
          const sensorTimeSinceLastReading = now - new Date(sensor.lastReadingAt).getTime();

          if (sensorTimeSinceLastReading > sensorLimitMs) {
            const sensorReason = `No data received for ${formatDuration(sensorLimitSeconds)}`;
            sensor.status = 'faulty';
            sensor.fault_reason = sensorReason;
            sensor.faulty_since = new Date();
            sensor.auto_flagged = true;
            await sensor.save();

            const paramLabel = sensor.parameter?.label || sensor.parameter?.key || 'Sensor';
            console.log(`🚨 [WATCHDOG] Sensor ${paramLabel} on Device ${d.device_id} flagged as faulty: ${sensorReason}`);

            // Raise sensor_offline alert if no unresolved one exists
            const existingAlert = await Alert.findOne({
              sensor: sensor._id,
              type: 'sensor_offline',
              status: { $ne: 'resolved' }
            });

            if (!existingAlert) {
              const sensorAlert = await Alert.create({
                type: 'sensor_offline',
                device: d._id,
                sensor: sensor._id,
                parameter: sensor.parameter?._id || sensor.parameter,
                parameter_name: paramLabel,
                unit: sensor.parameter?.unit || '',
                severity_level: 'high',
                message: `Sensor probe ${paramLabel} on device ${d.device_id} is offline. ${sensorReason}.`,
                status: 'unread'
              });

              if (cachedIo) {
                cachedIo.emit('new_alert', sensorAlert);
              }

              await processAlertSms(sensorAlert, d.site, sensor.parameter);
              await processAlertEmail(sensorAlert, d.site, sensor.parameter);
            }

            if (cachedIo) {
              cachedIo.emit('device_status_changed', {
                targetType: 'sensor',
                sensorId: sensor._id,
                deviceId: d._id,
                action: 'faulty',
                sensor
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ [WATCHDOG ERROR]:', error.message);
  }
}

/**
 * Start the watchdog background service
 * @param {Object} io - Socket.io server instance
 */
function startWatchdog(io) {
  cachedIo = io;
  serverStartTime = Date.now();

  console.log('🐕 [WATCHDOG] Watchdog service initialized.');

  // Check every 30 seconds for test responsiveness, while respecting sampling intervals and restart grace periods
  const checkIntervalMs = process.env.WATCHDOG_CHECK_INTERVAL_MS
    ? parseInt(process.env.WATCHDOG_CHECK_INTERVAL_MS, 10)
    : 30000;

  if (watchdogTimer) {
    clearInterval(watchdogTimer);
  }

  watchdogTimer = setInterval(runWatchdogCheck, checkIntervalMs);
}

/**
 * Stop the watchdog service (for graceful shutdown or tests)
 */
function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

module.exports = {
  startWatchdog,
  stopWatchdog,
  runWatchdogCheck
};
