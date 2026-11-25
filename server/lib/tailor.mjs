import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractKeywords, keywordCount } from "./filters.mjs";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export function readResumeText(client) {
  try {
    return fs.readFileSync(path.join(root, client.resumeFile), "utf8");
  } catch {
    return "";
  }
}

function weaveSentence(bullet, keyword) {
  const base = String(bullet).trim().replace(/[.\s]+$/, "");
  return `${base}, built on ${keyword}.`;
}

function localRewrite(client, keywords, role) {
  const top = keywords.slice(0, 8);
  const summaryKeywords = (top.length ? top : client.skills).slice(0, 4);
  const summaryList =
    summaryKeywords.length > 1
      ? `${summaryKeywords.slice(0, -1).join(", ")} and ${summaryKeywords[summaryKeywords.length - 1]}`
      : summaryKeywords[0] || client.primaryRole;
  const summary = `${client.primaryRole} with ${client.experience.toLowerCase()} of hands-on ${summaryList} experience. ${client.summarySeed} Available ${client.availability.toLowerCase()} for this ${role} contract, ${client.workAuth.toLowerCase()}, based in ${client.location}.`;

  let cursor = 0;
  const projects = (client.projects || []).map((project) => {
    let woven = 0;
    const bullets = project.bullets.map((bullet) => {
      if (woven >= 2) return bullet;
      const candidate = top.find(
        (keyword) => keywordCount(bullet, keyword) === 0 && !String(bullet).toLowerCase().includes(keyword.toLowerCase())
      );
      if (!candidate) return bullet;
      woven += 1;
      return weaveSentence(bullet, candidate);
    });
    cursor += 1;
    return { ...project, bullets };
  });

  const skills = [...client.skills];
  for (const keyword of keywords) {
    if (skills.length >= 18) break;
    if (!skills.some((skill) => skill.toLowerCase() === keyword.toLowerCase())) skills.push(keyword);
  }

  return { summary, projects, skills };
}

function stripJson(text) {
  const cleaned = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callGemini(settings, prompt) {
  if (!settings.geminiKey) throw new Error("Gemini key not configured");
  const model = settings.geminiModel || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
      })
    }
  );
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { text, model: `gemini/${model}` };
}

async function callOpenAiCompatible(settings, prompt, provider) {
  const config = {
    groq: {
      key: settings.groqKey,
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: settings.groqModel || "llama-3.3-70b-versatile"
    },
    openrouter: {
      key: settings.openrouterKey,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: settings.openrouterModel || "meta-llama/llama-3.3-70b-instruct:free"
    }
  }[provider];
  if (!config || !config.key) throw new Error(`${provider} key not configured`);
  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You rewrite resumes and reply with strict JSON only." },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!response.ok) throw new Error(`${provider} ${response.status}`);
  const payload = await response.json();
  return { text: payload?.choices?.[0]?.message?.content || "", model: `${provider}/${config.model}` };
}

async function callModelChain(settings, prompt) {
  const chain = [
    () => callGemini(settings, prompt),
    () => callOpenAiCompatible(settings, prompt, "groq"),
    () => callOpenAiCompatible(settings, prompt, "openrouter")
  ];
  const errors = [];
  for (const attempt of chain) {
    try {
      return await attempt();
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.join(" | "));
}

function coverageOf(keywords, text) {
  const matched = keywords.filter((keyword) => keywordCount(text, keyword) > 0);
  const missing = keywords.filter((keyword) => keywordCount(text, keyword) === 0);
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { score, matched, missing };
}

export async function tailorResume(client, jobDescription, settings, roleHint) {
  const keywords = extractKeywords(jobDescription, client.skills).slice(0, 10);
  const role = roleHint || client.primaryRole;
  const local = localRewrite(client, keywords, role);

  let summary = local.summary;
  let projects = local.projects;
  let skills = local.skills;
  let aiUsed = false;
  let aiModel = "";
  let aiNote = "";

  const anyKey = settings.geminiKey || settings.groqKey || settings.openrouterKey;
  if (anyKey) {
    const prompt = [
      `Rewrite the resume content below so it aligns with this job description for a ${role} C2C contract in the United States.`,
      "Rules: keep every claim truthful and grounded in the original content; keep the original project titles; weave the job description's key technologies into each project (2 to 3 mentions per project); write 2 to 3 concise bullets per project; keep measurable numbers intact; do not invent employers or dates.",
      'Reply with JSON only, shaped exactly as {"rewritten_summary": string, "rewritten_projects": [{"title": string, "bullets": string[]}], "rewritten_skills": string[]}.',
      "",
      "JOB DESCRIPTION:",
      String(jobDescription || "").slice(0, 6000),
      "",
      "CANDIDATE:",
      JSON.stringify({ name: client.name, role: client.primaryRole, experience: client.experience, location: client.location, workAuth: client.workAuth, availability: client.availability }),
      "",
      "BASE RESUME CONTENT:",
      JSON.stringify({
        summary: client.summarySeed,
        projects: (client.projects || []).map((project) => ({ title: project.title, meta: project.meta, bullets: project.bullets })),
        skills: client.skills
      })
    ].join("\n");

    try {
      const result = await callModelChain(settings, prompt);
      const parsed = stripJson(result.text);
      if (parsed && typeof parsed.rewritten_summary === "string") {
        summary = parsed.rewritten_summary.trim();
        if (Array.isArray(parsed.rewritten_projects) && parsed.rewritten_projects.length) {
          projects = (client.projects || []).map((project) => {
            const match = parsed.rewritten_projects.find(
              (item) => String(item.title || "").toLowerCase().slice(0, 12) === project.title.toLowerCase().slice(0, 12)
            ) || parsed.rewritten_projects[(client.projects || []).indexOf(project)];
            return { ...project, bullets: Array.isArray(match?.bullets) && match.bullets.length ? match.bullets : project.bullets };
          });
        }
        if (Array.isArray(parsed.rewritten_skills) && parsed.rewritten_skills.length) {
          skills = parsed.rewritten_skills.map((skill) => String(skill)).slice(0, 24);
        }
        aiUsed = true;
        aiModel = result.model;
      } else {
        aiNote = "Model reply was not valid JSON, so the local tailoring engine was used.";
      }
    } catch (error) {
      aiNote = `Model chain unavailable (${error.message}). Local tailoring engine applied.`;
    }
  } else {
    aiNote = "No AI key configured. Local tailoring engine applied — add a Gemini, Groq or OpenRouter key in settings for full rewrites.";
  }

  const fullText = [summary, ...projects.flatMap((project) => [project.title, ...project.bullets]), skills.join(" ")].join("\n");

  return {
    role,
    clientId: client.id,
    clientName: client.name,
    keywords,
    aiUsed,
    aiModel,
    aiNote,
    summary,
    projects,
    skills,
    coverage: coverageOf(keywords, fullText),
    original: {
      summary: client.summarySeed,
      projects: client.projects || [],
      skills: client.skills || []
    }
  };
}
