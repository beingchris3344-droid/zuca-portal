const nodemailer = require("nodemailer");

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send reset code
async function sendResetCode(email, code) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Zuca Portal Password Reset",
      text: `Your password reset code is ${code}. It expires in 10 minutes.`,
    });
    console.log(`Reset code sent to ${email}`);
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
}

module.exports = { sendResetCode };