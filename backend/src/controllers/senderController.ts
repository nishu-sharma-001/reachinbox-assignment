import { Request, Response } from "express";
import prisma from "../config/prisma";

export async function createSender(req: Request, res: Response) {
  try {
    const {
      email,
      name,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
    } = req.body;

    const sender = await prisma.sender.create({
      data: {
        email,
        name,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
      },
    });

    return res.status(201).json(sender);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create sender",
    });
  }
}