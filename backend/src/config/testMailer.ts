import "dotenv/config";
import nodemailer from "nodemailer";

async function testMailer() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"ReachInbox Test" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: "ReachInbox SMTP Test",
    text: "Email scheduler SMTP is working!",
  });

  console.log("Email sent:", info.messageId);
  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
}

testMailer().catch(console.error);