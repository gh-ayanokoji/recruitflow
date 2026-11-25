import { useEffect, useMemo, useState } from "react";
import { postJson } from "../api";
import { Badge, Card, CopyButton, Empty, Field, Icon } from "../components/ui";
import { ConfirmSend, EmailModal } from "../components/EmailModal";
import { statusTone, statusLabel, relative } from "../utils";

function buildQuery(role, exclusions) {
  const extras = (exclusions || [])
    .filter((word) => !["hotlist", "fulltime", "available consultants", "bench"].includes(String(word).toLowerCase()))
    .map((word) => `-${String(word).includes(" ") ? `"${word}"` : word}`);
  return [`"${role}"`, "C2C", "-hotlist", "-fulltime", '-"available consultants"', "-Bench", ...extras].join(" ");
}

export function Pipeline({ data, refresh, notify, navigate }) {
  const { clients, settings } = data;
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const client = clients.find((item) => item.id === clientId) || clients[0];
  const [roles, setRoles] = useState(client?.searchRoles || []);
  const [limit, setLimit] = useState(8);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (client) setRoles(client.searchRoles || []);
  }, [clientId]);

  const pending = useMemo(
    () => data.recruiters.filter((row) => row.clientId === client?.id && row.emailSentStatus === "pending"),
    [data.recruiters, client]
  );

  const rejected = useMemo(
    () => data.recruiters.filter((row) => row.clientId === client?.id && ["filtered", "mismatched_role"].includes(row.emailSentStatus)),
    [data.recruiters, client]
  );

  const queries = roles.length ? roles.map((role) => ({ role, query: buildQuery(role, client?.exclusionKeywords) })) : [];

  const toggleRole = (role) => {
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  };

  const runScrape = async () => {
    if (!roles.length) {
      notify("Select at least one target role", "bad");
      return;
    }
    setRunning(true);
    setLog([`> starting scrape for ${client.name}`, `> roles: ${roles.join(" · ")}`]);
    try {
      const result = await postJson("/scrape", { clientId: client.id, roles, limit });
      setLog(result.log || []);
      setOutcome(result);
      notify(`${result.added} new contacts stored · ${result.rejected} rejected`, "good");
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
      setLog((current) => [...current, `! ${error.message}`]);
    } finally {
      setRunning(false);
    }
  };

  const openPreview = async (recruiter) => {
    try {
      const result = await postJson("/email/preview", { clientId: recruiter.clientId, recruiterId: recruiter.id });
      setPreview(result);
    } catch (error) {
      notify(error.message, "bad");
    }
  };

  const dispatch = async () => {
    setSending(true);
    try {
      const result = await postJson("/outreach/send", { clientId: client.id, recruiterIds: selected, mode: "live" });
      const succeeded = result.results.filter((row) => row.ok).length;
      notify(`${succeeded} email${succeeded === 1 ? "" : "s"} dispatched${result.simulated ? " (simulated)" : ""}`, "good");
      setSelected([]);
      setConfirming(false);
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setSending(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <Card
        title="Search configuration"
        subtitle="LinkedIn content search · past 24 hours · sorted by date · United States geo target"
        action={<Badge tone={settings.values.playwrightEnabled ? "cyan" : "amber"}>{settings.values.playwrightEnabled ? "Playwright live" : "Sample corpus"}</Badge>}
      >
        <div className="grid grid-2" style={{ gap: 18 }}>
          <div className="col" style={{ gap: 14 }}>
            <Field label="Client candidate">
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.primaryRole}
                  </option>
                ))}
              </select>
            </Field>

            <div className="field">
              <span>Target roles</span>
              <div className="chip-list">
                {(client?.searchRoles || []).map((role) => (
                  <button
                    key={role}
                    className={`chip selectable ${roles.includes(role) ? "on" : ""}`}
                    onClick={() => toggleRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <span className="hint">Roles come from the candidate profile. Every selected role becomes its own LinkedIn query.</span>
            </div>

            <Field label={`Posts inspected per role · ${limit}`}>
              <input type="range" min="4" max="20" value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
            </Field>

            <div className="row wrap">
              <button className="btn primary" onClick={runScrape} disabled={running}>
                <Icon name="search" size={14} />
                {running ? "Scraping…" : "Run scrape"}
              </button>
              <button className="btn ghost" onClick={() => navigate("outreach")}>
                Go to send queue
                <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>

          <div className="col" style={{ gap: 12 }}>
            <div className="field">
              <span>Generated queries</span>
            </div>
            {queries.length ? (
              queries.map((item) => (
                <div key={item.role} className="card pad" style={{ padding: 13 }}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span className="small" style={{ fontWeight: 500 }}>{item.role}</span>
                    <CopyButton value={item.query} notify={notify} label="" />
                  </div>
                  <div className="mono dim" style={{ lineHeight: 1.6, wordBreak: "break-word" }}>{item.query}</div>
                </div>
              ))
            ) : (
              <span className="small muted">Pick a role to preview the query.</span>
            )}
            <div className="notice">
              <Icon name="alert" size={15} />
              <span>
                Exclusions: {client?.exclusionKeywords?.join(", ")}. Filters reject non-US locations, bench-marketing posts and domain
                mismatches before anything reaches the queue.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {log.length ? (
        <Card
          title="Scraper console"
          subtitle="Chrome devtools style trace of the last run"
          action={
            outcome ? (
              <div className="row" style={{ gap: 8 }}>
                <Badge tone="green">{outcome.added} stored</Badge>
                <Badge tone="red">{outcome.rejected} rejected</Badge>
              </div>
            ) : null
          }
        >
          <div className="console">
            {log.map((line, index) => {
              const tone = line.trim().startsWith("✓") ? "ok" : line.trim().startsWith("✕") ? "bad" : line.startsWith("Query") ? "info" : "";
              return (
                <div key={index} className={tone}>
                  {line}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card
        title="Eligible contacts"
        subtitle={`${pending.length} pending · ${rejected.length} rejected for ${client?.name || "candidate"}`}
        action={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost sm" onClick={() => setSelected(pending.map((row) => row.id))}>
              Select all
            </button>
            <button className="btn primary sm" disabled={!selected.length} onClick={() => setConfirming(true)}>
              <Icon name="send" size={12} />
              Approve & send {selected.length ? `(${selected.length})` : ""}
            </button>
          </div>
        }
        flush
      >
        {selected.length ? (
          <div className="selection-bar">
            <Icon name="check" size={13} />
            {selected.length} contact{selected.length === 1 ? "" : "s"} selected for dispatch
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
                <th>Role</th>
                <th>Filter checks</th>
                <th>Status</th>
                <th>Found</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.length ? (
                pending.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="check"
                        checked={selected.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td>
                      <div className="cell-main">{row.recruiterName}</div>
                      <div className="cell-sub mono">{row.recruiterEmail}</div>
                      <details className="jd">
                        <summary>Job description</summary>
                        <p>{row.jobDescription}</p>
                      </details>
                    </td>
                    <td>{row.role}</td>
                    <td>
                      <div className="row wrap" style={{ gap: 5 }}>
                        <Badge tone="green" dot={false}>US</Badge>
                        <Badge tone="green" dot={false}>no bench</Badge>
                        <Badge tone="green" dot={false}>domain</Badge>
                      </div>
                    </td>
                    <td>
                      <Badge tone={statusTone(row.emailSentStatus)}>{statusLabel(row.emailSentStatus)}</Badge>
                    </td>
                    <td className="muted small">{relative(row.timestamp)}</td>
                    <td>
                      <button className="btn ghost sm" onClick={() => openPreview(row)}>
                        Preview
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty title="No pending contacts">
                      Run a scrape, or widen the target roles for this candidate.
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {rejected.length ? (
        <Card title="Rejected by strict filters" subtitle="Kept for audit so nothing silently disappears" flush>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Recruiter</th>
                  <th>Role posted</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rejected.slice(0, 12).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="cell-main">{row.recruiterName}</div>
                      <div className="cell-sub mono">{row.recruiterEmail}</div>
                    </td>
                    <td>{row.role}</td>
                    <td className="muted small" style={{ maxWidth: 420 }}>{row.filterReason || "—"}</td>
                    <td>
                      <Badge tone={statusTone(row.emailSentStatus)}>{statusLabel(row.emailSentStatus)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {preview ? (
        <EmailModal
          preview={preview}
          onClose={() => setPreview(null)}
          footer={<button className="btn ghost" onClick={() => setPreview(null)}>Close</button>}
        />
      ) : null}

      {confirming ? (
        <ConfirmSend
          count={selected.length}
          busy={sending}
          onCancel={() => setConfirming(false)}
          onConfirm={dispatch}
        />
      ) : null}
    </div>
  );
}
