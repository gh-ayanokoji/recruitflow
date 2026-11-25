import { useCallback, useEffect, useState } from "react";
import { getJson, postJson } from "../api";
import { Badge, Card, Empty, Field, Icon, Segmented } from "../components/ui";
import { ConfirmSend, EmailModal } from "../components/EmailModal";
import { fmtDateTime } from "../utils";

export function Followups({ data, notify, refresh }) {
  const [days, setDays] = useState(Number(data.settings.values.followupDays) || 7);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("live");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getJson(`/followups?days=${days}`);
      setRows(payload.rows);
      setSelected([]);
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const dispatch = async () => {
    setSending(true);
    try {
      const payload = await postJson("/followups/send", { ids: selected, mode });
      setResults(payload.results);
      const ok = payload.results.filter((row) => row.ok).length;
      notify(`${ok} follow-up${ok === 1 ? "" : "s"} processed`, "good");
      setSelected([]);
      setConfirming(false);
      await load();
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <Card
        title="Follow-up eligibility"
        subtitle="Sent, no reply, no previous follow-up, and older than the threshold"
        action={
          <div className="row" style={{ gap: 9 }}>
            <Field label="">
              <div className="row" style={{ gap: 8 }}>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value) || 1)}
                  style={{ width: 76 }}
                />
                <span className="small muted" style={{ alignSelf: "center" }}>days</span>
              </div>
            </Field>
            <button className="btn ghost sm" onClick={load}>
              <Icon name="refresh" size={12} />
              Rescan
            </button>
          </div>
        }
        flush
      >
        <div className="row between" style={{ padding: "12px 20px", flexWrap: "wrap", gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Badge tone="indigo" dot={false}>{rows.length} due now</Badge>
            <Badge tone="cyan" dot={false}>Threaded via In-Reply-To</Badge>
          </div>
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
              <Icon name="repeat" size={12} />
              Send follow-ups ({selected.length})
            </button>
          </div>
        </div>

        {selected.length ? (
          <div className="selection-bar">
            <Icon name="check" size={13} />
            {selected.length} follow-up{selected.length === 1 ? "" : "s"} will be appended to the original Gmail threads
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
                <th>Age</th>
                <th>Threading headers</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}><div className="skeleton" style={{ height: 60 }} /></td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input type="checkbox" className="check" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                    </td>
                    <td>
                      <div className="cell-main">{row.recruiterName}</div>
                      <div className="cell-sub mono">{row.recruiterEmail}</div>
                    </td>
                    <td className="small">{row.candidate}</td>
                    <td className="small">{row.role}</td>
                    <td>
                      <Badge tone={row.ageDays >= 10 ? "amber" : ""}>{row.ageDays}d</Badge>
                    </td>
                    <td>
                      <div className="mono dim" style={{ fontSize: 10.5, maxWidth: 260, wordBreak: "break-all" }}>
                        In-Reply-To: {row.messageId || "missing"}
                      </div>
                    </td>
                    <td>
                      <button className="btn ghost sm" onClick={() => setPreview(row.preview)}>Preview</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty title="No follow-ups are due">
                      Emails become eligible {days} days after dispatch when no reply has been detected.
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {results.length ? (
        <Card title="Follow-up results" subtitle="Live increments followup_count and stamps last_followup_at">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={`${row.id}-${index}`}>
                    <td className="mono small">{row.recruiterEmail}</td>
                    <td className="small">{row.subject}</td>
                    <td><Badge tone={row.ok ? (row.simulated ? "amber" : "green") : "red"}>{row.error || (row.simulated ? "simulated" : "sent")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-2">
        <Card title="How threading works" subtitle="Why replies stay in one conversation">
          <div className="steps">
            <div className="step">The original outreach stores the SMTP Message-ID returned by Gmail.</div>
            <div className="step">The follow-up sets In-Reply-To and References to that exact ID and prefixes the subject with "Re: ".</div>
            <div className="step">Gmail surfaces the nudge directly under the first email, so the recruiter sees one thread.</div>
            <div className="step">A detected reply stops all further follow-ups for that contact.</div>
          </div>
        </Card>
        <Card title="Eligibility rule" subtitle="Mirrors the flat database flags">
          <div className="kv">
            <dt>Status</dt><dd><span className="mono">email_sent_status = "sent"</span></dd>
            <dt>Reply flag</dt><dd><span className="mono">replied = 0</span></dd>
            <dt>Follow-ups</dt><dd><span className="mono">followup_count = 0</span></dd>
            <dt>Age</dt><dd><span className="mono">timestamp ≤ now − {days} days</span></dd>
            <dt>Batch</dt><dd className="muted small">Resume re-attached with a fresh timestamped filename</dd>
          </div>
        </Card>
      </div>

      {preview ? (
        <EmailModal
          preview={preview}
          title="Follow-up preview"
          onClose={() => setPreview(null)}
          footer={<button className="btn ghost" onClick={() => setPreview(null)}>Close</button>}
        />
      ) : null}

      {confirming ? (
        <ConfirmSend
          count={selected.length}
          busy={sending}
          label="Send follow-ups"
          onCancel={() => setConfirming(false)}
          onConfirm={dispatch}
        />
      ) : null}
    </div>
  );
}
