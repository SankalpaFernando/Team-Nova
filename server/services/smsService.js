const User = require('../models/User');
const Alert = require('../models/Alert');

/**
 * SMS Provider Abstraction
 * Simulates sending SMS via Twilio or Sri Lankan SMS Gateway.
 */
const sendSms = async (to, message) => {
  console.log(`📱 [SMS SERVICE] Sending SMS to ${to}: "${message}"`);
  // Provider implementation (e.g., Twilio / Dialog / Mobitel API) goes here
  return { success: true, messageId: `msg_${Date.now()}` };
};

/**
 * Process targeted SMS alerts with persistent DB-backed cooldown.
 * @param {Object} alert - The newly created Alert document
 * @param {Object} site - The populated Site document
 * @param {Object} parameter - The Parameter document
 */
const processAlertSms = async (alert, site, parameter) => {
  try {
    const cooldownMinutes = parseInt(process.env.SMS_COOLDOWN_MINUTES || '30', 10);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const cooldownThreshold = new Date(Date.now() - cooldownMs);

    // PERSISTENT COOLDOWN CHECK:
    // Check if an SMS was already sent for this same (device, parameter) within cooldown window
    const recentSentAlert = await Alert.findOne({
      device: alert.device,
      parameter: alert.parameter,
      sms_sent: true,
      sms_sent_at: { $gte: cooldownThreshold }
    });

    if (recentSentAlert) {
      console.log(`⏳ [SMS SERVICE] Throttling SMS for device ${alert.device} parameter "${parameter.label}". Last sent at ${recentSentAlert.sms_sent_at}`);
      return false;
    }

    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    const alertSeverityRank = severityOrder[alert.severity_level] || 1;

    let recipientUser = null;

    // Check if site has assigned engineer
    if (site.assignedEngineer) {
      const engineer = await User.findById(site.assignedEngineer);
      if (engineer && engineer.notificationPrefs && engineer.notificationPrefs.sms_enabled) {
        const minRank = severityOrder[engineer.notificationPrefs.sms_min_severity || 'critical'] || 4;
        if (alertSeverityRank >= minRank && engineer.notificationPrefs.phone) {
          recipientUser = engineer;
        }
      }
    }

    // Fallback: If no engineer or engineer not opting in, check opted-in admin users
    if (!recipientUser) {
      const admins = await User.find({
        role: 'admin',
        'notificationPrefs.sms_enabled': true
      });
      for (const admin of admins) {
        const minRank = severityOrder[admin.notificationPrefs.sms_min_severity || 'critical'] || 4;
        if (alertSeverityRank >= minRank && admin.notificationPrefs.phone) {
          recipientUser = admin;
          break;
        }
      }
    }

    if (!recipientUser) {
      console.log(`ℹ️ [SMS SERVICE] Alert generated for site "${site.name}" but no recipient opted into SMS for severity "${alert.severity_level}".`);
      return false;
    }

    // Send SMS
    const smsResult = await sendSms(recipientUser.notificationPrefs.phone, alert.message);
    if (smsResult.success) {
      // Mark alert document with sms_sent state (persisted across restarts)
      alert.sms_sent = true;
      alert.sms_sent_at = new Date();
      await alert.save();
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ [SMS SERVICE ERROR]:', error.message);
    return false;
  }
};

module.exports = {
  sendSms,
  processAlertSms
};
