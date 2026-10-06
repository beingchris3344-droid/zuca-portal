import { useState, useRef, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

const FONT_CSS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_SIZE_DEFAULT = 24;

export default function FillSignTool() {
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("text");
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 560 });

  const baseCanvasRef = useRef(null);      // PDF page (rendered once)
  const overlayCanvasRef = useRef(null);   // items (redrawn on every change)
  const dragRef = useRef(null);
  const drawingRef = useRef(false);
  const signatureCanvasRef = useRef(null);
  const [showSignPad, setShowSignPad] = useState(false);

  // Reset items when file changes
  useEffect(() => {
    setItems([]);
  }, [files]);

  // ---------- EFFECT 1: render the PDF page ONCE per file ----------
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

        // Also size the overlay to match
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = scaled.width;
          overlayCanvasRef.current.height = scaled.height;
        }
        setCanvasSize({ w: scaled.width, h: scaled.height });

        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      } catch (e) {
        console.error("Fill & Sign base render error:", e);
      }
    }

    drawBase();
    return () => { cancelled = true; };
  }, [files]);

  // ---------- EFFECT 2: draw items on the overlay canvas ----------
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Clear overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let cancelled = false;

    async function drawItems() {
      for (const item of items) {
        if (cancelled) return;
        if (item.type === "text") {
          ctx.font = `bold ${item.size}px ${FONT_CSS}`;
          ctx.fillStyle = item.color;
          ctx.textBaseline = "top";
          ctx.fillText(item.text || "Click to type", item.x, item.y);
        } else if (item.type === "sign" && item.dataUrl) {
          try {
            const img = await new Promise((resolve, reject) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = reject;
              i.src = item.dataUrl;
            });
            if (cancelled) return;
            ctx.drawImage(img, item.x, item.y, item.width, item.height);
          } catch (e) {
            console.error("Signature draw error:", e);
          }
        }
      }
    }

    drawItems();
    return () => { cancelled = true; };
  }, [items, canvasSize]);

  // ---------- canvas click: add item ----------
  const onCanvasClick = (e) => {
    if (dragRef.current) return;
    if (!files[0]) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    // Convert screen coords → canvas coords (account for CSS size vs actual size)
    const scaleX = overlayCanvasRef.current.width / rect.width;
    const scaleY = overlayCanvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (mode === "text") {
      const id = Date.now();
      setItems((prev) => [
        ...prev,
        {
          id,
          type: "text",
          x,
          y,
          text: "Click to edit",
          size: FONT_SIZE_DEFAULT,
          color: "#0f172a",
        },
      ]);
    } else if (mode === "sign") {
      window.__signClickPos = { x, y };
      setShowSignPad(true);
    }
  };

  // ---------- drag ----------
  const onItemMouseDown = (e, id) => {
    e.stopPropagation();
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

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const rect = overlayCanvasRef.current.getBoundingClientRect();
      const scaleX = overlayCanvasRef.current.width / rect.width;
      const scaleY = overlayCanvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX - dragRef.current.offsetX;
      const y = (e.clientY - rect.top) * scaleY - dragRef.current.offsetY;
      setItems((prev) =>
        prev.map((it) =>
          it.id === dragRef.current.id ? { ...it, x, y } : it
        )
      );
    };
    const onUp = () => {
      if (dragRef.current) {
        setTimeout(() => { dragRef.current = null; }, 50);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ---------- signature pad ----------
  const startDraw = (e) => {
    drawingRef.current = true;
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
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };
  const endDraw = () => { drawingRef.current = false; };
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

    const id = Date.now();
    setItems((prev) => [
      ...prev,
      {
        id,
        type: "sign",
        x: pos.x,
        y: pos.y,
        dataUrl,
        width: 160,
        height: 64,
      },
    ]);
    setShowSignPad(false);
  };

  // ---------- edit / remove ----------
  const editItem = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.type === "text") {
      const next = window.prompt("Edit text:", item.text);
      if (next !== null) {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, text: next } : it))
        );
      }
    }
  };
  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // ---------- bake into PDF ----------
  const process = async ([file]) => {
    const buf = await readAsArrayBuffer(file);
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const page = pdf.getPage(0);
    const { width: pw, height: ph } = page.getSize();

    const helv = await pdf.embedFont(StandardFonts.HelveticaBold);
    const scale = canvasSize.w / pw;

    for (const item of items) {
      if (item.type === "text") {
        const pdfX = item.x / scale;
        const pdfY = ph - (item.y / scale) - (item.size / scale);

        const hex = item.color.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;

        page.drawText(item.text || "", {
          x: pdfX,
          y: pdfY,
          size: item.size / scale,
          font: helv,
          color: rgb(r, g, b),
        });
      } else if (item.type === "sign" && item.dataUrl) {
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
    }

    return await pdf.save();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "signed")
    : "zuca-signed.pdf";

  return (
    <>
      <ToolShell
        title="Fill & Sign"
        subtitle="Add text or a signature, then download"
        accept="application/pdf"
        files={files}
        setFiles={setFiles}
        onProcess={process}
        showPreview={false}
        outputName={outputName}
        processLabel="Download Signed PDF"
        options={
          <div className="pdf-options pdf-fs-options">
            <div className="pdf-fs-toolbar">
              <button
                type="button"
                className={mode === "text" ? "on" : ""}
                onClick={() => setMode("text")}
              >
                + Add text
              </button>
              <button
                type="button"
                className={mode === "sign" ? "on" : ""}
                onClick={() => setMode("sign")}
              >
                ✎ Add signature
              </button>
            </div>

            {files.length > 0 && (
              <div className="pdf-fs-stage">
                <p className="pdf-fs-hint">
                  {mode === "text"
                    ? "Click the page to add text. Drag to move. Double-click to edit."
                    : "Click where the signature should go."}
                </p>
                <div className="pdf-fs-canvas-wrap">
                  {/* PDF page — rendered once */}
                  <canvas
                    ref={baseCanvasRef}
                    className="pdf-fs-canvas pdf-fs-base"
                  />
                  {/* Overlay — items, redrawn on every change */}
                  <canvas
                    ref={overlayCanvasRef}
                    className="pdf-fs-canvas pdf-fs-overlay"
                    onClick={onCanvasClick}
                  />
                  {/* Drag handles */}
                  {items.map((item) => {
                    const rect = overlayCanvasRef.current?.getBoundingClientRect();
                    const scale = rect ? rect.width / overlayCanvasRef.current.width : 1;
                    const w = item.type === "text" ? "auto" : item.width * scale;
                    const h = item.type === "text" ? "auto" : item.height * scale;
                    return (
                      <div
                        key={item.id}
                        className="pdf-fs-item"
                        style={{
                          left: item.x * scale,
                          top: item.y * scale,
                          width: w,
                          height: h,
                        }}
                        onMouseDown={(e) => onItemMouseDown(e, item.id)}
                        onDoubleClick={() => editItem(item.id)}
                      >
                        {item.type === "text" ? (
                          <span
                            className="pdf-fs-item-inner"
                            style={{ fontSize: item.size * scale }}
                          >
                            {item.text}
                          </span>
                        ) : (
                          <img
                            src={item.dataUrl}
                            alt="signature"
                            className="pdf-fs-item-sig"
                          />
                        )}
                        <button
                          type="button"
                          className="pdf-fs-item-x"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          aria-label="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
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
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
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
        .pdf-fs-toolbar{display:flex;gap:6px;}
        .pdf-fs-toolbar button{
          flex:1;
          padding:9px 14px;
          border:1px solid #e2e8f0;
          border-radius:8px;
          background:#fff;
          font-family:inherit;
          font-size:12.5px;
          font-weight:700;
          color:#475569;
          cursor:pointer;
          transition:all .15s ease;
        }
        .pdf-fs-toolbar button:hover{border-color:#0f172a;color:#0f172a;}
        .pdf-fs-toolbar button.on{background:#0f172a;color:#fff;border-color:#0f172a;}

        .pdf-fs-stage{margin-top:6px;}
        .pdf-fs-hint{
          margin:0 0 10px;
          font-size:12px;
          color:#64748b;
          font-weight:500;
        }
        .pdf-fs-canvas-wrap{
          position:relative;
          max-width:460px;
          margin:0 auto;
          border:1px solid #e2e8f0;
          border-radius:10px;
          overflow:hidden;
          background:#f8fafc;
        }
        .pdf-fs-canvas{
          display:block;
          width:100%;
        }
        .pdf-fs-base{position:relative;z-index:1;}
        .pdf-fs-overlay{
          position:absolute;
          inset:0;
          z-index:2;
          cursor:crosshair;
          background:transparent;
        }
        .pdf-fs-item{
          position:absolute;
          z-index:3;
          cursor:move;
          outline:1px dashed rgba(15,23,42,.45);
          background:rgba(15,23,42,.04);
          border-radius:4px;
          user-select:none;
          touch-action:none;
        }
        .pdf-fs-item-inner{
          display:block;
          padding:2px 4px;
          font-weight:bold;
          color:#0f172a;
          white-space:nowrap;
          pointer-events:none;
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
          top:-8px;
          right:-8px;
          width:18px;
          height:18px;
          border-radius:50%;
          background:#dc2626;
          color:#fff;
          border:2px solid #fff;
          font-size:10px;
          line-height:1;
          display:grid;
          place-items:center;
          cursor:pointer;
          padding:0;
          z-index:4;
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
          height:200px;
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
        }
        .pdf-fs-modal-actions button{
          padding:9px 16px;
          border-radius:8px;
          border:1px solid #e2e8f0;
          background:#fff;
          font-family:inherit;
          font-size:13px;
          font-weight:700;
          color:#475569;
          cursor:pointer;
        }
        .pdf-fs-modal-actions button:hover{border-color:#0f172a;color:#0f172a;}
        .pdf-fs-modal-actions button.primary{background:#0f172a;color:#fff;border-color:#0f172a;}
        .pdf-fs-modal-actions button.primary:hover{opacity:.92;}
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