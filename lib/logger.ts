import { promises as fs } from "fs";
import path from "path";

type LogRecord = {
  ts: string;
  model: string;
  ip?: string | null;
  userAgent?: string | null;
  requestMessages: any[];
  responseText: string;
  error?: string;
  retrievalResults?: any[];
};

function todayFileName() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `chat-${yyyy}-${mm}-${dd}.jsonl`;
}

export async function appendChatLog(record: LogRecord) {
  const logsDir = path.join(process.cwd(), "logs");
  const filePath = path.join(logsDir, todayFileName());

  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(filePath, JSON.stringify(record) + "\n", "utf8");
}