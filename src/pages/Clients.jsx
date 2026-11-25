import { useState } from "react";
import { deleteJson, getJson, postJson } from "../api";
import { Badge, Card, Field, Icon, Modal } from "../components/ui";
import { initials } from "../utils";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  location: "",
  relocation: "",
  workAuth: "",
  availability: "",
  experience: "",
  primaryRole: "",
  rate: "",
  searchRoles: "",
  exclusionKeywords: "hotlist, fulltime, available consultants, bench",
  skills: "",
  summarySeed: "",
  resumeText: ""
};

export function Clients({ data, refresh, notify }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setForm(EMPTY);
    setEditing({ id: "" });
  };

  const openEdit = async (client) => {
    setEditing(client);
    setForm({
      ...EMPTY,
      ...client,
      searchRoles: (client.searchRoles || []).join(", "),
      exclusionKeywords: (client.exclusionKeywords || []).join(", "),
      skills: (client.skills || []).join(", "),
      resumeText: ""
    });
    try {
      const source = await getJson(`/resume/${client.id}/source`);
      setForm((current) => ({ ...current, resumeText: source.text }));
    } catch {
      notify("Could not load the resume source file", "bad");
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await postJson("/clients", { ...form, id: editing?.id || "" });
      notify(`${form.name} saved`, "good");
      setEditing(null);
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (client) => {
    if (!window.confirm(`Delete ${client.name} and their scraped contacts?`)) return;
    try {
      await deleteJson(`/clients/${client.id}`);
      notify("Client removed", "good");
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    }
  };

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="row between">
        <div className="small muted">
          {data.clients.length} registered candidate{data.clients.length === 1 ? "" : "s"} · roles and exclusions drive every scrape
        </div>
        <button className="btn primary" onClick={openNew}>
          <Icon name="plus" size={14} />
          Add candidate
        </button>
      </div>

      <div className="grid grid-2">
        {data.clients.map((client) => {
          const stats = data.stats.perClient.find((item) => item.id === client.id);
          return (
            <article className="card candidate-card" key={client.id}>
              <div className="accent" style={{ background: client.accent }} />
              <div className="row">
                <div className="avatar" style={{ background: client.accent }}>{initials(client.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{client.name}</span>
                    <Badge tone="indigo" dot={false}>{client.experience}</Badge>
                  </div>
                  <div className="cell-sub">{client.primaryRole} · {client.location}</div>
                </div>
                <button className="btn ghost sm" onClick={() => openEdit(client)}>Edit</button>
              </div>

              <div className="row wrap" style={{ gap: 14, fontSize: 11.8 }}>
                <span className="muted">{client.email}</span>
                <span className="muted">{client.phone}</span>
                <span className="muted">{client.workAuth}</span>
                <span className="muted">{client.availability}</span>
              </div>

              <div className="field">
                <span>Target roles</span>
                <div className="chip-list">
                  {(client.searchRoles || []).map((role) => (
                    <span className="chip" key={role}>{role}</span>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>Core skills</span>
                <div className="chip-list">
                  {(client.skills || []).slice(0, 8).map((skill) => (
                    <span className="chip" key={skill}>{skill}</span>
                  ))}
                </div>
              </div>

              <div className="divider" />

              <div className="row between small">
                <span className="muted">Sent <b style={{ color: "var(--text)" }}>{stats?.sent ?? 0}</b></span>
                <span className="muted">Replied <b style={{ color: "var(--text)" }}>{stats?.replied ?? 0}</b></span>
                <span className="muted">Pending <b style={{ color: "var(--text)" }}>{stats?.pending ?? 0}</b></span>
                <span className="muted">Rate <b style={{ color: "var(--text)" }}>{stats?.replyRate ?? 0}%</b></span>
                <button className="btn danger sm" onClick={() => remove(client)}>
                  <Icon name="trash" size={12} />
                </button>
              </div>

              <div className="mono dim" style={{ fontSize: 10.5 }}>{client.resumeFile}</div>
            </article>
          );
        })}
      </div>

      {editing ? (
        <Modal
          title={editing.id ? `Edit ${editing.name}` : "New client candidate"}
          subtitle="Fields map directly to the client_config.py structure"
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <button className="btn ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={busy || !form.name || !form.email}>
                {busy ? "Saving…" : "Save candidate"}
              </button>
            </>
          }
        >
          <div className="field-row">
            <Field label="Full name"><input value={form.name} onChange={update("name")} placeholder="Jane Doe" /></Field>
            <Field label="Email"><input value={form.email} onChange={update("email")} placeholder="jane@example.com" /></Field>
          </div>
          <div className="field-row three">
            <Field label="Phone"><input value={form.phone} onChange={update("phone")} /></Field>
            <Field label="LinkedIn"><input value={form.linkedin} onChange={update("linkedin")} /></Field>
            <Field label="Location"><input value={form.location} onChange={update("location")} placeholder="Dallas, TX" /></Field>
          </div>
          <div className="field-row three">
            <Field label="Work authorization"><input value={form.workAuth} onChange={update("workAuth")} placeholder="H1B" /></Field>
            <Field label="Availability"><input value={form.availability} onChange={update("availability")} placeholder="Immediate" /></Field>
            <Field label="Experience"><input value={form.experience} onChange={update("experience")} placeholder="5+ Years" /></Field>
          </div>
          <div className="field-row three">
            <Field label="Primary role"><input value={form.primaryRole} onChange={update("primaryRole")} /></Field>
            <Field label="Rate"><input value={form.rate} onChange={update("rate")} placeholder="$65/hr C2C" /></Field>
            <Field label="Relocation"><input value={form.relocation} onChange={update("relocation")} /></Field>
          </div>
          <Field label="Target roles" hint="Comma separated. Each role becomes a LinkedIn search query.">
            <input value={form.searchRoles} onChange={update("searchRoles")} placeholder="React Developer, Frontend Engineer" />
          </Field>
          <Field label="Exclusion keywords" hint="Appended as negative operators to the search query.">
            <input value={form.exclusionKeywords} onChange={update("exclusionKeywords")} />
          </Field>
          <Field label="Skills" hint="Comma separated. Used for keyword matching and resume tailoring.">
            <textarea value={form.skills} onChange={update("skills")} rows={2} />
          </Field>
          <Field label="Summary seed" hint="The truthful base summary the AI rewriting starts from.">
            <textarea value={form.summarySeed} onChange={update("summarySeed")} rows={3} />
          </Field>
          <Field label="Resume source" hint="Saved to the candidate's clients/ text file and used as the tailoring source.">
            <textarea value={form.resumeText} onChange={update("resumeText")} rows={10} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }} />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}
