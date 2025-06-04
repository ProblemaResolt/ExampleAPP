const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email templates
const templates = {
  verification: (token) => ({
    subject: 'Verify your email address',
    html: `
      <h1>Welcome to our platform!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${process.env.FRONTEND_URL}/verify-email/${token}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `
  }),

  passwordReset: (token) => ({
    subject: 'Reset your password',
    html: `
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password. Click the link below to proceed:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password/${token}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `
  }),

  subscriptionCreated: (companyName, plan) => ({
    subject: 'Subscription Created',
    html: `
      <h1>Subscription Created</h1>
      <p>Your subscription for ${companyName} has been created successfully.</p>
      <p>Plan: ${plan}</p>
      <p>You can manage your subscription from your dashboard.</p>
    `
  }),

  subscriptionUpdated: (companyName, plan) => ({
    subject: 'Subscription Updated',
    html: `
      <h1>Subscription Updated</h1>
      <p>Your subscription for ${companyName} has been updated.</p>
      <p>New Plan: ${plan}</p>
      <p>You can view the changes in your dashboard.</p>
    `
  }),

  subscriptionCancelled: (companyName) => ({
    subject: 'Subscription Cancelled',
    html: `
      <h1>Subscription Cancelled</h1>
      <p>Your subscription for ${companyName} has been cancelled.</p>
      <p>You can reactivate your subscription from your dashboard.</p>
    `
  }),
  paymentFailed: (companyName, error) => ({
    subject: 'Payment Failed',
    html: `
      <h1>Payment Failed</h1>
      <p>We were unable to process your payment for ${companyName}.</p>
      <p>Error: ${error}</p>
      <p>Please update your payment method in your dashboard.</p>
    `
  }),
  credentialsWelcome: ({ firstName, lastName, email, password, companyName }) => ({
    subject: 'TimeCraftアカウントが作成されました',
    html: `
      <h1>${companyName}へようこそ！</h1>
      <p>${lastName} ${firstName}様</p>
      <p>${companyName}でのTimeCraftアカウントが作成されました。</p>
      
      <h2>ログイン情報</h2>
      <p><strong>メールアドレス:</strong> ${email}</p>
      <p><strong>パスワード:</strong> ${password}</p>
      
      <p>以下のリンクからログインできます：</p>
      <a href="${process.env.FRONTEND_URL}/login">TimeCraftにログイン</a>
      
      <p><strong>重要:</strong></p>
      <ul>
        <li>初回ログイン後、必ずパスワードを変更してください</li>
        <li>このメールは安全に保管し、ログイン後は削除することをお勧めします</li>
        <li>メールアドレスの確認が必要です。確認メールが別途送信されます</li>
      </ul>
      
      <p>ご質問がございましたら、管理者にお問い合わせください。</p>
    `
  })
};

// Send email
const sendEmail = async (to, template, data) => {
  try {
    const { subject, html } = templates[template](data);

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  return sendEmail(email, 'verification', token);
};

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
  return sendEmail(email, 'passwordReset', token);
};

// Send subscription created email
const sendSubscriptionCreatedEmail = async (email, companyName, plan) => {
  return sendEmail(email, 'subscriptionCreated', { companyName, plan });
};

// Send subscription updated email
const sendSubscriptionUpdatedEmail = async (email, companyName, plan) => {
  return sendEmail(email, 'subscriptionUpdated', { companyName, plan });
};

// Send subscription cancelled email
const sendSubscriptionCancelledEmail = async (email, companyName) => {
  return sendEmail(email, 'subscriptionCancelled', { companyName });
};

// Send payment failed email
const sendPaymentFailedEmail = async (email, companyName, error) => {
  return sendEmail(email, 'paymentFailed', { companyName, error });
};

// Send credentials welcome email
const sendCredentialsWelcomeEmail = async (email, userData) => {
  return sendEmail(email, 'credentialsWelcome', userData);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionCreatedEmail,
  sendSubscriptionUpdatedEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
  sendCredentialsWelcomeEmail
};