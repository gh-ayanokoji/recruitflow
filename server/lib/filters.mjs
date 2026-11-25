export const NON_US_INDICATORS = [
  "india", "pune", "hyderabad", "bangalore", "bengaluru", "chennai", "noida", "gurgaon", "gurugram",
  "mumbai", "delhi", "kolkata", "ahmedabad", "canada", "toronto", "vancouver", "montreal", "ontario",
  "mexico", "mexico city", "brazil", "sao paulo", "united kingdom", "uk only", "london", "manchester",
  "ireland", "dublin", "germany", "berlin", "munich", "poland", "warsaw", "romania", "bucharest",
  "ukraine", "kyiv", "philippines", "manila", "singapore", "australia", "sydney", "melbourne",
  "dubai", "uae", "abu dhabi", "qatar", "doha", "saudi", "riyadh", "pakistan", "lahore", "karachi",
  "islamabad", "bangladesh", "dhaka", "sri lanka", "colombo", "nepal", "kathmandu", "nigeria",
  "lagos", "kenya", "nairobi", "south africa", "johannesburg", "vietnam", "hanoi", "japan", "tokyo",
  "south korea", "seoul", "china", "shanghai", "beijing", "hong kong", "taiwan", "taipei", "israel",
  "tel aviv", "turkey", "istanbul", "egypt", "cairo", "argentina", "buenos aires", "colombia",
  "bogota", "chile", "santiago", "peru", "lima", "costa rica", "guadalajara", "monterrey"
];

export const US_CITIES = [
  "dallas", "austin", "houston", "san antonio", "plano", "irving", "frisco", "richardson",
  "charlotte", "raleigh", "durham", "atlanta", "alpharetta", "chicago", "naperville", "new york",
  "nyc", "brooklyn", "jersey city", "boston", "seattle", "bellevue", "redmond", "tacoma",
  "san francisco", "san jose", "sunnyvale", "palo alto", "mountain view", "oakland", "sacramento",
  "los angeles", "san diego", "irvine", "phoenix", "tempe", "scottsdale", "denver", "boulder",
  "colorado springs", "miami", "tampa", "orlando", "jacksonville", "nashville", "memphis",
  "columbus", "cleveland", "cincinnati", "detroit", "ann arbor", "minneapolis", "st. louis",
  "saint louis", "kansas city", "salt lake city", "las vegas", "portland", "philadelphia",
  "pittsburgh", "baltimore", "arlington", "richmond", "washington dc", "mclean", "reston",
  "hartford", "providence", "buffalo", "rochester", "omaha", "des moines", "indianapolis",
  "louisville", "birmingham", "new orleans", "oklahoma city", "tulsa", "albuquerque", "tucson",
  "boise", "madison", "milwaukee", "grand rapids", "research triangle", "rtp"
];

export const US_TERMS = [
  "united states", "usa", "u.s.", "us only", "us-based", "us based", "remote (us)", "remote - us",
  "remote, us", "onsite in the us", "w2 or c2c", "anywhere in the us", "nationwide"
];

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC"
];

export const BENCH_PHRASES = [
  "on my bench", "on the bench", "my bench", "our bench", "bench sales", "bench marketer",
  "marketing my consultant", "marketing our consultant", "marketing a consultant",
  "candidate available", "consultant available", "consultants available", "available consultants",
  "hotlist", "hot list", "we have consultants", "visa candidates available", "h1b candidates available",
  "we are marketing", "marketing visa candidates"
];

export const DOMAIN_MAP = {
  qa: ["qa", "quality assurance", "sdet", "test automation", "automation engineer", "selenium", "manual tester"],
  devops: ["devops", "sre", "site reliability", "cloud engineer", "platform engineer", "infrastructure engineer"],
  salesforce: ["salesforce", "vlocity", "cpq", "apex developer"],
  sap: ["sap", "abap", "fiori", "hana consultant"],
  java: ["java", "spring boot", "microservices", "backend", "back-end", "full stack", "fullstack", "software engineer", "application developer", "api developer"],
  frontend: ["react", "frontend", "front-end", "ui developer", "angular", "vue", "next.js", "react developer"],
  data: ["data scientist", "data science", "data engineer", "machine learning", "ml engineer", "analytics", "ai engineer", "llm", "gen ai", "nlp engineer"],
  dotnet: [".net", "c#", "dotnet", "asp.net"]
};

