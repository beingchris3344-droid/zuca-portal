const nodemailer = require("nodemailer");

// ==================== CONFIGURATION ====================
const transporter = nodemailer.createTransport({
  host: "64.233.184.108", // Direct IPv4 for smtp.gmail.com
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // MUST BE 16-CHARACTER APP PASSWORD
  },
  tls: {
    servername: "smtp.gmail.com",
    rejectUnauthorized: false,
  },
  family: 4, 
  connectionTimeout: 20000,
});

// ==================== SENDING FUNCTION ====================
async function sendPasswordResetEmail(user, resetCode) {
  const mailOptions = {
    from: `"ZUCA Portal Support" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "ZUCA Portal Password Reset Request",
    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto; border:1px solid #ddd; padding:20px; border-radius:10px;">
        <h2 style="color: #2c3e50; text-align: center;">Password Reset</h2>
        <p>Hello <b>${user.fullName || "User"}</b>,</p>
        <p>You requested a password reset for your ZUCA Portal account.</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #e74c3c;">
          ${resetCode}
        </div>
        <p style="text-align: center; color: #7f8c8d;">This code expires in 15 minutes.</p>
        <p>If you didn't request this, please secure your account immediately.</p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #bdc3c7; text-align: center;">ZUCA Portal Support Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Mailer Error:", error.message);
    throw new Error("SMTP_CONNECTION_FAILED");
  }
}

module.exports = { sendPasswordResetEmail };