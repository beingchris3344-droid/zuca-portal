import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

export default function MergeTool() {
  const [files, setFiles] = useState([]);

  // -- reorder helpers -----------------------------------------------------
  const move = (from, to) => {
    if (to < 0 || to >= files.length) return;
    const next = [...files];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setFiles(next);
  };

  const process = async (pdfs) => {
    const out = await PDFDocument.create();

    for (const file of pdfs) {
      const buf = await readAsArrayBuffer(file);
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }

    return await out.save();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "merged")
    : "zuca-merged.pdf";

  return (
    <ToolShell
      title="Merge PDFs"
      subtitle="Combine multiple PDFs into one submission file"
      accept="application/pdf"
      multiple
      files={files}
      setFiles={setFiles}
      onProcess={process}
      outputName={outputName}
      processLabel="Merge PDFs"
      options={
        files.length > 1 && (
          <div className="pdf-options pdf-merge-order">
            <p className="pdf-options-label">
              Merge order — top file appears first in the result
            </p>
            <ol className="pdf-order-list">
              {files.map((f, i) => (
                <li key={i}>
                  <span className="pdf-order-num">{i + 1}</span>
                  <span className="pdf-order-name">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <FiArrowUp />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === files.length - 1}
                    aria-label="Move down"
                  >
                    <FiArrowDown />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )
      }
    />
  );
}