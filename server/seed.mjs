import { matchesStrictFilter } from "./lib/filters.mjs";

const NOW = Date.now();
const iso = (daysAgo, hoursAgo = 0, minutes = 0) =>
  new Date(NOW - daysAgo * 86400000 - hoursAgo * 3600000 - minutes * 60000).toISOString();

const CLIENTS = [
  {
    id: "cli_safi",
    key: "safi",
    name: "Safi Rahman",
    email: "safi.rahman@example.com",
    phone: "+1 (469) 555-0142",
    linkedin: "https://www.linkedin.com/in/safi-rahman",
    location: "Dallas, TX",
    relocation: "Yes — remote or onsite",
    workAuth: "H1B (transfer ready)",
    availability: "Immediate",
    experience: "8+ Years",
    primaryRole: "Java Developer",
    searchRoles: ["Java Developer", "Java Full Stack Engineer", "Backend Engineer"],
    exclusionKeywords: ["hotlist", "fulltime", "available consultants", "bench"],
    resumeFile: "clients/safi_rahman_resume.txt",
    accent: "#6366f1",
    rate: "$68/hr C2C",
    skills: ["Java 17", "Spring Boot", "Spring MVC", "Microservices", "Kafka", "AWS", "PostgreSQL", "Oracle", "Docker", "Kubernetes", "REST APIs", "JUnit", "Mockito", "Jenkins", "Agile"],
    summarySeed:
      "Java developer with 8+ years building distributed, event-driven backend systems for insurance and banking clients. Owns services end to end, from API contract to production observability.",
    projects: [
      {
        title: "Claims Processing Platform",
        meta: "Nationwide Insurance · 2022 – Present",
        bullets: [
          "Rebuilt the claims intake service as twelve Spring Boot microservices, cutting claim setup time from 6 minutes to 40 seconds.",
          "Published 2.4M claim events per day through Kafka with idempotent consumers and replay-safe offsets.",
          "Migrated 180 Oracle tables to PostgreSQL with zero downtime using logical replication."
        ]
      },
      {
        title: "Policy Rating Engine",
        meta: "Regions Bank · 2019 – 2022",
        bullets: [
          "Designed a rules-driven rating API processing 90K quotes per hour on AWS with autoscaling ECS tasks.",
          "Introduced JUnit and Mockito suites that raised coverage from 41% to 86%.",
          "Automated blue/green deploys with Jenkins and Docker images kept under 90MB."
        ]
      },
      {
        title: "Agent Portal APIs",
        meta: "Deloitte · 2017 – 2019",
        bullets: [
          "Built REST APIs for a 22,000-agent portal on Spring MVC and Oracle.",
          "Reduced p95 response time by 62% through query tuning and a Redis read cache."
        ]
      }
    ],
    education: "B.S. Computer Science, University of Texas at Dallas · 2016"
  },
  {
    id: "cli_tanuja",
    key: "tanuja",
    name: "Tanuja Iyer",
    email: "tanuja.iyer@example.com",
    phone: "+1 (512) 555-0188",
    linkedin: "https://www.linkedin.com/in/tanuja-iyer",
    location: "Austin, TX",
    relocation: "Open to remote",
    workAuth: "Green Card",
    availability: "2 Weeks",
    experience: "6+ Years",
    primaryRole: "Data Scientist",
    searchRoles: ["Data Scientist", "Machine Learning Engineer", "Data Engineer"],
    exclusionKeywords: ["hotlist", "fulltime", "available consultants", "bench"],
    resumeFile: "clients/tanuja_iyer_resume.txt",
    accent: "#22d3ee",
    rate: "$72/hr C2C",
    skills: ["Python", "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "SQL", "Snowflake", "Airflow", "Spark", "NLP", "LLMs", "Tableau", "AWS SageMaker"],
    summarySeed:
      "Data scientist with 6+ years turning messy operational data into production models and decision tools for healthcare and retail teams.",
    projects: [
      {
        title: "Patient Readmission Model",
        meta: "Ascension Health · 2022 – Present",
        bullets: [
          "Trained a gradient-boosted readmission model on 4.1M encounters, lifting recall at 10% precision by 23 points.",
          "Shipped scoring as a SageMaker endpoint consumed directly by case-management workflows."
        ]
      },
      {
        title: "Demand Forecasting Pipeline",
        meta: "H-E-B · 2020 – 2022",
        bullets: [
          "Built an Airflow and Spark pipeline forecasting weekly demand for 3,400 SKUs with 8.6% MAPE.",
          "Replaced manual Excel planning and saved an estimated 1,900 analyst hours per quarter."
        ]
      },
      {
        title: "Voice-of-Customer NLP",
        meta: "Dell Technologies · 2018 – 2020",
        bullets: [
          "Clustered 260K support transcripts with NLP embeddings to surface 14 recurring defect themes.",
          "Automated Tableau reporting for product and support leadership."
        ]
      }
    ],
    education: "M.S. Statistics, University of Texas at Austin · 2018"
  },
  {
    id: "cli_priya",
    key: "priya",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+1 (312) 555-0117",
    linkedin: "https://www.linkedin.com/in/priya-nair",
    location: "Chicago, IL",
    relocation: "Yes — hybrid or remote",
    workAuth: "US Citizen",
    availability: "Immediate",
    experience: "5+ Years",
    primaryRole: "React Developer",
    searchRoles: ["React Developer", "Frontend Engineer", "UI Developer"],
    exclusionKeywords: ["hotlist", "fulltime", "available consultants", "bench"],
    resumeFile: "clients/priya_nair_resume.txt",
    accent: "#f472b6",
    rate: "$64/hr C2C",
    skills: ["React 18", "TypeScript", "Next.js", "Redux Toolkit", "Node.js", "GraphQL", "REST APIs", "HTML5", "CSS3", "Jest", "Cypress", "Storybook", "AWS Amplify"],
    summarySeed:
      "Frontend engineer with 5+ years shipping accessible, fast product interfaces for fintech and marketplace teams.",
    projects: [
      {
        title: "Wealth Dashboard",
        meta: "Northern Trust · 2022 – Present",
        bullets: [
          "Led a React and TypeScript rewrite of the advisor dashboard used by 4,800 advisors.",
          "Cut Largest Contentful Paint from 4.1s to 1.3s through route-level code splitting and cache strategy."
        ]
      },
      {
        title: "Marketplace Checkout",
        meta: "Rever · 2020 – 2022",
        bullets: [
          "Built a Next.js checkout with Redux Toolkit state and GraphQL data loading.",
          "Raised mobile conversion 11% with an accessible three-step flow."
        ]
      },
      {
        title: "Design System",
        meta: "Koch Industries · 2019 – 2020",
        bullets: [
          "Shipped a Storybook component library adopted by seven product teams.",
          "Added Jest and Cypress coverage gates to the release pipeline."
        ]
      }
    ],
    education: "B.S. Information Systems, DePaul University · 2019"
  }
];

const POSTS = [
  {
    key: "safi",
    recruiterName: "Meera Kapoor",
    recruiterEmail: "meera.k@talentbridge.com",
    role: "Java Developer",
    hours: 3,
    postUrl: "https://www.linkedin.com/posts/meera-kapoor-hiring-java-dallas-activity-7241",
    text: `Hiring: Java Developer (C2C) — Dallas, TX (hybrid, 3 days onsite).

Must have: Java 11+, Spring Boot, Microservices, Kafka, AWS and PostgreSQL. 12+ month contract with a large insurance client.

Rate: up to $70/hr C2C. Email your updated resume to meera.k@talentbridge.com and I will call you today.`
  },
  {
    key: "safi",
    recruiterName: "Keith Davis",
    recruiterEmail: "kdavis@northpointegroup.com",
    role: "Senior Java Engineer",
    hours: 8,
    postUrl: "https://www.linkedin.com/posts/keith-davis-northpointe-java-remote-activity-7244",
    text: `C2C role: Senior Java Engineer — 100% Remote (United States only).

Need strong Spring Boot, Microservices, AWS (DynamoDB, Lambda), Docker and Kubernetes. 6–12 months, extension likely.

Send resumes to kdavis@northpointegroup.com with your best rate.`
  },
  {
    key: "safi",
    recruiterName: "Alina Roy",
    recruiterEmail: "alina.roy@fusionstaffing.com",
    role: "Java Developer",
    hours: 20,
    postUrl: "https://www.linkedin.com/posts/alina-roy-fusion-java-dallas-activity-7249",
    text: `Java Developer opening in Dallas, TX — C2C, 12 months.

Spring Boot, Kafka, Microservices, Azure and REST APIs. Client is in the payments space, interviews this week.

Reach me at alina.roy@fusionstaffing.com.`
  },
  {
    key: "safi",
    recruiterName: "Bench Desk",
    recruiterEmail: "bench@fastvisastaffing.com",
    role: "Java Developer",
    hours: 5,
    postUrl: "https://www.linkedin.com/posts/bench-desk-hotlist-java-activity-7250",
    text: `HOTLIST — we have consultants on my bench available immediately: Java, QA, BA, DevOps.

Marketing my consultant at $55/hr C2C. Share your requirements and I will send profiles today.`
  },
  {
    key: "safi",
    recruiterName: "Ravi Shinde",
    recruiterEmail: "ravi.shinde@punetechsolutions.in",
    role: "Java Developer",
    hours: 11,
    postUrl: "https://www.linkedin.com/posts/ravi-shinde-pune-java-activity-7251",
    text: `Urgent requirement: Java Developer in Pune, India. 6 months contract.

Java, Spring Boot, Hibernate, MySQL. Immediate joiners only. Send your resume to ravi.shinde@punetechsolutions.in.`
  },
  {
    key: "safi",
    recruiterName: "QA Talent Team",
    recruiterEmail: "qa.team@brightpathstaffing.com",
    role: "QA Automation Engineer",
    hours: 6,
    postUrl: "https://www.linkedin.com/posts/brightpath-qa-automation-charlotte-activity-7252",
    text: `Looking for a QA Automation Engineer with Java and Selenium — Charlotte, NC (onsite).

5+ years in test automation, API testing with Rest Assured. C2C 12 months.

Send resumes to qa.team@brightpathstaffing.com.`
  },
  {
    key: "safi",
    recruiterName: "Dana Whitfield",
    recruiterEmail: "dana@crmcloudpartners.com",
    role: "Salesforce Developer",
    hours: 14,
    postUrl: "https://www.linkedin.com/posts/dana-whitfield-salesforce-remote-activity-7253",
    text: `Salesforce Developer (C2C) — remote, USA.

Apex, LWC, Flow and CPQ required. 9 month contract with a healthcare payer.

Email dana@crmcloudpartners.com for the full JD.`
  },
  {
    key: "safi",
    recruiterName: "Marc Leblanc",
    recruiterEmail: "marc.leblanc@northstarcanada.ca",
    role: "Java Developer",
    hours: 9,
    postUrl: "https://www.linkedin.com/posts/marc-leblanc-toronto-java-activity-7254",
    text: `Java Developer — Toronto, Canada (hybrid). C2C 12 months.

Spring Boot, PostgreSQL, Kafka. Only candidates authorized to work in Canada please.

Contact marc.leblanc@northstarcanada.ca.`
  },
  {
    key: "safi",
    recruiterName: "Neha Verma",
    recruiterEmail: "neha.verma@delhistaffing.in",
    role: "Java Developer",
    hours: 18,
    postUrl: "https://www.linkedin.com/posts/neha-verma-noida-java-activity-7255",
    text: `Position: Java Developer. Location: Noida, India. Experience: 5–8 years.

Spring Boot, Microservices, AWS. C2C preferred. Apply to neha.verma@delhistaffing.in.`
  },
  {
    key: "safi",
    recruiterName: "Bench Sales Team",
    recruiterEmail: "sales@apexc2cbench.com",
    role: "Java Full Stack Engineer",
    hours: 16,
    postUrl: "https://www.linkedin.com/posts/apex-bench-sales-java-fullstack-activity-7256",
    text: `Bench sales update: marketing our consultant with 10 years of Java, React and AWS experience. Available immediately, any US location.

Visa: H1B. Please share C2C requirements at sales@apexc2cbench.com.`
  },
  {
    key: "tanuja",
    recruiterName: "Rohan Menon",
    recruiterEmail: "r.menon@lakesidetechnologies.com",
    role: "Data Scientist",
    hours: 4,
    postUrl: "https://www.linkedin.com/posts/rohan-menon-lakeside-datascientist-austin-activity-7261",
    text: `Data Scientist (C2C) — Austin, TX. 12 months, onsite 2 days per week.

Required: Python, PyTorch, Machine Learning, Snowflake, Airflow and NLP. Healthcare domain a plus.

Resumes to r.menon@lakesidetechnologies.com.`
  },
  {
    key: "tanuja",
    recruiterName: "Vishesh Bansal",
    recruiterEmail: "vishesh@apexstaffingsolutions.com",
    role: "Data Scientist",
    hours: 30,
    postUrl: "https://www.linkedin.com/posts/vishesh-bansal-apex-datascientist-phoenix-activity-7262",
    text: `Hiring Data Scientist — Phoenix, AZ (remote friendly, USA).

Must have Python, TensorFlow, SQL and AWS SageMaker. 12+ months C2C, rate up to $75/hr.

Contact vishesh@apexstaffingsolutions.com.`
  },
  {
    key: "tanuja",
    recruiterName: "Ava Chen",
    recruiterEmail: "ava@bytebridgepartners.com",
    role: "Data Scientist",
    hours: 2,
    postUrl: "https://www.linkedin.com/posts/ava-chen-bytebridge-llm-datascientist-activity-7263",
    text: `Data Scientist C2C — San Jose, CA. Interviews immediately.

Python, LLMs, RAG, NLP and PyTorch. You will build retrieval pipelines and evaluation harnesses for a Gen AI product team.

Email ava@bytebridgepartners.com.`
  },
  {
    key: "tanuja",
    recruiterName: "Himanshu Rao",
    recruiterEmail: "himanshu@staffinghubusa.com",
    role: "Data Engineer",
    hours: 7,
    postUrl: "https://www.linkedin.com/posts/himanshu-rao-dataengineer-remote-activity-7264",
    text: `Need a Data Engineer — remote, USA. C2C 12 months.

Snowflake, Airflow, Python, Spark and SQL. Build ETL for a retail analytics warehouse.

Send profiles to himanshu@staffinghubusa.com.`
  },
  {
    key: "priya",
    recruiterName: "Kelly Moran",
    recruiterEmail: "kelly@midwesttalentpartners.com",
    role: "React Developer",
    hours: 1,
    postUrl: "https://www.linkedin.com/posts/kelly-moran-react-chicago-activity-7271",
    text: `Looking for a React Developer with TypeScript, Next.js, Redux and GraphQL — Chicago, IL (hybrid).

6+ months C2C. Financial services client, strong design system culture.

Email kelly@midwesttalentpartners.com.`
  },
  {
    key: "priya",
    recruiterName: "Matt Rowe",
    recruiterEmail: "matt@remotestacktalent.com",
    role: "React Developer",
    hours: 13,
    postUrl: "https://www.linkedin.com/posts/matt-rowe-remotestack-react-activity-7272",
    text: `Need a React Developer — Remote (US). Next.js, TypeScript, Redux Toolkit, Node.js. $60–65/hr C2C, 9 months.

Product is a B2B analytics app. Contact matt@remotestacktalent.com.`
  },
  {
    key: "priya",
    recruiterName: "Priyanka Shah",
    recruiterEmail: "priyanka@atlstaffinggroup.com",
    role: "Full Stack Engineer",
    hours: 22,
    postUrl: "https://www.linkedin.com/posts/priyanka-shah-atl-fullstack-atlanta-activity-7273",
    text: `Immediate C2C requirement: Full Stack Engineer (Java + React) — Atlanta, GA.

Spring Boot, React, TypeScript and AWS. 12 months, hybrid 3 days onsite.

Share resumes at priyanka@atlstaffinggroup.com.`
  },
  {
    key: "priya",
    recruiterName: "Selenium Recruiting",
    recruiterEmail: "roles@testingtalentco.com",
    role: "QA Automation Engineer",
    hours: 10,
    postUrl: "https://www.linkedin.com/posts/testingtalent-qa-automation-remote-activity-7274",
    text: `QA Automation Engineer — Remote, USA.

Cypress, Playwright and TypeScript. Build test suites for a React product. C2C 6 months.

Apply at roles@testingtalentco.com.`
  }
];

const OUTREACH = [
  { email: "meera.k@talentbridge.com", days: 9, followups: 0, replied: 0, subject: "C2C Java Developer | Safi Rahman | 8+ Years | Immediate | Dallas, TX" },
  { email: "kdavis@northpointegroup.com", days: 3, followups: 0, replied: 0, subject: "C2C Senior Java Engineer | Safi Rahman | 8+ Years | Immediate | Dallas, TX" },
  { email: "alina.roy@fusionstaffing.com", days: 12, followups: 1, replied: 1, subject: "C2C Java Developer | Safi Rahman | 8+ Years | Immediate | Dallas, TX" },
  { email: "r.menon@lakesidetechnologies.com", days: 2, followups: 0, replied: 0, subject: "C2C Data Scientist | Tanuja Iyer | 6+ Years | 2 Weeks | Austin, TX" },
  { email: "vishesh@apexstaffingsolutions.com", days: 6, followups: 0, replied: 1, subject: "C2C Data Scientist | Tanuja Iyer | 6+ Years | 2 Weeks | Austin, TX" },
  { email: "matt@remotestacktalent.com", days: 8, followups: 0, replied: 0, subject: "C2C React Developer | Priya Nair | 5+ Years | Immediate | Chicago, IL" },
  { email: "priyanka@atlstaffinggroup.com", days: 4, followups: 0, replied: 0, subject: "C2C Full Stack Engineer | Priya Nair | 5+ Years | Immediate | Chicago, IL" }
];

const REPLY_SEEDS = [
  {
    email: "alina.roy@fusionstaffing.com",
    name: "Alina Roy",
    days: 11,
    subject: "Re: C2C Java Developer | Safi Rahman | 8+ Years | Immediate | Dallas, TX",
    snippet:
      "Thanks Safi — this looks like a strong fit for the payments role. Can you confirm your earliest start date and share a rate confirmation? I can get you a call with the hiring manager this week."
  },
  {
    email: "vishesh@apexstaffingsolutions.com",
    name: "Vishesh Bansal",
    days: 5,
    subject: "Re: C2C Data Scientist | Tanuja Iyer | 6+ Years | 2 Weeks | Austin, TX",
    snippet:
      "Received the resume, thank you. The client wants someone strong on SageMaker endpoints. What is Tanuja's availability for a 30 minute screen on Thursday?"
  }
];

function messageId(seed) {
  const token = Buffer.from(`${seed}-${NOW}`).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  return `<CAF${token}@mail.gmail.com>`;
}

export function buildSeed() {
  const clients = CLIENTS.map((client) => ({ ...client }));
  const byKey = Object.fromEntries(clients.map((client) => [client.key, client]));
  const recruiters = [];
  const history = [];
  const replies = [];
  const runs = [];

  POSTS.forEach((post, index) => {
    const client = byKey[post.key];
    const recruiter = {
      id: `rec_${String(index + 1).padStart(3, "0")}`,
      recruiterName: post.recruiterName,
      recruiterEmail: post.recruiterEmail,
      role: post.role,
      postUrl: post.postUrl,
      jobDescription: post.text,
      emailSentStatus: "pending",
      timestamp: iso(0, post.hours, index * 3),
      clientId: client.id,
      filterReason: "",
      checks: { usa: true, bench: true, domain: true },
      keywords: [],
      source: "linkedin"
    };
    const verdict = matchesStrictFilter(recruiter, client);
    recruiter.checks = verdict.checks;
    recruiter.keywords = verdict.keywords.slice(0, 8);
    if (!verdict.accepted) {
      recruiter.emailSentStatus = "filtered";
      recruiter.filterReason = verdict.reason;
    }
    recruiters.push(recruiter);
  });

  const byEmail = Object.fromEntries(recruiters.map((row) => [row.recruiterEmail, row]));

  OUTREACH.forEach((outreach, index) => {
    const recruiter = byEmail[outreach.email];
    if (!recruiter) return;
    const client = clients.find((item) => item.id === recruiter.clientId);
    const row = {
      id: `hist_${String(index + 1).padStart(3, "0")}`,
      recruiterName: recruiter.recruiterName,
      recruiterEmail: recruiter.recruiterEmail,
      role: recruiter.role,
      postUrl: recruiter.postUrl,
      candidate: client.name,
      clientId: client.id,
      emailSentStatus: "sent",
      timestamp: iso(outreach.days, 2, index * 7),
      subject: outreach.subject,
      messageId: messageId(outreach.email),
      followupCount: outreach.followups,
      lastFollowupAt: outreach.followups ? iso(outreach.days - 5, 1) : "",
      replied: outreach.replied,
      hookKeywords: recruiter.keywords.slice(0, 3),
      jobDescription: recruiter.jobDescription
    };
    history.push(row);
    recruiter.emailSentStatus = "sent";
  });

  REPLY_SEEDS.forEach((reply, index) => {
    const match = history.find((row) => row.recruiterEmail === reply.email);
    replies.push({
      id: `rep_${String(index + 1).padStart(3, "0")}`,
      from: reply.email,
      fromName: reply.name,
      subject: reply.subject,
      receivedAt: iso(reply.days, 4),
      snippet: reply.snippet,
      historyId: match ? match.id : "",
      clientId: match ? match.clientId : "",
      source: "imap"
    });
  });

  runs.push(
    {
      id: "run_001",
      clientId: "cli_safi",
      roles: ["Java Developer", "Java Full Stack Engineer", "Backend Engineer"],
      startedAt: iso(1, 3),
      finishedAt: iso(1, 2, 41),
      found: 10,
      accepted: 3,
      rejected: 7,
      status: "completed",
      mode: "simulated"
    },
    {
      id: "run_002",
      clientId: "cli_tanuja",
      roles: ["Data Scientist", "Machine Learning Engineer"],
      startedAt: iso(0, 9),
      finishedAt: iso(0, 8, 46),
      found: 4,
      accepted: 4,
      rejected: 0,
      status: "completed",
      mode: "simulated"
    },
    {
      id: "run_003",
      clientId: "cli_priya",
      roles: ["React Developer", "Frontend Engineer"],
      startedAt: iso(0, 5),
      finishedAt: iso(0, 4, 52),
      found: 4,
      accepted: 3,
      rejected: 1,
      status: "completed",
      mode: "simulated"
    }
  );

  return { clients, recruiters, history, replies, runs, version: 1 };
}
