const Alert = require('../models/Alert');
const Device = require('../models/Device');

// @desc    Get all alerts (admin) or user's alerts
// @route   GET /api/alerts
// @access  Private
exports.getAlerts = async (req, res, next) => {
  try {
    const { status, severity, site, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (severity) query.severity_level = severity;

    // Site engineer scoping vs site query parameter
    if (req.user && req.user.role === 'site_engineer') {
      const assignedSite = req.user.assignedSite;
      if (!assignedSite) {
        return res.status(200).json({ success: true, count: 0, total: 0, page: 1, pages: 0, data: [] });
      }
      const siteDevices = await Device.find({ site: assignedSite }).select('_id');
      query.device = { $in: siteDevices.map(d => d._id) };
    } else if (site) {
      const siteDevices = await Device.find({ site }).select('_id');
      query.device = { $in: siteDevices.map(d => d._id) };
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate({ path: 'device', select: 'device_id', populate: { path: 'site', select: 'name location' } })
        .populate('reading', 'pH temperature salinity dissolved_o2 recorded_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Alert.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: alerts.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single alert
// @route   GET /api/alerts/:id
// @access  Private
exports.getAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate({ path: 'device', select: 'device_id site', populate: { path: 'site', select: 'name location region' } })
      .populate('reading')
      .populate('recipients', 'name email');
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

// @desc    Update alert status (Admin or Site Engineer for target site)
// @route   PUT /api/alerts/:id/status
// @access  Private
exports.updateAlertStatus = async (req, res, next) => {
  try {
    let { status } = req.body;
    
    const existingAlert = await Alert.findById(req.params.id).populate('device');
    if (!existingAlert) return res.status(404).json({ success: false, message: 'Alert not found' });

    if (req.user && req.user.role === 'site_engineer') {
      const engineerAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      const alertDeviceSite = existingAlert.device && existingAlert.device.site ? existingAlert.device.site.toString() : null;

      if (!engineerAssignedSite || engineerAssignedSite !== alertDeviceSite) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to update alerts for your assigned site.'
        });
      }

      // Two-stage alert resolution flow: site_engineer resolving an alert sets status to 'pending_confirmation'
      if (status === 'resolved' || status === 'pending_confirmation') {
        status = 'pending_confirmation';
      }
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate({ path: 'device', select: 'device_id', populate: { path: 'site', select: 'name location' } });

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all alerts as read for the current user
// @route   PUT /api/alerts/markallread
// @access  Private
exports.markAllRead = async (req, res, next) => {
  try {
    const query = {};
    await Alert.updateMany({ ...query, status: 'unread' }, { status: 'read' });
    res.status(200).json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread alert count
// @route   GET /api/alerts/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const query = { status: 'unread' };
    const count = await Alert.countDocuments(query);
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

// @desc    Get total alert count
// @route   GET /api/alerts/total-count
// @access  Private
exports.getTotalCount = async (req, res, next) => {
  try {
    const query = {};
    if (req.user && req.user.role === 'site_engineer') {
      const assignedSite = req.user.assignedSite;
      if (!assignedSite) {
        return res.status(200).json({ success: true, count: 0 });
      }
      const siteDevices = await Device.find({ site: assignedSite }).select('_id');
      query.device = { $in: siteDevices.map(d => d._id) };
    }
    const count = await Alert.countDocuments(query);
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};