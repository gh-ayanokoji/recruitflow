import { computeStats } from "./stats.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sparkline(series) {
  const max = Math.max(1, ...series.map((point) => point.sent));
  const width = 640;
  const height = 140;
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const points = series
    .map((point, index) => `${(index * step).toFixed(1)},${(height - (point.sent / max) * (height - 16) - 8).toFixed(1)}`)
    .join(" ");
  const replyPoints = series
    .map((point, index) => `${(index * step).toFixed(1)},${(height - (point.replies / max) * (height - 16) - 8).toFixed(1)}`)
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="spark">
    <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${area}" fill="url(#fill)"/>
    <polyline points="${points}" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linejoin="round"/>
    <polyline points="${replyPoints}" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="4 4"/>
  </svg>`;
}

export function buildReportHtml(db, settings) {
  const stats = computeStats(db, settings);
  const generated = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const clientRows = stats.perClient
    .map(
      (client) => `<tr>
        <td><span class="dot" style="background:${escapeHtml(client.accent || "#6366f1")}"></span>${escapeHtml(client.name)}<div class="muted">${escapeHtml(client.role)}</div></td>
        <td class="num">${client.sent}</td>
        <td class="num">${client.replied}</td>
        <td class="num">${client.pending}</td>
        <td class="num">${client.filtered}</td>
        <td class="num">${client.replyRate}%</td>
      </tr>`
    )
    .join("");

  const keywordRows = stats.topKeywords
    .map((item) => {
      const width = Math.max(6, Math.round((item.count / stats.topKeywords[0].count) * 100));
      return `<div class="kw"><span>${escapeHtml(item.keyword)}</span><div class="bar"><i style="width:${width}%"></i></div><b>${item.count}</b></div>`;
    })
    .join("");

  const recentRows = stats.recent
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.recruiterName)}<div class="muted">${escapeHtml(row.recruiterEmail)}</div></td>
        <td>${escapeHtml(row.candidate)}</td>
        <td>${escapeHtml(row.role)}</td>
        <td>${row.replied ? '<span class="pill ok">replied</span>' : '<span class="pill">awaiting</span>'}</td>
        <td class="muted">${new Date(row.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
      </tr>`
    )
    .join("");

  const funnelRows = stats.funnel
    .map((step, index) => {
      const width = Math.max(8, Math.round((step.value / Math.max(1, stats.funnel[0].value)) * 100));
      return `<div class="funnel-row"><span>${escapeHtml(step.label)}</span><div class="funnel-bar"><i style="width:${width}%;opacity:${1 - index * 0.18}"></i></div><b>${step.value}</b></div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RecruitFlow · Outreach Analytics</title>
<style>
  :root{--bg:#0a0b10;--panel:#12141c;--line:rgba(148,163,184,.14);--text:#e6e9f2;--muted:#8b93a7;--accent:#6366f1;--green:#34d399}
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 15% -10%,rgba(99,102,241,.18),transparent),var(--bg);color:var(--text);font-family:'Inter',-apple-system,Segoe UI,sans-serif}
  .wrap{max-width:1080px;margin:0 auto;padding:56px 28px 80px}
  header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;border-bottom:1px solid var(--line);padding-bottom:28px}
  .brand{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted)}
  h1{margin:10px 0 0;font-size:40px;letter-spacing:-.03em}
  .stamp{text-align:right;font-size:12px;color:var(--muted);line-height:1.6}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:32px 0}
  .kpi{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));border:1px solid var(--line);border-radius:16px;padding:20px}
  .kpi span{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--muted)}
  .kpi b{display:block;font-size:34px;margin-top:12px;letter-spacing:-.02em}
  .kpi small{color:var(--green);font-size:12px}
  .grid{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;margin-bottom:20px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px}
  .card h2{margin:0 0 18px;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .spark{width:100%;height:180px;display:block}
  .legend{display:flex;gap:20px;font-size:12px;color:var(--muted);margin-top:10px}
  .legend i{display:inline-block;width:18px;height:2px;vertical-align:middle;margin-right:6px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:0 8px 12px;font-weight:600}
  td{padding:12px 8px;border-top:1px solid var(--line);vertical-align:top}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  .muted{color:var(--muted);font-size:11.5px;margin-top:3px}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}
  .pill{display:inline-block;padding:3px 9px;border-radius:99px;border:1px solid var(--line);font-size:11px;color:var(--muted)}
  .pill.ok{color:var(--green);border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.08)}
  .kw{display:grid;grid-template-columns:120px 1fr 34px;align-items:center;gap:12px;font-size:12.5px;margin-bottom:10px}
  .bar,.funnel-bar{height:7px;border-radius:99px;background:rgba(148,163,184,.12);overflow:hidden}
  .bar i,.funnel-bar i{display:block;height:100%;background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:99px}
  .kw b{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)}
  .funnel-row{display:grid;grid-template-columns:130px 1fr 40px;gap:12px;align-items:center;font-size:12.5px;margin-bottom:14px}
  .funnel-row b{text-align:right;font-variant-numeric:tabular-nums}
  footer{margin-top:36px;color:var(--muted);font-size:11.5px;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:18px}
  @media(max-width:820px){.kpis{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}h1{font-size:30px}}
  @media print{body{background:#0a0b10}}
</style></head>
<body><div class="wrap">
  <header>
    <div><div class="brand">RecruitFlow · C2C Outreach</div><h1>Pipeline Analytics</h1></div>
    <div class="stamp">Generated ${escapeHtml(generated)}<br/>${stats.totals.clients} active candidates · ${stats.totals.runs} scrape runs</div>
  </header>

  <section class="kpis">
    <div class="kpi"><span>Scraped contacts</span><b>${stats.totals.scraped}</b><small>${stats.totals.filtered} filtered out</small></div>
    <div class="kpi"><span>Outreach sent</span><b>${stats.totals.sent}</b><small>${stats.totals.sentToday} today</small></div>
    <div class="kpi"><span>Replies</span><b>${stats.totals.replied}</b><small>${stats.totals.replyRate}% reply rate</small></div>
    <div class="kpi"><span>Follow-ups due</span><b>${stats.totals.followupsDue}</b><small>${settings.followupDays} day threshold</small></div>
  </section>

  <section class="grid">
    <div class="card"><h2>Dispatch volume · 14 days</h2>${sparkline(stats.series)}
      <div class="legend"><span><i style="background:#818cf8"></i>Emails sent</span><span><i style="background:#34d399"></i>Replies</span></div>
    </div>
    <div class="card"><h2>Pipeline funnel</h2>${funnelRows}</div>
  </section>

  <section class="card" style="margin-bottom:20px"><h2>Candidate performance</h2>
    <table><thead><tr><th>Candidate</th><th style="text-align:right">Sent</th><th style="text-align:right">Replied</th><th style="text-align:right">Pending</th><th style="text-align:right">Filtered</th><th style="text-align:right">Reply rate</th></tr></thead>
    <tbody>${clientRows}</tbody></table>
  </section>

  <section class="grid">
    <div class="card"><h2>Recent outreach</h2>
      <table><thead><tr><th>Recruiter</th><th>Candidate</th><th>Role</th><th>Status</th><th>Sent</th></tr></thead><tbody>${recentRows}</tbody></table>
    </div>
    <div class="card"><h2>Top matched keywords</h2>${keywordRows}</div>
  </section>

  <footer><span>RecruitFlow analytics export</span><span>Flat-file pipeline · ${stats.totals.pending} pending contacts</span></footer>
</div></body></html>`;
}
