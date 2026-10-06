import { useEffect, useRef, useState } from "react";
import { FiX, FiArrowUp, FiArrowDown, FiRotateCw } from "react-icons/fi";
import { readAsDataURL, readAsArrayBuffer } from "../lib/readFile";

export default function PdfPreview({
  files,
  rotateAngle = 0,
  onRemove,
  onMove,
  onRotate,
  overlay,
}) {
  if (!files || files.length === 0) return null;

  return (
    <div className="pdf-preview">
      <div className="pdf-preview-label">
        Preview · {files.length} {files.length === 1 ? "file" : "files"}
      </div>
      <div className="pdf-preview-grid">
        {files.map((file, i) => (
          <PreviewCard
            key={`${file.name}-${i}`}
            file={file}
            index={i}
            total={files.length}
            rotateAngle={rotateAngle}
            onRemove={onRemove}
            onMove={onMove}
            onRotate={onRotate}
            overlay={overlay}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewCard({
  file,
  index,
  total,
  rotateAngle,
  onRemove,
  onMove,
  onRotate,
  overlay,
}) {
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);        // 👈 offscreen cached page
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [baseReady, setBaseReady] = useState(false);

  // --------------------------------------------------------------
  // EFFECT 1 — render the raw page ONCE per file into an offscreen canvas
  // --------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBaseReady(false);

    async function renderBase() {
      try {
        const kind =
          file.type === "application/pdf" ? "pdf"
          : file.type.startsWith("image/") ? "image"
          : "unknown";

        // Create the offscreen canvas (kept in a ref)
        const base = document.createElement("canvas");

        // ---------- IMAGE ----------
        if (kind === "image") {
          setIsPdf(false);
          const dataUrl = await readAsDataURL(file);
          if (cancelled) return;
          const img = new Image();
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = dataUrl;
          });
          if (cancelled) return;
          const maxW = 220;
          const scale = Math.min(maxW / img.width, 1);
          base.width = img.width * scale;
          base.height = img.height * scale;
          const bctx = base.getContext("2d");
          bctx.drawImage(img, 0, 0, base.width, base.height);

          baseCanvasRef.current = base;
          setBaseReady(true);
          setLoading(false);
          return;
        }

        // ---------- PDF ----------
        if (kind === "pdf") {
          setIsPdf(true);
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();

          const buf = await readAsArrayBuffer(file);
          if (cancelled) return;
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const page = await pdf.getPage(1);
          if (cancelled) return;

          const viewport = page.getViewport({ scale: 1 });
          const maxW = 220;
          const scale = Math.min(maxW / viewport.width, 1);
          const scaled = page.getViewport({ scale });

          base.width = scaled.width;
          base.height = scaled.height;
          const bctx = base.getContext("2d");
          await page.render({ canvasContext: bctx, viewport: scaled }).promise;

          if (cancelled) return;

          // Stash extra metadata for the overlay
          base._meta = {
            totalPages: pdf.numPages,
            scale,
            isPdf: true,
          };

          baseCanvasRef.current = base;
          setBaseReady(true);
          setLoading(false);
          return;
        }

        setError("Unsupported file");
        setLoading(false);
      } catch (e) {
        console.error("Preview render error:", e);
        if (!cancelled) { setError("Preview failed"); setLoading(false); }
      }
    }

    renderBase();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // --------------------------------------------------------------
  // EFFECT 2 — copy cached page to visible canvas, then run overlay
  // Runs on every overlay change → makes sliders feel instant
  // --------------------------------------------------------------
  useEffect(() => {
    if (!baseReady || !baseCanvasRef.current || !canvasRef.current) return;

    const base = baseCanvasRef.current;
    const canvas = canvasRef.current;

    // Resize visible canvas to match cached page
    canvas.width = base.width;
    canvas.height = base.height;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);

    if (overlay) {
      try {
        overlay({
          ctx,
          canvas,
          pageNumber: 1,
          fileIndex: index + 1,
          totalPages: base._meta?.totalPages || 1,
          totalFiles: total,
          scale: base._meta?.scale || 1,
          isImage: !base._meta?.isPdf,
        });
      } catch (e) {
        console.error("Overlay error:", e);
      }
    }
  }, [overlay, baseReady, index, total]);

  return (
    <div className="pdf-preview-card">
      <div className="pdf-preview-canvas-wrap">
        {loading && <div className="pdf-preview-skeleton" />}
        {error && <div className="pdf-preview-error">{error}</div>}
        <canvas
          ref={canvasRef}
          className="pdf-preview-canvas"
          style={{
            transform: `rotate(${rotateAngle}deg)`,
            transition: "transform .3s ease",
            display: loading || error ? "none" : "block",
          }}
        />
        {isPdf && (
          <span className="pdf-preview-badge">PDF · page 1</span>
        )}
      </div>

      <div className="pdf-preview-name" title={file.name}>
        {file.name}
      </div>

      {(onRemove || onMove || onRotate) && (
        <div className="pdf-preview-actions">
          {onRotate && (
            <button
              type="button"
              onClick={onRotate}
              aria-label="Rotate 90°"
              title="Rotate 90°"
              className="rotate"
            >
              <FiRotateCw />
            </button>
          )}
          {onMove && (
            <>
              <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label="Move up"
              >
                <FiArrowUp />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={index === total - 1}
                aria-label="Move down"
              >
                <FiArrowDown />
              </button>
            </>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label="Remove"
              className="danger"
            >
              <FiX />
            </button>
          )}
        </div>
      )}
    </div>
  );
}