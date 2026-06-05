import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Generate and download a beautiful PDF report from the QC alignment results.
 * Runs entirely in the browser — no backend call needed.
 */
export function downloadReportPdf(report) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // ─── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39); // dark navy
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("DocGovernance.ai", margin, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("Document Alignment Report", margin, 24);

  const timestamp = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.text(timestamp, margin, 32);

  if (report.processingTime) {
    doc.text(`Processing time: ${report.processingTime}`, pageWidth - margin, 32, {
      align: "right",
    });
  }

  y = 48;

  // ─── Summary Stats ────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Summary", margin, y);
  y += 8;

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Total Sections", "Clean Sections", "Issues Found"]],
    body: [
      [
        String(report.totalSections ?? 0),
        String(report.cleanSections ?? 0),
        String(report.issuesFound ?? 0),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { halign: "center", fontSize: 11 },
  });

  y = doc.lastAutoTable.finalY + 12;

  // ─── Discrepancies ────────────────────────────────────────────────────────
  const discrepancies = report.discrepancies || [];

  if (discrepancies.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74); // green
    doc.text("✓ No discrepancies found — document is aligned.", margin, y);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Discrepancies", margin, y);
    y += 4;

    discrepancies.forEach((section, sIdx) => {
      // Section header
      y = ensureSpace(doc, y, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(55, 55, 55);
      y += 8;
      const sectionLabel = `#${section.sectionId || sIdx + 1}  ${sanitizeText(section.sectionTitle) || "Untitled Section"}`;
      doc.text(sectionLabel, margin, y);

      // Severity + confidence
      const sevColor = severityColor(section.severity);
      doc.setTextColor(...sevColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const meta = `${section.severity || "Medium"} · ${Math.round((section.confidence || 0) * 100)}% confidence`;
      doc.text(meta, pageWidth - margin, y, { align: "right" });
      y += 4;

      // Table of discrepancies within this section
      const rows = (section.discrepancies || []).map((d) => [
        sanitizeText(d.statementInDocument),
        sanitizeText(d.conflictingReference),
        sanitizeText(d.issueDescription),
        d.isFromImage ? `Yes\n${sanitizeText(d.imageReference)}` : "No",
      ]);

      doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Statement in Document", "Conflicting Reference", "Issue", "Image?"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: sevColor, textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 45 },
          2: { cellWidth: 55 },
          3: { cellWidth: 18, halign: "center" },
        },
        didParseCell: (data) => {
          // Wrap long text
          data.cell.styles.overflow = "linebreak";
        },
      });

      y = doc.lastAutoTable.finalY + 6;

      // Reasoning
      if (section.reasoning) {
        y = ensureSpace(doc, y, 14);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const reasonLines = doc.splitTextToSize(
          `Reasoning: ${sanitizeText(section.reasoning)}`,
          pageWidth - margin * 2
        );
        doc.text(reasonLines, margin, y);
        y += reasonLines.length * 4 + 4;
      }
    });
  }

  // ─── Footer on every page ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${pageCount}  ·  DocGovernance.ai`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // ─── Download ─────────────────────────────────────────────────────────────
  const fileName = `Alignment_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitize text for jsPDF — its built-in Helvetica only supports WinAnsi encoding.
 * Word documents often embed invisible Unicode between visible letters (zero-width
 * joiners, combining marks, variation selectors, RTL/LTR marks, etc.) which jsPDF
 * renders as "&x&y&z" garbled output. Fix: normalize then keep ONLY printable
 * characters that WinAnsi can actually render.
 */
function sanitizeText(text) {
  if (!text) return "";
  return (
    String(text)
      // Normalize to NFKD — decomposes ligatures and combined chars into base + marks
      .normalize("NFKD")
      // Strip ALL combining diacritical marks (U+0300–U+036F) and other combining ranges
      .replace(/[\u0300-\u036F\u0483-\u0489\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, "")
      // Strip zero-width and invisible formatting characters (comprehensive list)
      .replace(/[\u00AD\u034F\u061C\u070F\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF\uFFF9-\uFFFB]/g, "")
      // Strip surrogate pairs (emoji, symbols beyond BMP) that sneak through
      .replace(/[\uD800-\uDFFF]/g, "")
      // Replace smart/curly quotes with ASCII
      .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
      .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
      // Replace dashes
      .replace(/[\u2013\u2012]/g, "-")
      .replace(/[\u2014\u2015]/g, "--")
      // Replace other common Unicode with ASCII equivalents
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
      .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
      .replace(/[\u2190-\u21FF]/g, "->")  // arrows
      .replace(/[\u2713\u2714]/g, "[x]")  // checkmarks
      .replace(/[\u2717\u2718]/g, "[ ]")  // x-marks
      // NUCLEAR: strip ANY remaining character outside printable ASCII (0x20-0x7E)
      // and basic Latin-1 supplement (0xA0-0xFF, but we already handled 0xA0)
      .replace(/[^\x20-\x7E\xA1-\xFF]/g, "")
      // Collapse multiple spaces
      .replace(/ {2,}/g, " ")
      .trim()
  );
}

function severityColor(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return [220, 38, 38]; // red
    case "medium":
      return [234, 88, 12]; // orange
    default:
      return [59, 130, 246]; // blue
  }
}

function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 16) {
    doc.addPage();
    return 16;
  }
  return y;
}
