import { useEffect, useMemo, useState } from "react";
import { postJson } from "../api";
import { Badge, Card, CoverageRing, Empty, Field, Icon } from "../components/ui";
import { downloadUrl } from "../utils";

export function ResumeStudio({ data, notify }) {
  const { clients, recruiters } = data;
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const client = clients.find((item) => item.id === clientId) || clients[0];
  const clientRecruiters = useMemo(
    () => recruiters.filter((row) => row.clientId === client?.id),
    [recruiters, client]
  );
  const [recruiterId, setRecruiterId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("tailored");
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    setResult(null);
    const first = clientRecruiters[0];
    setRecruiterId(first?.id || "");
    setJobDescription(first?.jobDescription || "");
  }, [clientId]);

  useEffect(() => {
    const match = clientRecruiters.find((row) => row.id === recruiterId);
    if (match) setJobDescription(match.jobDescription);
  }, [recruiterId]);

  const tailor = async () => {
    if (!jobDescription.trim()) {
      notify("Select a recruiter post or paste a job description", "bad");
      return;
    }
    setBusy(true);
    try {
      const tailored = await postJson("/resume/tailor", { clientId: client.id, recruiterId, jobDescription });
      setResult(tailored);
      setTab("tailored");
      notify(tailored.aiUsed ? `Rewritten with ${tailored.aiModel}` : "Tailored with the local engine", "good");
    } catch (error) {
      notify(error.message, "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-main" style={{ alignItems: "start" }}>
      <div className="col" style={{ gap: 18 }}>
        <Card title="Tailoring input" subtitle="Choose the candidate and the exact recruiter post to align against">
          <div className="col" style={{ gap: 14 }}>
            <div className="field-row">
              <Field label="Candidate">
                <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                  {clients.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · {item.primaryRole}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source post">
                <select value={recruiterId} onChange={(event) => setRecruiterId(event.target.value)}>
                  <option value="">Pasted job description</option>
                  {clientRecruiters.map((row) => (
                    <option key={row.id} value={row.id}>{row.recruiterName} · {row.role}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Job description">
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={7}
                placeholder="Paste the recruiter's post here to extract keywords and rewrite the resume."
              />
            </Field>

            <div className="row wrap">
              <button className="btn primary" onClick={tailor} disabled={busy}>
                <Icon name="sparkle" size={14} />
                {busy ? "Tailoring…" : "Tailor resume"}
              </button>
              <a
                className={`btn ghost ${result ? "" : "disabled"}`}
                href={downloadUrl(`/resume/${client?.id}/download?recruiterId=${encodeURIComponent(recruiterId)}`)}
                onClick={(event) => {
                  if (!result) event.preventDefault();
                }}
              >
                <Icon name="download" size={13} />
                Export DOCX
              </a>
              <button className="btn ghost sm" onClick={() => setShowSource((current) => !current)}>
                {showSource ? "Hide source" : "View source resume"}
              </button>
            </div>
          </div>
        </Card>

        {showSource ? (
          <Card title="Source resume" subtitle={client?.resumeFile}>
            <pre className="console" style={{ maxHeight: 420, whiteSpace: "pre-wrap" }}>{result?.sourceResume || "Loading source text on the first tailoring run."}</pre>
          </Card>
        ) : null}

        {result ? (
          <Card
            title="Keyword alignment"
            subtitle="Coverage of the job description keywords inside the rewritten resume"
            action={<Badge tone={result.aiUsed ? "green" : "amber"}>{result.aiUsed ? result.aiModel : "local engine"}</Badge>}
          >
            <div className="coverage">
              <CoverageRing value={result.coverage.score} />
              <div className="col" style={{ gap: 8, flex: 1 }}>
                <div className="small muted">{result.coverage.matched.length} of {result.keywords.length} JD keywords present</div>
                <div className="meter"><i style={{ width: `${result.coverage.score}%` }} /></div>
                <div className="chip-list">
                  {result.coverage.matched.map((keyword) => (
                    <span className="chip matched" key={keyword}>{keyword}</span>
                  ))}
                </div>
                {result.coverage.missing.length ? (
                  <div className="chip-list">
                    {result.coverage.missing.map((keyword) => (
                      <span className="chip missing" key={keyword}>{keyword}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            {result.aiNote ? (
              <div className="notice" style={{ marginTop: 14 }}>
                <Icon name="alert" size={15} />
                <span>{result.aiNote}</span>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      <div className="col" style={{ gap: 18 }}>
        {result ? (
          <Card
            title={`${client?.name} · ${result.role}`}
            subtitle="Formatting-preserving rewrite ready for dispatch"
            action={
              <div className="tabs" style={{ border: "none", margin: 0 }}>
                <button className={`tab ${tab === "tailored" ? "on" : ""}`} onClick={() => setTab("tailored")}>Tailored</button>
                <button className={`tab ${tab === "original" ? "on" : ""}`} onClick={() => setTab("original")}>Original</button>
              </div>
            }
          >
            <div className="resume-paper">
              <h1>{client?.name}</h1>
              <div className="resume-meta">
                {client?.primaryRole} · {client?.location}<br />
                {client?.phone} · {client?.email}<br />
                {client?.linkedin}<br />
                Work authorization: {client?.workAuth} · Availability: {client?.availability} · Relocation: {client?.relocation}
              </div>

              <h2>Professional Summary</h2>
              <p>{tab === "tailored" ? result.summary : result.original.summary}</p>

              <h2>Technical Skills</h2>
              <p>{(tab === "tailored" ? result.skills : result.original.skills).join(" · ")}</p>

              <h2>Project Experience</h2>
              {(tab === "tailored" ? result.projects : result.original.projects).map((project) => (
                <div key={project.title}>
                  <div className="project-title">{project.title}</div>
                  <div className="project-meta">{project.meta}</div>
                  <ul>
                    {project.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <h2>Education</h2>
              <p>{client?.education}</p>
            </div>
          </Card>
        ) : (
          <Card title="No tailored resume yet" subtitle="The rewrite preserves roles, dates and measurable outcomes">
            <Empty title="Pick a post and tailor">
              The engine extracts the summary, projects and skills, weaves the top job description keywords through each project, and
              keeps every original number intact. Export lands as a DOCX you can convert to PDF.
            </Empty>
            <div className="steps" style={{ marginTop: 18 }}>
              <div className="step">Select a client candidate and one of their scraped recruiter posts.</div>
              <div className="step">Confirm the parsed job description, then run the tailoring engine.</div>
              <div className="step">Review keyword coverage and export the DOCX before sending.</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
