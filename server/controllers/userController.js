const User = require('../models/User');
const Site = require('../models/Site');
const sendEmail = require('../utils/sendEmail');

// Helper to send approval email with login link from the official admin email
const sendApprovalNotification = async (user) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const loginUrl = `${clientUrl}/login`;

  // The only official admin email permitted to send registration approval emails
  const officialAdminEmail = 'mangroveguard.team@gmail.com';
  const adminEmail = (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('@'))
    ? process.env.EMAIL_USER.trim()
    : officialAdminEmail;

  const adminName = 'Mangrove Admin';
  const fromSender = `"Mangrove Admin" <${adminEmail}>`;

  const subject = 'Your MangroveGuard Account Has Been Approved - You Can Log In Now';
  const textMessage = `Hello ${user.name},\n\nGreat news! Your registration request has been reviewed and approved by Mangrove Admin.\n\nYour account is now active and you can log in now to access your dashboard and environmental site monitoring details.\n\nRegistered Email: ${user.email}\nApproved By: ${adminName} (${adminEmail})\n\nRegistered User Login Link: ${loginUrl}\n\nThank you,\nMangrove Admin\nMangroveGuard Administration Team\nContact: ${adminEmail}`;

  const htmlMessage = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
      <div style="background: #164e3d; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">MangroveGuard</h1>
        <p style="color: #6ee7b7; margin: 6px 0 0 0; font-size: 14px;">Environmental Monitoring & Conservation</p>
      </div>
      <div style="padding: 32px 28px;">
        <div style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
          Registration Approved
        </div>
        <h2 style="color: #111827; font-size: 22px; margin-top: 0; margin-bottom: 14px;">Welcome aboard, ${user.name}!</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Your registration request has been <strong>approved by Mangrove Admin</strong>. Your account is now active and <strong>you can log in now</strong>.
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <div style="font-size: 14px; color: #166534; font-weight: 600; margin-bottom: 8px;">Registration Approval Details:</div>
          <p style="margin: 4px 0; color: #15803d; font-size: 13px;">Registered Email: <strong>${user.email}</strong></p>
          <p style="margin: 4px 0; color: #15803d; font-size: 13px;">Account Status: <strong>Active & Approved</strong></p>
          <p style="margin: 4px 0; color: #15803d; font-size: 13px;">Approved By: <strong>${adminName}</strong> (${adminEmail})</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #164e3d; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 34px; border-radius: 8px; box-shadow: 0 2px 6px rgba(22, 78, 61, 0.25);">
            Log In Now
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
          Registered User Login Link:
        </p>
        <p style="word-break: break-all; margin: 0 0 20px 0; font-size: 13px;">
          <a href="${loginUrl}" style="color: #2b9388; text-decoration: underline; font-weight: 500;">${loginUrl}</a>
        </p>
        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
          <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.5;">
            If you have questions, you can reply directly to this email or contact the <strong>Mangrove Admin</strong> team at <a href="mailto:${adminEmail}" style="color: #2b9388;">${adminEmail}</a>.
          </p>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © MangroveGuard — Coastal & Mangrove Ecosystem Monitoring System
        </p>
      </div>
    </div>
  `;

  try {
    const emailResult = await sendEmail({
      from: fromSender,
      replyTo: adminEmail,
      to: user.email,
      subject,
      text: textMessage,
      html: htmlMessage
    });
    return { success: true, loginUrl, devMode: !!emailResult?.devMode };
  } catch (err) {
    console.error('Failed to send approval email:', err);
    return { success: false, loginUrl, error: err.message };
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const users = await User.find(filter)
      .select('-password')
      .populate('assignedSite', 'name location region')
      .sort({ createdAt: -1 });
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

// @desc    Get count of pending user registrations
// @route   GET /api/users/pending-count
// @access  Private/Admin
exports.getPendingUsersCount = async (req, res, next) => {
  try {
    const count = await User.countDocuments({ status: 'pending', role: { $ne: 'admin' } });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending user registration
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'approved';
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('assignedSite', 'name location region');

    // Send email notification to the approved user from the official admin email (mangroveguard.team@gmail.com)
    const emailResult = await sendApprovalNotification(user);

    res.status(200).json({
      success: true,
      message: `User ${user.name} approved successfully. Approval email with login link sent to ${user.email}.`,
      data: updatedUser,
      emailSent: emailResult.success,
      loginUrl: emailResult.loginUrl,
      devMode: emailResult.devMode
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a user registration
// @route   PUT /api/users/:id/reject
// @access  Private/Admin
exports.rejectUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot reject an administrator account' });
    }

    user.status = 'rejected';
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('assignedSite', 'name location region');

    res.status(200).json({
      success: true,
      message: `User ${user.name} registration rejected`,
      data: updatedUser
    });
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
    const user = await User.create({
      ...req.body,
      status: req.body.status || 'approved'
    });
    const userObj = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedSite: user.assignedSite,
      notificationPrefs: user.notificationPrefs,
      created_at: user.created_at || user.createdAt
    };
    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (Admin: status and/or role ONLY)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const allowedFields = ['role', 'status'];
    const bodyKeys = Object.keys(req.body);

    // Reject if body is empty or contains any disallowed field (e.g. name, email, password)
    if (bodyKeys.length === 0 || bodyKeys.some(key => !allowedFields.includes(key))) {
      return res.status(400).json({
        success: false,
        message: "Admins can only change a user's role and status."
      });
    }

    // Validate status if provided
    if (req.body.status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status specified. Allowed values are: pending, approved, rejected.'
        });
      }
    }

    // Validate role if provided
    if (req.body.role !== undefined) {
      if (!['registered_user', 'admin', 'site_engineer'].includes(req.body.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Allowed values are: registered_user, admin, site_engineer.'
        });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const wasNotApproved = user.status === 'pending' || user.status === 'rejected';
    const isNowApproved = req.body.status === 'approved';

    if (req.body.status !== undefined) {
      user.status = req.body.status;
    }

    if (req.body.role !== undefined) {
      // DEMOTION AUTO-UNASSIGN:
      // If role changed away from site_engineer, clear assignedSite on user and site.assignedEngineer
      if (user.role === 'site_engineer' && req.body.role !== 'site_engineer') {
        if (user.assignedSite) {
          await Site.findByIdAndUpdate(user.assignedSite, { assignedEngineer: null });
        }
        user.assignedSite = null;
      }
      user.role = req.body.role;
    }

    await user.save();

    if (wasNotApproved && isNowApproved) {
      await sendApprovalNotification(user);
    }

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('assignedSite', 'name location region');

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user role (with auto-unassign on demotion)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.changeUserRole = async (req, res, next) => {
  try {
    const allowedRoleFields = ['role', 'assignedSite'];
    const bodyKeys = Object.keys(req.body);

    if (bodyKeys.some(key => !allowedRoleFields.includes(key))) {
      return res.status(400).json({
        success: false,
        message: "Admins can only change a user's role and status."
      });
    }

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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.name !== undefined) {
      const trimmedName = String(req.body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      user.name = trimmedName;
    }

    // Email cannot be changed after registration
    if (req.body.email !== undefined) {
      const trimmedEmail = String(req.body.email).trim().toLowerCase();
      if (trimmedEmail && trimmedEmail !== user.email) {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be changed after registration.'
        });
      }
    }

    // Handle notification preferences if sent nested or flat
    if (
      req.body.notificationPrefs ||
      req.body.sms_enabled !== undefined ||
      req.body.phone !== undefined ||
      req.body.sms_min_severity !== undefined ||
      req.body.email_alerts_enabled !== undefined ||
      req.body.email_min_severity !== undefined
    ) {
      const prefs = req.body.notificationPrefs || req.body;
      if (!user.notificationPrefs) {
        user.notificationPrefs = {};
      }
      if (prefs.sms_enabled !== undefined) user.notificationPrefs.sms_enabled = Boolean(prefs.sms_enabled);
      if (prefs.sms_min_severity !== undefined) user.notificationPrefs.sms_min_severity = prefs.sms_min_severity;
      if (prefs.phone !== undefined) user.notificationPrefs.phone = String(prefs.phone).trim();
      if (prefs.email_alerts_enabled !== undefined) user.notificationPrefs.email_alerts_enabled = Boolean(prefs.email_alerts_enabled);
      if (prefs.email_min_severity !== undefined) user.notificationPrefs.email_min_severity = prefs.email_min_severity;
    }

    // Handle optional password change if passed to /profile
    if (req.body.currentPassword && req.body.newPassword) {
      const userWithPass = await User.findById(req.user.id).select('+password');
      if (!(await userWithPass.comparePassword(req.body.currentPassword))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      if (req.body.newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = req.body.newPassword;
    }

    await user.save();
    await user.populate('assignedSite', 'name location region');

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ success: true, data: userObj, user: userObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification preferences directly
// @route   PUT /api/users/notification-prefs
// @access  Private
exports.updateNotificationPrefs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const prefs = req.body.notificationPrefs || req.body;
    if (!user.notificationPrefs) {
      user.notificationPrefs = {};
    }
    if (prefs.sms_enabled !== undefined) user.notificationPrefs.sms_enabled = Boolean(prefs.sms_enabled);
    if (prefs.sms_min_severity !== undefined) user.notificationPrefs.sms_min_severity = prefs.sms_min_severity;
    if (prefs.phone !== undefined) user.notificationPrefs.phone = String(prefs.phone).trim();
    if (prefs.email_alerts_enabled !== undefined) user.notificationPrefs.email_alerts_enabled = Boolean(prefs.email_alerts_enabled);
    if (prefs.email_min_severity !== undefined) user.notificationPrefs.email_min_severity = prefs.email_min_severity;

    await user.save();

    res.status(200).json({ 
      success: true, 
      data: user.notificationPrefs, 
      notificationPrefs: user.notificationPrefs,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        notificationPrefs: user.notificationPrefs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification preferences
// @route   GET /api/users/notification-prefs
// @access  Private
exports.getNotificationPrefs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ 
      success: true, 
      data: user.notificationPrefs, 
      notificationPrefs: user.notificationPrefs 
    });
  } catch (error) {
    next(error);
  }
};
