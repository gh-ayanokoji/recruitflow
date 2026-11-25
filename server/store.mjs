import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeed } from "./seed.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const settingsFile = path.join(dataDir, "settings.json");

export const SECRET_KEYS = ["gmailAppPassword", "geminiKey", "openrouterKey", "groqKey", "linkedinPassword"];

const SETTINGS_DEFAULTS = {
  linkedinEmail: "",
  gmailEmail: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  imapHost: "imap.gmail.com",
  imapPort: 993,
  ccLead: "",
  adminBcc: "",
  dailyLimit: 40,
  followupDays: 7,
  geminiModel: "gemini-2.0-flash",
  openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
  groqModel: "llama-3.3-70b-versatile",
  simulation: true,
  playwrightEnabled: false,
  plan: "Standard"
};

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDataDir();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

function migrate(db) {
  db.clients = Array.isArray(db.clients) ? db.clients : [];
  db.recruiters = Array.isArray(db.recruiters) ? db.recruiters : [];
  db.history = Array.isArray(db.history) ? db.history : [];
  db.replies = Array.isArray(db.replies) ? db.replies : [];
  db.runs = Array.isArray(db.runs) ? db.runs : [];
  db.history = db.history.map((row) => ({
    followupCount: 0,
    lastFollowupAt: "",
    replied: 0,
    subject: "",
    messageId: "",
    ...row
  }));
  return db;
}

export async function getDb() {
  ensureDataDir();
  if (!fs.existsSync(dbFile)) {
    const seed = buildSeed();
    writeJson(dbFile, seed);
    return migrate(seed);
  }
  return migrate(readJson(dbFile, buildSeed()));
}

let queue = Promise.resolve();

export function mutateDb(mutator) {
  const next = queue.then(async () => {
    const db = await getDb();
    const result = await mutator(db);
    writeJson(dbFile, db);
    return result;
  });
  queue = next.catch(() => {});
  return next;
}

export function resetDb() {
  writeJson(dbFile, buildSeed());
  return getDb();
}

export function loadSettings() {
  const stored = readJson(settingsFile, {});
  const env = {
    linkedinEmail: process.env.LINKEDIN_EMAIL || "",
    gmailEmail: process.env.GMAIL_EMAIL || "",
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
    geminiKey: process.env.GEMINI_API_KEY || "",
    openrouterKey: process.env.OPENROUTER_API_KEY || "",
    groqKey: process.env.GROQ_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || SETTINGS_DEFAULTS.geminiModel,
    openrouterModel: process.env.OPENROUTER_MODEL || SETTINGS_DEFAULTS.openrouterModel,
    groqModel: process.env.GROQ_MODEL || SETTINGS_DEFAULTS.groqModel
  };
  const merged = { ...SETTINGS_DEFAULTS, ...env, ...stored };
  for (const key of Object.keys(env)) {
    if (!stored[key] && env[key]) merged[key] = env[key];
  }
  return merged;
}

export function saveSettings(patch) {
  const current = loadSettings();
  const next = { ...current };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined) continue;
    next[key] = value;
  }
  writeJson(settingsFile, next);
  return next;
}

export function publicSettings(settings) {
  const values = {};
  const secrets = {};
  for (const [key, value] of Object.entries(settings)) {
    if (SECRET_KEYS.includes(key)) {
      const text = String(value || "");
      secrets[key] = { set: text.length > 0, hint: text ? `••••${text.slice(-4)}` : "" };
    } else {
      values[key] = value;
    }
  }
  return { values, secrets };
}

export function paths() {
  return { root, dataDir, dbFile, settingsFile };
}
