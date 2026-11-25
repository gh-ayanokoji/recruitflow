import { Badge, Card, Empty, Icon, Stat } from "../components/ui";
import { AreaChart } from "../components/ui";
import { statusLabel, statusTone, relative, fmtDate } from "../utils";

export function Overview({ data, navigate }) {
  const { stats, settings, session, clients } = data;
  const totals = stats.totals;
  const pendingRows = data.recruiters.filter((row) => row.emailSentStatus === "pending").slice(0, 5);
  const aiReady = settings.secrets.geminiKey.set || settings.secrets.groqKey.set || settings.secrets.openrouterKey.set;
  const checklist = [
    { label: "Capture a LinkedIn session for the scraper", done: session.present, action: "settings" },
    { label: "Connect Gmail app password for SMTP and IMAP", done: settings.secrets.gmailAppPassword.set, action: "settings" },
    { label: "Add an AI key (Gemini, Groq or OpenRouter)", done: aiReady, action: "settings" },
    { label: "Review target roles for every candidate", done: clients.length > 0, action: "clients" }
  ];

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="grid grid-4">
        <Stat label="Scraped contacts" value={totals.scraped} note={<span>{totals.filtered} rejected by strict filters</span>} />
        <Stat label="Outreach sent" value={totals.sent} note={<span>{totals.sentToday} dispatched today</span>} />
        <Stat
          label="Recruiter replies"
          value={totals.replied}
          note={<span><span className="up">{totals.replyRate}%</span> reply rate</span>}
        />
        <Stat label="Pending approval" value={totals.pending} note={<span>{totals.followupsDue} follow-ups due</span>} />
      </div>

      <div className="grid grid-main">
        <Card
          title="Dispatch volume"
          subtitle="Last 14 days · outreach emails against recruiter replies"
          action={<Badge tone="indigo" dot={false}>{totals.runs} scrape runs</Badge>}
        >
          <AreaChart series={stats.series} />
        </Card>

        <Card title="Pipeline funnel" subtitle="How the strict filter narrows each scrape">
          <div className="funnel">
            {stats.funnel.map((step, index) => (
              <div className="funnel-row" key={step.label}>
                <span className="label">{step.label}</span>
                <div className="bar">
                  <i
                    style={{
                      width: `${Math.max(5, Math.round((step.value / Math.max(1, stats.funnel[0].value)) * 100))}%`,
                      opacity: 1 - index * 0.17
                    }}
                  />
                </div>
                <b>{step.value}</b>
              </div>
            ))}
          </div>
          <div className="divider" style={{ margin: "16px 0 14px" }} />
          <div className="row between small muted">
            <span>Pass rate</span>
            <b style={{ color: "var(--text)" }}>
              {Math.round(((totals.scraped - totals.filtered) / Math.max(1, totals.scraped)) * 100)}%
            </b>
          </div>
        </Card>
      </div>

      <div className="grid grid-main">
        <Card title="Candidate performance" subtitle="Reply rate per registered client candidate">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th className="num">Sent</th>
                  <th className="num">Replied</th>
                  <th className="num">Pending</th>
                  <th className="num">Follow-ups</th>
                  <th className="num">Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.perClient.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="row">
                        <span className="dot" style={{ width: 8, height: 8, borderRadius: 99, background: client.accent || "#6366f1" }} />
                        <div>
                          <div className="cell-main">{client.name}</div>
                          <div className="cell-sub">{client.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{client.sent}</td>
                    <td className="num">{client.replied}</td>
                    <td className="num">{client.pending}</td>
                    <td className="num">{client.followupsDue}</td>
                    <td className="num">
                      <span className={`badge ${client.replyRate > 0 ? "green" : ""}`} style={{ fontSize: 10 }}>
                        {client.replyRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Ready to approve"
          subtitle="Latest first-pass contacts"
          action={
            <button className="btn ghost sm" onClick={() => navigate("pipeline")}>
              Open pipeline
              <Icon name="arrow" size={12} />
            </button>
          }
        >
          {pendingRows.length ? (
            <div className="col" style={{ gap: 12 }}>
              {pendingRows.map((row) => {
                const client = clients.find((item) => item.id === row.clientId);
                return (
                  <div key={row.id} className="row between" style={{ gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-main" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.recruiterName}
                      </div>
                      <div className="cell-sub">{row.role} · {client?.name || "—"}</div>
                    </div>
                    <span className="mono dim" style={{ fontSize: 10.5 }}>{relative(row.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title="Inbox zero on the queue">
              Run a scrape from the pipeline to add eligible recruiters.
            </Empty>
          )}
        </Card>
      </div>

      <div className="grid grid-main">
        <Card title="Recent outreach" subtitle="Latest rows written to email_sent_history.csv" flush>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Recruiter</th>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="cell-main">{row.recruiterName}</div>
                      <div className="cell-sub mono">{row.recruiterEmail}</div>
                    </td>
                    <td>{row.candidate}</td>
                    <td>
                      <Badge tone={row.replied ? "green" : statusTone(row.emailSentStatus)}>
                        {row.replied ? "replied" : statusLabel(row.emailSentStatus)}
                      </Badge>
                    </td>
                    <td className="muted small">{fmtDate(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="col" style={{ gap: 16 }}>
          <Card title="Top matched keywords" subtitle="Technologies pulled from live job descriptions">
            {stats.topKeywords.length ? (
              stats.topKeywords.slice(0, 7).map((item) => (
                <div className="keyword-row" key={item.keyword}>
                  <span className="muted">{item.keyword}</span>
                  <div className="bar">
                    <i style={{ width: `${Math.max(8, (item.count / stats.topKeywords[0].count) * 100)}%` }} />
                  </div>
                  <b>{item.count}</b>
                </div>
              ))
            ) : (
              <Empty title="No keywords yet">Scrape or send outreach to populate this.</Empty>
            )}
          </Card>

          <Card title="Setup checklist" subtitle="Everything the automation needs before a live run">
            <div className="checklist">
              {checklist.map((item) => (
                <div className="checklist-item" key={item.label}>
                  <span className={`tick ${item.done ? "done" : ""}`}>{item.done ? "✓" : ""}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {!item.done ? (
                    <button className="btn ghost sm" onClick={() => navigate(item.action)}>
                      Fix
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