export const JD_KEYWORDS = [
  "Java", "Spring Boot", "Microservices", "Kafka", "AWS", "Azure", "GCP", "Docker", "Kubernetes",
  "PostgreSQL", "MySQL", "Oracle", "MongoDB", "DynamoDB", "Redis", "REST APIs", "GraphQL", "React",
  "Next.js", "TypeScript", "JavaScript", "Node.js", "Redux", "HTML5", "CSS3", "Python", "Pandas",
  "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP",
  "LLMs", "RAG", "SQL", "Snowflake", "Databricks", "Airflow", "Spark", "Tableau", "Power BI", "ETL",
  "Data Warehousing", "CI/CD", "Jenkins", "Terraform", "Ansible", "Linux", "Git", "Agile", "Scrum",
  "Jira", "Hibernate", "JUnit", "Mockito", "Selenium", "Cypress", "Playwright", "Salesforce", "SAP",
  ".NET", "C#", "Go", "Rust", "Scala", "Elasticsearch", "RabbitMQ", "gRPC", "OAuth", "Stripe"
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const DOMAIN_LABELS = { qa: "QA", devops: "DevOps", salesforce: "Salesforce", sap: "SAP", java: "Java", frontend: "Frontend", data: "Data", dotnet: ".NET" };

export function extractEmails(text) {
  const found = String(text || "").match(EMAIL_REGEX) || [];
  return [...new Set(found.map((email) => email.toLowerCase().replace(/[.,;:]+$/, "")))];
}

export function extractKeywords(text, hintSkills = []) {
  const source = String(text || "");
  const lower = source.toLowerCase();
  const scored = [];
  for (const keyword of JD_KEYWORDS) {
    const needle = keyword.toLowerCase();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = lower.match(new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "g"));
    if (matches) scored.push({ keyword, count: matches.length });
  }
  const hinted = hintSkills
    .filter((skill) => lower.includes(String(skill).toLowerCase()))
    .map((skill) => skill);
  const ordered = [];
  for (const item of scored.sort((a, b) => b.count - a.count)) ordered.push(item.keyword);
  for (const skill of hinted) if (!ordered.some((k) => k.toLowerCase() === skill.toLowerCase())) ordered.push(skill);
  return ordered;
}

export function keywordCount(text, keyword) {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = String(text || "").toLowerCase().match(new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "g"));
  return matches ? matches.length : 0;
}

export function buildHook(keywords, role) {
  const top = keywords.slice(0, 3);
  if (!top.length) {
    return `My background aligns closely with the ${role} requirement you posted, and I can start immediately.`;
  }
  const list = top.length === 1 ? top[0] : `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}`;
  return `My hands-on experience with ${list} maps directly to what you are looking for in this ${role} contract.`;
}

export function buildSubject(client, role) {
  return `C2C ${role} | ${client.name} | ${client.experience} | ${client.availability} | ${client.location}`;
}

export function isUsaJob(text) {
  const lower = String(text || "").toLowerCase();
  const hasUsTerm = US_TERMS.some((term) => lower.includes(term));
  const hasUsCity = US_CITIES.some((city) => lower.includes(city));
  const hasUsState = new RegExp(`\\b(${US_STATES.join("|")})\\b`).test(text || "");
  const nonUs = NON_US_INDICATORS.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower));
  const hasUs = hasUsTerm || hasUsCity || hasUsState;
  if (hasUs) return { usa: true, reason: "" };
  if (nonUs.length) return { usa: false, reason: `Non-US location: ${nonUs[0]}` };
  return { usa: false, reason: "No US location or remote-US signal found" };
}

export function isBenchPost(text) {
  const lower = String(text || "").toLowerCase();
  const hit = BENCH_PHRASES.find((phrase) => lower.includes(phrase));
  return hit ? { bench: true, reason: `Bench marketing phrase: "${hit}"` } : { bench: false, reason: "" };
}

export function detectJobTitle(text) {
  const lines = String(text || "").split(/\n|(?<=\.)\s+/);
  for (const line of lines) {
    const match = line.match(/(?:role|position|title|requirement|opening|hiring|looking for|need)\s*[:\-–]?\s*([A-Za-z0-9 .+/#&-]{3,70})/i);
    if (match) return match[1].trim().replace(/[.,]$/, "");
  }
  return "";
}

export function detectDomain(text) {
  const source = String(text || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [domain, words] of Object.entries(DOMAIN_MAP)) {
    let score = 0;
    for (const word of words) {
      if (source.includes(word)) score += word.includes(" ") ? 3 : 2;
    }
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  return best;
}

export function clientDomains(client) {
  const declared = detectDomain(`${client.primaryRole} ${(client.searchRoles || []).join(" ")} ${(client.skills || []).join(" ")}`);
  const set = new Set([declared]);
  if (declared === "java") set.add("frontend");
  if (declared === "frontend") set.add("java");
  if (declared === "data") set.add("java");
  return [...set].filter(Boolean);
}

export function matchesStrictFilter(recruiter, client) {
  const text = `${recruiter.jobDescription || ""}`;
  const location = isUsaJob(text);
  const bench = isBenchPost(text);
  const title = detectJobTitle(text);
  const domain = detectDomain(title || text);
  const allowed = clientDomains(client);
  const domainOk = !domain || allowed.includes(domain);
  const checks = {
    usa: location.usa,
    bench: !bench.bench,
    domain: domainOk
  };
  let reason = "";
  if (!location.usa) reason = location.reason;
  else if (bench.bench) reason = bench.reason;
  else if (!domainOk) {
    reason = `Role domain mismatch: ${DOMAIN_LABELS[domain] || domain} role for a ${client.primaryRole} profile`;
  }
  return {
    accepted: checks.usa && checks.bench && checks.domain,
    checks,
    reason,
    detectedTitle: title,
    detectedDomain: domain,
    keywords: extractKeywords(text, client.skills || [])
  };
}

export function buildSearchQuery(role, exclusionKeywords = []) {
  const base = [`"${role}"`, "C2C"];
  const defaults = ['-hotlist', "-fulltime", '-"available consultants"', "-Bench"];
  const extras = exclusionKeywords
    .filter((word) => !["hotlist", "fulltime", "available consultants", "bench"].includes(String(word).toLowerCase()))
    .map((word) => `-${String(word).includes(" ") ? `"${word}"` : word}`);
  return [...base, ...defaults, ...extras].join(" ");
}
