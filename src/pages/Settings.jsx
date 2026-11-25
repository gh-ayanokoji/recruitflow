import { useState } from "react";
import { postJson, putJson } from "../api";
import { Badge, Card, Field, Icon } from "../components/ui";
import { fmtDateTime } from "../utils";

export function Settings({ data, refresh, notify }) {
  const { values, secrets } = data.settings;
  const [form, setForm] = useState({ ...values });
  const [secretForm, setSecretForm] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateSecret = (key) => (event) => setSecretForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      await putJson("/settings", { values: form, secrets: secretForm });
      notify("Settings saved", "good");
      setSecretForm({});
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    if (!window.confirm("Reset the pipeline to its seeded demo dataset? This overwrites current records.")) return;
    try {
      await postJson("/demo/reset", {});
      notify("Demo dataset restored", "good");
      await refresh();
    } catch (error) {
      notify(error.message, "bad");
    }
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <Card
        title="LinkedIn session"
        subtitle="Playwright storage state used by the scraper"
        action={<Badge tone={data.session.present ? "green" : "amber"}>{data.session.present ? "Session captured" : "No session"}</Badge>}
      >
        <div className="grid grid-2" style={{ gap: 18 }}>
          <div className="col" style={{ gap: 12 }}>
            <div className="kv">
              <dt>State file</dt><dd className="mono">session.json</dd>
              <dt>Cookies</dt><dd>{data.session.cookies || 0}</dd>
              <dt>Origins</dt><dd>{data.session.origins || 0}</dd>
              <dt>Captured</dt><dd>{data.session.present ? fmtDateTime(data.session.savedAt) : "—"}</dd>
            </div>
            <label className="row small muted" style={{ gap: 8 }}>
              <input type="checkbox" className="check" checked={Boolean(form.playwrightEnabled)} onChange={update("playwrightEnabled")} />
              Use Playwright for live scraping instead of the sample corpus
            </label>
            <Field label="LinkedIn account email">
              <input value={form.linkedinEmail || ""} onChange={update("linkedinEmail")} placeholder="you@example.com" />
            </Field>
            <Field label="LinkedIn password" hint={secrets.linkedinPassword?.set ? `Saved ${secrets.linkedinPassword.hint} · leave blank to keep` : "Used only to prefill the headful login"}>
              <input type="password" value={secretForm.linkedinPassword || ""} onChange={updateSecret("linkedinPassword")} placeholder="••••••••" />
            </Field>
          </div>
          <div>
            <div className="steps">
              <div className="step">Run the headful login helper for the LinkedIn account and complete any CAPTCHA or 2FA prompt.</div>
              <div className="step">Once the home feed loads, the helper writes cookies and local storage into session.json.</div>
              <div className="step">Place session.json in this project root; the status card above turns green.</div>
              <div className="step">Enable the Playwright toggle only after <span className="mono">playwright install</span> has downloaded Chromium.</div>
            </div>
            <div className="notice" style={{ marginTop: 14 }}>
              <Icon name="alert" size={15} />
              <span>Without Playwright the scraper inspects a bundled corpus of realistic LinkedIn posts and still runs the full filter chain.</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-2" style={{ gap: 18 }}>
        <Card title="Gmail SMTP and IMAP" subtitle="App password, not the account password">
          <div className="col" style={{ gap: 14 }}>
            <Field label="Gmail address">
              <input value={form.gmailEmail || ""} onChange={update("gmailEmail")} placeholder="you@gmail.com" />
            </Field>
            <Field label="App password" hint={secrets.gmailAppPassword?.set ? `Saved ${secrets.gmailAppPassword.hint} · leave blank to keep` : "Google Account → Security → App passwords"}>
              <input type="password" value={secretForm.gmailAppPassword || ""} onChange={updateSecret("gmailAppPassword")} placeholder="abcd efgh ijkl mnop" />
            </Field>
            <div className="field-row">
              <Field label="SMTP host"><input value={form.smtpHost || ""} onChange={update("smtpHost")} /></Field>
              <Field label="SMTP port"><input type="number" value={form.smtpPort || 587} onChange={update("smtpPort")} /></Field>
            </div>
            <div className="field-row">
              <Field label="IMAP host"><input value={form.imapHost || ""} onChange={update("imapHost")} /></Field>
              <Field label="IMAP port"><input type="number" value={form.imapPort || 993} onChange={update("imapPort")} /></Field>
            </div>
            <div className="field-row">
              <Field label="CC team lead"><input value={form.ccLead || ""} onChange={update("ccLead")} placeholder="lead@example.com" /></Field>
              <Field label="BCC admin"><input value={form.adminBcc || ""} onChange={update("adminBcc")} placeholder="ops@example.com" /></Field>
            </div>
            <label className="row small muted" style={{ gap: 8 }}>
              <input type="checkbox" className="check" checked={Boolean(form.simulation)} onChange={update("simulation")} />
              Simulation mode: never contact a real recruiter
            </label>
          </div>
        </Card>

        <Card title="AI providers" subtitle="Fallback chain: Gemini → Groq → OpenRouter → local engine">
          <div className="col" style={{ gap: 14 }}>
            <Field label="Gemini API key" hint={secrets.geminiKey?.set ? `Saved ${secrets.geminiKey.hint} · leave blank to keep` : "Primary model for resume tailoring"}>
              <input type="password" value={secretForm.geminiKey || ""} onChange={updateSecret("geminiKey")} placeholder="AIza…" />
            </Field>
            <Field label="Gemini model"><input value={form.geminiModel || ""} onChange={update("geminiModel")} /></Field>
            <div className="divider" />
            <Field label="Groq API key" hint={secrets.groqKey?.set ? `Saved ${secrets.groqKey.hint} · leave blank to keep` : "Secondary fallback"}>
              <input type="password" value={secretForm.groqKey || ""} onChange={updateSecret("groqKey")} placeholder="gsk_…" />
            </Field>
            <Field label="Groq model"><input value={form.groqModel || ""} onChange={update("groqModel")} /></Field>
            <div className="divider" />
            <Field label="OpenRouter API key" hint={secrets.openrouterKey?.set ? `Saved ${secrets.openrouterKey.hint} · leave blank to keep` : "Tertiary fallback and follow-up value props"}>
              <input type="password" value={secretForm.openrouterKey || ""} onChange={updateSecret("openrouterKey")} placeholder="sk-or-v1-…" />
            </Field>
            <Field label="OpenRouter model"><input value={form.openrouterModel || ""} onChange={update("openrouterModel")} /></Field>
            <div className="notice">
              <Icon name="sparkle" size={15} />
              <span>Keys are stored server-side and never returned to the browser in full. Without a key, tailoring uses the deterministic local engine.</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-2" style={{ gap: 18 }}>
        <Card title="Pipeline controls" subtitle="Global limits enforced by the sender">
          <div className="field-row">
            <Field label="Daily send limit" hint="Counted across all candidates from the history timestamps.">
              <input type="number" min="1" value={form.dailyLimit || 40} onChange={update("dailyLimit")} />
            </Field>
            <Field label="Follow-up delay (days)" hint="Used by eligibility scans and the inbox window.">
              <input type="number" min="1" value={form.followupDays || 7} onChange={update("followupDays")} />
            </Field>
          </div>
          <div className="kv" style={{ marginTop: 16 }}>
            <dt>Store</dt><dd className="mono">data/db.json</dd>
            <dt>Settings</dt><dd className="mono">data/settings.json</dd>
            <dt>Attachments</dt><dd className="mono">clients/*.txt → DOCX per dispatch</dd>
            <dt>Runtime</dt><dd>Node 20+ · Express API · React SPA</dd>
          </div>
        </Card>

        <Card title="Workspace" subtitle="Demo data and environment notes">
          <div className="notice amber" style={{ marginBottom: 14 }}>
            <Icon name="alert" size={15} />
            <span>Resetting restores the seeded candidates, contacts, outreach history and replies for demo purposes.</span>
          </div>
          <div className="row wrap">
            <button className="btn danger" onClick={resetDemo}>
              <Icon name="refresh" size={13} />
              Reset demo dataset
            </button>
            <button className="btn primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          </div>
          <div className="divider" style={{ margin: "16px 0" }} />
          <div className="small muted" style={{ lineHeight: 1.7 }}>
            PDF conversion through Microsoft Word COM is replaced by native DOCX generation, so the pipeline runs on any OS. The flat
            CSV schema, keyword hooks, SMTP fallback, threaded follow-ups and IMAP date-window sync all follow the original blueprint.
          </div>
        </Card>
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn primary" onClick={save} disabled={busy}>
          <Icon name="check" size={14} />
          {busy ? "Saving…" : "Save all settings"}
        </button>
      </div>
    </div>
  );
}
