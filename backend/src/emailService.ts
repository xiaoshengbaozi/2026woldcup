import { connect as tlsConnect } from "tls";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

export async function sendEmail(input: EmailInput) {
  const config = readSmtpConfig();
  const client = await SmtpClient.connect(config);
  try {
    await client.expect(220);
    await client.command(`EHLO ${getSmtpClientName()}`, 250);
    await client.command("AUTH LOGIN", 334);
    await client.command(Buffer.from(config.user).toString("base64"), 334);
    await client.command(Buffer.from(config.pass).toString("base64"), 235);
    await client.command(`MAIL FROM:<${config.from}>`, 250);
    await client.command(`RCPT TO:<${input.to}>`, [250, 251]);
    await client.command("DATA", 354);
    await client.writeData(buildMessage(config.from, input));
    await client.command("QUIT", 221).catch(() => undefined);
  } finally {
    client.close();
  }
}

function readSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.EMAIL_FROM || user;
  if (!host || !user || !pass || !from) {
    throw Object.assign(new Error("email_not_configured"), { statusCode: 503 });
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    user,
    pass,
    from,
  };
}

function buildMessage(from: string, input: EmailInput) {
  const boundary = `wc26-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function encodeMimeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function getSmtpClientName() {
  try {
    return new URL(process.env.PUBLIC_APP_URL || "https://ball.boyzi.fun").hostname || "localhost";
  } catch {
    return "localhost";
  }
}

class SmtpClient {
  private buffer = "";
  private pending: Array<(line: string) => void> = [];

  static connect(config: SmtpConfig) {
    return new Promise<SmtpClient>((resolve, reject) => {
      const socket = tlsConnect({
        host: config.host,
        port: config.port,
        servername: config.host,
        rejectUnauthorized: config.secure,
      });
      const client = new SmtpClient(socket);
      socket.once("secureConnect", () => resolve(client));
      socket.once("error", reject);
    });
  }

  private constructor(private readonly socket: ReturnType<typeof tlsConnect>) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => this.handleData(String(chunk)));
  }

  command(command: string, expected: number | number[]) {
    this.socket.write(`${command}\r\n`);
    return this.expect(expected);
  }

  writeData(message: string) {
    this.socket.write(`${message}\r\n.\r\n`);
    return this.expect(250);
  }

  expect(expected: number | number[]) {
    const expectedCodes = Array.isArray(expected) ? expected : [expected];
    return new Promise<void>((resolve, reject) => {
      this.pending.push((line) => {
        const code = Number(line.slice(0, 3));
        if (expectedCodes.includes(code)) {
          resolve();
          return;
        }
        reject(new Error(`smtp_${line.slice(0, 80)}`));
      });
    });
  }

  close() {
    this.socket.end();
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    while (true) {
      const index = this.buffer.indexOf("\n");
      if (index === -1) return;
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (/^\d{3}-/.test(line)) continue;
      const next = this.pending.shift();
      next?.(line);
    }
  }
}
