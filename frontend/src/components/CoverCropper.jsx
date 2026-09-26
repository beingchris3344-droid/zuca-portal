// frontend/src/components/CoverCropper.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FiX, FiZoomIn, FiZoomOut, FiDroplet, FiMove, FiMaximize2,
} from "react-icons/fi";

/* =========================================================
   CONFIG
   ========================================================= */

const CROP_WIDTH = 500;
const ASPECT = 1;
const OUTPUT_W = 1600;
const OUTPUT_H = 640;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 6;
const DEFAULT_BLUR = 40;
const MIN_BLUR = 0;
const MAX_BLUR = 80;
const DARK_OVERLAY = 0.18;

// Placement controls for the sharp crop inside the banner
const MIN_PLACEMENT_SIZE = 0.3;   // 30% of banner width
const MAX_PLACEMENT_SIZE = 1.2;   // 120% — overflow allowed
const DEFAULT_PLACEMENT_SIZE = 0.7;

export default function CoverCropper({ imageFile, onCropComplete, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blurPx, setBlurPx] = useState(DEFAULT_BLUR);
  const [previewUrl, setPreviewUrl] = useState(null);

  /* Placement state — where the sharp crop sits in the banner */
  const [placement, setPlacement] = useState({ x: 0.5, y: 0.5 }); // 0..1 normalized center
  const [placementSize, setPlacementSize] = useState(DEFAULT_PLACEMENT_SIZE);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const imgRef = useRef(null);
  const previewRef = useRef(null);

  const [previewDragging, setPreviewDragging] = useState(false);
  const previewDragStartRef = useRef({ x: 0, y: 0, px: 0.5, py: 0.5 });

  const cropW = CROP_WIDTH;
  const cropH = Math.round(CROP_WIDTH / ASPECT);

  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { naturalSizeRef.current = naturalSize; }, [naturalSize]);

  /* ---------- Load image ---------- */
  useEffect(() => {
    if (!imageFile) return;

    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      const nat = { w: img.width, h: img.height };
      setNaturalSize(nat);
      naturalSizeRef.current = nat;

      const fitScale = Math.min(cropW / img.width, cropH / img.height);
      setScale(fitScale);
      scaleRef.current = fitScale;

      const centered = {
        x: (cropW - img.width * fitScale) / 2,
        y: (cropH - img.height * fitScale) / 2,
      };
      setOffset(centered);
      offsetRef.current = centered;
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [imageFile, cropW, cropH]);

  /* ---------- Crop box drag ---------- */
  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    };
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const t = e.touches[0];
    setDragging(true);
    dragStartRef.current = {
      x: t.clientX - offsetRef.current.x,
      y: t.clientY - offsetRef.current.y,
    };
  };

  const applyMove = useCallback((clientX, clientY) => {
    const newX = clientX - dragStartRef.current.x;
    const newY = clientY - dragStartRef.current.y;
    const next = { x: newX, y: newY };
    offsetRef.current = next;
    setOffset(next);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (e.touches) {
        const t = e.touches[0];
        applyMove(t.clientX, t.clientY);
      } else {
        applyMove(e.clientX, e.clientY);
      }
    };
    const onEnd = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dragging, applyMove]);

  /* ---------- Preview drag (place the sharp crop) ---------- */
  const handlePreviewDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const t = e.touches ? e.touches[0] : e;
    const rect = previewRef.current.getBoundingClientRect();

    setPreviewDragging(true);
    previewDragStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      px: placement.x,
      py: placement.y,
      rectW: rect.width,
      rectH: rect.height,
    };
  };

  useEffect(() => {
    if (!previewDragging) return;

    const onMove = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const start = previewDragStartRef.current;

      const dx = (t.clientX - start.x) / start.rectW;
      const dy = (t.clientY - start.y) / start.rectH;

      const nx = Math.max(0, Math.min(1, start.px + dx));
      const ny = Math.max(0, Math.min(1, start.py + dy));

      setPlacement({ x: nx, y: ny });
    };
    const onEnd = () => setPreviewDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [previewDragging]);

  /* ---------- Zoom ---------- */
  const applyZoom = (newScale, focusX, focusY) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newScale));
    const pointX = (focusX - offsetRef.current.x) / scaleRef.current;
    const pointY = (focusY - offsetRef.current.y) / scaleRef.current;
    const next = {
      x: focusX - pointX * clamped,
      y: focusY - pointY * clamped,
    };
    setScale(clamped);
    scaleRef.current = clamped;
    setOffset(next);
    offsetRef.current = next;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const focusX = e.clientX - rect.left;
    const focusY = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    applyZoom(scaleRef.current * (1 + delta), focusX, focusY);
  };

  const zoomSlider = (newScale) => {
    applyZoom(newScale, cropW / 2, cropH / 2);
  };

  /* =========================================================
     RENDER BANNER — with user-controlled placement
     ========================================================= */
  const renderBanner = useCallback(
    (forExport = false) => {
      if (!imgRef.current || !naturalSizeRef.current.w) return null;

      const W = forExport ? OUTPUT_W : 480;
      const H = forExport ? OUTPUT_H : Math.round(480 * (OUTPUT_H / OUTPUT_W));

      /* ----- 1. Extract the user's crop ----- */
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d");

      const sourceX = -offsetRef.current.x / scaleRef.current;
      const sourceY = -offsetRef.current.y / scaleRef.current;
      const sourceW = cropW / scaleRef.current;
      const sourceH = cropH / scaleRef.current;

      cropCtx.drawImage(
        imgRef.current,
        sourceX, sourceY, sourceW, sourceH,
        0, 0, cropW, cropH
      );

      /* ----- 2. Compose banner ----- */
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const cropRatio = cropCanvas.width / cropCanvas.height;
      const outputRatio = W / H;

      /* ---- 2a. Blurred background (fills everything) ---- */
      ctx.save();
      if (blurPx > 0) ctx.filter = `blur(${(blurPx * W) / OUTPUT_W}px)`;

      let bgW, bgH, bgX, bgY;
      if (cropRatio > outputRatio) {
        bgH = H * 1.25;
        bgW = bgH * cropRatio;
      } else {
        bgW = W * 1.25;
        bgH = bgW / cropRatio;
      }
      bgX = (W - bgW) / 2;
      bgY = (H - bgH) / 2;

      ctx.drawImage(cropCanvas, bgX, bgY, bgW, bgH);
      ctx.restore();

      /* ---- 2b. Dark overlay ---- */
      ctx.fillStyle = `rgba(0, 0, 0, ${DARK_OVERLAY})`;
      ctx.fillRect(0, 0, W, H);

      /* ---- 2c. Sharp foreground — placed by the user ---- */
      /*
       * placementSize is a fraction of the banner width.
       * placement.x/y are the normalized center position (0..1).
       * The crop is drawn as a square sized to `placementSize * W`.
       */
      const fgSize = W * placementSize;
      const fgX = placement.x * W - fgSize / 2;
      const fgY = placement.y * H - fgSize / 2;

      ctx.drawImage(cropCanvas, fgX, fgY, fgSize, fgSize);

      return canvas;
    },
    [cropW, cropH, blurPx, placement, placementSize]
  );

  /* ---------- Live preview ---------- */
  useEffect(() => {
    if (!imageUrl || !naturalSize.w) return;

    const id = setTimeout(() => {
      const canvas = renderBanner(false);
      if (!canvas) return;
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.7));
    }, 80);

    return () => clearTimeout(id);
  }, [imageUrl, naturalSize, offset, scale, blurPx, placement, placementSize, renderBanner]);

  /* ---------- Export ---------- */
  const handleUpload = async () => {
    if (!imgRef.current || uploading || !naturalSizeRef.current.w) return;
    setUploading(true);

    try {
      const canvas = renderBanner(true);
      if (!canvas) throw new Error("Could not render banner");

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Failed to crop image. Please try again.");
            setUploading(false);
            return;
          }
          const croppedFile = new File([blob], `cover-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          onCropComplete(croppedFile);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Crop error:", err);
      alert("Failed to crop image. Please try again.");
      setUploading(false);
    }
  };

  const resetPlacement = () => {
    setPlacement({ x: 0.5, y: 0.5 });
    setPlacementSize(DEFAULT_PLACEMENT_SIZE);
  };

  if (!imageUrl || !naturalSize.w) return null;

  const zoomPercent = Math.round(
    (scale / Math.min(cropW / naturalSize.w, cropH / naturalSize.h)) * 100
  );
  const blurPercent = Math.round((blurPx / MAX_BLUR) * 100);
  const sizePercent = Math.round(placementSize * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Adjust your cover</h2>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Close"
            disabled={uploading}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* LIVE PREVIEW — draggable to place the sharp crop */}
        <div style={styles.previewSection}>
          <div style={styles.previewLabel}>
            <span style={styles.previewDot} />
            Live preview — drag the image to reposition
          </div>
          <div
            ref={previewRef}
            style={{
              ...styles.previewFrame,
              cursor: previewDragging ? "grabbing" : "grab",
            }}
            onMouseDown={handlePreviewDragStart}
            onTouchStart={handlePreviewDragStart}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Live preview"
                style={styles.previewImg}
                draggable={false}
              />
            )}
            <div style={styles.previewAvatar} />
            <div style={styles.dragHint}>
              <FiMove size={12} />
              Drag to move
            </div>
          </div>
        </div>

        {/* CROP BOX — where the user selects their square region */}
        <div style={styles.cropAreaLabel}>Select the area you want as your cover</div>
        <div
          style={{
            ...styles.cropWrapper,
            width: cropW,
            height: cropH,
            cursor: dragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onWheel={handleWheel}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Cover preview"
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width: naturalSize.w * scale,
              height: naturalSize.h * scale,
              userSelect: "none",
              pointerEvents: "none",
              willChange: "transform",
            }}
          />

          <div style={styles.gridOverlay}>
            <div style={{ ...styles.gridLine, top: "33.33%", left: 0, right: 0, height: 1 }} />
            <div style={{ ...styles.gridLine, top: "66.66%", left: 0, right: 0, height: 1 }} />
            <div style={{ ...styles.gridLine, left: "33.33%", top: 0, bottom: 0, width: 1 }} />
            <div style={{ ...styles.gridLine, left: "66.66%", top: 0, bottom: 0, width: 1 }} />
          </div>

          <div style={{ ...styles.corner, top: 8, left: 8, borderTop: "3px solid #fff", borderLeft: "3px solid #fff" }} />
          <div style={{ ...styles.corner, top: 8, right: 8, borderTop: "3px solid #fff", borderRight: "3px solid #fff" }} />
          <div style={{ ...styles.corner, bottom: 8, left: 8, borderBottom: "3px solid #fff", borderLeft: "3px solid #fff" }} />
          <div style={{ ...styles.corner, bottom: 8, right: 8, borderBottom: "3px solid #fff", borderRight: "3px solid #fff" }} />
        </div>

        {/* CROP ZOOM */}
        <div style={styles.controlRow}>
          <button
            onClick={() => zoomSlider(scale / 1.15)}
            style={styles.controlBtn}
            aria-label="Zoom out"
          >
            <FiZoomOut size={18} />
          </button>

          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.001}
            value={scale}
            onChange={(e) => zoomSlider(parseFloat(e.target.value))}
            style={styles.slider}
          />

          <button
            onClick={() => zoomSlider(scale * 1.15)}
            style={styles.controlBtn}
            aria-label="Zoom in"
          >
            <FiZoomIn size={18} />
          </button>

          <span style={styles.controlValue}>{zoomPercent}%</span>
        </div>

        {/* PLACEMENT SIZE */}
        <div style={styles.controlRow}>
          <span style={styles.controlBtn} aria-label="Size in banner">
            <FiMaximize2 size={16} />
          </span>
          <span style={styles.controlLabel}>Size</span>
          <input
            type="range"
            min={MIN_PLACEMENT_SIZE}
            max={MAX_PLACEMENT_SIZE}
            step={0.01}
            value={placementSize}
            onChange={(e) => setPlacementSize(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <button
            type="button"
            onClick={resetPlacement}
            style={styles.resetBtn}
            title="Reset placement"
          >
            Reset
          </button>
          <span style={styles.controlValue}>{sizePercent}%</span>
        </div>

        {/* BLUR */}
        <div style={styles.controlRow}>
          <span style={styles.controlBtn} aria-label="Blur intensity">
            <FiDroplet size={16} />
          </span>
          <span style={styles.controlLabel}>Blur</span>
          <input
            type="range"
            min={MIN_BLUR}
            max={MAX_BLUR}
            step={1}
            value={blurPx}
            onChange={(e) => setBlurPx(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <button
            type="button"
            onClick={() => setBlurPx(DEFAULT_BLUR)}
            style={styles.resetBtn}
            title="Reset blur"
          >
            Reset
          </button>
          <span style={styles.controlValue}>{blurPercent}%</span>
        </div>

        <p style={styles.hint}>
          Crop your photo · Drag the preview to place it · Adjust size & blur
        </p>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            style={styles.cancelBtn}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            style={{
              ...styles.uploadBtn,
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? (
              <>
                <span style={styles.spinner} />
                Uploading...
              </>
            ) : (
              "Upload Cover"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================
   STYLES
================================================================ */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.78)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 24,
    maxWidth: 620,
    width: "100%",
    maxHeight: "92vh",
    overflowY: "auto",
    boxShadow: "0 25px 60px -20px rgba(0, 0, 0, 0.4)",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },

  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
  },

  /* ---------- Live preview ---------- */
  previewSection: { marginBottom: 18 },

  previewLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  previewDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.15)",
  },

  previewFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: `${OUTPUT_W} / ${OUTPUT_H}`,
    borderRadius: 12,
    overflow: "hidden",
    background: "#0f172a",
    border: "1px solid #e2e8f0",
    touchAction: "none",
    userSelect: "none",
  },

  previewImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    pointerEvents: "none",
  },

  previewAvatar: {
    position: "absolute",
    left: "8%",
    bottom: "-20%",
    width: "16%",
    aspectRatio: "1",
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 0 0 4px #ffffff, 0 6px 16px rgba(0,0,0,0.25)",
    border: "2px solid #22c55e",
    pointerEvents: "none",
  },

  dragHint: {
    position: "absolute",
    right: 8,
    top: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    background: "rgba(0,0,0,0.5)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 600,
    borderRadius: 6,
    backdropFilter: "blur(4px)",
    pointerEvents: "none",
  },

  /* ---------- Crop area ---------- */
  cropAreaLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  cropWrapper: {
    position: "relative",
    margin: "0 auto",
    overflow: "hidden",
    borderRadius: 14,
    background: "#ffffff",
    maxWidth: "100%",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    boxShadow: "0 12px 40px -18px rgba(15, 23, 42, 0.4)",
  },

  gridOverlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },

  gridLine: {
    position: "absolute",
    background: "rgba(15, 23, 42, 0.15)",
  },

  corner: {
    position: "absolute",
    width: 22,
    height: 22,
    pointerEvents: "none",
    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
  },

  /* ---------- Controls ---------- */
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },

  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
    flexShrink: 0,
  },

  controlLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    minWidth: 32,
  },

  controlValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    minWidth: 44,
    textAlign: "right",
  },

  slider: {
    flex: 1,
    accentColor: "#0f172a",
    cursor: "pointer",
  },

  resetBtn: {
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: 8,
    color: "#475569",
    cursor: "pointer",
  },

  hint: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    margin: "16px 0 0",
  },

  /* ---------- Actions ---------- */
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid #f1f5f9",
  },

  cancelBtn: {
    padding: "10px 18px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    cursor: "pointer",
  },

  uploadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 22px",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 6px 14px -6px rgba(15, 23, 42, 0.5)",
  },

  spinner: {
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    display: "inline-block",
  },
};