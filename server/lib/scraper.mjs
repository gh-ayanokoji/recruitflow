import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchesStrictFilter } from "./filters.mjs";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const sessionFile = path.join(root, "session.json");

const FIRMS = [
  ["Talentbridge Partners", "talentbridge.com"],
  ["Northpointe Group", "northpointegroup.com"],
  ["Fusion Staffing", "fusionstaffing.com"],
  ["Lakeside Technologies", "lakesidetechnologies.com"],
  ["Bytebridge Partners", "bytebridgepartners.com"],
  ["Apex Staffing Solutions", "apexstaffingsolutions.com"],
  ["Midwest Talent Partners", "midwesttalentpartners.com"],
  ["Remotestack Talent", "remotestacktalent.com"],
  ["Atlantic Staffing Group", "atlstaffinggroup.com"],
  ["Staffinghub USA", "staffinghubusa.com"]
];

const RECRUITERS = [
  "Anita Desai", "Brian Cole", "Carla Mendes", "Dev Patel", "Elena Fischer", "Farah Qureshi",
  "Grant Whitaker", "Hana Kim", "Ivan Petrov", "Julia Brandt", "Karan Mehta", "Laura Simmons",
  "Marcus Reed", "Nadia Haddad", "Owen Clarke", "Pooja Reddy", "Quinn Alvarez", "Rina Sato"
];

const US_LOCATIONS = [
  "Dallas, TX", "Austin, TX", "Chicago, IL", "Atlanta, GA", "Charlotte, NC", "Phoenix, AZ",
  "Denver, CO", "Seattle, WA", "New York, NY", "Remote (United States)", "San Jose, CA",
  "Boston, MA", "Tampa, FL", "Minneapolis, MN", "Plano, TX", "Nashville, TN"
];

const NON_US_LOCATIONS = [
  "Pune, India", "Toronto, Canada", "Noida, India", "Mexico City, Mexico",
  "London, United Kingdom", "Hyderabad, India", "Vancouver, Canada"
];

const DOMAIN_MISMATCH_ROLES = ["QA Automation Engineer", "DevOps Engineer", "Salesforce Developer", "SAP ABAP Consultant"];

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildPost(client, role, index, variant) {
  const skills = client.skills.filter((skill) => !/agile|ci\/cd|storybook|mockito|junit/i.test(skill));
  const stack = skills.slice(index % 3, (index % 3) + 5);
  const firm = FIRMS[(index + variant) % FIRMS.length];
  const recruiter = RECRUITERS[(index * 3 + variant) % RECRUITERS.length];
  const email = `${recruiter.split(" ")[0].toLowerCase()}.${recruiter.split(" ")[1].toLowerCase()}${Date.now().toString().slice(-4)}@${firm[1]}`;
  const location = US_LOCATIONS[(index + variant * 2) % US_LOCATIONS.length];

  if (variant === 4) {
    const nonUs = NON_US_LOCATIONS[index % NON_US_LOCATIONS.length];
    return {
      recruiterName: recruiter,
      recruiterEmail: email,
      role,
      postUrl: `https://www.linkedin.com/posts/${slug(recruiter)}-${slug(role)}-${Date.now()}-${index}`,
      jobDescription: `Urgent requirement: ${role} in ${nonUs}. C2C contract, 6 to 12 months.\n\nMust have ${stack.join(", ")}. Immediate joiners preferred. Send your resume to ${email}.`
    };
  }

  if (variant === 5) {
    return {
      recruiterName: "Bench Sales Desk",
      recruiterEmail: email,
      role,
      postUrl: `https://www.linkedin.com/posts/bench-desk-${slug(role)}-${Date.now()}-${index}`,
      jobDescription: `HOTLIST — we have consultants on my bench available immediately, including ${client.primaryRole}s.\n\nMarketing my consultant at a competitive C2C rate. Share your requirements and I will send profiles to ${email}.`
    };
  }

  if (variant === 6) {
    const mismatchRole = DOMAIN_MISMATCH_ROLES[index % DOMAIN_MISMATCH_ROLES.length];
    return {
      recruiterName: recruiter,
      recruiterEmail: email,
      role: mismatchRole,
      postUrl: `https://www.linkedin.com/posts/${slug(recruiter)}-${slug(mismatchRole)}-${Date.now()}-${index}`,
      jobDescription: `Looking for a ${mismatchRole} — ${location}. C2C, 12 months.\n\nRequired: Java, Selenium, Jenkins and SQL. Send resumes to ${email}.`
    };
  }

  return {
    recruiterName: recruiter,
    recruiterEmail: email,
    role,
    postUrl: `https://www.linkedin.com/posts/${slug(recruiter)}-${slug(role)}-${Date.now()}-${index}`,
    jobDescription: `Hiring: ${role} (C2C) — ${location}.\n\nMust have ${stack.join(", ")}. 12+ month contract, interviews this week.\n\nRate: competitive C2C. Email your updated resume to ${email}.`
  };
}

