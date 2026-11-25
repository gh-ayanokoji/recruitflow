import { ImapFlow } from "imapflow";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function imapDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
}

function addressOf(envelope) {
  const from = envelope?.from?.[0];
  if (!from) return "";
  return String(from.address || "").toLowerCase();
}

export function replyWindowStart(history, settings) {
  const pending = history.filter((row) => row.emailSentStatus === "sent" && !row.replied);
  if (!pending.length) {
    return new Date(Date.now() - 30 * 86400000);
  }
  const oldest = pending
    .map((row) => new Date(row.timestamp).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)[0];
  return new Date(oldest || Date.now() - 30 * 86400000);
}

function matchReplies(db, incoming) {
  const byEmail = new Map();
  for (const row of db.history) {
    if (row.emailSentStatus !== "sent") continue;
    const list = byEmail.get(row.recruiterEmail.toLowerCase()) || [];
    list.push(row);
    byEmail.set(row.recruiterEmail.toLowerCase(), list);
  }
  const known = new Set(db.replies.map((reply) => `${reply.from}|${reply.receivedAt}`));
  const matched = [];
  for (const message of incoming) {
    const rows = byEmail.get(message.from) || [];
    if (!rows.length) continue;
    const row = rows.find((item) => !item.replied) || rows[rows.length - 1];
    const key = `${message.from}|${message.receivedAt}`;
    if (known.has(key)) continue;
    known.add(key);
    row.replied = 1;
    const reply = {
      id: `rep_${Date.now().toString(36)}_${matched.length}`,
      from: message.from,
      fromName: message.fromName || message.from,
      subject: message.subject || "",
      receivedAt: message.receivedAt,
      snippet: message.snippet || "",
      historyId: row.id,
      clientId: row.clientId,
      source: "imap"
    };
    db.replies.push(reply);
    matched.push({ reply, history: row });
  }
  return matched;
}

function demoIncoming(db) {
  const pending = db.history.filter(
    (row) => row.emailSentStatus === "sent" && !row.replied && Date.now() - new Date(row.timestamp).getTime() > 86400000
  );
  const picks = pending.slice(0, Math.min(2, pending.length));
  return picks.map((row, index) => ({
    from: row.recruiterEmail.toLowerCase(),
    fromName: row.recruiterName,
    subject: `Re: ${row.subject.replace(/^Re:\s*/i, "")}`,
    receivedAt: new Date(Date.now() - index * 5400000 - 1800000).toISOString(),
    snippet:
      index === 0
        ? "Thanks for reaching out — the profile looks relevant. Can you confirm availability for a 30 minute screen this week?"
        : "Resume received. Please share the candidate's rate confirmation and earliest start date so I can submit to the client."
  }));
}

async function fetchRealIncoming(settings, since) {
  const client = new ImapFlow({
    host: settings.imapHost || "imap.gmail.com",
    port: Number(settings.imapPort) || 993,
    secure: true,
    auth: { user: settings.gmailEmail, pass: settings.gmailAppPassword },
    logger: false
  });
  const incoming = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const uids = await client.search({ since });
      for (let index = 0; index < uids.length; index += 100) {
        const batch = uids.slice(index, index + 100);
        for await (const message of client.fetch(batch, { envelope: true, uid: true })) {
          incoming.push({
            from: addressOf(message.envelope),
            fromName: message.envelope?.from?.[0]?.name || "",
            subject: message.envelope?.subject || "",
            receivedAt: new Date(message.envelope?.date || Date.now()).toISOString(),
            snippet: ""
          });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return incoming;
}

export async function syncReplies(db, settings) {
  const since = replyWindowStart(db.history, settings);
  const bridgeReady = Boolean(settings.gmailEmail && settings.gmailAppPassword && !settings.simulation);

  if (!bridgeReady) {
    const incoming = demoIncoming(db);
    const matched = matchReplies(db, incoming);
    return {
      mode: "simulated",
      since: since.toISOString(),
      scanned: incoming.length,
      matched: matched.length,
      note: "Gmail credentials or live mode are not configured, so the sync used a deterministic demo inbox.",
      matches: matched.map((item) => ({ email: item.reply.from, subject: item.reply.subject }))
    };
  }

  try {
    const incoming = await fetchRealIncoming(settings, since);
    const matched = matchReplies(db, incoming);
    return {
      mode: "live",
      since: since.toISOString(),
      scanned: incoming.length,
      matched: matched.length,
      note: `Scanned INBOX since ${imapDate(since)} in batches of 100 headers.`,
      matches: matched.map((item) => ({ email: item.reply.from, subject: item.reply.subject }))
    };
  } catch (error) {
    return {
      mode: "failed",
      since: since.toISOString(),
      scanned: 0,
      matched: 0,
      note: `IMAP sync failed: ${error.message}`,
      matches: []
    };
  }
}
