const Site = require('../models/Site');
const Device = require('../models/Device');
const Sensor = require('../models/Sensor');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const User = require('../models/User');
const ChangeRequest = require('../models/ChangeRequest');

// @desc    Get all sites
// @route   GET /api/sites
// @access  Private
exports.getSites = async (req, res, next) => {
  try {
    const sites = await Site.find()
      .populate('createdBy', 'name email')
      .populate('assignedEngineer', 'name email notificationPrefs')
      .populate('thresholds.parameter', 'key label unit valid_min valid_max');

    res.status(200).json({ success: true, count: sites.length, data: sites });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single site
// @route   GET /api/sites/:id
// @access  Private
exports.getSite = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedEngineer', 'name email notificationPrefs')
      .populate('thresholds.parameter', 'key label unit valid_min valid_max');

    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }

    const devices = await Device.find({ site: req.params.id })
      .select('device_id status installation_date lastSeen sampling_interval_seconds');

    res.status(200).json({
      success: true,
      data: { site, devices }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create site
// @route   POST /api/sites
// @access  Private/Admin, Site Engineer (via ChangeRequest)
exports.createSite = async (req, res, next) => {
  try {
    // Site engineers submit a ChangeRequest — admin approves to actually create
    if (req.user.role === 'site_engineer') {
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: null,
        entityType: 'site',
        action: 'create',
        payload: { 
          form: req.body, 
          name: req.body.name,
          targetSummary: `New Site: ${req.body.name || 'unnamed'}` 
        },
        status: 'pending'
      });
      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Site creation request submitted for admin approval.',
        data: changeRequest
      });
    }

    req.body.createdBy = req.user.id;
    const site = await Site.create(req.body);

    const populatedSite = await Site.findById(site._id)
      .populate('createdBy', 'name email')
      .populate('thresholds.parameter', 'key label unit');

    const io = req.app.get('io');
    if (io) {
      io.emit('site_created', populatedSite);
    }

    res.status(201).json({ success: true, data: populatedSite });
  } catch (error) {
    next(error);
  }
};

// @desc    Update site
// @route   PUT /api/sites/:id
// @access  Private (Admin or assigned Site Engineer via ChangeRequest)
exports.updateSite = async (req, res, next) => {
  try {
    delete req.body.createdBy;

    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }

    if (req.user.role === 'site_engineer') {
      delete req.body.assignedEngineer;

      const changes = {};
      Object.keys(req.body).forEach(key => {
        const oldVal = site[key] !== undefined ? site[key] : null;
        const newVal = req.body[key];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          changes[key] = { old: oldVal, new: newVal };
        }
      });

      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: site._id,
        entityType: 'site',
        action: 'update',
        targetId: site._id,
        payload: { 
          form: req.body, 
          changes,
          name: site.name,
          targetSummary: `Site: ${site.name}` 
        },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Site update request submitted for admin approval.',
        data: changeRequest
      });
    }

    const updatedSite = await Site.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedEngineer', 'name email')
      .populate('thresholds.parameter', 'key label unit');

    const io = req.app.get('io');
    if (io) {
      io.emit('site_updated', updatedSite);
    }

    res.status(200).json({ success: true, data: updatedSite });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete site
// @route   DELETE /api/sites/:id
// @access  Private/Admin, Site Engineer (via ChangeRequest)
exports.deleteSite = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    if (req.user.role === 'site_engineer') {
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: site._id,
        entityType: 'site',
        action: 'delete',
        targetId: site._id,
        payload: { 
          name: site.name,
          location: site.location,
          targetSummary: `Site: ${site.name}` 
        },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Site deletion request submitted for admin approval.',
        data: changeRequest
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }

    // Unassign engineer if assigned -> revert role to registered_user
    if (site.assignedEngineer) {
      await User.findByIdAndUpdate(site.assignedEngineer, { assignedSite: null, role: 'registered_user' });
    }

    // Cascade cleanup: delete all sensors, readings, and alerts for devices at this site
    const siteDevices = await Device.find({ site: req.params.id }).select('_id');
    const siteDevIds = siteDevices.map(d => d._id);
    await Promise.all([
      Sensor.deleteMany({ device: { $in: siteDevIds } }),
      SensorReading.deleteMany({ device: { $in: siteDevIds } }),
      Alert.deleteMany({ device: { $in: siteDevIds } }),
      Device.deleteMany({ site: req.params.id }),
      site.deleteOne()
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('site_deleted', req.params.id);
    }

    res.status(200).json({ success: true, message: 'Site and associated devices removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign engineer to site
// @route   PUT /api/sites/:id/assign-engineer
// @access  Private/Admin
exports.assignEngineer = async (req, res, next) => {
  try {
    const { userId: targetUserId } = req.body;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    // Unassign previous engineer from this site if different -> revert role to registered_user
    if (site.assignedEngineer && site.assignedEngineer.toString() !== targetUserId) {
      await User.findByIdAndUpdate(site.assignedEngineer, { assignedSite: null, role: 'registered_user' });
    }

    // Unassign this user from any previous site
    if (user.assignedSite && user.assignedSite.toString() !== site._id.toString()) {
      await Site.findByIdAndUpdate(user.assignedSite, { assignedEngineer: null });
    }

    // Update site assignment
    site.assignedEngineer = user._id;
    await site.save();

    // Update user role and assigned site
    user.assignedSite = site._id;
    user.role = 'site_engineer';
    await user.save();

    const updatedSite = await Site.findById(site._id)
      .populate('assignedEngineer', 'name email role assignedSite')
      .populate('thresholds.parameter', 'key label unit');

    res.status(200).json({
      success: true,
      message: `Engineer ${user.name} assigned to site ${site.name}`,
      data: updatedSite
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unassign engineer from site
// @route   PUT /api/sites/:id/unassign-engineer
// @access  Private/Admin
exports.unassignEngineer = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }

    if (site.assignedEngineer) {
      await User.findByIdAndUpdate(site.assignedEngineer, { assignedSite: null, role: 'registered_user' });
      site.assignedEngineer = null;
      await site.save();
    }

    const updatedSite = await Site.findById(site._id)
      .populate('thresholds.parameter', 'key label unit');

    res.status(200).json({
      success: true,
      message: 'Engineer unassigned from site successfully',
      data: updatedSite
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update site thresholds
// @route   PUT /api/sites/:id/thresholds
// @access  Private (Admin or assigned Site Engineer via ChangeRequest)
exports.updateThresholds = async (req, res, next) => {
  try {
    const { thresholds } = req.body;
    const thresholdData = Array.isArray(thresholds) ? thresholds : req.body;

    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    // Site engineer scope check — goes through ChangeRequest
    if (req.user.role === 'site_engineer') {
      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: site._id,
        entityType: 'site',
        action: 'update',
        targetId: site._id,
        payload: { 
          form: { thresholds: thresholdData }, 
          name: site.name,
          targetSummary: `Thresholds for Site: ${site.name}`, 
          isThresholdUpdate: true 
        },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Threshold update request submitted for admin approval.',
        data: changeRequest
      });
    }

    const updatedSite = await Site.findByIdAndUpdate(
      req.params.id,
      { thresholds: thresholdData },
      { new: true, runValidators: true }
    ).populate('thresholds.parameter', 'key label unit valid_min valid_max');

    res.status(200).json({ success: true, data: updatedSite });
  } catch (error) {
    next(error);
  }
};
