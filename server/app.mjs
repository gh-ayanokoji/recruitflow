import express from "express";
import fs from "node:fs";
import path from "node:path";
import { getDb, loadSettings, mutateDb, paths, publicSettings, resetDb, saveSettings } from "./store.mjs";
import { buildSearchQuery, matchesStrictFilter } from "./lib/filters.mjs";
import { tailorResume, readResumeText } from "./lib/tailor.mjs";
import { buildResumeDocx, resumeFileName } from "./lib/docx.mjs";
import { composeFollowup, composeOutreach, dispatchEmail } from "./lib/outreach.mjs";
import { syncReplies } from "./lib/imap.mjs";
import { runScrape, sessionStatus } from "./lib/scraper.mjs";
import { computeStats, followupEligible } from "./lib/stats.mjs";
import { buildReportHtml } from "./lib/report.mjs";

const VALID_STATUSES = ["pending", "sent", "failed", "mismatched_role", "filtered"];
const LOCAL_ONLY = { geminiKey: "", groqKey: "", openrouterKey: "" };

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function bad(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(headers, rows) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clientOr404(db, id) {
  return db.clients.find((client) => client.id === id || client.key === id);
}

function publicClient(client) {
  return { ...client, searchQueries: (client.searchRoles || []).map((role) => buildSearchQuery(role, client.exclusionKeywords)) };
}

async function localAttachment(client, jobDescription) {
  try {
    const tailored = await tailorResume(client, jobDescription, { ...loadSettings(), ...LOCAL_ONLY }, client.primaryRole);
    const buffer = await buildResumeDocx(client, tailored);
    return {
      filename: resumeFileName(client, tailored),
      content: buffer
    };
  } catch {
    return null;
  }
}

export function createApiRouter() {
  const router = express.Router();

  router.get(
    "/bootstrap",
    wrap(async (req, res) => {
      const db = await getDb();
      const settings = loadSettings();
      res.json({
        clients: db.clients.map(publicClient),
        recruiters: db.recruiters,
        history: db.history,
        replies: [...db.replies].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
        runs: [...db.runs].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)),
        settings: publicSettings(settings),
        stats: computeStats(db, settings),
        session: sessionStatus()
      });
    })
  );

  router.post(
    "/scrape",
    wrap(async (req, res) => {
      const { clientId, roles, limit } = req.body || {};
      const settings = loadSettings();
      const db = await getDb();
      const client = clientOr404(db, clientId);
      if (!client) return bad(res, "Client candidate not found");
      const selectedRoles = normalizeList(roles).length ? normalizeList(roles) : client.searchRoles;
      if (!selectedRoles.length) return bad(res, "Select at least one target role");

      const outcome = await runScrape({
        client,
        roles: selectedRoles,
        limit: Number(limit) || 8,
        settings
      });

      const result = await mutateDb((state) => {
        const fresh = clientOr404(state, client.id);
        const existing = new Set(state.recruiters.map((row) => `${row.recruiterEmail}|${row.postUrl}`));
        let added = 0;
        const push = (record) => {
          const key = `${record.recruiterEmail}|${record.postUrl}`;
          if (existing.has(key)) return;
          existing.add(key);
          state.recruiters.push({
            id: `rec_${Date.now().toString(36)}_${added}`,
            recruiterName: record.recruiterName,
            recruiterEmail: record.recruiterEmail,
            role: record.role,
            postUrl: record.postUrl,
            jobDescription: record.jobDescription,
            emailSentStatus: record.filterReason
              ? record.checks && !record.checks.domain
                ? "mismatched_role"
                : "filtered"
              : "pending",
            timestamp: record.timestamp,
            clientId: fresh.id,
            filterReason: record.filterReason || "",
            checks: record.checks,
            keywords: record.keywords || [],
            source: record.source || "simulated"
          });
          added += 1;
        };
        outcome.accepted.forEach(push);
        outcome.rejected.forEach(push);
        const run = {
          id: `run_${Date.now().toString(36)}`,
          clientId: fresh.id,
          roles: selectedRoles,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          found: outcome.accepted.length + outcome.rejected.length,
          accepted: outcome.accepted.length,
          rejected: outcome.rejected.length,
          status: "completed",
          mode: outcome.mode
        };
        state.runs.push(run);
        return { added, run };
      });

      res.json({
        mode: outcome.mode,
        log: outcome.log,
        added: result.added,
        accepted: outcome.accepted.length,
        rejected: outcome.rejected.length,
        run: result.run
      });
    })
  );

  router.patch(
    "/recruiters/:id",
    wrap(async (req, res) => {
      const status = String(req.body?.emailSentStatus || "");
      if (!VALID_STATUSES.includes(status)) return bad(res, "Unknown status");
      const result = await mutateDb((db) => {
        const row = db.recruiters.find((item) => item.id === req.params.id);
        if (!row) return null;
        row.emailSentStatus = status;
        return row;
      });
      if (!result) return bad(res, "Recruiter not found", 404);
      res.json(result);
    })
  );

  router.delete(
    "/recruiters/:id",
    wrap(async (req, res) => {
      const removed = await mutateDb((db) => {
        const index = db.recruiters.findIndex((item) => item.id === req.params.id);
        if (index === -1) return false;
        db.recruiters.splice(index, 1);
        return true;
      });
      if (!removed) return bad(res, "Recruiter not found", 404);
      res.json({ ok: true });
    })
  );

  router.post(
    "/clients",
    wrap(async (req, res) => {
      const body = req.body || {};
      if (!String(body.name || "").trim()) return bad(res, "Candidate name is required");
      if (!String(body.email || "").includes("@")) return bad(res, "A valid candidate email is required");
      const saved = await mutateDb((db) => {
        const existing = body.id ? db.clients.find((client) => client.id === body.id) : null;
        const target = existing || {
          id: `cli_${Date.now().toString(36)}`,
          accent: ["#6366f1", "#22d3ee", "#f472b6", "#34d399", "#fbbf24"][db.clients.length % 5],
          projects: [],
          summarySeed: "",
          education: ""
        };
        const key = body.key ? String(body.key).toLowerCase().replace(/[^a-z0-9]/g, "-") : target.key || String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const resumeSlug = String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "_");
        Object.assign(target, {
          key,
          name: String(body.name).trim(),
          email: String(body.email).trim(),
          phone: String(body.phone || ""),
          linkedin: String(body.linkedin || ""),
          location: String(body.location || ""),
          relocation: String(body.relocation || ""),
          workAuth: String(body.workAuth || ""),
          availability: String(body.availability || ""),
          experience: String(body.experience || ""),
          primaryRole: String(body.primaryRole || ""),
          rate: String(body.rate || ""),
          searchRoles: normalizeList(body.searchRoles),
          exclusionKeywords: normalizeList(body.exclusionKeywords),
          skills: normalizeList(body.skills),
          summarySeed: String(body.summarySeed || target.summarySeed || ""),
          resumeFile: target.resumeFile || `clients/${resumeSlug}_resume.txt`
        });
        if (body.resumeText) {
          const targetPath = path.join(paths().root, target.resumeFile);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, String(body.resumeText));
        }
        if (!existing) db.clients.push(target);
        return target;
      });
      res.json(publicClient(saved));
    })
  );

  router.delete(
    "/clients/:id",
    wrap(async (req, res) => {
      const removed = await mutateDb((db) => {
        const index = db.clients.findIndex((client) => client.id === req.params.id);
        if (index === -1) return false;
        const [client] = db.clients.splice(index, 1);
        db.recruiters = db.recruiters.filter((row) => row.clientId !== client.id);
        return true;
      });
      if (!removed) return bad(res, "Client not found", 404);
      res.json({ ok: true });
    })
  );

  router.post(
    "/email/preview",
    wrap(async (req, res) => {
      const db = await getDb();
      const client = clientOr404(db, req.body?.clientId);
      const recruiter =
        db.recruiters.find((row) => row.id === req.body?.recruiterId) ||
        (req.body?.jobDescription
          ? {
              recruiterName: req.body.recruiterName || "Recruiter",
              recruiterEmail: req.body.recruiterEmail || "recruiter@example.com",
              role: req.body.role || client?.primaryRole,
              jobDescription: req.body.jobDescription
            }
          : null);
      if (!client) return bad(res, "Client candidate not found");
      if (!recruiter) return bad(res, "Recruiter not found");
      res.json(composeOutreach(client, recruiter, loadSettings()));
    })
  );

  router.post(
    "/outreach/send",
    wrap(async (req, res) => {
      const { recruiterIds, mode } = req.body || {};
      const settings = loadSettings();
      const db = await getDb();
      const ids = normalizeList(recruiterIds);
      if (!ids.length) return bad(res, "Select at least one recruiter");
      const testMode = mode !== "live";
      const today = dayKey(new Date());
      const sentToday = db.history.filter((row) => dayKey(row.timestamp) === today).length;
      const remaining = Math.max(0, (Number(settings.dailyLimit) || 0) - sentToday);
      if (!testMode && remaining === 0) return bad(res, `Daily limit of ${settings.dailyLimit} reached`);

      const contacted = new Set(db.history.map((row) => `${row.clientId}|${row.recruiterEmail.toLowerCase()}`));
      const candidates = ids
        .map((id) => db.recruiters.find((row) => row.id === id))
        .filter(Boolean)
        .filter((row) => row.emailSentStatus === "pending")
        .slice(0, testMode ? ids.length : remaining);
      if (!candidates.length) return bad(res, "No pending recruiters matched the selection");

      const attachments = new Map();
      const results = [];
      for (const recruiter of candidates) {
        const client = db.clients.find((item) => item.id === recruiter.clientId);
        if (!client) continue;
        if (!testMode && contacted.has(`${client.id}|${recruiter.recruiterEmail.toLowerCase()}`)) {
          results.push({
            recruiterId: recruiter.id,
            recruiterEmail: recruiter.recruiterEmail,
            to: recruiter.recruiterEmail,
            subject: "",
            ok: false,
            simulated: false,
            messageId: "",
            error: "Already contacted for this candidate",
            status: "skipped"
          });
          continue;
        }
        if (!attachments.has(client.id)) {
          attachments.set(client.id, await localAttachment(client, recruiter.jobDescription));
        }
        const attachment = attachments.get(client.id);
        const message = composeOutreach(client, recruiter, settings);
        const recipient = testMode ? { ...message, to: settings.gmailEmail || client.email, cc: [], bcc: [] } : message;
        const driver = await dispatchEmail(recipient, settings, { attachments: attachment ? [attachment] : [] });
        results.push({
          recruiterId: recruiter.id,
          recruiterEmail: recruiter.recruiterEmail,
          to: recipient.to,
          subject: recipient.subject,
          ok: driver.ok,
          simulated: driver.simulated,
          messageId: driver.messageId,
          error: driver.error || "",
          status: driver.simulated ? "simulated" : driver.ok ? "sent" : "failed"
        });
        if (!testMode) {
          if (driver.ok) contacted.add(`${client.id}|${recruiter.recruiterEmail.toLowerCase()}`);
          await mutateDb((state) => {
            const row = state.recruiters.find((item) => item.id === recruiter.id);
            if (!row) return null;
            row.emailSentStatus = driver.ok ? "sent" : "failed";
            state.history.push({
              id: `hist_${Date.now().toString(36)}_${recruiter.id.slice(-4)}`,
              recruiterName: recruiter.recruiterName,
              recruiterEmail: recruiter.recruiterEmail,
              role: recruiter.role,
              postUrl: recruiter.postUrl,
              candidate: client.name,
              clientId: client.id,
              emailSentStatus: driver.ok ? "sent" : "failed",
              timestamp: new Date().toISOString(),
              subject: recipient.subject,
              messageId: driver.messageId,
              followupCount: 0,
              lastFollowupAt: "",
              replied: 0,
              hookKeywords: message.keywords.slice(0, 4),
              jobDescription: recruiter.jobDescription
            });
            return true;
          });
        }
      }

      res.json({
        mode: testMode ? "test" : "live",
        simulated: results.some((row) => row.simulated),
        remaining: testMode ? remaining : Math.max(0, remaining - results.filter((row) => row.ok && row.status !== "skipped").length),
        results
      });
    })
  );

  router.get(
    "/followups",
    wrap(async (req, res) => {
      const settings = loadSettings();
      const days = Number(req.query.days) || Number(settings.followupDays) || 7;
      const db = await getDb();
      const rows = db.history
        .filter((row) => followupEligible(row, days))
        .map((row) => {
          const client = db.clients.find((item) => item.id === row.clientId);
          if (!client) return null;
          return {
            id: row.id,
            recruiterName: row.recruiterName,
            recruiterEmail: row.recruiterEmail,
            role: row.role,
            candidate: client.name,
            sentAt: row.timestamp,
            ageDays: Math.floor((Date.now() - new Date(row.timestamp).getTime()) / 86400000),
            messageId: row.messageId,
            subject: row.subject,
            preview: composeFollowup(client, row, settings)
          };
        })
        .filter(Boolean);
      res.json({ days, rows });
    })
  );

  router.post(
    "/followups/send",
    wrap(async (req, res) => {
      const { ids, mode } = req.body || {};
      const settings = loadSettings();
      const db = await getDb();
      const days = Number(settings.followupDays) || 7;
      const selected = normalizeList(ids);
      const eligible = db.history.filter((row) => selected.includes(row.id) && followupEligible(row, days));
      if (!eligible.length) return bad(res, "No eligible follow-ups in the selection");
      const results = [];
      for (const row of eligible) {
        const client = db.clients.find((item) => item.id === row.clientId);
        if (!client) continue;
        const message = composeFollowup(client, row, settings);
        const attachment = await localAttachment(client, row.jobDescription || "");
        const testMode = mode !== "live";
        const recipient = testMode ? { ...message, to: settings.gmailEmail || client.email, cc: [], bcc: [] } : message;
        const driver = await dispatchEmail(recipient, settings, { attachments: attachment ? [attachment] : [] });
        results.push({
          id: row.id,
          recruiterEmail: row.recruiterEmail,
          subject: recipient.subject,
          ok: driver.ok,
          simulated: driver.simulated,
          error: driver.error || ""
        });
        if (!testMode && driver.ok) {
          await mutateDb((state) => {
            const target = state.history.find((item) => item.id === row.id);
            if (!target) return null;
            target.followupCount = Number(target.followupCount || 0) + 1;
            target.lastFollowupAt = new Date().toISOString();
            target.lastFollowupMessageId = driver.messageId;
            return true;
          });
        }
      }
      res.json({ mode: mode === "live" ? "live" : "test", results });
    })
  );

  router.post(
    "/replies/sync",
    wrap(async (req, res) => {
      const settings = loadSettings();
      let outcome = null;
      await mutateDb(async (db) => {
        outcome = await syncReplies(db, settings);
        return outcome;
      });
      res.json(outcome);
    })
  );

  router.post(
    "/resume/tailor",
    wrap(async (req, res) => {
      const db = await getDb();
      const client = clientOr404(db, req.body?.clientId);
      if (!client) return bad(res, "Client candidate not found");
      const recruiter = req.body?.recruiterId ? db.recruiters.find((row) => row.id === req.body.recruiterId) : null;
      const jobDescription = String(req.body?.jobDescription || recruiter?.jobDescription || "");
      if (!jobDescription.trim()) return bad(res, "A job description is required");
      const tailored = await tailorResume(client, jobDescription, loadSettings(), recruiter?.role || req.body?.role || client.primaryRole);
      res.json({ ...tailored, sourceResume: readResumeText(client), recruiterId: recruiter?.id || "" });
    })
  );

  router.get(
    "/resume/:clientId/source",
    wrap(async (req, res) => {
      const db = await getDb();
      const client = clientOr404(db, req.params.clientId);
      if (!client) return bad(res, "Client candidate not found", 404);
      res.json({ client: publicClient(client), text: readResumeText(client) });
    })
  );

  router.get(
    "/resume/:clientId/download",
    wrap(async (req, res) => {
      const db = await getDb();
      const client = clientOr404(db, req.params.clientId);
      if (!client) return bad(res, "Client candidate not found", 404);
      const recruiter = req.query.recruiterId ? db.recruiters.find((row) => row.id === req.query.recruiterId) : null;
      const jobDescription = String(req.query.jd || recruiter?.jobDescription || readResumeText(client));
      const tailored = await tailorResume(client, jobDescription, loadSettings(), recruiter?.role || client.primaryRole);
      const buffer = await buildResumeDocx(client, tailored);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${resumeFileName(client, tailored)}"`);
      res.send(buffer);
    })
  );

  router.get(
    "/export/recruiters.csv",
    wrap(async (req, res) => {
      const db = await getDb();
      const csv = toCsv(
        ["recruiter_name", "recruiter_email", "role", "post_url", "job_description", "email_sent_status", "timestamp"],
        db.recruiters.map((row) => ({
          recruiter_name: row.recruiterName,
          recruiter_email: row.recruiterEmail,
          role: row.role,
          post_url: row.postUrl,
          job_description: row.jobDescription,
          email_sent_status: row.emailSentStatus,
          timestamp: new Date(row.timestamp).toISOString().slice(0, 19).replace("T", " ")
        }))
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="recruiters.csv"');
      res.send(csv);
    })
  );

  router.get(
    "/export/history.csv",
    wrap(async (req, res) => {
      const db = await getDb();
      const csv = toCsv(
        [
          "recruiter_name", "recruiter_email", "role", "post_url", "candidate", "email_sent_status",
          "timestamp", "subject", "message_id", "followup_count", "last_followup_at", "replied"
        ],
        db.history.map((row) => ({
          recruiter_name: row.recruiterName,
          recruiter_email: row.recruiterEmail,
          role: row.role,
          post_url: row.postUrl,
          candidate: row.candidate,
          email_sent_status: row.emailSentStatus,
          timestamp: new Date(row.timestamp).toISOString().slice(0, 19).replace("T", " "),
          subject: row.subject,
          message_id: row.messageId,
          followup_count: row.followupCount,
          last_followup_at: row.lastFollowupAt ? new Date(row.lastFollowupAt).toISOString().slice(0, 19).replace("T", " ") : "",
          replied: row.replied
        }))
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="email_sent_history.csv"');
      res.send(csv);
    })
  );

  router.get(
    "/export/report.html",
    wrap(async (req, res) => {
      const db = await getDb();
      const html = buildReportHtml(db, loadSettings());
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="analytics_report.html"');
      res.send(html);
    })
  );

  router.get(
    "/settings",
    wrap(async (req, res) => {
      res.json({ ...publicSettings(loadSettings()), session: sessionStatus() });
    })
  );

  router.put(
    "/settings",
    wrap(async (req, res) => {
      const { values, secrets } = req.body || {};
      const patch = {};
      if (values && typeof values === "object") {
        for (const [key, value] of Object.entries(values)) {
          if (key === "dailyLimit" || key === "followupDays" || key === "smtpPort" || key === "imapPort") {
            patch[key] = Number(value) || 0;
          } else if (key === "simulation" || key === "playwrightEnabled") {
            patch[key] = Boolean(value);
          } else {
            patch[key] = String(value ?? "");
          }
        }
      }
      if (secrets && typeof secrets === "object") {
        for (const [key, value] of Object.entries(secrets)) {
          if (typeof value === "string" && value.trim()) patch[key] = value.trim();
        }
      }
      const saved = saveSettings(patch);
      res.json(publicSettings(saved));
    })
  );

  router.post(
    "/demo/reset",
    wrap(async (req, res) => {
      await resetDb();
      res.json({ ok: true });
    })
  );

  router.get(
    "/recruiter/verdict",
    wrap(async (req, res) => {
      const db = await getDb();
      const client = clientOr404(db, req.query.clientId);
      if (!client) return bad(res, "Client candidate not found");
      res.json(matchesStrictFilter({ jobDescription: String(req.query.text || "") }, client));
    })
  );

  return router;
}
