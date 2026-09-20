const Site = require('../models/Site');
const Device = require('../models/Device');
const User = require('../models/User');

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
// @access  Private/Admin, Site Engineer
exports.createSite = async (req, res, next) => {
  try {
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
// @access  Private (Admin or assigned Site Engineer)
exports.updateSite = async (req, res, next) => {
  try {
    delete req.body.createdBy;

    // Site engineer scope check
    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== req.params.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to update your assigned site.'
        });
      }
      delete req.body.assignedEngineer; // Engineers cannot reassign themselves or others
    }

    const site = await Site.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedEngineer', 'name email')
      .populate('thresholds.parameter', 'key label unit');

    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('site_updated', site);
    }

    res.status(200).json({ success: true, data: site });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete site
// @route   DELETE /api/sites/:id
// @access  Private/Admin, Site Engineer
exports.deleteSite = async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    // Unassign engineer if assigned -> revert role to registered_user
    if (site.assignedEngineer) {
      await User.findByIdAndUpdate(site.assignedEngineer, { assignedSite: null, role: 'registered_user' });
    }

    await Device.deleteMany({ site: req.params.id });
    await site.deleteOne();

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
// @access  Private (Admin or assigned Site Engineer)
exports.updateThresholds = async (req, res, next) => {
  try {
    const { thresholds } = req.body;
    const thresholdData = Array.isArray(thresholds) ? thresholds : req.body;

    // Site engineer scope check
    if (req.user.role === 'site_engineer') {
      const userAssignedSite = req.user.assignedSite ? req.user.assignedSite.toString() : null;
      if (!userAssignedSite || userAssignedSite !== req.params.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to update thresholds for your assigned site.'
        });
      }
    }

    const site = await Site.findByIdAndUpdate(
      req.params.id,
      { thresholds: thresholdData },
      { new: true, runValidators: true }
    ).populate('thresholds.parameter', 'key label unit valid_min valid_max');

    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    res.status(200).json({ success: true, data: site });
  } catch (error) {
    next(error);
  }
};
