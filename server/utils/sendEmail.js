console.log('EMAIL ENV CHECK:', process.env.EMAIL_HOST, process.env.EMAIL_USER, !!process.env.EMAIL_PASS);
const nodemailer = require('nodemailer');

// Sends an email using SMTP credentials from .env.
// If no SMTP credentials are configured (e.g. during development),
// it falls back to just logging the email to the console so the
// forgot-password flow can still be tested end-to-end.
const sendEmail = async (options) => {
  const hasEmailConfig =
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS;

  if (!hasEmailConfig) {
    console.log('\n==================== EMAIL (DEV MODE) ====================');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(options.text);
    console.log('============================================================\n');
    return { devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  });

  return info;
};

module.exports = sendEmail;