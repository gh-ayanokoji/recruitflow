import { useCallback, useEffect, useState } from "react";
import { getJson } from "./api";
import { Icon } from "./components/ui";
import { Overview } from "./pages/Overview";
import { Pipeline } from "./pages/Pipeline";
import { Recruiters } from "./pages/Recruiters";
import { Clients } from "./pages/Clients";
import { ResumeStudio } from "./pages/ResumeStudio";
import { Outreach } from "./pages/Outreach";
import { Followups } from "./pages/Followups";
import { Replies } from "./pages/Replies";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";

const NAV = [
  {
    label: "Command",
    items: [
      { id: "overview", label: "Overview", icon: "grid" },
      { id: "pipeline", label: "Scrape pipeline", icon: "funnel" },
      { id: "recruiters", label: "Recruiters", icon: "users" }
    ]
  },
  {
    label: "Candidates",
    items: [
      { id: "clients", label: "Client profiles", icon: "idcard" },
      { id: "resume", label: "Resume studio", icon: "file" }
    ]
  },
  {
    label: "Outreach",
    items: [
      { id: "outreach", label: "Send queue", icon: "send" },
      { id: "followups", label: "Follow-ups", icon: "repeat" },
      { id: "replies", label: "Reply sync", icon: "inbox" }
    ]
  },
  {
    label: "System",
    items: [
      { id: "analytics", label: "Analytics", icon: "chart" },
      { id: "settings", label: "Settings", icon: "sliders" }
    ]
  }
];

const META = {
  overview: { title: "Overview", sub: "Command center for every C2C outreach pipeline.", crumb: "Command / Overview" },
  pipeline: { title: "Scrape pipeline", sub: "Run LinkedIn searches, apply strict filters, and approve outreach.", crumb: "Command / Scrape" },
  recruiters: { title: "Recruiters", sub: "The scraped contact database with filter verdicts and post sources.", crumb: "Command / Recruiters" },
  clients: { title: "Client profiles", sub: "Candidate details, target roles, exclusions and resume assets.", crumb: "Candidates / Profiles" },
  resume: { title: "Resume studio", sub: "Align a candidate resume to a job description and export it.", crumb: "Candidates / Resume" },
  outreach: { title: "Send queue", sub: "Approve, personalize and dispatch cold email with duplicate protection.", crumb: "Outreach / Send" },
  followups: { title: "Follow-ups", sub: "Threaded nudges for recruiters who have not answered yet.", crumb: "Outreach / Follow-ups" },
  replies: { title: "Reply sync", sub: "Scan the inbox and reconcile recruiter responses.", crumb: "Outreach / Replies" },
  analytics: { title: "Analytics", sub: "Pipeline performance and the premium dark HTML report.", crumb: "System / Analytics" },
  settings: { title: "Settings", sub: "Credentials, AI providers, limits and session state.", crumb: "System / Settings" }
};

function readRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return META[hash] ? hash : "overview";
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const notify = useCallback((message, tone = "") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const payload = await getJson("/bootstrap");
      setData(payload);
      setError("");
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navigate = useCallback((id) => {
    window.location.hash = `#/${id}`;
    setRoute(META[id] ? id : "overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const props = { data, refresh, notify, navigate };
  const meta = META[route];
  const pending = data?.stats?.totals?.pending ?? 0;
  const followups = data?.stats?.totals?.followupsDue ?? 0;
  const simulation = data?.settings?.values?.simulation;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">RF</div>
          <div>
            <div className="brand-name">RecruitFlow</div>
            <div className="brand-sub">C2C Outreach OS</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${route === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                >
                  <Icon name={item.icon} size={15} />
                  {item.label}
                  {item.id === "recruiters" && pending ? <span className="nav-badge">{pending}</span> : null}
                  {item.id === "followups" && followups ? <span className="nav-badge">{followups}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className={`mode-pill ${simulation ? "sim" : "live"}`}>
            <i />
            {simulation ? "Simulation mode" : "Live dispatch"}
          </span>
          <span>{data?.session?.present ? "LinkedIn session captured" : "No LinkedIn session"}</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="crumb">{meta.crumb}</span>
          <div className="spacer" />
          <span className="top-stat">
            <Icon name="clock" size={13} />
            Follow-up threshold <b>{data?.settings?.values?.followupDays ?? 7}d</b>
          </span>
          <span className="top-stat">
            <Icon name="mail" size={13} />
            Today <b>{data?.stats?.totals?.sentToday ?? 0}</b>/<b>{data?.settings?.values?.dailyLimit ?? "—"}</b>
          </span>
        </header>

        <div className="page">
          <div className="page-head">
            <div>
              <div className="eyebrow">RecruitFlow · {meta.crumb.split(" / ")[0]}</div>
              <h1 className="page-title">{meta.title}</h1>
              <p className="page-sub">{meta.sub}</p>
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={refresh} title="Reload pipeline data">
                <Icon name="refresh" size={14} />
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="notice amber" style={{ marginBottom: 18 }}>
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          {loading || !data ? (
            <div className="grid grid-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="skeleton" style={{ height: 116 }} />
              ))}
            </div>
          ) : (
            <>
              {route === "overview" ? <Overview {...props} /> : null}
              {route === "pipeline" ? <Pipeline {...props} /> : null}
              {route === "recruiters" ? <Recruiters {...props} /> : null}
              {route === "clients" ? <Clients {...props} /> : null}
              {route === "resume" ? <ResumeStudio {...props} /> : null}
              {route === "outreach" ? <Outreach {...props} /> : null}
              {route === "followups" ? <Followups {...props} /> : null}
              {route === "replies" ? <Replies {...props} /> : null}
              {route === "analytics" ? <Analytics {...props} /> : null}
              {route === "settings" ? <Settings {...props} /> : null}
            </>
          )}
        </div>
      </main>

      <div className="toast-wrap">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone || ""}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
