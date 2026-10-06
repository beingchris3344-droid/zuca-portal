import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

export default function SplitTool() {
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState("extract");   // "extract" | "every"
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState("");       // blank = last page
  const [everyN, setEveryN] = useState(5);

  const process = async ([file]) => {
    const buf = await readAsArrayBuffer(file);
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const total = src.getPageCount();

    // ---------- EXTRACT RANGE ----------
    if (mode === "extract") {
      const from = Math.max(1, Math.min(Number(fromPage) || 1, total));
      const to = Math.max(from, Math.min(Number(toPage) || total, total));

      const out = await PDFDocument.create();
      const indices = [];
      for (let i = from - 1; i < to; i++) indices.push(i);

      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));

      const bytes = await out.save();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return {
        data: bytes,
        filename: `${baseName}-pages-${from}-${to}.pdf`,
        mime: "application/pdf",
      };
    }

    // ---------- SPLIT EVERY N ----------
    const n = Math.max(1, Number(everyN) || 1);
    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^.]+$/, "");

    let chunk = 1;
    for (let start = 0; start < total; start += n) {
      const end = Math.min(start + n, total);
      const part = await PDFDocument.create();

      const indices = [];
      for (let i = start; i < end; i++) indices.push(i);

      const pages = await part.copyPages(src, indices);
      pages.forEach((p) => part.addPage(p));

      const bytes = await part.save();
      zip.file(
        `${baseName}-part-${chunk}-pages-${start + 1}-${end}.pdf`,
        bytes
      );
      chunk++;
    }

    const blob = await zip.generateAsync({ type: "blob" });
    return {
      data: blob,
      filename: `${baseName}-split.zip`,
      mime: "application/zip",
    };
  };

  // Preview: draw a badge on the thumbnail showing what will be extracted
  const previewOverlay = ({ ctx, canvas, totalPages }) => {
    const msg =
      mode === "extract"
        ? `Extract: ${fromPage}–${toPage || totalPages}`
        : `Split every ${everyN}p`;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    const stripH = 22;
    ctx.fillRect(0, 0, canvas.width, stripH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(msg, canvas.width / 2, stripH / 2);
    ctx.restore();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, mode === "extract" ? "pages" : "split")
    : "zuca-split.pdf";

  return (
    <>
      <ToolShell
        title="Split PDF"
        subtitle="Extract pages or split into multiple files"
        accept="application/pdf"
        files={files}
        setFiles={setFiles}
        onProcess={process}
        previewOverlay={previewOverlay}
        outputName={outputName}
        processLabel={mode === "extract" ? "Extract Pages" : "Split & Download ZIP"}
        options={
          <div className="pdf-options pdf-split-options">

            {/* ============ MODE TABS ============ */}
            <div className="pdf-split-tabs">
              <button
                type="button"
                className={mode === "extract" ? "on" : ""}
                onClick={() => setMode("extract")}
              >
                Extract range
              </button>
              <button
                type="button"
                className={mode === "every" ? "on" : ""}
                onClick={() => setMode("every")}
              >
                Split every N pages
              </button>
            </div>

            {/* ============ EXTRACT MODE ============ */}
            {mode === "extract" && (
              <>
                <label className="pdf-split-num">
                  From page
                  <input
                    type="number"
                    min={1}
                    value={fromPage}
                    onChange={(e) => setFromPage(e.target.value)}
                  />
                </label>
                <label className="pdf-split-num">
                  To page
                  <input
                    type="number"
                    min={1}
                    placeholder="Last"
                    value={toPage}
                    onChange={(e) => setToPage(e.target.value)}
                  />
                </label>
                <p className="pdf-split-hint">
                  Leave "To page" blank to extract from the start page to the last page.
                </p>
              </>
            )}

            {/* ============ EVERY-N MODE ============ */}
            {mode === "every" && (
              <>
                <label className="pdf-split-num">
                  Pages per file
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={everyN}
                    onChange={(e) => setEveryN(e.target.value)}
                  />
                </label>
                <p className="pdf-split-hint">
                  A 20-page PDF split every 5 pages → 4 files, packed in a ZIP.
                </p>
              </>
            )}
          </div>
        }
      />

      <style>{`
        /* ============================================================
           SplitTool — mode tabs + number inputs
        ============================================================ */

        .pdf-split-options{
          flex-direction:column;
          align-items:stretch;
          gap:12px;
        }

        /* -------- mode tabs -------- */
        .pdf-split-tabs{
          display:flex;
          gap:4px;
          background:#f1f5f9;
          border-radius:10px;
          padding:3px;
        }
        .pdf-split-tabs button{
          flex:1;
          border:0;
          background:none;
          border-radius:8px;
          padding:9px 12px;
          font-family:inherit;
          font-size:12.5px;
          font-weight:700;
          color:#64748b;
          cursor:pointer;
          transition:all .15s ease;
        }
        .pdf-split-tabs button:hover{
          color:#0f172a;
        }
        .pdf-split-tabs button.on{
          background:#fff;
          color:#0f172a;
          box-shadow:0 1px 3px rgba(15,23,42,.12);
        }

        /* -------- numeric inputs -------- */
        .pdf-split-num{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          font-size:13px;
          font-weight:700;
        }
        .pdf-split-num input[type="number"]{
          width:120px;
          padding:7px 10px;
          border:1px solid #e2e8f0;
          border-radius:8px;
          font-family:inherit;
          font-size:13px;
          background:#fff;
          color:#0f172a;
          text-align:right;
        }
        .pdf-split-num input[type="number"]:focus{
          outline:none;
          border-color:#0f172a;
          box-shadow:0 0 0 3px rgba(15,23,42,.08);
        }
        .pdf-split-num input[type="number"]::-webkit-outer-spin-button,
        .pdf-split-num input[type="number"]::-webkit-inner-spin-button{
          -webkit-appearance:none;
          margin:0;
        }
        .pdf-split-num input[type="number"]{
          -moz-appearance:textfield;
          appearance:textfield;
        }

        /* -------- hint -------- */
        .pdf-split-hint{
          margin:0;
          font-size:11.5px;
          color:#64748b;
          line-height:1.5;
          font-weight:500;
        }

        @media (max-width:520px){
          .pdf-split-num input[type="number"]{
            width:100px;
          }
        }
      `}</style>
    </>
  );
}