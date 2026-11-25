export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

export const getJson = (path) => api(path);
export const postJson = (path, body) => api(path, { method: "POST", body: JSON.stringify(body || {}) });
export const putJson = (path, body) => api(path, { method: "PUT", body: JSON.stringify(body || {}) });
export const deleteJson = (path) => api(path, { method: "DELETE" });
export const patchJson = (path, body) => api(path, { method: "PATCH", body: JSON.stringify(body || {}) });
