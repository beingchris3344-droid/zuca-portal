// backend/services/mailer.js
const nodemailer = require("nodemailer");

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "zucaportal2025@gmail.com", // your Gmail
    pass: "nwieijfuympaefqn",         // your app password
  },
});

/**
 * Send a password reset email
 * @param {string} to - recipient email
 * @param {string} code - 6-digit reset code
 */
async function sendResetEmail(to, code) {
  try {
    const mailOptions = {
      from: `"ZUCA Portal Support" <zucaportal2025@gmail.com>`,
      to,
      subject: "ZUCA Portal Password Reset Request",
      // Plain-text fallback
      text: `Hello,

You requested a password reset for your ZUCA Portal account.

Hello ${user.fullName}  Your reset code is: ${code}
This code will expire in 15 minutes If you did not request this password reset, you can safely ignore this email. Thankyou: Regards; zucaportac support team.

If you did not request this, please ignore this email.

For support, contact: support@zucaportal2025@gmail.com

– ZUCA Portal Team`,
      // HTML version
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <h2 style="color: #1f4ca5;">ZUCA Portal Password Reset</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your ZUCA Portal account.</p>
          <p style="font-weight:bold;">Use the code below to reset your password:</p>
          <div style="font-size: 28px; color: #d9534f; font-weight: bold; margin: 15px 0;">${code}</div>
          <p>This code will expire in <strong>15 minutes</strong>.</p>
          <p>If you did not request this password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
          <p style="font-size: 14px; color: #555;">
            For support, contact: <a href="mailto:support@zucaportal2025@gmail.com">support@zucaportal2025@gmail.com</a>
          </p>
          <p style="font-size: 14px; color: #555;">– ZUCA Portal Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return true;
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return false;
  }
}

module.exports = { sendResetEmail };