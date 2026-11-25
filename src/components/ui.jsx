import { useEffect } from "react";

export function Icon({ name, size = 16 }) {
  const paths = {
    grid: ["M3 3h7v7H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 14h7v7H3z"],
    funnel: ["M3 4h18l-7 8v7l-4 2v-9L3 4z"],
    users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z", "M22 21v-2a4 4 0 0 0-3-3.87"],
    idcard: ["M3 5h18v14H3z", "M7 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0z", "M13 9h5", "M13 13h5", "M6 16h8"],
    file: ["M14 3H6v18h12V7z", "M14 3v4h4", "M9 12h6", "M9 16h6"],
    send: ["M22 2 11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
    repeat: ["M17 2l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 22l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
    inbox: ["M22 12h-6l-2 3h-4l-2-3H2", "M5.5 5h13l3.5 7v7H2v-7L5.5 5z"],
    chart: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
    sliders: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"],
    check: ["M20 6 9 17l-5-5"],
    plus: ["M12 5v14", "M5 12h14"],
    download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
    refresh: ["M23 4v6h-6", "M1 20v-6h6", "M3.5 9a9 9 0 0 1 14.9-3.4L23 10", "M1 14l4.6 4.4A9 9 0 0 0 20.5 15"],
    external: ["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14 21 3"],
    trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"],
    search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"],
    copy: ["M9 9h10v12H9z", "M5 15H4V3h11v1"],
    alert: ["M12 9v4", "M12 17h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
    sparkle: ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"],
    mail: ["M4 4h16v16H4z", "M4 6l8 6 8-6"],
    arrow: ["M5 12h14", "M13 6l6 6-6 6"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
    x: ["M18 6 6 18", "M6 6l12 12"]
  };
  const list = paths[name] || paths.grid;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {list.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

export function Badge({ tone, children, dot = true }) {
  return (
    <span className={`badge ${tone || ""}`}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}

export function Stat({ label, value, note, children }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      {children}
    </div>
  );
}

export function Card({ title, subtitle, action, children, flush, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <div className="card-head">
          <div>
            <div className="card-title">{title}</div>
            {subtitle ? <div className="card-sub">{subtitle}</div> : null}
          </div>
          <div className="spacer" />
          {action}
        </div>
      ) : null}
      <div className={`card-body ${flush ? "flush" : ""}`}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <div className="card-title">{title}</div>
            {subtitle ? <div className="card-sub">{subtitle}</div> : null}
          </div>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option.value} className={`seg ${value === option.value ? "on" : ""}`} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AreaChart({ series }) {
  const width = 720;
  const height = 200;
  const max = Math.max(1, ...series.map((point) => Math.max(point.sent, point.replies)));
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const y = (value) => height - 18 - (value / max) * (height - 36);

  const line = (key) =>
    series.map((point, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");

  const area = `${line("sent")} L${width},${height} L0,${height} Z`;

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ height: 200 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1="0" x2={width} y1={height - 18 - ratio * (height - 36)} y2={height - 18 - ratio * (height - 36)} stroke="rgba(148,163,184,0.09)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#chartFill)" />
        <path d={line("sent")} fill="none" stroke="#818cf8" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("replies")} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
      </svg>
      <div className="row between small muted" style={{ marginTop: 4 }}>
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor(series.length / 2)]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
      <div className="chart-legend">
        <span><i style={{ background: "#818cf8" }} />Emails sent</span>
        <span><i style={{ background: "#34d399" }} />Replies</span>
      </div>
    </div>
  );
}

export function CoverageRing({ value }) {
  return (
    <div className="coverage-ring" style={{ "--angle": `${Math.round((value / 100) * 360)}deg` }}>
      <b>{value}%</b>
    </div>
  );
}

export function CopyButton({ value, notify, label = "Copy" }) {
  return (
    <button
      className="btn ghost sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          notify?.("Copied to clipboard", "good");
        } catch {
          notify?.("Clipboard unavailable in this browser", "bad");
        }
      }}
    >
      <Icon name="copy" size={12} />
      {label}
    </button>
  );
}
