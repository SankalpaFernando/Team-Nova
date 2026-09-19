const User = require('../models/User');
const Alert = require('../models/Alert');
const sendEmail = require('../utils/sendEmail');

/**
 * Process targeted email alerts with persistent DB-backed cooldown.
 * Mirrors the logic in smsService.js's processAlertSms, but sends email
 * instead of SMS, and tracks its own email_sent / email_sent_at fields
 * so the two channels can be throttled independently.
 * @param {Object} alert - The newly created Alert document
 * @param {Object} site - The populated Site document
 * @param {Object} parameter - The Parameter document
 */
const processAlertEmail = async (alert, site, parameter) => {
  try {
    const cooldownMinutes = parseInt(process.env.EMAIL_COOLDOWN_MINUTES || process.env.SMS_COOLDOWN_MINUTES || '30', 10);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const cooldownThreshold = new Date(Date.now() - cooldownMs);

    // PERSISTENT COOLDOWN CHECK — same pattern as SMS, but keyed on email_sent
    const recentSentAlert = await Alert.findOne({
      device: alert.device,
      parameter: alert.parameter,
      email_sent: true,
      email_sent_at: { $gte: cooldownThreshold }
    });

    if (recentSentAlert) {
      console.log(`⏳ [EMAIL SERVICE] Throttling email for device ${alert.device} parameter "${parameter.label}". Last sent at ${recentSentAlert.email_sent_at}`);
      return false;
    }

    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    const alertSeverityRank = severityOrder[alert.severity_level] || 1;

    let recipientUser = null;

    // Prefer the site's assigned engineer, if opted in
    if (site.assignedEngineer) {
      const engineer = await User.findById(site.assignedEngineer);
      console.log(`🔍 [EMAIL DEBUG] Engineer found: ${engineer?.email}, prefs:`, JSON.stringify(engineer?.notificationPrefs));
      if (engineer && engineer.notificationPrefs && engineer.notificationPrefs.email_alerts_enabled) {
        const minRank = severityOrder[engineer.notificationPrefs.email_min_severity || 'critical'] || 4;
        console.log(`🔍 [EMAIL DEBUG] alertRank=${alertSeverityRank}, minRank=${minRank}, hasEmail=${!!engineer.email}`);
        if (alertSeverityRank >= minRank && engineer.email) {
          recipientUser = engineer;
        }
      }
    }

    // Fallback: opted-in admins
    if (!recipientUser) {
      const admins = await User.find({
        role: 'admin',
        'notificationPrefs.email_alerts_enabled': true
      });
      for (const admin of admins) {
        const minRank = severityOrder[admin.notificationPrefs.email_min_severity || 'critical'] || 4;
        if (alertSeverityRank >= minRank && admin.email) {
          recipientUser = admin;
          break;
        }
      }
    }

    if (!recipientUser) {
      console.log(`ℹ️ [EMAIL SERVICE] Alert generated for site "${site.name}" but no recipient opted into email for severity "${alert.severity_level}".`);
      return false;
    }

    // Send the email using the existing sendEmail utility
    const emailResult = await sendEmail({
      to: recipientUser.email,
      subject: `[MangroveGuard Alert] ${alert.severity_level.toUpperCase()} - ${parameter.label} at ${site.name}`,
      text: alert.message,
      html: `<p><strong>${alert.severity_level.toUpperCase()} ALERT</strong></p><p>${alert.message}</p><p>Site: ${site.name}</p>`
    });

    // sendEmail returns { devMode: true } if no SMTP config is set,
    // or the nodemailer info object on a real send — either counts as "sent" here
    alert.email_sent = true;
    alert.email_sent_at = new Date();
    await alert.save();

    console.log(`📧 [EMAIL SERVICE] Sent to ${recipientUser.email}${emailResult.devMode ? ' (dev mode — logged only)' : ''}`);
    return true;
  } catch (error) {
    console.error('❌ [EMAIL SERVICE ERROR]:', error.message);
    return false;
  }
};

module.exports = {
  processAlertEmail
};