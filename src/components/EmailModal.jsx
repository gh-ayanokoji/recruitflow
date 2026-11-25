import { Badge, Icon, Modal } from "./ui";

export function EmailModal({ preview, title, onClose, footer }) {
  if (!preview) return null;
  const headers = [
    ["To", preview.to],
    ["Cc", (preview.cc || []).join(", ") || "—"],
    ["Bcc", (preview.bcc || []).join(", ") || "—"],
    ["Subject", preview.subject]
  ];
  if (preview.inReplyTo) headers.push(["In-Reply-To", preview.inReplyTo]);
  if (preview.references) headers.push(["References", preview.references]);
  if (preview.attachments?.length) headers.push(["Attachment", preview.attachments.map((item) => item.filename).join(", ")]);

  return (
    <Modal title={title || "Email preview"} subtitle="Exactly what will leave the outbox." onClose={onClose} wide footer={footer}>
      <div className="card" style={{ background: "rgba(8,9,13,0.4)" }}>
        <div className="card-body">
          {headers.map(([label, value]) => (
            <div className="header-line" key={label}>
              <span>{label}</span>
              <span className={label === "Subject" || label.includes("Reply") || label === "References" ? "mono" : ""} style={{ wordBreak: "break-word" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {preview.keywords?.length ? (
        <div className="row wrap small muted">
          <Icon name="sparkle" size={13} />
          JD hook keywords
          {preview.keywords.map((keyword) => (
            <span className="chip" key={keyword}>
              {keyword}
            </span>
          ))}
        </div>
      ) : null}

      <div className="email-preview">{preview.body}</div>
    </Modal>
  );
}

export function ConfirmSend({ count, label, busy, onCancel, onConfirm }) {
  return (
    <Modal
      title="Confirm dispatch"
      subtitle={`${count} personalized email${count === 1 ? "" : "s"} will be sent from the configured Gmail account.`}
      onClose={onCancel}
      footer={
        <>
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy} onClick={onConfirm}>
            {busy ? "Dispatching…" : label || "Send outreach"}
          </button>
        </>
      }
    >
      <div className="notice amber">
        <Icon name="alert" size={16} />
        <span>
          This action writes to the outreach history and cannot be recalled. Client candidates and the team lead are CC'd, the admin is BCC'd.
        </span>
      </div>
      <div className="row wrap small muted">
        <Badge tone="indigo" dot={false}>Duplicate guard active</Badge>
        <Badge tone="green" dot={false}>Threading headers preserved</Badge>
        <Badge tone="cyan" dot={false}>Rate-limited dispatch</Badge>
      </div>
    </Modal>
  );
}
