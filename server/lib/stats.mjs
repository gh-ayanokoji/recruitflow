function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function followupEligible(row, days) {
  if (row.emailSentStatus !== "sent") return false;
  if (row.replied) return false;
  if (Number(row.followupCount) > 0) return false;
  const age = (Date.now() - new Date(row.timestamp).getTime()) / 86400000;
  return age >= days;
}

export function computeStats(db, settings) {
  const today = dayKey(new Date());
  const sent = db.history.filter((row) => row.emailSentStatus === "sent");
  const replied = db.history.filter((row) => Number(row.replied) === 1);
  const pending = db.recruiters.filter((row) => row.emailSentStatus === "pending");
  const filtered = db.recruiters.filter((row) => row.emailSentStatus === "filtered" || row.emailSentStatus === "mismatched_role");
  const days = Number(settings.followupDays) || 7;
  const due = db.history.filter((row) => followupEligible(row, days));

  const series = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86400000);
    const key = dayKey(date);
    series.push({
      date: key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sent: db.history.filter((row) => dayKey(row.timestamp) === key).length,
      replies: db.replies.filter((row) => dayKey(row.receivedAt) === key).length
    });
  }

  const perClient = db.clients.map((client) => {
    const clientSent = db.history.filter((row) => row.clientId === client.id);
    const clientReplied = clientSent.filter((row) => Number(row.replied) === 1);
    return {
      id: client.id,
      key: client.key,
      name: client.name,
      role: client.primaryRole,
      accent: client.accent,
      sent: clientSent.length,
      replied: clientReplied.length,
      pending: db.recruiters.filter((row) => row.clientId === client.id && row.emailSentStatus === "pending").length,
      filtered: db.recruiters.filter(
        (row) => row.clientId === client.id && (row.emailSentStatus === "filtered" || row.emailSentStatus === "mismatched_role")
      ).length,
      followupsDue: clientSent.filter((row) => followupEligible(row, days)).length,
      replyRate: clientSent.length ? Math.round((clientReplied.length / clientSent.length) * 100) : 0
    };
  });

  const keywordCounts = new Map();
  for (const row of db.history) {
    for (const keyword of row.hookKeywords || []) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    }
  }
  for (const row of db.recruiters) {
    if (row.emailSentStatus !== "pending") continue;
    for (const keyword of row.keywords || []) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    }
  }
  const topKeywords = [...keywordCounts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totals: {
      scraped: db.recruiters.length,
      pending: pending.length,
      sent: sent.length,
      replied: replied.length,
      filtered: filtered.length,
      followupsDue: due.length,
      sentToday: db.history.filter((row) => dayKey(row.timestamp) === today).length,
      replyRate: sent.length ? Math.round((replied.length / sent.length) * 100) : 0,
      clients: db.clients.length,
      runs: db.runs.length
    },
    series,
    perClient,
    topKeywords,
    funnel: [
      { label: "Scraped", value: db.recruiters.length },
      { label: "Passed filters", value: db.recruiters.length - filtered.length },
      { label: "Outreach sent", value: sent.length },
      { label: "Replied", value: replied.length }
    ],
    recent: [...db.history]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8)
  };
}
