const nodemailer = require('nodemailer');

// Sends an email using SMTP/Gmail credentials from .env.
// If no credentials are configured (e.g. during development),
// it logs the email with sender, recipient, and login link to the console so the
// approval and notification flows can be verified end-to-end.
const sendEmail = async (options) => {
  const hasEmailConfig =
    (process.env.EMAIL_HOST || process.env.EMAIL_SERVICE) &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS;

  const defaultEmail = (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('@'))
    ? process.env.EMAIL_USER
    : ((process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@'))
        ? (process.env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] || process.env.EMAIL_FROM.trim())
        : 'admin@mangrovewatch.com');

  const defaultFrom = (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@') && process.env.EMAIL_FROM.includes('<'))
    ? process.env.EMAIL_FROM
    : `"Mangrove Admin" <${defaultEmail}>`;

  if (!hasEmailConfig) {
    console.log('\n==================== EMAIL NOTIFICATION (DEV MODE) ====================');
    console.log(`From:    ${options.from || defaultFrom}`);
    console.log(`Reply-To:${options.replyTo || defaultEmail}`);
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('--------------------------- MESSAGE TEXT ---------------------------');
    console.log(options.text);
    console.log('====================================================================\n');
    return { devMode: true, success: true };
  }

  const transportConfig = process.env.EMAIL_SERVICE
    ? {
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      }
    : {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };

  const transporter = nodemailer.createTransport(transportConfig);

  const fromAddress = options.from || defaultFrom;

  const mailOptions = {
    from: fromAddress,
    replyTo: options.replyTo || defaultEmail,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = sendEmail;