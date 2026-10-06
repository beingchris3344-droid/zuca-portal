import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer, readAsDataURL, kindOf } from "../lib/readFile";
import { withSuffix } from "../lib/download";

export default function ImageToPdfTool() {
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState("a4");
  const [margin, setMargin] = useState(24);

  const process = async (items) => {
    const pdf = await PDFDocument.create();

    // Standard page dimensions (in PDF points; 1 pt = 1/72 inch)
    const SIZES = {
      a4:     { w: 595.28, h: 841.89 },   // 210 × 297 mm
      letter: { w: 612,    h: 792 },      // 8.5 × 11 in
      fit:    null,                       // page = image size exactly
    };

    for (const file of items) {
      const kind = kindOf(file);

      if (kind === "image") {
        // 1) Read the image as a data URL, then as raw bytes
        const dataUrl = await readAsDataURL(file);
        const bytes = await (await fetch(dataUrl)).arrayBuffer();

        // 2) Embed it — pdf-lib needs to know JPG vs PNG
        const isPng = file.type === "image/png";
        const img = isPng
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);

        // 3) "fit" mode = page matches image dimensions
        if (pageSize === "fit") {
          const page = pdf.addPage([img.width, img.height]);
          page.drawImage(img, {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
          });
          continue;
        }

        // 4) Standard page size — center the image, keep aspect ratio
        const { w: pw, h: ph } = SIZES[pageSize];
        const maxW = pw - margin * 2;
        const maxH = ph - margin * 2;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;

        const page = pdf.addPage([pw, ph]);
        page.drawImage(img, {
          x: (pw - w) / 2,
          y: (ph - h) / 2,
          width: w,
          height: h,
        });
      } else if (kind === "pdf") {
        // 5) If a PDF is dropped in, append all its pages
        const buf = await readAsArrayBuffer(file);
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await pdf.copyPages(src, src.getPageIndices());
        pages.forEach((p) => pdf.addPage(p));
      }
    }

    return await pdf.save();
  };

  // Output name uses the first input file so it feels personalized
  const outputName = files[0]
    ? withSuffix(files[0].name, "images")
    : "zuca-images.pdf";

  return (
    <ToolShell
      title="Image to PDF"
      subtitle="Turn photos of your assignment into one clean PDF"
      accept="image/*,application/pdf"
      multiple
      files={files}
      setFiles={setFiles}
      onProcess={process}
      outputName={outputName}
      processLabel="Create PDF"
      options={
        <div className="pdf-options">
          <label>
            Page size
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
            >
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="letter">Letter (8.5 × 11 in)</option>
              <option value="fit">Fit to image</option>
            </select>
          </label>

          {pageSize !== "fit" && (
            <label>
              Margin
              <select
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
              >
                <option value={0}>None</option>
                <option value={12}>Small</option>
                <option value={24}>Normal</option>
                <option value={48}>Wide</option>
              </select>
            </label>
          )}
        </div>
      }
    />
  );
}