import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";

const BODY_FONT = "Calibri";

function heading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 90 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF", space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: BODY_FONT, color: "111827", characterSpacing: 20 })]
  });
}

function line(text, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 60 },
    children: [
      new TextRun({
        text,
        font: BODY_FONT,
        size: options.size ?? 20,
        bold: options.bold,
        italics: options.italics,
        color: options.color ?? "1F2937"
      })
    ]
  });
}

export async function buildResumeDocx(client, tailored) {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: client.name, bold: true, size: 40, font: BODY_FONT, color: "111827" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: `${client.primaryRole} · ${client.location}`, size: 22, font: BODY_FONT, color: "374151" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: `${client.phone} · ${client.email} · ${client.linkedin}`, size: 19, font: BODY_FONT, color: "4B5563" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Work Authorization: ${client.workAuth} · Availability: ${client.availability} · Relocation: ${client.relocation}`,
          size: 19,
          font: BODY_FONT,
          color: "4B5563"
        })
      ]
    }),
    heading("Professional Summary"),
    line(tailored.summary),
    heading("Technical Skills"),
    ...tailored.skills.map((skill, index) =>
      line(`${String(index + 1).padStart(2, "0")}  ${skill}`, { after: 20 })
    ),
    heading("Project Experience"),
    ...tailored.projects.flatMap((project) => [
      line(project.title, { bold: true, size: 22, after: 20 }),
      line(project.meta, { italics: true, size: 19, color: "6B7280", after: 60 }),
      ...project.bullets.map((bullet) =>
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: bullet, font: BODY_FONT, size: 20, color: "1F2937" })]
        })
      )
    ]),
    heading("Education"),
    line(client.education || "")
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: BODY_FONT } } } },
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}

export function resumeFileName(client, tailored) {
  const stamp = Math.floor(Date.now() / 1000);
  const safe = `${client.name}_Resume_${stamp}.docx`;
  return `${safe.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

export { HeadingLevel };
