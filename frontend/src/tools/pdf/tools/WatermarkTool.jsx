import { useState } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

// ---------- font map -----------------------------------------------------
const FONTS = {
  helvetica:  { id: StandardFonts.Helvetica,          css: "Helvetica, Arial, sans-serif",      label: "Helvetica" },
  helveticaBold: { id: StandardFonts.HelveticaBold,   css: "Helvetica, Arial, sans-serif",      label: "Helvetica Bold" },
  times:      { id: StandardFonts.TimesRoman,         css: "'Times New Roman', Times, serif",   label: "Times Roman" },
  timesBold:  { id: StandardFonts.TimesRomanBold,     css: "'Times New Roman', Times, serif",   label: "Times Bold" },
  courier:    { id: StandardFonts.Courier,            css: "'Courier New', monospace",          label: "Courier" },
  courierBold:{ id: StandardFonts.CourierBold,        css: "'Courier New', monospace",          label: "Courier Bold" },
};

// ---------- hex -> rgb(0..1) --------------------------------------------
const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
};

const rgbToCss = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
};

export default function WatermarkTool() {
  const [files, setFiles] = useState([]);
  const [text, setText] = useState("ZUCA");
  const [color, setColor] = useState("#808080");  // any hex
  const [opacity, setOpacity] = useState(30);      // 5 – 100
  const [size, setSize] = useState(60);            // 12 – 200
  const [rotation, setRotation] = useState(-45);   // -180 to 180
  const [position, setPosition] = useState("center"); // center | tile
  const [fontKey, setFontKey] = useState("helveticaBold");
  const [tileGapX, setTileGapX] = useState(300);   // for tile mode
  const [tileGapY, setTileGapY] = useState(220);

  const process = async ([file]) => {
    const buf = await readAsArrayBuffer(file);
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const font = await pdf.embedFont(FONTS[fontKey].id);
    const { r, g, b } = hexToRgb(color);
    const alpha = opacity / 100;
    const angleDeg = rotation;

    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();

      if (position === "tile") {
        for (let y = 40; y < height + tileGapY; y += tileGapY) {
          for (let x = 40; x < width + tileGapX; x += tileGapX) {
            page.drawText(text, {
              x,
              y,
              size,
              font,
              color: rgb(r, g, b),
              opacity: alpha,
              rotate: degrees(angleDeg),
            });
          }
        }
      } else {
        const textWidth = font.widthOfTextAtSize(text, size);
        const x = (width - textWidth) / 2;
        const y = (height - size) / 2;
        page.drawText(text, {
          x,
          y,
          size,
          font,
          color: rgb(r, g, b),
          opacity: alpha,
          rotate: degrees(angleDeg),
        });
      }
    });

    return await pdf.save();
  };

  // Live preview overlay — draws the watermark on the preview canvas
  const previewOverlay = ({ ctx, canvas }) => {
    const alpha = opacity / 100;
    const previewSize = Math.max(8, size * 0.5);
    const angleRad = (rotation * Math.PI) / 180;

    ctx.save();
    ctx.fillStyle = rgbToCss(color, alpha);
    ctx.font = `bold ${previewSize}px ${FONTS[fontKey].css}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (position === "tile") {
      // Scale the tile gaps to the preview size
      const stepX = Math.max(40, tileGapX * 0.5);
      const stepY = Math.max(40, tileGapY * 0.5);
      for (let y = stepY / 2; y < canvas.height + stepY; y += stepY) {
        for (let x = stepX / 2; x < canvas.width + stepX; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angleRad);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angleRad);
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "watermarked")
    : "zuca-watermarked.pdf";

  return (
    <>
      <ToolShell
        title="Watermark"
        subtitle="Stamp text across every page — full control"
        accept="application/pdf"
        files={files}
        setFiles={setFiles}
        onProcess={process}
        previewOverlay={previewOverlay}
        outputName={outputName}
        processLabel="Add Watermark"
        options={
          <div className="pdf-options pdf-wm-options">

            {/* ============ TEXT ============ */}
            <label className="pdf-wm-text">
              Text
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ZUCA"
                maxLength={60}
              />
            </label>

            {/* ============ COLOR ============ */}
            <label className="pdf-wm-color">
              Color
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Pick any color"
              />
              <span className="pdf-wm-hex">{color.toUpperCase()}</span>
            </label>

            {/* ============ FONT ============ */}
            <label>
              Font
              <select value={fontKey} onChange={(e) => setFontKey(e.target.value)}>
                {Object.entries(FONTS).map(([k, f]) => (
                  <option key={k} value={k}>{f.label}</option>
                ))}
              </select>
            </label>

            {/* ============ SIZE SLIDER ============ */}
            <label className="pdf-wm-slider">
              Size
              <input
                type="range"
                min={12}
                max={200}
                step={2}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span className="pdf-wm-val">{size}pt</span>
            </label>

            {/* ============ OPACITY SLIDER ============ */}
            <label className="pdf-wm-slider">
              Opacity
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
              <span className="pdf-wm-val">{opacity}%</span>
            </label>

            {/* ============ ROTATION SLIDER ============ */}
            <label className="pdf-wm-slider">
              Rotation
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
              <span className="pdf-wm-val">{rotation}°</span>
            </label>

            {/* ============ POSITION ============ */}
            <label>
              Position
              <select value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="center">Center</option>
                <option value="tile">Tile (repeat)</option>
              </select>
            </label>

            {/* ============ TILE GAPS (only when tiling) ============ */}
            {position === "tile" && (
              <>
                <label className="pdf-wm-slider">
                  Horizontal gap
                  <input
                    type="range"
                    min={100}
                    max={600}
                    step={10}
                    value={tileGapX}
                    onChange={(e) => setTileGapX(Number(e.target.value))}
                  />
                  <span className="pdf-wm-val">{tileGapX}pt</span>
                </label>

                <label className="pdf-wm-slider">
                  Vertical gap
                  <input
                    type="range"
                    min={80}
                    max={500}
                    step={10}
                    value={tileGapY}
                    onChange={(e) => setTileGapY(Number(e.target.value))}
                  />
                  <span className="pdf-wm-val">{tileGapY}pt</span>
                </label>
              </>
            )}

            {/* ============ QUICK PRESETS ============ */}
            <div className="pdf-wm-presets">
              <span className="pdf-wm-presets-label">Quick presets</span>
              <div className="pdf-wm-presets-row">
                <button
                  type="button"
                  onClick={() => {
                    setText("DRAFT");
                    setColor("#dc2626");
                    setOpacity(35);
                    setSize(80);
                    setRotation(-30);
                    setPosition("center");
                    setFontKey("helveticaBold");
                  }}
                >
                  DRAFT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText("CONFIDENTIAL");
                    setColor("#0f172a");
                    setOpacity(25);
                    setSize(70);
                    setRotation(-45);
                    setPosition("tile");
                    setFontKey("helveticaBold");
                  }}
                >
                  CONFIDENTIAL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText("ZUCA");
                    setColor("#808080");
                    setOpacity(20);
                    setSize(90);
                    setRotation(-45);
                    setPosition("center");
                    setFontKey("helveticaBold");
                  }}
                >
                  ZUCA
                </button>
              </div>
            </div>

          </div>
        }
      />

      <style>{`
        /* ============================================================
           WatermarkTool — full-control watermark editor
        ============================================================ */

        .pdf-wm-options{
          flex-direction:column;
          align-items:stretch;
          gap:12px;
        }

        .pdf-wm-options label{
          display:flex;
          align-items:center;
          gap:10px;
          font-size:13px;
          font-weight:700;
          justify-content:space-between;
        }

        /* -------- text input -------- */
        .pdf-wm-text input[type="text"]{
          flex:1;
          min-width:0;
          padding:7px 10px;
          border:1px solid #e2e8f0;
          border-radius:8px;
          font-family:inherit;
          font-size:13px;
          background:#fff;
          color:#0f172a;
        }
        .pdf-wm-text input[type="text"]:focus{
          outline:none;
          border-color:#0f172a;
          box-shadow:0 0 0 3px rgba(15,23,42,.08);
        }

        /* -------- color picker -------- */
        .pdf-wm-color input[type="color"]{
          width:44px;
          height:32px;
          border:1px solid #e2e8f0;
          border-radius:8px;
          background:#fff;
          cursor:pointer;
          padding:2px;
        }
        .pdf-wm-hex{
          font-family:ui-monospace, 'SF Mono', Menlo, monospace;
          font-size:11.5px;
          color:#64748b;
          font-weight:700;
          min-width:70px;
          text-align:right;
        }

        /* -------- sliders -------- */
        .pdf-wm-slider input[type="range"]{
          flex:1;
          min-width:0;
          height:4px;
          -webkit-appearance:none;
          appearance:none;
          background:#e2e8f0;
          border-radius:4px;
          outline:none;
          cursor:pointer;
        }
        .pdf-wm-slider input[type="range"]::-webkit-slider-thumb{
          -webkit-appearance:none;
          appearance:none;
          width:18px;
          height:18px;
          background:#0f172a;
          border-radius:50%;
          cursor:pointer;
          transition:transform .12s ease;
          border:0;
        }
        .pdf-wm-slider input[type="range"]::-webkit-slider-thumb:hover{
          transform:scale(1.15);
        }
        .pdf-wm-slider input[type="range"]::-moz-range-thumb{
          width:18px;
          height:18px;
          background:#0f172a;
          border-radius:50%;
          cursor:pointer;
          border:0;
        }
        .pdf-wm-val{
          font-family:ui-monospace, 'SF Mono', Menlo, monospace;
          font-size:11.5px;
          color:#0f172a;
          font-weight:800;
          min-width:52px;
          text-align:right;
        }

        /* -------- presets -------- */
        .pdf-wm-presets{
          display:flex;
          flex-direction:column;
          gap:8px;
          padding-top:6px;
          border-top:1px dashed #e2e8f0;
          margin-top:4px;
        }
        .pdf-wm-presets-label{
          font-size:11px;
          font-weight:800;
          letter-spacing:.6px;
          text-transform:uppercase;
          color:#64748b;
        }
        .pdf-wm-presets-row{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }
        .pdf-wm-presets-row button{
          padding:7px 14px;
          border-radius:8px;
          border:1px solid #e2e8f0;
          background:#fff;
          font-family:inherit;
          font-size:12px;
          font-weight:700;
          color:#0f172a;
          cursor:pointer;
          transition:all .15s ease;
        }
        .pdf-wm-presets-row button:hover{
          background:#0f172a;
          color:#fff;
          border-color:#0f172a;
          transform:translateY(-1px);
        }

        /* -------- mobile -------- */
        @media (max-width:520px){
          .pdf-wm-options label{
            font-size:12.5px;
          }
          .pdf-wm-val{
            min-width:44px;
            font-size:11px;
          }
        }
      `}</style>
    </>
  );
}