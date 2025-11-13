// utils/email.js
import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Gmail transporter setup
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use Gmail service directly
      auth: {
        user: process.env.SMTP_USER, // your Gmail address
        pass: process.env.SMTP_PASS, // your Gmail App Password
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to: ${to}`);

    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return false;
  }
};
