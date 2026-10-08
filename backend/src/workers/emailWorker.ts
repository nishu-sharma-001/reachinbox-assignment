
import { Worker, DelayedError } from "bullmq";
import redis from "../config/redis";
import { sendEmail } from "../services/emailService";
import prisma from "../config/prisma";
import { indexEmail } from "../services/emailSearchService";
import {
  reserveHourlySlot,
  releaseHourlySlot,
} from "../services/rateLimitService";

const worker = new Worker(
  "emailQueue",
  async (job) => {
    console.log(`Processing email job: ${job.id}`);

    const emailId = Number(job.data.emailId);
    const delaySeconds = Math.max(
      0,
      Number(job.data.delaySeconds ?? 2)
    );
    const hourlyLimit = Math.max(
      1,
      Number(job.data.hourlyLimit ?? 100)
    );

    if (!emailId) {
      throw new Error("Invalid emailId in job data");
    }

    const emailRecord = await prisma.email.findUnique({
      where: { id: emailId },
      include: { sender: true },
    });

    if (!emailRecord) {
      throw new Error("Email not found");
    }

    if (emailRecord.status === "SENT") {
      console.log(`Email ${emailId} already sent; skipping`);
      return;
    }

    const reservation = await reserveHourlySlot(
      emailRecord.senderId,
      hourlyLimit
    );

    if (!reservation.allowed) {
      const delayMs = (reservation.waitSeconds + 1) * 1000;

      await job.moveToDelayed(Date.now() + delayMs, job.token);
      console.log(
        `Hourly limit reached. Email ${emailId} delayed by ${reservation.waitSeconds + 1}s`
      );

      throw new DelayedError();
    }

    let emailSent = false;

    try {
      if (delaySeconds > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, delaySeconds * 1000)
        );
      }

      await sendEmail(emailId);
      emailSent = true;

      const updatedEmail = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (updatedEmail) {
        await indexEmail(updatedEmail);
      }

      console.log(`Email ${emailId} sent successfully`);
    } catch (error) {
      if (!emailSent) {
        await releaseHourlySlot(emailRecord.senderId);
      }

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log(
  `Email worker started with concurrency ${
    process.env.WORKER_CONCURRENCY || 5
  }`
);