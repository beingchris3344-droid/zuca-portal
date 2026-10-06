import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

// ---------- numbering helpers -------------------------------------------
const toRoman = (n) => {
  const map = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
    [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) { out += s; n -= v; }
  }
  return out;
};

const toAlpha = (n) => {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(97 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const formatNumber = (n, system) => {
  switch (system) {
    case "roman-lower": return toRoman(n);
    case "roman-upper": return toRoman(n).toUpperCase();
    case "alpha-lower": return toAlpha(n);
    case "alpha-upper": return toAlpha(n).toUpperCase();
    default:            return String(n);
  }
};

// Build the visible label for a given number (used by both process & preview)
const buildLabel = (num, total, system, format) => {
  const numText = formatNumber(num, system);
  const totalText = formatNumber(total, system);
  switch (format) {
    case "page-n":            return `Page ${numText}`;
    case "n-slash-total":     return `${numText} / ${totalText}`;
    case "page-n-of-total":   return `Page ${numText} of ${totalText}`;
    default:                  return numText;
  }
};

export default function PageNumbersTool() {
  const [files, setFiles] = useState([]);
  const [position, setPosition] = useState("bottom-center");
  const [system, setSystem] = useState("arabic");
  const [format, setFormat] = useState("n");
  const [fontSize, setFontSize] = useState(11);
  const [skipFirst, setSkipFirst] = useState(false);
  const [margin, setMargin] = useState(24);

  const process = async ([file]) => {
    const buf = await readAsArrayBuffer(file);
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = pdf.getPages();
    const total = pages.length;

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const color = rgb(0.2, 0.2, 0.2);

    pages.forEach((page, i) => {
      if (skipFirst && i === 0) return;

      const text = buildLabel(i + 1, total, system, format);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      let x, y;
      const [vPos, hPos] = position.split("-");

      if (hPos === "left") x = margin;
      else if (hPos === "right") x = width - margin - textWidth;
      else x = (width - textWidth) / 2;

      if (vPos === "top") y = height - margin - textHeight;
      else y = margin;

      page.drawText(text, { x, y, size: fontSize, font, color });
    });

    return await pdf.save();
  };

  // Draws the number onto the preview canvas so the user sees it live.
  // Called by PdfPreview after the PDF page (or image) renders.
  const previewOverlay = ({ ctx, canvas, totalPages }) => {
    // Preview always shows page 1 of the file (or the image itself)
    const num = 1;
    if (skipFirst) return;   // page 1 skipped → nothing to draw

    const text = buildLabel(num, totalPages || 1, system, format);
    const previewFont = Math.max(8, fontSize * 0.9);

    ctx.save();
    ctx.font = `${previewFont}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#333333";
    ctx.textBaseline = "alphabetic";

    const textWidth = ctx.measureText(text).width;
    const [vPos, hPos] = position.split("-");
    const scaledMargin = Math.max(4, margin * 0.55);

    let x;
    if (hPos === "left") x = scaledMargin;
    else if (hPos === "right") x = canvas.width - scaledMargin - textWidth;
    else x = (canvas.width - textWidth) / 2;

    let y;
    if (vPos === "top") y = scaledMargin + previewFont;
    else y = canvas.height - scaledMargin;

    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "numbered")
    : "zuca-numbered.pdf";

  return (
    <>
      <ToolShell
        title="Page Numbers"
        subtitle="Add page numbers to every page"
        accept="application/pdf"
        files={files}
        setFiles={setFiles}
        onProcess={process}
        previewOverlay={previewOverlay}
        outputName={outputName}
        processLabel="Add Page Numbers"
        options={
          <div className="pdf-options">
            <label>
              Position
              <select value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="top-center">Top center</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
              </select>
            </label>

            <label>
              Number style
              <select value={system} onChange={(e) => setSystem(e.target.value)}>
                <option value="arabic">1, 2, 3 (Arabic)</option>
                <option value="roman-lower">i, ii, iii (roman lower)</option>
                <option value="roman-upper">I, II, III (ROMAN UPPER)</option>
                <option value="alpha-lower">a, b, c (alpha lower)</option>
                <option value="alpha-upper">A, B, C (ALPHA UPPER)</option>
              </select>
            </label>

            <label>
              Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="n">Number only</option>
                <option value="page-n">Page number</option>
                <option value="n-slash-total">Number / Total</option>
                <option value="page-n-of-total">Page X of Y</option>
              </select>
            </label>

            <label>
              Font size
              <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
                <option value={9}>Small (9)</option>
                <option value={11}>Normal (11)</option>
                <option value={14}>Large (14)</option>
                <option value={18}>Extra large (18)</option>
              </select>
            </label>

            <label>
              Margin
              <select value={margin} onChange={(e) => setMargin(Number(e.target.value))}>
                <option value={12}>Small</option>
                <option value={24}>Normal</option>
                <option value={48}>Wide</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={skipFirst}
                onChange={(e) => setSkipFirst(e.target.checked)}
              />
              Skip first page (cover)
            </label>
          </div>
        }
      />

      <style>{`
        /* PageNumbersTool — tool-specific styles */
        .pdf-options label:has(input[type="checkbox"]){
          display:inline-flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          user-select:none;
          font-weight:700;
        }
        .pdf-options input[type="checkbox"]{
          width:16px;
          height:16px;
          accent-color:#0f172a;
          cursor:pointer;
          margin:0;
        }
      `}</style>
    </>
  );
}