import { AreaChart, Badge, Card, Icon, Stat } from "../components/ui";
import { downloadUrl } from "../utils";

export function Analytics({ data }) {
  const { stats } = data;
  const maxSent = Math.max(1, ...stats.perClient.map((client) => client.sent));

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="grid grid-4">
        <Stat label="Total scraped" value={stats.totals.scraped} note={`${stats.totals.filtered} rejected by filters`} />
        <Stat label="Emails sent" value={stats.totals.sent} note={`${stats.totals.sentToday} today`} />
        <Stat label="Reply rate" value={`${stats.totals.replyRate}%`} note={`${stats.totals.replied} recruiter replies`} />
        <Stat label="Follow-ups due" value={stats.totals.followupsDue} note={`Threshold ${data.settings.values.followupDays} days`} />
      </div>

      <Card
        title="Performance report"
        subtitle="A self-contained dark HTML dashboard, ready to share with a client"
        action={
          <a className="btn primary" href={downloadUrl("/export/report.html")}>
            <Icon name="download" size={14} />
            Export analytics_report.html
          </a>
        }
      >
        <div className="grid grid-2" style={{ gap: 18 }}>
          <div>
            <div className="small muted" style={{ marginBottom: 8 }}>Dispatch and replies · 14 days</div>
            <AreaChart series={stats.series} />
          </div>
          <div className="col" style={{ gap: 12 }}>
            <div className="small muted">Pipeline funnel</div>
            <div className="funnel">
              {stats.funnel.map((step, index) => (
                <div className="funnel-row" key={step.label}>
                  <span className="label">{step.label}</span>
                  <div className="bar">
                    <i
                      style={{
                        width: `${Math.max(5, Math.round((step.value / Math.max(1, stats.funnel[0].value)) * 100))}%`,
                        opacity: 1 - index * 0.16
                      }}
                    />
                  </div>
                  <b>{step.value}</b>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row between small">
              <span className="muted">Contacts awaiting approval</span>
              <b>{stats.totals.pending}</b>
            </div>
            <div className="row between small">
              <span className="muted">Registered candidates</span>
              <b>{stats.totals.clients}</b>
            </div>
            <div className="row between small">
              <span className="muted">Scrape runs logged</span>
              <b>{stats.totals.runs}</b>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="Reply rate by candidate" subtitle="Replies per candidate against total outreach">
          <div className="col" style={{ gap: 14 }}>
            {stats.perClient.map((client) => (
              <div className="keyword-row" key={client.id} style={{ gridTemplateColumns: "130px minmax(0,1fr) 46px" }}>
                <span className="muted">{client.name}</span>
                <div className="bar">
                  <i style={{ width: `${Math.max(4, (client.sent / maxSent) * 100)}%`, background: client.accent }} />
                </div>
                <b>{client.replyRate}%</b>
              </div>
            ))}
          </div>
          <div className="divider" style={{ margin: "6px 0 14px" }} />
          <div className="row wrap" style={{ gap: 8 }}>
            <Badge tone="indigo" dot={false}>{stats.totals.sent} sent</Badge>
            <Badge tone="green" dot={false}>{stats.totals.replied} replied</Badge>
            <Badge tone="amber" dot={false}>{stats.totals.followupsDue} follow-ups due</Badge>
          </div>
        </Card>

        <Card title="Top matched keywords" subtitle="Signals from recruiter job descriptions">
          {stats.topKeywords.map((item) => (
            <div className="keyword-row" key={item.keyword}>
              <span className="muted">{item.keyword}</span>
              <div className="bar">
                <i style={{ width: `${Math.max(8, (item.count / stats.topKeywords[0].count) * 100)}%` }} />
              </div>
              <b>{item.count}</b>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Data exports" subtitle="Flat CSV files mirror the local pipeline database">
        <div className="grid grid-3" style={{ gap: 12 }}>
          <a className="btn ghost" href={downloadUrl("/export/recruiters.csv")}>
            <Icon name="download" size={13} />
            recruiters.csv
          </a>
          <a className="btn ghost" href={downloadUrl("/export/history.csv")}>
            <Icon name="download" size={13} />
            email_sent_history.csv
          </a>
          <a className="btn ghost" href={downloadUrl("/export/report.html")}>
            <Icon name="download" size={13} />
            analytics_report.html
          </a>
        </div>
        <div className="notice" style={{ marginTop: 14 }}>
          <Icon name="alert" size={15} />
          <span>
            Exports always reflect the current store, including filter verdicts, message IDs and reply flags. The HTML report is fully
            self-contained and embeds its own dark theme.
          </span>
        </div>
      </Card>
    </div>
  );
}
