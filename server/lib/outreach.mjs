import nodemailer from "nodemailer";
import { buildHook, buildSubject, extractKeywords } from "./filters.mjs";

export function firstNameOf(recruiterName) {
  const clean = String(recruiterName || "").trim();
  if (!clean || /bench|team|desk|recruiting/i.test(clean)) return "there";
  return clean.split(/\s+/)[0];
}

export function contactLines(client) {
  return [
    `${client.name}`,
    `${client.primaryRole} · ${client.experience} · ${client.location}`,
    `${client.phone} · ${client.email}`,
    `${client.linkedin}`,
    `Work authorization: ${client.workAuth} · Availability: ${client.availability} · Relocation: ${client.relocation}`
  ];
}

export function composeOutreach(client, recruiter, settings) {
  const keywords = extractKeywords(recruiter.jobDescription, client.skills).slice(0, 8);
  const role = recruiter.role || client.primaryRole;
  const hook = buildHook(keywords, role);
  const subject = buildSubject(client, role);
  const body = [
    `Hi ${firstNameOf(recruiter.recruiterName)},`,
    "",
    `I saw your ${role} C2C requirement and wanted to reach out directly. ${hook}`,
    "",
    `Quick snapshot of ${client.name.split(" ")[0]}:`,
    `• ${client.experience} as a ${client.primaryRole}, ${client.workAuth.toLowerCase()}, ${client.availability.toLowerCase()}`,
    `• Core stack: ${(keywords.length ? keywords : client.skills).slice(0, 6).join(", ")}`,
    `• Location: ${client.location} (${client.relocation.toLowerCase()}) · Target rate: ${client.rate || "open to discussion"}`,
    "",
    `I have attached a resume tailored to this specific posting. Happy to jump on a call today or tomorrow at your convenience.`,
    "",
    "Best regards,",
    ...contactLines(client)
  ].join("\n");

  return {
    to: recruiter.recruiterEmail,
    cc: [client.email, settings.ccLead].filter(Boolean),
    bcc: [settings.adminBcc].filter(Boolean),
    subject,
    body,
    hook,
    keywords,
    attachments: [
      {
        filename: resumeAttachmentName(client),
        description: "Tailored resume"
      }
    ]
  };
}

export function composeFollowup(client, row, settings) {
  const keywords = extractKeywords(row.jobDescription, client.skills).slice(0, 6);
  const list = keywords.slice(0, 3);
  const valueLine = list.length
    ? `Since we last spoke, ${client.name.split(" ")[0]} has been shipping work directly with ${list.join(", ")}, which is exactly the gap you described in the ${row.role} requirement.`
    : `${client.name.split(" ")[0]} remains available immediately and matches the ${row.role} requirement you posted.`;
  const subject = row.subject.toLowerCase().startsWith("re:") ? row.subject : `Re: ${row.subject}`;
  const body = [
    `Hi ${firstNameOf(row.recruiterName)},`,
    "",
    `Following up on my note about the ${row.role} contract — I know inboxes get busy.`,
    "",
    valueLine,
    "",
    `${client.name.split(" ")[0]} is ${client.availability.toLowerCase()} and can interview this week. I re-attached the resume for convenience.`,
    "",
    "Best regards,",
    ...contactLines(client)
  ].join("\n");

  return {
    to: row.recruiterEmail,
    cc: [client.email, settings.ccLead].filter(Boolean),
    bcc: [settings.adminBcc].filter(Boolean),
    subject,
    body,
    inReplyTo: row.messageId,
    references: row.messageId,
    keywords,
    attachments: [
      {
        filename: resumeAttachmentName(client),
        description: "Tailored resume"
      }
    ]
  };
}

function resumeAttachmentName(client) {
  const stamp = Math.floor(Date.now() / 1000);
  return `${client.name}_Resume_${stamp}.docx`.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function transportReady(settings) {
  return Boolean(!settings.simulation && settings.gmailEmail && settings.gmailAppPassword);
}

function buildTransport(settings) {
  const secure = Number(settings.smtpPort) === 465;
  return nodemailer.createTransport({
    host: settings.smtpHost || "smtp.gmail.com",
    port: Number(settings.smtpPort) || 587,
    secure,
    auth: { user: settings.gmailEmail, pass: settings.gmailAppPassword },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000
  });
}

function simulateMessageId(seed) {
  return `<sim-${Buffer.from(String(seed) + Date.now() + Math.random()).toString("hex").slice(0, 24)}@recruitflow.local>`;
}

export async function dispatchEmail(message, settings, options = {}) {
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  if (!transportReady(settings)) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return {
      ok: true,
      simulated: true,
      messageId: simulateMessageId(message.to),
      response: "Simulated dispatch: Gmail credentials or live mode not configured."
    };
  }
  try {
    const transport = buildTransport(settings);
    const info = await transport.sendMail({
      from: `"${settings.senderName || "RecruitFlow"}" <${settings.gmailEmail}>`,
      to: message.to,
      cc: message.cc && message.cc.length ? message.cc.join(", ") : undefined,
      bcc: message.bcc && message.bcc.length ? message.bcc.join(", ") : undefined,
      subject: message.subject,
      text: message.body,
      inReplyTo: message.inReplyTo || undefined,
      references: message.references || undefined,
      attachments
    });
    return { ok: true, simulated: false, messageId: info.messageId, response: info.response };
  } catch (error) {
    return { ok: false, simulated: false, messageId: "", response: "", error: error.message };
  }
}
