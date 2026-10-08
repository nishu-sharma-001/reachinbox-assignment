import prisma from "../config/prisma";
import { transporter } from "../config/mailer";

export async function sendEmail(emailId: number) {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: true,
    },
  });

  if (!email) {
    throw new Error("Email not found");
  }

  // Idempotency: already sent hai to dobara send nahi karna
  if (email.status === "SENT") {
    return;
  }

  await prisma.email.update({
    where: { id: emailId },
    data: {
      status: "PROCESSING",
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${email.sender.name || "ReachInbox"}" <${email.sender.email}>`,
      to: email.recipient,
      subject: email.subject,
      text: email.body,
    });

    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        messageId: info.messageId,
        errorMessage: null,
      },
    });

    return info;
  } catch (error) {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}