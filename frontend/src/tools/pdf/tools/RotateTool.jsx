import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

export default function RotateTool() {
  const [files, setFiles] = useState([]);
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState("all"); // "all" | "first" | "last"

  const process = async ([file]) => {
    const buf = await readAsArrayBuffer(file);
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = pdf.getPages();

    const targets =
      scope === "first" ? [pages[0]] :
      scope === "last"  ? [pages[pages.length - 1]] :
      pages;

    for (const page of targets) {
      if (!page) continue;
      const current = page.getRotation().angle || 0;
      page.setRotation(degrees((current + angle) % 360));
    }

    return await pdf.save();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "rotated")
    : "zuca-rotated.pdf";

  return (
    <ToolShell
      title="Rotate PDF"
      subtitle="Fix sideways scans before you upload"
      accept="application/pdf"
      files={files}
      setFiles={setFiles}
      onProcess={process}
      previewRotate={angle}
      outputName={outputName}
      processLabel="Rotate & Download"
      options={
        <div className="pdf-options">
          <label>
  Rotate by
  <select
    value={angle}
    onChange={(e) => setAngle(Number(e.target.value))}
  >
    <option value={90}>90° clockwise</option>
    <option value={180}>180° (upside down)</option>
    <option value={270}>270° (90° counter-clockwise)</option>
    <option value={360}>360° (full circle)</option>
    <option value={450}>450° (90° + full circle)</option>
    <option value={540}>540° (180° + full circle)</option>
  </select>
</label>

          <label>
            Apply to
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="all">All pages</option>
              <option value="first">First page only</option>
              <option value="last">Last page only</option>
            </select>
          </label>
        </div>
      }
    />
  );
}