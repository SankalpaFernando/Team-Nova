const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const sendEmail = require('../utils/sendEmail');

// In-memory rate limiting by IP (max 15 verification code requests per hour per IP)
const ipAttempts = new Map();
const ipCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipAttempts.entries()) {
    if (now > data.resetAt) ipAttempts.delete(ip);
  }
}, 15 * 60 * 1000);
if (ipCleanupTimer.unref) ipCleanupTimer.unref();

const checkIpRateLimit = (ip) => {
  if (!ip) return true;
  const now = Date.now();
  const data = ipAttempts.get(ip);
  if (!data || now > data.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (data.count >= 15) {
    return false;
  }
  data.count += 1;
  return true;
};

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  const userObj = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'approved',
    assignedSite: user.assignedSite,
    notificationPrefs: user.notificationPrefs,
    created_at: user.created_at || user.createdAt
  };
  res.status(statusCode).json({ success: true, token, user: userObj });
};

// @desc    Register user - validates input, checks duplicates, sends 6-digit verification code
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // 1. Current duplicate check: if email belongs to an existing user (approved or pending), return error
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // IP rate limiting check
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (!checkIpRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification requests from this network. Please try again later.'
      });
    }

    // Check if a pending verification already exists for this email
    let record = await EmailVerification.findOne({ email: normalizedEmail });
    const now = Date.now();

    if (record) {
      // Cooldown check (60 seconds)
      const elapsedSeconds = Math.floor((now - record.lastSentAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const wait = 60 - elapsedSeconds;
        return res.status(429).json({
          success: false,
          message: `Please wait ${wait} second${wait > 1 ? 's' : ''} before requesting another code.`
        });
      }

      // Hourly limit check (5 per hour)
      if (now > record.hourlyResetAt.getTime()) {
        record.hourlyCount = 0;
        record.hourlyResetAt = new Date(now + 60 * 60 * 1000);
      }
      if (record.hourlyCount >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Maximum verification code requests reached for this hour. Please try again later.'
        });
      }
    }

    // Generate 6-digit code with crypto.randomInt (100000 - 999999)
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    // Hash password with bcrypt cost 12 (same as User model) - plain password is NEVER stored
    const passwordHash = await bcrypt.hash(password, 12);

    if (record) {
      record.name = trimmedName;
      record.passwordHash = passwordHash;
      record.codeHash = codeHash;
      record.attempts = 0;
      record.lastSentAt = new Date(now);
      record.hourlyCount += 1;
      record.expiresAt = new Date(now + 10 * 60 * 1000);
      await record.save();
    } else {
      record = await EmailVerification.create({
        email: normalizedEmail,
        name: trimmedName,
        passwordHash,
        codeHash,
        attempts: 0,
        lastSentAt: new Date(now),
        hourlyCount: 1,
        hourlyResetAt: new Date(now + 60 * 60 * 1000),
        expiresAt: new Date(now + 10 * 60 * 1000)
      });
    }

    // Send email using existing sendEmail utility
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #164e3d; margin-top: 0;">MangroveGuard Email Verification</h2>
        <p style="color: #374151; font-size: 15px;">Hello ${trimmedName},</p>
        <p style="color: #374151; font-size: 15px;">Thank you for registering. Please enter the 6-digit verification code below to verify your email address:</p>
        <div style="background: #f0fdf4; border: 1px dashed #15803d; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #164e3d; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code is valid for <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject: 'MangroveGuard - Your 6-Digit Verification Code',
      text: `Hello ${trimmedName},\n\nYour MangroveGuard verification code is: ${code}\n\nIt expires in 10 minutes. If you did not request this, please ignore this email.`,
      html: htmlMessage
    });

    res.status(200).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message: `We sent a 6-digit code to ${normalizedEmail}. It expires in 10 minutes. Check spam.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email code & create pending user registration
// @route   POST /api/auth/verify-email-code
// @access  Public
exports.verifyEmailCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Please provide both email and verification code' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const record = await EmailVerification.findOne({ email: normalizedEmail });
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Verification code not found or expired. Please register again.'
      });
    }

    // Check expiration
    if (Date.now() > record.expiresAt.getTime()) {
      await record.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code or register again.'
      });
    }

    // Check if attempts exceeded (5 wrong attempts locks/invalidates)
    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect attempts. This code has been invalidated. Please register again.'
      });
    }

    // Constant-time compare using crypto.timingSafeEqual
    const incomingHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    const incomingBuf = Buffer.from(incomingHash, 'utf8');
    const storedBuf = Buffer.from(record.codeHash, 'utf8');

    const isMatch = incomingBuf.length === storedBuf.length && crypto.timingSafeEqual(incomingBuf, storedBuf);

    if (!isMatch) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        await record.deleteOne();
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. This code has been invalidated. Please register again.'
        });
      }
      await record.save();
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. You have ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
      });
    }

    // Code is valid!
    // Re-check that email isn't taken in the meantime
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user strictly with role: 'registered_user', status: 'pending' (ignoring any client role/status)
    const newUser = new User({
      name: record.name,
      email: record.email,
      password: record.passwordHash,
      role: 'registered_user',
      status: 'pending'
    });

    // Prevent double-hashing password since passwordHash is already a bcrypt hash
    newUser._skipPasswordHash = true;
    await newUser.save();

    // Clean up verification record
    await record.deleteOne();

    res.status(201).json({
      success: true,
      status: 'pending',
      message: 'Email verified and registration submitted successfully! Your account is pending administrator approval.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend 6-digit verification code
// @route   POST /api/auth/resend-email-code
// @access  Public
exports.resendEmailCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const record = await EmailVerification.findOne({ email: normalizedEmail });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No pending registration found for this email. Please register again.'
      });
    }

    const now = Date.now();

    // Cooldown check (60 seconds)
    const elapsedSeconds = Math.floor((now - record.lastSentAt.getTime()) / 1000);
    if (elapsedSeconds < 60) {
      const wait = 60 - elapsedSeconds;
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait} second${wait > 1 ? 's' : ''} before requesting another code.`
      });
    }

    // Hourly rate limit check (5 per hour)
    if (now > record.hourlyResetAt.getTime()) {
      record.hourlyCount = 0;
      record.hourlyResetAt = new Date(now + 60 * 60 * 1000);
    }
    if (record.hourlyCount >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification code requests reached for this hour. Please try again later.'
      });
    }

    // IP rate limiting check
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (!checkIpRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification requests from this network. Please try again later.'
      });
    }

    // Generate new code
    const code = crypto.randomInt(100000, 1000000).toString();
    record.codeHash = crypto.createHash('sha256').update(code).digest('hex');
    record.attempts = 0;
    record.lastSentAt = new Date(now);
    record.hourlyCount += 1;
    record.expiresAt = new Date(now + 10 * 60 * 1000);
    await record.save();

    await sendEmail({
      to: normalizedEmail,
      subject: 'MangroveGuard - New Email Verification Code',
      text: `Hello ${record.name},\n\nYour new MangroveGuard verification code is: ${code}\n\nIt expires in 10 minutes. If you did not request this, please ignore this email.`
    });

    res.status(200).json({
      success: true,
      message: `A new verification code has been sent to ${normalizedEmail}. Check spam.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password').populate('assignedSite', 'name location region');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check account approval status for non-admin accounts
    if (user.role !== 'admin') {
      if (user.status === 'pending') {
        return res.status(403).json({
          success: false,
          status: 'pending',
          message: 'Your registration is pending approval by an administrator. Please wait until your account is approved before logging in.'
        });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({
          success: false,
          status: 'rejected',
          message: 'Your registration request has been rejected by an administrator. Please contact support if you have questions.'
        });
      }
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('assignedSite', 'name location region');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'admin' && (user.status === 'pending' || user.status === 'rejected')) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending administrator approval or has been rejected.'
      });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Request a password reset link
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const user = await User.findOne({ email });

    // Always respond with the same success message to avoid leaking registered emails
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const message = `You requested a password reset.\n\nPlease click the link below (valid for 10 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;

    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: 'MangroveGuard - Password Reset Request',
        text: message
      });

      const response = {
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
      };

      if (emailResult.devMode) {
        response.devResetUrl = resetUrl;
      }

      return res.status(200).json(response);
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Error sending reset email:', emailError);
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token from email link
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Please provide a new password' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
