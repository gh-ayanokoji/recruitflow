export function fmtDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function relative(value) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(value);
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function statusTone(status) {
  if (status === "sent") return "green";
  if (status === "pending") return "indigo";
  if (status === "failed") return "red";
  if (status === "mismatched_role") return "amber";
  if (status === "filtered") return "red";
  return "";
}

export function statusLabel(status) {
  return String(status || "").replace(/_/g, " ");
}

export function firstName(name) {
  return String(name || "").split(" ")[0] || "there";
}

export function downloadUrl(path) {
  return `/api${path}`;
}
