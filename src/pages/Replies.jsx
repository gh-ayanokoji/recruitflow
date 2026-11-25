import { useState } from "react";
import { postJson } from "../api";
import { Badge, Card, Empty, Icon, Stat } from "../components/ui";
import { fmtDateTime, relative } from "../utils";

export function Replies({ data, refresh, notify }) {
  const [sync, setSync] = useState(null);
  const [busy, setBusy] = useState(false);

  const awaiting = data.history.filter((row) => Number(row.replied) === 0 && row.emailSentStatus === "sent");
  const replied = data.history.filter((row) => Number(row.replied) === 1);
  const oldest = awaiting.length
    ? new Date(Math.min(...awaiting.map((row) => new Date(row.timestamp).getTime())))
    : null;

  const runSync = async () => {
    setBusy(true);
    try {
      const result = await postJson("/replies/sync", {});
      setSync(result);
      if (result.matched) notify(`${result.matched} new repl${result.matched === 1 ? "y" : "ies"} matched`, "good");
      else notify("Sync finished with no new replies", "");
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="grid grid-4">
        <Stat label="Awaiting reply" value={awaiting.length} note="Sent emails with replied = 0" />
        <Stat label="Replies detected" value={replied.length} note="Reply flag flipped to 1" />
        <Stat
          label="Sync window start"
          value={oldest ? oldest.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "30d"}
          note={oldest ? "Oldest unreplied send" : "Default 30 day lookback"}
        />
        <Stat label="Inbox records" value={data.replies.length} note="Stored reply snippets" />
      </div>

      <Card
        title="IMAP inbox sync"
        subtitle="Read-only scan of the Gmail INBOX, batched headers, sender matched against the outreach history"
        action={
          <button className="btn primary" onClick={runSync} disabled={busy}>
            <Icon name="refresh" size={14} />
            {busy ? "Scanning…" : "Check replies"}
          </button>
        }
      >
        <div className="grid grid-2" style={{ gap: 18 }}>
          <div className="col" style={{ gap: 12 }}>
            <div className="kv">
              <dt>Server</dt><dd className="mono">{data.settings.values.imapHost}:{data.settings.values.imapPort}</dd>
              <dt>Mode</dt>
              <dd>
                <Badge tone={data.settings.secrets.gmailAppPassword.set && !data.settings.values.simulation ? "green" : "amber"}>
                  {data.settings.secrets.gmailAppPassword.set && !data.settings.values.simulation ? "Live IMAP" : "Simulated inbox"}
                </Badge>
              </dd>
              <dt>Search</dt><dd className="mono">SINCE DD-Mon-YYYY · batches of 100</dd>
              <dt>Window</dt><dd className="mono">{oldest ? oldest.toISOString().slice(0, 10) : "last 30 days"}</dd>
            </div>
            <div className="notice">
              <Icon name="alert" size={15} />
              <span>
                Only sender addresses and subject headers are read. Matching flips <span className="mono">replied = 1</span> on the
                oldest unanswered outreach to that recruiter and records the reply snippet.
              </span>
            </div>
          </div>

          <div className="col" style={{ gap: 10 }}>
            {sync ? (
              <>
                <div className={`notice ${sync.matched ? "green" : ""}`}>
                  <Icon name={sync.matched ? "check" : "inbox"} size={15} />
                  <span>
                    {sync.note}
                    <br />
                    Scan mode: <b>{sync.mode}</b> · scanned {sync.scanned} messages · matched {sync.matched}.
                  </span>
                </div>
                {sync.matches?.length ? (
                  <div className="chip-list">
                    {sync.matches.map((match, index) => (
                      <span className="chip matched" key={index}>{match.email}</span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                <b>No sync in this session</b>
                Run a check to reconcile the inbox against the outreach history.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Recruiter replies" subtitle="Matched conversations only" flush>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th>Preview</th>
                <th>Candidate</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {data.replies.length ? (
                data.replies.map((reply) => {
                  const client = data.clients.find((item) => item.id === reply.clientId);
                  return (
                    <tr key={reply.id}>
                      <td>
                        <div className="cell-main">{reply.fromName || reply.from}</div>
                        <div className="cell-sub mono">{reply.from}</div>
                      </td>
                      <td className="small" style={{ maxWidth: 260 }}>{reply.subject}</td>
                      <td className="muted small" style={{ maxWidth: 380 }}>{reply.snippet || "—"}</td>
                      <td className="small">{client?.name || "—"}</td>
                      <td className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(reply.receivedAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>
                    <Empty title="No replies stored">
                      Run a sync after your first outreach batch lands in recruiter inboxes.
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Awaiting reply" subtitle="The records the next sync will try to close" flush>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Recruiter</th>
                <th>Candidate</th>
                <th>Role</th>
                <th>Sent</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {awaiting.length ? (
                [...awaiting]
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                  .map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-main">{row.recruiterName}</div>
                        <div className="cell-sub mono">{row.recruiterEmail}</div>
                      </td>
                      <td className="small">{row.candidate}</td>
                      <td className="small">{row.role}</td>
                      <td className="muted small">{relative(row.timestamp)}</td>
                      <td>
                        <Badge tone={Date.now() - new Date(row.timestamp).getTime() > 7 * 86400000 ? "amber" : ""}>
                          {Math.floor((Date.now() - new Date(row.timestamp).getTime()) / 86400000)}d
                        </Badge>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <Empty title="Every email has a reply">Nothing is waiting on a response.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
