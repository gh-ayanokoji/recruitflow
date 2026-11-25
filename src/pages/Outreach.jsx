import { useMemo, useState } from "react";
import { postJson } from "../api";
import { Badge, Card, CopyButton, Empty, Icon, Segmented, Stat } from "../components/ui";
import { ConfirmSend, EmailModal } from "../components/EmailModal";
import { downloadUrl, fmtDateTime, statusLabel, statusTone } from "../utils";

export function Outreach({ data, refresh, notify }) {
  const { clients, recruiters, history } = data;
  const [mode, setMode] = useState("live");
  const [clientFilter, setClientFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

  const pending = useMemo(() => {
    return recruiters
      .filter((row) => row.emailSentStatus === "pending")
      .filter((row) => (clientFilter === "all" ? true : row.clientId === clientFilter))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [recruiters, clientFilter]);

  const contacted = new Set(history.map((row) => `${row.clientId}|${row.recruiterEmail}`));
  const duplicates = pending.filter((row) => contacted.has(`${row.clientId}|${row.recruiterEmail}`));

  const today = new Date().toISOString().slice(0, 10);
  const sentToday = history.filter((row) => new Date(row.timestamp).toISOString().slice(0, 10) === today).length;
  const limit = Number(data.settings.values.dailyLimit) || 0;
  const remaining = Math.max(0, limit - sentToday);
  const simulation = data.settings.values.simulation || !data.settings.secrets.gmailAppPassword.set;

  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const openPreview = async (row) => {
    try {
      const result = await postJson("/email/preview", { clientId: row.clientId, recruiterId: row.id });
      setPreview({ ...result, recruiterId: row.id });
    } catch (error) {
      notify(error.message, "bad");
    }
  };

  const dispatch = async () => {
    setSending(true);
    try {
      const payload = await postJson("/outreach/send", {
        clientId: pending.find((row) => selected.includes(row.id))?.clientId,
        recruiterIds: selected,
        mode
      });
      setResults(payload.results);
      const ok = payload.results.filter((row) => row.ok).length;
      notify(
        mode === "test" ? `Test run complete · ${ok} preview email${ok === 1 ? "" : "s"} delivered to the operator` : `${ok} email${ok === 1 ? "" : "s"} dispatched${payload.simulated ? " (simulated)" : ""}`,
        "good"
      );
      setSelected([]);
      setConfirming(false);
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setSending(false);
    }
  };

  const sendPreviewSingle = () => {
    if (!preview) return;
    setSelected((current) => (current.includes(preview.recruiterId) ? current : [...current, preview.recruiterId]));
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="grid grid-4">
        <Stat label="Pending queue" value={pending.length} note="Approved recruiters awaiting a first touch" />
        <Stat label="Daily capacity" value={`${remaining}/${limit || "—"}`} note={<span>{sentToday} sent today</span>} />
        <Stat label="Sent all time" value={history.filter((row) => row.emailSentStatus === "sent").length} note="Rows in email_sent_history.csv" />
        <Stat
          label="Duplicate guard"
          value={duplicates.length}
          note={<span>{duplicates.length ? "already contacted" : "no collisions"}</span>}
        />
      </div>

      <Card
        title="Send queue"
        subtitle="One personalized email per recruiter, with the tailored resume attached"
        action={
          <div className="row" style={{ gap: 9 }}>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "test", label: "Test" },
                { value: "live", label: "Live" }
              ]}
            />
            <button className="btn primary sm" disabled={!selected.length} onClick={() => setConfirming(true)}>
              <Icon name="send" size={12} />
              Send selected ({selected.length})
            </button>
          </div>
        }
        flush
      >
        <div className="row between" style={{ padding: "12px 20px", gap: 12, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 10 }}>
            <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} style={{ width: 220 }}>
              <option value="all">All candidates</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <button className="btn ghost sm" onClick={() => setSelected(pending.map((row) => row.id))}>Select all</button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Badge tone={simulation ? "amber" : "green"}>{simulation ? "Simulated dispatch" : "Gmail SMTP live"}</Badge>
            <Badge tone="indigo" dot={false}>{mode === "test" ? "Test mode: operator only" : "Live mode: real recipients"}</Badge>
          </div>
        </div>

        {selected.length ? (
          <div className="selection-bar">
            <Icon name="check" size={13} />
            {selected.length} selected · the resume is tailored locally and attached at dispatch
            <div style={{ marginLeft: "auto" }}>
              <button className="btn ghost sm" onClick={() => setSelected([])}>Clear</button>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>Recruiter</th>
                <th>Candidate</th>
                <th>Role</th>
                <th>Hook keywords</th>
                <th>Scraped</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.length ? (
                pending.map((row) => {
                  const client = clients.find((item) => item.id === row.clientId);
                  return (
                    <tr key={row.id}>
                      <td>
                        <input type="checkbox" className="check" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                      </td>
                      <td>
                        <div className="cell-main">{row.recruiterName}</div>
                        <div className="cell-sub mono">{row.recruiterEmail}</div>
                      </td>
                      <td className="small">{client?.name || "—"}</td>
                      <td className="small">{row.role}</td>
                      <td>
                        <div className="chip-list">
                          {(row.keywords || []).slice(0, 3).map((keyword) => (
                            <span className="chip" key={keyword}>{keyword}</span>
                          ))}
                        </div>
                      </td>
                      <td className="muted small">{fmtDateTime(row.timestamp)}</td>
                      <td>
                        <button className="btn ghost sm" onClick={() => openPreview(row)}>Preview</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty title="Queue is clear">
                      Every eligible contact has been contacted. Run a fresh scrape to top up the pipeline.
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {results.length ? (
        <Card title="Last dispatch" subtitle="Per-message SMTP outcome">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Result</th>
                  <th>Message-ID</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={`${row.recruiterId}-${index}`}>
                    <td className="mono small">{row.to}</td>
                    <td className="small" style={{ maxWidth: 330 }}>{row.subject}</td>
                    <td>
                      <Badge tone={row.ok ? (row.simulated ? "amber" : "green") : "red"}>
                        {row.error || row.status}
                      </Badge>
                    </td>
                    <td className="mono dim small" style={{ maxWidth: 220, wordBreak: "break-all" }}>{row.messageId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card
        title="Outreach history"
        subtitle="De-duplication source of truth · message IDs drive follow-up threading"
        action={
          <a className="btn ghost sm" href={downloadUrl("/export/history.csv")}>
            <Icon name="download" size={12} />
            Export email_sent_history.csv
          </a>
        }
        flush
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Recruiter</th>
                <th>Candidate</th>
                <th>Subject</th>
                <th>Message-ID</th>
                <th>Follow-ups</th>
                <th>Status</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {history.length ? (
                [...history]
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-main">{row.recruiterName}</div>
                        <div className="cell-sub mono">{row.recruiterEmail}</div>
                      </td>
                      <td className="small">{row.candidate}</td>
                      <td className="small" style={{ maxWidth: 320 }}>{row.subject}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <span className="mono dim" style={{ fontSize: 10.5, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.messageId || "—"}
                          </span>
                          {row.messageId ? <CopyButton value={row.messageId} notify={notify} label="" /> : null}
                        </div>
                      </td>
                      <td className="num">{row.followupCount}</td>
                      <td>
                        <Badge tone={row.replied ? "green" : statusTone(row.emailSentStatus)}>
                          {row.replied ? "replied" : statusLabel(row.emailSentStatus)}
                        </Badge>
                      </td>
                      <td className="muted small">{fmtDateTime(row.timestamp)}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty title="No outreach yet">Send the first batch from the queue above.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {preview ? (
        <EmailModal
          preview={preview}
          title="Outreach preview"
          onClose={() => setPreview(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setPreview(null)}>Close</button>
              <button
                className="btn primary"
                onClick={() => {
                  sendPreviewSingle();
                  setPreview(null);
                }}
              >
                Add to selection
              </button>
            </>
          }
        />
      ) : null}

      {confirming ? (
        <ConfirmSend
          count={selected.length}
          busy={sending}
          label={mode === "test" ? "Send test batch" : "Send outreach"}
          onCancel={() => setConfirming(false)}
          onConfirm={dispatch}
        />
      ) : null}
    </div>
  );
}