export function simulateScrape(client, roles, limit) {
  const log = [];
  const accepted = [];
  const rejected = [];
  log.push(`Searching LinkedIn content for ${client.primaryRole} · ${roles.length} role queries`);
  roles.forEach((role, roleIndex) => {
    log.push(`Query: "${role}" + C2C -hotlist -fulltime -"available consultants" -Bench`);
    log.push("Filters: past 24 hours · sorted by date posted · geoUrn 103644278 (United States)");
    const count = Math.max(4, Math.min(12, Number(limit) || 8));
    for (let index = 0; index < count; index += 1) {
      const variant = index % 7;
      const post = buildPost(client, role, index + roleIndex * count, variant);
      const verdict = matchesStrictFilter(post, client);
      const record = {
        ...post,
        clientId: client.id,
        timestamp: new Date(Date.now() - index * 1_800_000).toISOString(),
        checks: verdict.checks,
        keywords: verdict.keywords.slice(0, 10),
        filterReason: verdict.reason,
        source: "simulated"
      };
      if (verdict.accepted) {
        accepted.push(record);
        log.push(`  ✓ ${post.recruiterName} · ${post.role} · ${post.recruiterEmail}`);
      } else {
        rejected.push(record);
        log.push(`  ✕ rejected ${post.recruiterEmail} — ${verdict.reason}`);
      }
    }
  });
  log.push(`Scrape complete: ${accepted.length} eligible, ${rejected.length} rejected`);
  return { mode: "simulated", accepted, rejected, log };
}

async function liveScrape(client, roles, limit) {
  if (!fs.existsSync(sessionFile)) {
    throw new Error("session.json is missing — run a LinkedIn login session first");
  }
  const { chromium } = await import("playwright");
  const state = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://www.linkedin.com" });
  const page = await context.newPage();
  const log = [];
  const accepted = [];
  const rejected = [];

  try {
    for (const role of roles) {
      const keywords = encodeURIComponent(`"${role}" C2C -hotlist -fulltime -Bench`);
      const url = `https://www.linkedin.com/search/results/content/?keywords=${keywords}&datePosted=%22past-24h%22&sortBy=%22date_posted%22&geoUrn=%5B%22103644278%22%5D`;
      log.push(`GET ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(4000);

      for (let i = 0; i < 6; i += 1) {
        await page.mouse.wheel(0, 2400);
        await page.waitForTimeout(1200);
      }

      const seeMore = page.locator("button:has-text('See more'), span:has-text('See more')");
      const seeMoreCount = await seeMore.count();
      for (let i = 0; i < Math.min(seeMoreCount, 25); i += 1) {
        try {
          await seeMore.nth(i).click({ timeout: 800 });
        } catch {
          log.push("  ! could not expand truncated post");
        }
      }

      const cards = page.locator("div.feed-shared-update-v2");
      const total = Math.min(await cards.count(), (Number(limit) || 8) * 2);
      for (let i = 0; i < total; i += 1) {
        const card = cards.nth(i);
        const text = (await card.innerText().catch(() => "")) || "";
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const mailto = await card.locator("a[href^='mailto:']").first().getAttribute("href").catch(() => null);
        if (mailto) emails.push(mailto.replace("mailto:", "").split("?")[0]);
        if (!emails.length) continue;

        let postUrl = "";
        try {
          await card.scrollIntoViewIfNeeded();
          await card.locator("button[aria-label*='control menu for post']").first().click({ timeout: 2500 });
          await page.waitForTimeout(400);
          const copyLink = page.locator("div[role='menu'] >> text=Copy link").first();
          await copyLink.click({ timeout: 2500 });
          await page.waitForTimeout(300);
          postUrl = await page.evaluate(async () => {
            try {
              await navigator.clipboard.writeText("");
              return await navigator.clipboard.readText();
            } catch {
              return "";
            }
          });
          postUrl = String(postUrl).split("?")[0];
        } catch {
          log.push("  ! copy link unavailable, recording without permalink");
        }

        const author = (await card.locator("a[href*='/in/'] span").first().innerText().catch(() => "")) || "Recruiter";
        const record = {
          recruiterName: author.trim(),
          recruiterEmail: emails[0].toLowerCase(),
          role,
          postUrl: postUrl || "https://www.linkedin.com/feed/",
          jobDescription: text,
          clientId: client.id,
          timestamp: new Date().toISOString(),
          source: "linkedin"
        };
        const verdict = matchesStrictFilter(record, client);
        record.checks = verdict.checks;
        record.keywords = verdict.keywords.slice(0, 10);
        record.filterReason = verdict.reason;
        if (verdict.accepted) accepted.push(record);
        else rejected.push(record);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  log.push(`Scrape complete: ${accepted.length} eligible, ${rejected.length} rejected`);
  return { mode: "live", accepted, rejected, log };
}

export async function runScrape({ client, roles, limit, settings }) {
  if (!settings.playwrightEnabled) {
    return simulateScrape(client, roles, limit);
  }
  try {
    return await liveScrape(client, roles, limit);
  } catch (error) {
    const fallback = simulateScrape(client, roles, limit);
    fallback.log.unshift(`Live Playwright scrape unavailable: ${error.message}`);
    fallback.log.unshift("Falling back to the sample post corpus so the pipeline can still be reviewed.");
    fallback.mode = "simulated-fallback";
    return fallback;
  }
}

export function sessionStatus() {
  try {
    const stats = fs.statSync(sessionFile);
    const parsed = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    return {
      present: true,
      savedAt: stats.mtime.toISOString(),
      cookies: Array.isArray(parsed.cookies) ? parsed.cookies.length : 0,
      origins: Array.isArray(parsed.origins) ? parsed.origins.length : 0
    };
  } catch {
    return { present: false, savedAt: "", cookies: 0, origins: 0 };
  }
}
