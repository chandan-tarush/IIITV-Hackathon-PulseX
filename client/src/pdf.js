function escapePdfText(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text, maxLength = 86) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function buildPdfLines(title, body) {
  const lines = [title, ""];
  String(body)
    .split("\n")
    .forEach((line) => {
      if (!line.trim()) {
        lines.push("");
        return;
      }
      wrapLine(line).forEach((wrapped) => lines.push(wrapped));
    });
  return lines;
}

export function downloadPdfDocument({ title, body, filename }) {
  const lines = buildPdfLines(title, body);
  const pageHeight = 792;
  const top = 740;
  const step = 18;
  const pages = [];
  let currentPage = [];
  let y = top;

  lines.forEach((line) => {
    if (y < 70) {
      pages.push(currentPage);
      currentPage = [];
      y = top;
    }
    currentPage.push(`BT /F1 12 Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`);
    y -= step;
  });
  pages.push(currentPage);

  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");

  const kids = [];
  const pageObjectNumbers = [];
  const contentObjectNumbers = [];

  pages.forEach((_, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    contentObjectNumbers.push(contentObjectNumber);
    kids.push(`${pageObjectNumber} 0 R`);
  });

  objects.push(`2 0 obj << /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >> endobj`);

  pages.forEach((commands, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = contentObjectNumbers[index];
    objects.push(
      `${pageObjectNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectNumber} 0 R >> endobj`,
    );
    const stream = commands.join("\n");
    objects.push(`${contentObjectNumber} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  });

  const fontObjectNumber = 3 + pages.length * 2;
  objects.push(`${fontObjectNumber} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
