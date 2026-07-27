const User = require('../models/User');
const Site = require('../models/Site');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('assignedSite', 'name location region');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('assignedSite', 'name location region');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.getRecentLogins = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const users = await User.find({ lastLogin: { $gte: thirtyDaysAgo } })
      .sort('-lastLogin')
      .select('name email role lastLogin assignedSite')
      .populate('assignedSite', 'name location');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user (admin)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    const userObj = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedSite: user.assignedSite,
      notificationPrefs: user.notificationPrefs,
      created_at: user.created_at
    };
    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    delete req.body.password;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password').populate('assignedSite', 'name location region');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user role (with auto-unassign on demotion)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.changeUserRole = async (req, res, next) => {
  try {
    const { role, assignedSite } = req.body;
    const targetUserId = req.params.id;

    if (!['admin', 'site_engineer', 'registered_user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const previousRole = user.role;
    const previousAssignedSite = user.assignedSite;

    // DEMOTION AUTO-UNASSIGN:
    // If role changed away from site_engineer, clear assignedSite on user and site.assignedEngineer
    if (previousRole === 'site_engineer' && role !== 'site_engineer') {
      if (previousAssignedSite) {
        await Site.findByIdAndUpdate(previousAssignedSite, { assignedEngineer: null });
      }
      user.assignedSite = null;
    }

    // SITE ENGINEER ASSIGNMENT VALIDATION:
    if (role === 'site_engineer') {
      if (!assignedSite) {
        return res.status(400).json({
          success: false,
          message: 'Selecting an assigned site is required when changing role to Site Engineer.'
        });
      }
      const site = await Site.findById(assignedSite);
      if (!site) {
        return res.status(404).json({ success: false, message: 'Target site not found' });
      }
      // Clear previous engineer on target site if any -> revert them to registered_user
      if (site.assignedEngineer && site.assignedEngineer.toString() !== user._id.toString()) {
        await User.findByIdAndUpdate(site.assignedEngineer, { assignedSite: null, role: 'registered_user' });
      }
      // Clear previous site of target user if any
      if (previousAssignedSite && previousAssignedSite.toString() !== assignedSite.toString()) {
        await Site.findByIdAndUpdate(previousAssignedSite, { assignedEngineer: null });
      }
      site.assignedEngineer = user._id;
      await site.save();

      user.assignedSite = site._id;
    }

    user.role = role;
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('assignedSite', 'name location region');

    res.status(200).json({
      success: true,
      message: `User role changed to ${role}`,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.assignedSite) {
      await Site.findByIdAndUpdate(user.assignedSite, { assignedEngineer: null });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update own profile & notification preferences
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.notificationPrefs) {
      updates.notificationPrefs = {
        ...req.user.notificationPrefs,
        ...req.body.notificationPrefs
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password').populate('assignedSite', 'name location region');

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};