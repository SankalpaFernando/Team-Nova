const Parameter = require('../models/Parameter');
const ChangeRequest = require('../models/ChangeRequest');

// @desc    Get parameters (with optional site scope filtering)
// @route   GET /api/parameters
// @access  Private (any authenticated user)
exports.getParameters = async (req, res, next) => {
  try {
    const { includeInactive, site } = req.query;

    const filter = {};
    if (includeInactive !== 'true') {
      filter.active = true;
    }

    if (site) {
      filter.$or = [
        { scope: 'global' },
        { scope: 'site', site: site }
      ];
    }

    const parameters = await Parameter.find(filter)
      .populate('site', 'name location region')
      .sort({ scope: 1, label: 1 });

    res.status(200).json({ success: true, count: parameters.length, data: parameters });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single parameter
// @route   GET /api/parameters/:id
// @access  Private
exports.getParameter = async (req, res, next) => {
  try {
    const parameter = await Parameter.findById(req.params.id).populate('site', 'name location region');
    if (!parameter) {
      return res.status(404).json({ success: false, message: 'Parameter not found' });
    }
    res.status(200).json({ success: true, data: parameter });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new parameter (Admin or Site Engineer)
// @route   POST /api/parameters
// @access  Private (Admin or Site Engineer)
exports.createParameter = async (req, res, next) => {
  try {
    if (!req.user || !['admin', 'site_engineer'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges to create catalog parameters.'
      });
    }

    req.body.createdBy = req.user.id;

    if (req.user.role === 'site_engineer') {
      const userSite = req.user.assignedSite ? (req.user.assignedSite._id || req.user.assignedSite) : null;
      if (!userSite) {
        return res.status(400).json({
          success: false,
          message: 'Bad Request: You must be assigned to a site to propose or create parameters.'
        });
      }

      const payloadForm = {
        ...req.body,
        scope: req.body.scope || 'site',
        site: userSite,
        createdBy: req.user._id
      };

      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: userSite,
        entityType: 'parameter',
        action: 'create',
        payload: { form: payloadForm, targetSummary: `Parameter Proposal: ${req.body.label || req.body.key}` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role === 'admin') {
      if (req.body.scope !== 'site') {
        req.body.scope = 'global';
        req.body.site = null;
      }
    }

    const parameter = await Parameter.create(req.body);
    const populated = await Parameter.findById(parameter._id).populate('site', 'name location region');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update parameter
// @route   PUT /api/parameters/:id
// @access  Private (Admin or Site Engineer for their site's parameters)
exports.updateParameter = async (req, res, next) => {
  try {
    const parameter = await Parameter.findById(req.params.id);
    if (!parameter) {
      return res.status(404).json({ success: false, message: 'Parameter not found' });
    }

    if (req.user.role === 'site_engineer') {
      const userSite = req.user.assignedSite ? (req.user.assignedSite._id || req.user.assignedSite) : null;
      if (!userSite) {
        return res.status(400).json({
          success: false,
          message: 'Bad Request: You must be assigned to a site to request parameter updates.'
        });
      }

      const changes = {};
      Object.keys(req.body).forEach(key => {
        const oldVal = parameter[key] !== undefined ? parameter[key] : null;
        const newVal = req.body[key];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          changes[key] = { old: oldVal, new: newVal };
        }
      });

      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: userSite,
        entityType: 'parameter',
        action: 'update',
        targetId: parameter._id,
        payload: { form: req.body, changes, targetSummary: `Parameter ${parameter.label} (${parameter.key})` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
    }

    const updatedParameter = await Parameter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('site', 'name location region');

    res.status(200).json({ success: true, data: updatedParameter });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote site-scoped parameter to global (Admin only)
// @route   PUT /api/parameters/:id/promote
// @access  Private/Admin
exports.promoteParameter = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can promote parameters to global status.'
      });
    }

    const parameter = await Parameter.findById(req.params.id);
    if (!parameter) {
      return res.status(404).json({ success: false, message: 'Parameter not found' });
    }

    parameter.scope = 'global';
    parameter.site = null;
    await parameter.save();

    res.status(200).json({
      success: true,
      message: `Parameter "${parameter.label}" promoted to Global status.`,
      data: parameter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate/Delete parameter
// @route   DELETE /api/parameters/:id
// @access  Private (Admin or Site Engineer for their site parameters)
exports.deleteParameter = async (req, res, next) => {
  try {
    const parameter = await Parameter.findById(req.params.id);
    if (!parameter) {
      return res.status(404).json({ success: false, message: 'Parameter not found' });
    }

    if (req.user.role === 'site_engineer') {
      const userSite = req.user.assignedSite ? (req.user.assignedSite._id || req.user.assignedSite) : null;
      if (!userSite) {
        return res.status(400).json({
          success: false,
          message: 'Bad Request: You must be assigned to a site to request parameter deactivation.'
        });
      }

      const changeRequest = await ChangeRequest.create({
        requestedBy: req.user._id,
        site: userSite,
        entityType: 'parameter',
        action: 'delete',
        targetId: parameter._id,
        payload: { targetSummary: `Deactivate Parameter: ${parameter.label} (${parameter.key})` },
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        pendingApproval: true,
        message: 'Submitted for admin approval.',
        data: changeRequest
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
    }

    parameter.active = false;
    await parameter.save();

    res.status(200).json({ success: true, message: 'Parameter deactivated successfully', data: parameter });
  } catch (error) {
    next(error);
  }
};
