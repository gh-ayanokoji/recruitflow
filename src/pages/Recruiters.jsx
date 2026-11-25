import { useMemo, useState } from "react";
import { deleteJson, patchJson } from "../api";
import { Badge, Card, Empty, Icon } from "../components/ui";
import { downloadUrl, fmtDateTime, statusLabel, statusTone } from "../utils";

const STATUSES = ["pending", "sent", "failed", "mismatched_role", "filtered"];

export function Recruiters({ data, refresh, notify }) {
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [includeExcluded, setIncludeExcluded] = useState(false);

  const clientsById = useMemo(() => Object.fromEntries(data.clients.map((client) => [client.id, client])), [data.clients]);

  const rows = useMemo(() => {
    return data.recruiters
      .filter((row) => (clientFilter === "all" ? true : row.clientId === clientFilter))
      .filter((row) => {
        if (statusFilter !== "all") return row.emailSentStatus === statusFilter;
        if (includeExcluded) return true;
        return !["filtered", "mismatched_role"].includes(row.emailSentStatus);
      })
      .filter((row) => {
        if (!query.trim()) return true;
        const needle = query.toLowerCase();
        return (
          row.recruiterName.toLowerCase().includes(needle) ||
          row.recruiterEmail.toLowerCase().includes(needle) ||
          row.role.toLowerCase().includes(needle) ||
          row.jobDescription.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data.recruiters, clientFilter, statusFilter, query, includeExcluded]);

  const changeStatus = async (row, status) => {
    try {
      await patchJson(`/recruiters/${row.id}`, { emailSentStatus: status });
      notify(`${row.recruiterEmail} marked ${statusLabel(status)}`, "good");
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.recruiterEmail} from the database?`)) return;
    try {
      await deleteJson(`/recruiters/${row.id}`);
      notify("Recruiter removed", "good");
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    }
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <Card
        title="Contact database"
        subtitle="Backed by the flat CSV schema: name, email, role, post URL, description, status, timestamp"
        action={
          <a className="btn ghost sm" href={downloadUrl("/export/recruiters.csv")}>
            <Icon name="download" size={12} />
            Export recruiters.csv
          </a>
        }
      >
        <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <label className="field">
            <span>Search</span>
            <input type="search" placeholder="Name, email, role or text in the post" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="field">
            <span>Candidate</span>
            <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
              <option value="all">All candidates</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Every status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="row small muted" style={{ paddingBottom: 10, gap: 7 }}>
            <input type="checkbox" className="check" checked={includeExcluded} onChange={(event) => setIncludeExcluded(event.target.checked)} />
            Show excluded
          </label>
        </div>
      </Card>

      <Card title={`${rows.length} records`} subtitle="Filter verdicts are stored per contact for audit" flush>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Recruiter</th>
                <th>Candidate</th>
                <th>Role</th>
                <th>Checks</th>
                <th>Status</th>
                <th>Scraped</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ minWidth: 240 }}>
                      <div className="cell-main">{row.recruiterName}</div>
                      <div className="cell-sub mono">{row.recruiterEmail}</div>
                      {row.postUrl ? (
                        <a className="cell-sub link" href={row.postUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 5 }}>
                          View post
                        </a>
                      ) : null}
                      <details className="jd">
                        <summary>Job description</summary>
                        <p>{row.jobDescription}</p>
                      </details>
                    </td>
                    <td className="small">{clientsById[row.clientId]?.name || "—"}</td>
                    <td className="small">{row.role}</td>
                    <td>
                      <div className="col" style={{ gap: 4 }}>
                        <Badge tone={row.checks?.usa ? "green" : "red"} dot={false}>{row.checks?.usa ? "US" : "non-US"}</Badge>
                        <Badge tone={row.checks?.bench ? "green" : "red"} dot={false}>{row.checks?.bench ? "clean" : "bench"}</Badge>
                        <Badge tone={row.checks?.domain ? "green" : "amber"} dot={false}>{row.checks?.domain ? "domain" : "mismatch"}</Badge>
                      </div>
                    </td>
                    <td>
                      <select
                        value={row.emailSentStatus}
                        onChange={(event) => changeStatus(row, event.target.value)}
                        style={{ padding: "5px 24px 5px 8px", fontSize: 11.5, minWidth: 120 }}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
                        ))}
                      </select>
                      {row.filterReason ? <div className="cell-sub" style={{ maxWidth: 190 }}>{row.filterReason}</div> : null}
                    </td>
                    <td className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(row.timestamp)}</td>
                    <td>
                      <button className="btn danger sm" onClick={() => remove(row)} title="Delete record">
                        <Icon name="trash" size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty title="Nothing matches these filters">
                      Adjust the status filter or run a new scrape.
                    </Empty>
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
