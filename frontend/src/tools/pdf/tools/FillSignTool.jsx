import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

export default function FillSignTool() {
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 560 });

  const baseCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const drawingRef = useRef(false);
  const signatureCanvasRef = useRef(null);
  const [showSignPad, setShowSignPad] = useState(false);

  useEffect(() => {
    setItems([]);
    setSelectedId(null);
  }, [files]);

  // ---------- EFFECT 1: render PDF page once ----------
  useEffect(() => {
    if (!files[0] || !baseCanvasRef.current) return;
    let cancelled = false;

    async function drawBase() {
      const canvas = baseCanvasRef.current;
      const ctx = canvas.getContext("2d");

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const buf = await readAsArrayBuffer(files[0]);
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const maxW = 460;
        const scale = Math.min(maxW / viewport.width, 1);
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = scaled.width;
          overlayCanvasRef.current.height = scaled.height;
        }
        setCanvasSize({ w: scaled.width, h: scaled.height });

        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      } catch (e) {
        console.error("Sign PDF render error:", e);
      }
    }

    drawBase();
    return () => { cancelled = true; };
  }, [files]);

  // ---------- EFFECT 2: draw signatures on overlay ----------
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const item of items) {
      if (!item.dataUrl) continue;
      const img = new Image();
      img.onload = () => {
        if (!items.find((i) => i.id === item.id)) return;
        ctx.drawImage(img, item.x, item.y, item.width, item.height);
      };
      img.src = item.dataUrl;
    }
  }, [items, canvasSize]);

  // ---------- add signature ----------
  const onCanvasPointerDown = (e) => {
    if (e.target.closest(".pdf-fs-item")) return;
    if (!files[0]) return;
    if (dragRef.current || resizeRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const scaleX = overlayCanvasRef.current.width / rect.width;
    const scaleY = overlayCanvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    window.__signClickPos = { x, y };
    setSelectedId(null);
    setShowSignPad(true);
  };

  // ---------- move drag ----------
  const onItemPointerDown = (e, id) => {
    if (e.target.classList.contains("pdf-fs-resize")) return;
    e.stopPropagation();
    setSelectedId(id);

    const item = items.find((i) => i.id === id);
    if (!item) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const scaleX = overlayCanvasRef.current.width / rect.width;
    const scaleY = overlayCanvasRef.current.height / rect.height;

    dragRef.current = {
      id,
      offsetX: (e.clientX - rect.left) * scaleX - item.x,
      offsetY: (e.clientY - rect.top) * scaleY - item.y,
    };
  };

  // ---------- resize drag ----------
  const onResizePointerDown = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const scaleX = overlayCanvasRef.current.width / rect.width;
    const scaleY = overlayCanvasRef.current.height / rect.height;

    resizeRef.current = {
      id,
      startX: (e.clientX - rect.left) * scaleX,
      startY: (e.clientY - rect.top) * scaleY,
      origW: item.width,
      origH: item.height,
      ratio: item.width / item.height,
    };
  };

  // ---------- global pointermove / pointerup for drag + resize ----------
  useEffect(() => {
    const onMove = (e) => {
      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = overlayCanvasRef.current.width / rect.width;
      const scaleY = overlayCanvasRef.current.height / rect.height;

      if (dragRef.current) {
        const x = (e.clientX - rect.left) * scaleX - dragRef.current.offsetX;
        const y = (e.clientY - rect.top) * scaleY - dragRef.current.offsetY;
        setItems((prev) =>
          prev.map((it) =>
            it.id === dragRef.current.id ? { ...it, x, y } : it
          )
        );
        return;
      }

      if (resizeRef.current) {
        const dx = (e.clientX - rect.left) * scaleX - resizeRef.current.startX;
        const newW = Math.max(40, resizeRef.current.origW + dx);
        const newH = newW / resizeRef.current.ratio;
        setItems((prev) =>
          prev.map((it) =>
            it.id === resizeRef.current.id
              ? { ...it, width: newW, height: newH }
              : it
          )
        );
      }
    };
    const onUp = () => {
      if (dragRef.current || resizeRef.current) {
        setTimeout(() => {
          dragRef.current = null;
          resizeRef.current = null;
        }, 50);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // ---------- signature pad (pointer events → works on mouse + touch) ----------
  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  const moveDraw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const endDraw = (e) => {
    drawingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const trimmed = trimCanvas(canvas);
    const dataUrl = trimmed.toDataURL("image/png");
    const pos = window.__signClickPos || { x: 40, y: 40 };

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [
      ...prev,
      {
        id,
        x: pos.x,
        y: pos.y,
        dataUrl,
        width: 160,
        height: 64,
      },
    ]);
    setSelectedId(id);
    setShowSignPad(false);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ---------- slider ----------
  const selected = items.find((i) => i.id === selectedId);
  const onSizeSlider = (val) => {
    if (!selected) return;
    const ratio = selected.width / selected.height;
    const newW = Number(val);
    const newH = newW / ratio;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId ? { ...it, width: newW, height: newH } : it
      )
    );
  };

  // ---------- bake into PDF ----------
  const process = async ([file]) => {
    const buf = await readAsArrayBuffer(file);
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const page = pdf.getPage(0);
    const { width: pw, height: ph } = page.getSize();

    const scale = canvasSize.w / pw;

    for (const item of items) {
      if (!item.dataUrl) continue;
      const bytes = await (await fetch(item.dataUrl)).arrayBuffer();
      const img = await pdf.embedPng(bytes);
      const w = item.width / scale;
      const h = item.height / scale;
      page.drawImage(img, {
        x: item.x / scale,
        y: ph - (item.y / scale) - h,
        width: w,
        height: h,
      });
    }

    return await pdf.save();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "signed")
    : "zuca-signed.pdf";

  return (
    <>
      <ToolShell
        title="Sign PDF"
        subtitle="Draw, place, resize — works with mouse or finger"
        accept="application/pdf"
        files={files}
        setFiles={setFiles}
        onProcess={process}
        showPreview={false}
        outputName={outputName}
        processLabel="Download Signed PDF"
        options={
          <div className="pdf-options pdf-fs-options">
            {files.length > 0 && (
              <div className="pdf-fs-stage">
                <p className="pdf-fs-hint">
                  Tap the page to add a signature. Drag to move, tap to select,
                  then use the slider to resize.
                </p>
                <div className="pdf-fs-canvas-wrap">
                  <canvas
                    ref={baseCanvasRef}
                    className="pdf-fs-canvas pdf-fs-base"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="pdf-fs-canvas pdf-fs-overlay"
                    onPointerDown={onCanvasPointerDown}
                  />
                  {items.map((item) => {
                    const rect = overlayCanvasRef.current?.getBoundingClientRect();
                    const scale = rect && overlayCanvasRef.current
                      ? rect.width / overlayCanvasRef.current.width
                      : 1;
                    const isSelected = item.id === selectedId;
                    return (
                      <div
                        key={item.id}
                        className={`pdf-fs-item ${isSelected ? "selected" : ""}`}
                        style={{
                          left: item.x * scale,
                          top: item.y * scale,
                          width: item.width * scale,
                          height: item.height * scale,
                        }}
                        onPointerDown={(e) => onItemPointerDown(e, item.id)}
                      >
                        <img
                          src={item.dataUrl}
                          alt="signature"
                          className="pdf-fs-item-sig"
                        />
                        {isSelected && (
                          <>
                            <button
                              type="button"
                              className="pdf-fs-item-x"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(item.id);
                              }}
                              aria-label="Remove"
                            >
                              ✕
                            </button>
                            <div
                              className="pdf-fs-resize"
                              onPointerDown={(e) => onResizePointerDown(e, item.id)}
                              title="Drag to resize"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected && (
                  <div className="pdf-fs-size">
                    <label className="pdf-fs-size-label">Signature size</label>
                    <input
                      type="range"
                      min={60}
                      max={500}
                      step={5}
                      value={Math.round(selected.width)}
                      onChange={(e) => onSizeSlider(e.target.value)}
                    />
                    <span className="pdf-fs-size-val">
                      {Math.round(selected.width)}pt
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {showSignPad && (
        <div className="pdf-fs-modal-overlay" onClick={() => setShowSignPad(false)}>
          <div className="pdf-fs-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Draw your signature</h3>
            <canvas
              ref={signatureCanvasRef}
              width={500}
              height={200}
              className="pdf-fs-sig-canvas"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerCancel={endDraw}
              onPointerLeave={endDraw}
            />
            <div className="pdf-fs-modal-actions">
              <button type="button" onClick={clearSignature}>Clear</button>
              <button type="button" onClick={() => setShowSignPad(false)}>Cancel</button>
              <button type="button" className="primary" onClick={saveSignature}>
                Use signature
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pdf-fs-options{
          flex-direction:column;
          align-items:stretch;
          gap:12px;
        }

        .pdf-fs-stage{margin-top:6px;}
        .pdf-fs-hint{
          margin:0 0 10px;
          font-size:12px;
          color:#64748b;
          font-weight:500;
          line-height:1.5;
        }
        .pdf-fs-canvas-wrap{
          position:relative;
          max-width:460px;
          margin:0 auto;
          border:1px solid #e2e8f0;
          border-radius:10px;
          overflow:hidden;
          background:#f8fafc;
          touch-action:none;
        }
        .pdf-fs-canvas{display:block;width:100%;}
        .pdf-fs-base{position:relative;z-index:1;}
        .pdf-fs-overlay{
          position:absolute;
          inset:0;
          z-index:2;
          cursor:crosshair;
          background:transparent;
          touch-action:none;
        }
        .pdf-fs-item{
          position:absolute;
          z-index:3;
          cursor:move;
          outline:1px dashed rgba(15,23,42,.25);
          background:rgba(15,23,42,.02);
          border-radius:4px;
          user-select:none;
          touch-action:none;
        }
        .pdf-fs-item.selected{
          outline:2px solid #0f172a;
          background:rgba(15,23,42,.05);
        }
        .pdf-fs-item-sig{
          display:block;
          width:100%;
          height:100%;
          object-fit:contain;
          pointer-events:none;
          background:transparent;
        }
        .pdf-fs-item-x{
          position:absolute;
          top:-10px;
          right:-10px;
          width:24px;
          height:24px;
          border-radius:50%;
          background:#dc2626;
          color:#fff;
          border:2px solid #fff;
          font-size:12px;
          line-height:1;
          display:grid;
          place-items:center;
          cursor:pointer;
          padding:0;
          z-index:4;
          touch-action:manipulation;
        }
        .pdf-fs-resize{
          position:absolute;
          bottom:-10px;
          right:-10px;
          width:22px;
          height:22px;
          border-radius:50%;
          background:#0f172a;
          border:2px solid #fff;
          cursor:nwse-resize;
          z-index:4;
          box-shadow:0 2px 6px rgba(15,23,42,.3);
          touch-action:none;
        }
        .pdf-fs-resize:hover{
          background:#10b981;
          transform:scale(1.15);
        }

        .pdf-fs-size{
          display:flex;
          align-items:center;
          gap:12px;
          margin-top:16px;
          padding:12px 16px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:10px;
        }
        .pdf-fs-size-label{
          font-size:12px;
          font-weight:800;
          color:#0f172a;
          white-space:nowrap;
        }
        .pdf-fs-size input[type="range"]{
          flex:1;
          height:8px;
          -webkit-appearance:none;
          appearance:none;
          background:#e2e8f0;
          border-radius:4px;
          outline:none;
          cursor:pointer;
          touch-action:manipulation;
        }
        .pdf-fs-size input[type="range"]::-webkit-slider-thumb{
          -webkit-appearance:none;
          appearance:none;
          width:26px;
          height:26px;
          background:#0f172a;
          border-radius:50%;
          cursor:pointer;
          border:3px solid #fff;
          box-shadow:0 2px 8px rgba(15,23,42,.3);
        }
        .pdf-fs-size input[type="range"]::-moz-range-thumb{
          width:26px;
          height:26px;
          background:#0f172a;
          border-radius:50%;
          cursor:pointer;
          border:3px solid #fff;
        }
        .pdf-fs-size-val{
          font-family:ui-monospace, 'SF Mono', Menlo, monospace;
          font-size:12px;
          font-weight:800;
          color:#0f172a;
          min-width:52px;
          text-align:right;
        }

        .pdf-fs-modal-overlay{
          position:fixed;
          inset:0;
          z-index:1000;
          background:rgba(15,23,42,.6);
          display:grid;
          place-items:center;
          padding:16px;
          backdrop-filter:blur(4px);
        }
        .pdf-fs-modal{
          background:#fff;
          border-radius:16px;
          padding:20px;
          max-width:560px;
          width:100%;
          box-shadow:0 20px 40px -20px rgba(15,23,42,.5);
        }
        .pdf-fs-modal h3{
          margin:0 0 14px;
          font-size:16px;
          font-weight:800;
          color:#0f172a;
        }
        .pdf-fs-sig-canvas{
          display:block;
          width:100%;
          height:220px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:10px;
          cursor:crosshair;
          touch-action:none;
        }
        .pdf-fs-modal-actions{
          display:flex;
          gap:8px;
          justify-content:flex-end;
          margin-top:14px;
          flex-wrap:wrap;
        }
        .pdf-fs-modal-actions button{
          padding:10px 18px;
          border-radius:8px;
          border:1px solid #e2e8f0;
          background:#fff;
          font-family:inherit;
          font-size:13px;
          font-weight:700;
          color:#475569;
          cursor:pointer;
          touch-action:manipulation;
        }
        .pdf-fs-modal-actions button:hover{border-color:#0f172a;color:#0f172a;}
        .pdf-fs-modal-actions button.primary{background:#0f172a;color:#fff;border-color:#0f172a;}
        .pdf-fs-modal-actions button.primary:hover{opacity:.92;}

        @media (max-width:520px){
          .pdf-fs-size{
            flex-wrap:wrap;
            gap:8px;
          }
          .pdf-fs-size-label{
            width:100%;
          }
          .pdf-fs-size-val{
            min-width:44px;
            font-size:11px;
          }
          .pdf-fs-modal-actions button{
            flex:1;
            padding:12px 14px;
          }
        }
      `}</style>
    </>
  );
}

// ---------- helpers -----------------------------------------------------
function trimCanvas(source) {
  const { width, height } = source;
  const ctx = source.getContext("2d");
  const pixels = ctx.getImageData(0, 0, width, height).data;

  let top = height, left = width, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  if (right < left || bottom < top) {
    const blank = document.createElement("canvas");
    blank.width = 1;
    blank.height = 1;
    return blank;
  }

  const pad = 6;
  top = Math.max(0, top - pad);
  left = Math.max(0, left - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);

  const w = right - left + 1;
  const h = bottom - top + 1;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d").drawImage(source, left, top, w, h, 0, 0, w, h);
  return out;
}