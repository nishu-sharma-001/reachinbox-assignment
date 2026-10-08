import elasticsearch from "../config/elasticsearch";
import { indexEmail } from "../services/emailSearchService";

const INDEX_NAME = "emails";

export async function indexEmail(email: {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: string;
}) {
  await elasticsearch.index({
    index: INDEX_NAME,
    id: String(email.id),
    document: {
      id: email.id,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      status: email.status,
    },
    refresh: true,
  });
}