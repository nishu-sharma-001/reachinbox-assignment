import { Request, Response } from "express";
import prisma from "../config/prisma";
import { emailQueue } from "../queues/emailQueue";
import elasticsearch from "../config/elasticsearch";

export async function scheduleEmail(req: Request, res: Response) {
  try {
    const {
      recipient,
      subject,
      body,
      scheduledAt,
      senderId,
      delaySeconds,
      hourlyLimit,
    } = req.body;

    if (!recipient || !subject || !body || !scheduledAt || !senderId) {
      return res.status(400).json({
        message:
          "recipient, subject, body, scheduledAt and senderId are required",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduledAt date",
      });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        message: "scheduledAt must be in the future",
      });
    }

    const sender = await prisma.sender.findUnique({
      where: { id: Number(senderId) },
    });

    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
      });
    }

    const email = await prisma.email.create({
      data: {
        recipient,
        subject,
        body,
        scheduledAt: scheduledDate,
        jobId: "pending",
        senderId: Number(senderId),
        delaySeconds: Number(delaySeconds || 2),
        hourlyLimit: Number(hourlyLimit || 100),
      },
    });

    const job = await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
        delaySeconds: Number(delaySeconds || 2),
        hourlyLimit: Number(hourlyLimit || 100),
      },
      {
        delay: Math.max(0, scheduledDate.getTime() - Date.now()),
      }
    );

    await prisma.email.update({
      where: { id: email.id },
      data: {
        jobId: job.id!,
      },
    });

    return res.status(201).json({
      message: "Email scheduled successfully",
      email: {
        ...email,
        jobId: job.id,
      },
    });
  } catch (error) {
    console.error("Schedule email error:", error);

    return res.status(500).json({
      message: "Failed to schedule email",
    });
  }
}

export async function getEmails(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;

    const emails = await prisma.email.findMany({
      where: status
        ? {
            status: status as any,
          }
        : undefined,
      include: {
        sender: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return res.json(emails);
  } catch (error) {
    console.error("Get emails error:", error);

    return res.status(500).json({
      message: "Failed to fetch emails",
    });
  }
}

export async function searchEmails(req: Request, res: Response) {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const result = await elasticsearch.search({
      index: "emails",
      query: {
        multi_match: {
          query: q,
          fields: ["recipient", "subject", "body"],
        },
      },
    });

    const emails = result.hits.hits.map((hit) => hit._source);

    return res.json(emails);
  } catch (error) {
    console.error("Search emails error:", error);

    return res.status(500).json({
      message: "Failed to search emails",
    });
  }
}

export async function getEmailStats(req: Request, res: Response) {
  try {
    const scheduled = await prisma.email.count({
      where: {
        status: "SCHEDULED",
      },
    });

    const sent = await prisma.email.count({
      where: {
        status: "SENT",
      },
    });

    const failed = await prisma.email.count({
      where: {
        status: "FAILED",
      },
    });

    const total = scheduled + sent + failed;

    const successRate =
      total > 0 ? Math.round((sent / total) * 100) : 0;

    return res.json({
      scheduled,
      sent,
      failed,
      total,
      successRate,
    });
  } catch (error) {
    console.error("Get email stats error:", error);

    return res.status(500).json({
      message: "Failed to fetch email stats",
    });
  }
}
