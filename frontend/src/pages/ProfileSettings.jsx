// frontend/src/pages/ProfileSettings.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiSave, FiUser, FiMail, FiPhone, FiLock, FiCheckCircle,
  FiAlertCircle, FiCamera, FiTrash2, FiArrowLeft, FiShield,
  FiEye, FiEyeOff, FiGift, FiSliders, FiDroplet, FiZoomIn, FiZoomOut,
} from "react-icons/fi";
import BASE_URL from "../api";

import ProfileImageCropper from "../components/ProfileImageCropper";
import FingerprintRegistration from "../components/FingerprintRegistration";
import { FaFingerprint } from "react-icons/fa";
import BirthdaySettings from "../components/BirthdaySettings";

const guiltMessages = [
  "🎵 You'll miss the beautiful choir hymns...",
  "🙏 Who will pray with us at mass?",
  "🏠 Your Jumuia family will miss you dearly...",
  "💬 The community chat won't be the same without you...",
  "📸 All those gallery memories together...",
  "🎮 Who will challenge us to Bible Trivia now?",
  "⛪ Sunday mass won't feel complete without you...",
];

/* ================================================================
   THEMES
================================================================ */

const THEMES = {
  emerald:  "linear-gradient(135deg, #059669 0%, #0d9488 40%, #7c3aed 100%)",
  sunset:   "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #be185d 100%)",
  ocean:    "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)",
  forest:   "linear-gradient(135deg, #15803d 0%, #166534 50%, #365314 100%)",
  midnight: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
  royal:    "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
  rose:     "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #d946ef 100%)",
  amber:    "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  sky:      "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #2563eb 100%)",
  azure:    "linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #1e40af 100%)",
  ice:      "linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 50%, #0ea5e9 100%)",
  navy:     "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #1e3a8a 100%)",
  mint:     "linear-gradient(135deg, #6ee7b7 0%, #10b981 50%, #047857 100%)",
  lime:     "linear-gradient(135deg, #bef264 0%, #84cc16 50%, #15803d 100%)",
  jade:     "linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #115e59 100%)",
  sage:     "linear-gradient(135deg, #a7f3d0 0%, #4ade80 50%, #065f46 100%)",
  violet:   "linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)",
  lavender: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #7c3aed 100%)",
  fuchsia:  "linear-gradient(135deg, #e879f9 0%, #d946ef 50%, #a21caf 100%)",
  blush:    "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 50%, #ec4899 100%)",
  coral:    "linear-gradient(135deg, #fb923c 0%, #f87171 50%, #e11d48 100%)",
  peach:    "linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #f97316 100%)",
  gold:     "linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%)",
  fire:     "linear-gradient(135deg, #facc15 0%, #f97316 50%, #dc2626 100%)",
  slate:    "linear-gradient(135deg, #64748b 0%, #475569 50%, #1e293b 100%)",
  charcoal: "linear-gradient(135deg, #4b5563 0%, #374151 50%, #111827 100%)",
  stone:    "linear-gradient(135deg, #d6d3d1 0%, #78716c 50%, #292524 100%)",
  ink:      "linear-gradient(135deg, #1f2937 0%, #0f172a 50%, #000000 100%)",
  aurora:   "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #f43f5e 100%)",
  twilight: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)",
  neon:     "linear-gradient(135deg, #06b6d4 0%, #f0abfc 50%, #a3e635 100%)",
  candy:    "linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #60a5fa 100%)",
};

/* ================================================================
   COVER CROPPER CONFIG
================================================================ */

const CROP_WIDTH = 500;
const CROP_ASPECT = 1;
const OUTPUT_W = 1600;
const OUTPUT_H = 640;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 6;
const DEFAULT_BLUR = 40;
const MIN_BLUR = 0;
const MAX_BLUR = 80;
const DARK_OVERLAY = 0.18;
const FEATHER_RATIO = 0.1;

/* ================================================================
   COVER CROPPER COMPONENT
================================================================ */

function CoverCropper({ imageFile, onCropComplete, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blurPx, setBlurPx] = useState(DEFAULT_BLUR);
  const [previewUrl, setPreviewUrl] = useState(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const imgRef = useRef(null);

  const cropW = CROP_WIDTH;
  const cropH = Math.round(CROP_WIDTH / CROP_ASPECT);

  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { naturalSizeRef.current = naturalSize; }, [naturalSize]);

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

  const applyMove = (clientX, clientY) => {
    const newX = clientX - dragStartRef.current.x;
    const newY = clientY - dragStartRef.current.y;
    const next = { x: newX, y: newY };
    offsetRef.current = next;
    setOffset(next);
  };

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
  }, [dragging]);

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

  const renderBanner = (forExport = false) => {
    if (!imgRef.current || !naturalSizeRef.current.w) return null;

    const W = forExport ? OUTPUT_W : 480;
    const H = forExport ? OUTPUT_H : Math.round(480 * (OUTPUT_H / OUTPUT_W));

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

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const cropRatio = cropCanvas.width / cropCanvas.height;
    const outputRatio = W / H;

    /* 2a. Blurred background */
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

    /* 2b. Dark overlay */
    ctx.fillStyle = `rgba(0, 0, 0, ${DARK_OVERLAY})`;
    ctx.fillRect(0, 0, W, H);

    /* 2c. Sharp foreground (fit inside) */
    let fgW, fgH;
    if (cropRatio > outputRatio) {
      fgW = W;
      fgH = W / cropRatio;
    } else {
      fgH = H;
      fgW = H * cropRatio;
    }
    const fgX = (W - fgW) / 2;
    const fgY = (H - fgH) / 2;

    /* 2d. Feather mask */
    const feather = Math.round(W * FEATHER_RATIO);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = fgW;
    maskCanvas.height = fgH;
    const maskCtx = maskCanvas.getContext("2d");

    maskCtx.fillStyle = "#ffffff";
    maskCtx.fillRect(0, 0, fgW, fgH);
    maskCtx.globalCompositeOperation = "destination-out";

    let grad = maskCtx.createLinearGradient(0, 0, feather, 0);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    maskCtx.fillStyle = grad;
    maskCtx.fillRect(0, 0, feather, fgH);

    grad = maskCtx.createLinearGradient(fgW - feather, 0, fgW, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    maskCtx.fillStyle = grad;
    maskCtx.fillRect(fgW - feather, 0, feather, fgH);

    grad = maskCtx.createLinearGradient(0, 0, 0, feather);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    maskCtx.fillStyle = grad;
    maskCtx.fillRect(0, 0, fgW, feather);

    grad = maskCtx.createLinearGradient(0, fgH - feather, 0, fgH);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    maskCtx.fillStyle = grad;
    maskCtx.fillRect(0, fgH - feather, fgW, feather);

    /* 2e. Apply mask */
    const sharpCanvas = document.createElement("canvas");
    sharpCanvas.width = fgW;
    sharpCanvas.height = fgH;
    const sharpCtx = sharpCanvas.getContext("2d");
    sharpCtx.drawImage(cropCanvas, 0, 0, fgW, fgH);
    sharpCtx.globalCompositeOperation = "destination-in";
    sharpCtx.drawImage(maskCanvas, 0, 0);

    /* 2f. Composite */
    ctx.drawImage(sharpCanvas, fgX, fgY);

    return canvas;
  };

  useEffect(() => {
    if (!imageUrl || !naturalSize.w) return;
    const id = setTimeout(() => {
      const canvas = renderBanner(false);
      if (!canvas) return;
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.7));
    }, 80);
    return () => clearTimeout(id);
  }, [imageUrl, naturalSize, offset, scale, blurPx]);

  const handleUpload = () => {
    if (!imgRef.current || uploading) return;
    setUploading(true);
    try {
      const canvas = renderBanner(true);
      if (!canvas) throw new Error("Could not render banner");
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Failed to crop image.");
            setUploading(false);
            return;
          }
          const file = new File([blob], `cover-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          onCropComplete(file);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error(err);
      alert("Failed to crop image.");
      setUploading(false);
    }
  };

  if (!imageUrl || !naturalSize.w) return null;

  const zoomPercent = Math.round(
    (scale / Math.min(cropW / naturalSize.w, cropH / naturalSize.h)) * 100
  );
  const blurPercent = Math.round((blurPx / MAX_BLUR) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={cs.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        style={cs.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={cs.header}>
          <h2 style={cs.title}>Adjust your cover</h2>
          <button onClick={onClose} style={cs.closeBtn} disabled={uploading}>
            ✕
          </button>
        </div>

        <div style={cs.previewSection}>
          <div style={cs.previewLabel}>
            <span style={cs.previewDot} />
            Live preview — how it will appear
          </div>
          <div style={cs.previewFrame}>
            {previewUrl && <img src={previewUrl} alt="preview" style={cs.previewImg} />}
            <div style={cs.previewAvatar} />
          </div>
        </div>

        <div
          style={{
            ...cs.cropWrapper,
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
            }}
          />
          <div style={cs.gridOverlay}>
            <div style={{ ...cs.gridLine, top: "33.33%", left: 0, right: 0, height: 1 }} />
            <div style={{ ...cs.gridLine, top: "66.66%", left: 0, right: 0, height: 1 }} />
            <div style={{ ...cs.gridLine, left: "33.33%", top: 0, bottom: 0, width: 1 }} />
            <div style={{ ...cs.gridLine, left: "66.66%", top: 0, bottom: 0, width: 1 }} />
          </div>
        </div>

        <div style={cs.controlRow}>
          <button onClick={() => zoomSlider(scale / 1.15)} style={cs.controlBtn}>
            <FiZoomOut size={18} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.001}
            value={scale}
            onChange={(e) => zoomSlider(parseFloat(e.target.value))}
            style={cs.slider}
          />
          <button onClick={() => zoomSlider(scale * 1.15)} style={cs.controlBtn}>
            <FiZoomIn size={18} />
          </button>
          <span style={cs.controlValue}>{zoomPercent}%</span>
        </div>

        <div style={cs.controlRow}>
          <span style={cs.controlBtn}>
            <FiDroplet size={16} />
          </span>
          <span style={cs.controlLabel}>Blur</span>
          <input
            type="range"
            min={MIN_BLUR}
            max={MAX_BLUR}
            step={1}
            value={blurPx}
            onChange={(e) => setBlurPx(parseFloat(e.target.value))}
            style={cs.slider}
          />
          <button
            type="button"
            onClick={() => setBlurPx(DEFAULT_BLUR)}
            style={cs.resetBtn}
          >
            Reset
          </button>
          <span style={cs.controlValue}>{blurPercent}%</span>
        </div>

        <p style={cs.hint}>Drag anywhere · Zoom in or out · Adjust blur</p>

        <div style={cs.actions}>
          <button onClick={onClose} style={cs.cancelBtn} disabled={uploading}>
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              ...cs.uploadBtn,
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? (
              <>
                <span style={cs.spinner} />
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

const cs = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.78)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 1300,
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
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
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
    fontSize: 14,
  },
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
  },
  previewImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
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
    boxShadow: "0 12px 40px -18px rgba(15, 23, 42, 0.4)",
  },
  gridOverlay: { position: "absolute", inset: 0, pointerEvents: "none" },
  gridLine: { position: "absolute", background: "rgba(15, 23, 42, 0.15)" },
  controlRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 14 },
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
  controlLabel: { fontSize: 12, fontWeight: 700, color: "#475569", minWidth: 32 },
  controlValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    minWidth: 44,
    textAlign: "right",
  },
  slider: { flex: 1, accentColor: "#0f172a", cursor: "pointer" },
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

/* ================================================================
   16:9 PROFILE IMAGE
================================================================ */

const createProfileImage16x9 = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const WIDTH = 1920;
        const HEIGHT = 1080;
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not create image canvas."));
          return;
        }

        const drawCover = (context, image, x, y, width, height) => {
          const imageRatio = image.width / image.height;
          const targetRatio = width / height;
          let sourceWidth, sourceHeight, sourceX, sourceY;
          if (imageRatio > targetRatio) {
            sourceHeight = image.height;
            sourceWidth = image.height * targetRatio;
            sourceX = (image.width - sourceWidth) / 2;
            sourceY = 0;
          } else {
            sourceWidth = image.width;
            sourceHeight = image.width / targetRatio;
            sourceX = 0;
            sourceY = (image.height - sourceHeight) / 2;
          }
          context.drawImage(
            image, sourceX, sourceY, sourceWidth, sourceHeight,
            x, y, width, height
          );
        };

        ctx.save();
        ctx.filter = "blur(35px)";
        drawCover(ctx, img, -60, -60, WIDTH + 120, HEIGHT + 120);
        ctx.restore();

        ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const originalRatio = img.width / img.height;
        const canvasRatio = WIDTH / HEIGHT;
        let foregroundWidth, foregroundHeight;
        if (originalRatio > canvasRatio) {
          foregroundWidth = WIDTH;
          foregroundHeight = WIDTH / originalRatio;
        } else {
          foregroundHeight = HEIGHT;
          foregroundWidth = HEIGHT * originalRatio;
        }
        const foregroundX = (WIDTH - foregroundWidth) / 2;
        const foregroundY = (HEIGHT - foregroundHeight) / 2;

        ctx.drawImage(img, foregroundX, foregroundY, foregroundWidth, foregroundHeight);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Could not process the image."));
              return;
            }
            const processedFile = new File(
              [blob],
              `profile-${Date.now()}.jpg`,
              { type: "image/jpeg", lastModified: Date.now() }
            );
            resolve(processedFile);
          },
          "image/jpeg",
          0.92
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    img.src = objectUrl;
  });
};

function ProfileSettings({ user, onUserUpdate }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("general");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [deleting, setDeleting] = useState(false);

  const [fingerprintUpdated, setFingerprintUpdated] = useState(false);

  /* COVER + THEME */
  const [coverImage, setCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [pendingCoverFile, setPendingCoverFile] = useState(null);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [theme, setTheme] = useState("emerald");
  const [showThemePicker, setShowThemePicker] = useState(false);

  const coverInputRef = useRef(null);

  /* LOAD USER DATA */
  useEffect(() => {
    if (!user) return;

    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    const imageUrl = user.profileImage?.startsWith("http")
      ? user.profileImage
      : user.profileImage
      ? `${BASE_URL}/${user.profileImage}`
      : null;

    setProfileImage(imageUrl);

    const coverUrl = user.coverImage?.startsWith("http")
      ? user.coverImage
      : user.coverImage
      ? `${BASE_URL}/${user.coverImage}`
      : null;

    setCoverImage(coverUrl);

    const savedTheme =
      user.profileTheme || localStorage.getItem("profileTheme") || "emerald";
    setTheme(savedTheme);
  }, [user]);

  /* DELETE COUNTDOWN */
  useEffect(() => {
    let timer;
    if (deleteStep === 3 && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((count) => count - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [deleteStep, deleteCountdown]);

  /* CLOSE THEME PICKER */
  useEffect(() => {
    if (!showThemePicker) return;
    const handler = (e) => {
      const picker = e.target.closest("[data-theme-picker]");
      const trigger = e.target.closest("[data-theme-trigger]");
      if (!picker && !trigger) setShowThemePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showThemePicker]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10MB or smaller.");
      return;
    }
    setError("");
    setSuccess("");
    setSelectedImageFile(file);
    setShowCropper(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (croppedFile) => {
    if (!croppedFile || !user) return;
    try {
      setError("");
      setSuccess("");
      setUploadingImage(true);
      const processedFile = await createProfileImage16x9(croppedFile);
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("profile", processedFile);

      const res = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-profile`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updated = res.data.user;
      const img = updated.profileImage?.startsWith("http")
        ? updated.profileImage
        : updated.profileImage
        ? `${BASE_URL}/${updated.profileImage}`
        : null;

      setProfileImage(img);
      localStorage.setItem("user", JSON.stringify(updated));
      if (onUserUpdate) onUserUpdate(updated);

      setSelectedImageFile(null);
      setShowCropper(false);
      setSuccess("Profile picture updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Profile image upload error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to upload image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove your profile picture?")) return;
    try {
      setError("");
      setSuccess("");
      const token = localStorage.getItem("token");
      await axios.delete(
        `${BASE_URL}/api/users/${user.id}/delete-profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfileImage(null);
      const updated = { ...user, profileImage: null };
      localStorage.setItem("user", JSON.stringify(updated));
      if (onUserUpdate) onUserUpdate(updated);
      setSuccess("Profile picture removed.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Remove profile image error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to remove image."
      );
    }
  };

  /* COVER — open cropper */
  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Cover image must be 10MB or smaller.");
      return;
    }
    setError("");
    setSuccess("");
    setPendingCoverFile(file);
    setShowCoverCropper(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  /* COVER — receive cropped file and upload */
  const handleCoverUpload = async (croppedFile) => {
    if (!croppedFile || !user) return;
    try {
      setError("");
      setSuccess("");
      setUploadingCover(true);

      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("cover", croppedFile);

      const res = await axios.post(
        `${BASE_URL}/api/users/${user.id}/upload-cover`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updated = res.data.user;
      const url = updated.coverImage?.startsWith("http")
        ? updated.coverImage
        : updated.coverImage
        ? `${BASE_URL}/${updated.coverImage}`
        : null;

      setCoverImage(url);
      localStorage.setItem("user", JSON.stringify(updated));
      if (onUserUpdate) onUserUpdate(updated);

      setShowCoverCropper(false);
      setPendingCoverFile(null);
      setSuccess("Cover photo updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Cover upload error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to upload cover."
      );
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!window.confirm("Remove your cover photo?")) return;

    try {
      setError("");
      setSuccess("");
      const token = localStorage.getItem("token");

      await axios.delete(
        `${BASE_URL}/api/users/${user.id}/delete-cover`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCoverImage(null);
      const updated = { ...user, coverImage: null };
      localStorage.setItem("user", JSON.stringify(updated));
      if (onUserUpdate) onUserUpdate(updated);

      setSuccess("Cover photo removed.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Remove cover error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to remove cover."
      );
    }
  };

  const handleThemeChange = async (themeId) => {
    setTheme(themeId);
    localStorage.setItem("profileTheme", themeId);

    const updated = { ...user, profileTheme: themeId };
    localStorage.setItem("user", JSON.stringify(updated));
    if (onUserUpdate) onUserUpdate(updated);

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BASE_URL}/api/users/profile-theme`,
        { theme: themeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.warn("Theme save to backend failed (kept locally):", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (showPasswordFields) {
      if (!formData.currentPassword) {
        setError("Current password is required.");
        return;
      }
      if (formData.newPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const data = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      };
      if (showPasswordFields) {
        data.currentPassword = formData.currentPassword;
        data.newPassword = formData.newPassword;
      }

      const res = await axios.put(`${BASE_URL}/api/users/profile`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.setItem("user", JSON.stringify(res.data.user));
      if (onUserUpdate) onUserUpdate(res.data.user);

      setSuccess("Profile updated!");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setShowPasswordFields(false);
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Profile update error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Update failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteCountdown > 0 || deleting) return;
    setDeleting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/delete-my-account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword, reason: deleteReason },
      });
      localStorage.clear();
      window.location.href = "/login?deleted=true";
    } catch (err) {
      console.error("Delete account error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Delete failed."
      );
      setDeleting(false);
      setDeleteStep(0);
      setShowDeleteConfirm(false);
      setDeleteCountdown(5);
    }
  };

  const handleFingerprintRegistered = () => {
    setFingerprintUpdated((prev) => !prev);
    setSuccess("✅ Fingerprint settings updated!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const resetDeleteFlow = () => {
    setShowDeleteConfirm(false);
    setDeleteStep(0);
    setDeleteReason("");
    setDeleteConfirmText("");
    setDeletePassword("");
    setDeleteCountdown(5);
    setDeleting(false);
  };

  const initials =
    (user?.fullName || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const tabs = [
    { id: "general", label: "General", icon: <FiUser size={14} /> },
    { id: "security", label: "Security", icon: <FiShield size={14} /> },
    { id: "birthday", label: "Birthday", icon: <FiGift size={14} /> },
    { id: "advanced", label: "Advanced", icon: <FiSliders size={14} /> },
  ];

  return (
    <div style={s.page}>
      {/* HERO */}
      <div style={s.hero}>
        {coverImage ? (
          <>
            <img src={coverImage} alt="Cover" style={s.heroCoverImage} />
            <div style={s.heroCoverOverlay} />
          </>
        ) : (
          <div
            style={{
              ...s.heroGradient,
              background: THEMES[theme] || THEMES.emerald,
            }}
          />
        )}

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={s.heroBackBtn}
          aria-label="Go back"
        >
          <FiArrowLeft size={18} />
        </button>

        <div style={s.heroCoverControls}>
          <label
            style={{
              ...s.heroControlBtn,
              opacity: uploadingCover ? 0.6 : 1,
              cursor: uploadingCover ? "not-allowed" : "pointer",
            }}
            title="Upload cover photo"
          >
            {uploadingCover ? (
              <span style={s.heroControlSpinner} />
            ) : (
              <FiCamera size={14} />
            )}
            <span>Cover</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              hidden
              ref={coverInputRef}
              onChange={handleCoverSelect}
              disabled={uploadingCover}
            />
          </label>

          <button
            type="button"
            data-theme-trigger
            onClick={() => setShowThemePicker((v) => !v)}
            style={s.heroControlBtn}
            title="Choose theme"
          >
            <FiSliders size={14} />
            <span>Theme</span>
          </button>

          {coverImage && (
            <button
              type="button"
              onClick={handleRemoveCover}
              style={s.heroControlBtn}
              title="Remove cover"
            >
              <FiTrash2 size={14} />
              <span>Remove</span>
            </button>
          )}
        </div>

        {/* THEME PICKER */}
        <AnimatePresence>
          {showThemePicker && (
            <motion.div
              data-theme-picker
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={s.themePicker}
            >
              <div style={s.themePickerHeader}>
                <span>Choose a banner theme</span>
                <button
                  type="button"
                  onClick={() => setShowThemePicker(false)}
                  style={s.themePickerClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div style={s.themeGrid}>
                {Object.entries(THEMES).map(([id, gradient]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      handleThemeChange(id);
                      setShowThemePicker(false);
                    }}
                    style={{
                      ...s.themeSwatch,
                      background: gradient,
                      outline: theme === id ? "3px solid #ffffff" : "none",
                      boxShadow:
                        theme === id
                          ? "0 0 0 2px #0f172a, 0 6px 16px -6px rgba(0,0,0,0.5)"
                          : "0 2px 6px -3px rgba(0,0,0,0.3)",
                    }}
                    title={id}
                  >
                    {theme === id && <span style={s.themeSwatchCheck}>✓</span>}
                  </button>
                ))}
              </div>
              <p style={s.themePickerHint}>
                Upload a cover photo to override the theme.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={s.heroContent}>
          <div style={s.heroAvatarWrap}>
            <div
              style={s.heroAvatar}
              onClick={() => profileImage && setShowFullImage(true)}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user?.fullName}
                  style={s.heroAvatarImg}
                />
              ) : (
                <div style={s.heroAvatarFallback}>{initials}</div>
              )}
            </div>

            <label
              style={{
                ...s.heroCameraBtn,
                opacity: uploadingImage ? 0.6 : 1,
                cursor: uploadingImage ? "not-allowed" : "pointer",
              }}
              title="Change profile photo"
            >
              {uploadingImage ? (
                <span style={s.cameraSpinner} />
              ) : (
                <FiCamera size={16} />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                hidden
                ref={fileInputRef}
                onChange={handleImageSelect}
                disabled={uploadingImage}
              />
            </label>
          </div>

          <div style={s.heroIdentity}>
            <h1 style={s.heroName}>{user?.fullName || "Your Name"}</h1>
            <p style={s.heroEmail}>{user?.email}</p>

            <div style={s.heroMeta}>
              <span style={s.roleBadge}>{user?.role || "Member"}</span>
              {user?.phone && (
                <span style={s.metaChip}>
                  <FiPhone size={12} /> {user.phone}
                </span>
              )}
              {user?.homeJumuia?.name && (
                <span style={s.metaChip}>🏠 {user.homeJumuia.name}</span>
              )}
            </div>
          </div>

          {profileImage && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              style={s.heroRemoveBtn}
              disabled={uploadingImage}
              title="Remove profile photo"
            >
              <FiTrash2 size={14} />
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={s.tabsWrap}>
        <div style={s.tabs}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={activeTab === t.id ? s.tabActive : s.tab}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={s.body}>
        <div style={s.content}>
          {error && (
            <div style={s.errorMsg}>
              <FiAlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={s.successMsg}>
              <FiCheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Section
                    title="Basic Information"
                    description="Your name and contact details. Visible to your Jumuia members."
                    icon={<FiUser size={16} />}
                  >
                    <Field icon={<FiUser size={14} />} label="Full Name">
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        style={s.input}
                        autoComplete="name"
                        placeholder="e.g. Jane Wanjiku"
                      />
                    </Field>

                    <Field icon={<FiMail size={14} />} label="Email Address">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        style={s.input}
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </Field>

                    <Field icon={<FiPhone size={14} />} label="Phone Number">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        style={s.input}
                        autoComplete="tel"
                        placeholder="+254 ..."
                      />
                    </Field>
                  </Section>

                  <Actions
                    onCancel={() => navigate(-1)}
                    loading={loading}
                    label="Save Changes"
                  />
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Section
                    title="Password"
                    description="Change your password. You'll need your current one to confirm."
                    icon={<FiLock size={16} />}
                  >
                    <Field icon={<FiShield size={14} />} label="Current Password">
                      <PasswordInput
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        show={showCurrentPassword}
                        onToggle={() => setShowCurrentPassword((p) => !p)}
                        placeholder="Enter current password"
                      />
                    </Field>

                    <Field icon={<FiLock size={14} />} label="New Password">
                      <PasswordInput
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        show={showNewPassword}
                        onToggle={() => setShowNewPassword((p) => !p)}
                        placeholder="Min. 6 characters"
                      />
                    </Field>

                    <Field icon={<FiCheckCircle size={14} />} label="Confirm Password">
                      <PasswordInput
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        show={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword((p) => !p)}
                        placeholder="Re-enter new password"
                      />
                    </Field>
                  </Section>

                  <Section
                    title="Fingerprint Login"
                    description="Sign in with your fingerprint instead of typing your password."
                    icon={<FaFingerprint size={16} />}
                    accent="#7c3aed"
                  >
                    <FingerprintRegistration
                      key={fingerprintUpdated}
                      onRegistered={handleFingerprintRegistered}
                    />
                  </Section>

                  <Actions
                    onCancel={() => navigate(-1)}
                    loading={loading}
                    label="Save Changes"
                  />
                </motion.div>
              )}

              {activeTab === "birthday" && (
                <motion.div
                  key="birthday"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Section
                    title="Birthday & Celebration"
                    description="We'll send you a little celebration on your special day."
                    icon={<FiGift size={16} />}
                    accent="#ec4899"
                  >
                    <BirthdaySettings user={user} onUpdate={onUserUpdate} />
                  </Section>
                </motion.div>
              )}

              {activeTab === "advanced" && (
                <motion.div
                  key="advanced"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Section
                    title="Danger Zone"
                    description="Irreversible actions. Please be certain."
                    icon={<FiTrash2 size={16} />}
                    accent="#dc2626"
                  >
                    {!showDeleteConfirm ? (
                      <div style={dz.box}>
                        <p style={dz.warning}>
                          <strong>Delete your account permanently.</strong>{" "}
                          This removes all data — attendance, contributions,
                          messages, memberships. Cannot be undone.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          style={dz.initialBtn}
                        >
                          <FiTrash2 size={14} />
                          Delete My Account
                        </button>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        style={dz.confirmBox}
                      >
                        {deleteStep === 0 && (
                          <>
                            <p style={dz.confirmTitle}>
                              😢 Are you absolutely sure?
                            </p>
                            <div style={dz.lossBox}>
                              <p style={dz.lossTitle}>
                                You will permanently lose:
                              </p>
                              <ul style={dz.lossList}>
                                <li>📊 All attendance records</li>
                                <li>💰 Contribution history</li>
                                <li>🏠 Jumuia membership</li>
                                <li>💬 All messages</li>
                                <li>👑 Executive positions</li>
                                <li>📸 Uploaded media</li>
                              </ul>
                            </div>
                            <p style={dz.guiltText}>
                              "
                              {
                                guiltMessages[
                                  Math.floor(Math.random() * guiltMessages.length)
                                ]
                              }
                              "
                            </p>
                            <div style={dz.btnRow}>
                              <button
                                type="button"
                                onClick={resetDeleteFlow}
                                style={dz.cancelBtn}
                              >
                                Never mind, I'll stay 🙏
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteStep(1)}
                                style={dz.continueBtn}
                              >
                                I understand, continue
                              </button>
                            </div>
                          </>
                        )}

                        {deleteStep === 1 && (
                          <>
                            <p style={dz.confirmTitle}>
                              📝 Why are you leaving?
                            </p>
                            <select
                              value={deleteReason}
                              onChange={(e) => setDeleteReason(e.target.value)}
                              style={dz.select}
                            >
                              <option value="">Select a reason...</option>
                              <option value="graduated">
                                🎓 Graduated / Completed studies
                              </option>
                              <option value="transferred">
                                🏫 Transferred to another school
                              </option>
                              <option value="inactive">
                                😴 No longer active in ZUCA
                              </option>
                              <option value="privacy">🔒 Privacy concerns</option>
                              <option value="other">💬 Other</option>
                            </select>
                            <div style={dz.btnRow}>
                              <button
                                type="button"
                                onClick={() => setDeleteStep(0)}
                                style={dz.cancelBtn}
                              >
                                ← Back
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteStep(2)}
                                style={dz.continueBtn}
                              >
                                Continue
                              </button>
                            </div>
                          </>
                        )}

                        {deleteStep === 2 && (
                          <>
                            <p style={dz.confirmTitle}>
                              ⚠️ Final Confirmation
                            </p>
                            <p style={dz.typeLabel}>
                              Type{" "}
                              <span style={dz.typeHighlight}>
                                DELETE MY ACCOUNT
                              </span>{" "}
                              to confirm:
                            </p>
                            <input
                              type="text"
                              value={deleteConfirmText}
                              onChange={(e) =>
                                setDeleteConfirmText(e.target.value)
                              }
                              placeholder="DELETE MY ACCOUNT"
                              style={dz.confirmInput}
                              autoComplete="off"
                            />
                            <p style={{ ...dz.typeLabel, marginTop: 12 }}>
                              Enter your password:
                            </p>
                            <input
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Your password"
                              style={dz.confirmInput}
                              autoComplete="current-password"
                            />
                            <div style={dz.btnRow}>
                              <button
                                type="button"
                                onClick={() => setDeleteStep(1)}
                                style={dz.cancelBtn}
                              >
                                ← Back
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteStep(3)}
                                disabled={
                                  deleteConfirmText !== "DELETE MY ACCOUNT" ||
                                  !deletePassword
                                }
                                style={{
                                  ...dz.continueBtn,
                                  background: "#dc2626",
                                  opacity:
                                    deleteConfirmText === "DELETE MY ACCOUNT" &&
                                    deletePassword
                                      ? 1
                                      : 0.5,
                                  cursor:
                                    deleteConfirmText === "DELETE MY ACCOUNT" &&
                                    deletePassword
                                      ? "pointer"
                                      : "not-allowed",
                                }}
                              >
                                Delete My Account
                              </button>
                            </div>
                          </>
                        )}

                        {deleteStep === 3 && (
                          <div style={{ textAlign: "center" }}>
                            <p
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#dc2626",
                                marginBottom: 8,
                              }}
                            >
                              😭 This is really happening...
                            </p>
                            <p style={{ color: "#64748b", marginBottom: 16 }}>
                              Deleting in {deleteCountdown}s...
                            </p>
                            <button
                              type="button"
                              onClick={handleDeleteAccount}
                              disabled={deleteCountdown > 0 || deleting}
                              style={{
                                padding: "12px 28px",
                                background:
                                  deleteCountdown > 0 ? "#94a3b8" : "#dc2626",
                                color: "white",
                                border: "none",
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor:
                                  deleteCountdown > 0
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {deleteCountdown > 0
                                ? `Wait ${deleteCountdown}s...`
                                : deleting
                                ? "Deleting..."
                                : "💔 Yes, Delete Forever"}
                            </button>
                            <button
                              type="button"
                              onClick={resetDeleteFlow}
                              style={{
                                display: "block",
                                margin: "12px auto 0",
                                background: "none",
                                border: "none",
                                color: "#64748b",
                                cursor: "pointer",
                                fontSize: 13,
                                textDecoration: "underline",
                              }}
                            >
                              I changed my mind! Keep my account 🙏
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      {/* FULL IMAGE */}
      <AnimatePresence>
        {showFullImage && profileImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={s.fullImgOverlay}
            onClick={() => setShowFullImage(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              style={s.fullImgContent}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={profileImage} alt="Profile" style={s.fullImg} />
              <button
                type="button"
                style={s.fullImgClose}
                onClick={() => setShowFullImage(false)}
                aria-label="Close image"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFILE CROPPER */}
      <AnimatePresence>
        {showCropper && selectedImageFile && (
          <ProfileImageCropper
            imageFile={selectedImageFile}
            onCropComplete={(croppedFile) => handleImageUpload(croppedFile)}
            onClose={() => {
              if (!uploadingImage) {
                setShowCropper(false);
                setSelectedImageFile(null);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* COVER CROPPER */}
      <AnimatePresence>
        {showCoverCropper && pendingCoverFile && (
          <CoverCropper
            imageFile={pendingCoverFile}
            onCropComplete={handleCoverUpload}
            onClose={() => {
              if (!uploadingCover) {
                setShowCoverCropper(false);
                setPendingCoverFile(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
================================================================ */

function Section({ title, description, icon, accent = "#3b82f6", children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <div
          style={{
            ...s.sectionIconWrap,
            background: `${accent}15`,
            color: accent,
          }}
        >
          {icon}
        </div>
        <div style={s.sectionHeaderText}>
          <h3 style={s.sectionTitle}>{title}</h3>
          {description && <p style={s.sectionDesc}>{description}</p>}
        </div>
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ icon, label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({ name, value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={s.pwWrapper}>
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        style={s.pwInput}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={onToggle}
        style={s.eyeBtn}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
      </button>
    </div>
  );
}

function Actions({ onCancel, loading, label }) {
  return (
    <div style={s.actions}>
      <button type="button" onClick={onCancel} style={s.cancelBtn}>
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        style={{
          ...s.saveBtn,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? <span style={s.spinner} /> : <FiSave size={16} />}
        {loading ? "Saving..." : label}
      </button>
    </div>
  );
}

/* ================================================================
   STYLES
================================================================ */

const s = {
  page: {
    width: "100%",
    minHeight: "100%",
    background: "#f8fafc",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 40,
  },

  hero: {
    position: "relative",
    background: "#0f172a",
    overflow: "hidden",
    paddingBottom: 60,
    minHeight: 280,
  },

  heroGradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, #059669 0%, #0d9488 40%, #7c3aed 100%)",
    transition: "background 0.4s ease",
  },

  heroCoverImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  heroCoverOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.65) 100%)",
  },

  heroBackBtn: {
    position: "absolute",
    top: 20,
    left: 24,
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 12,
    color: "white",
    cursor: "pointer",
    zIndex: 2,
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    transition: "all 0.15s ease",
  },

  heroCoverControls: {
    position: "absolute",
    top: 20,
    right: 24,
    display: "flex",
    gap: 8,
    zIndex: 3,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  heroControlBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    transition: "all 0.15s ease",
  },

  heroControlSpinner: {
    width: 12,
    height: 12,
    border: "2px solid rgba(255,255,255,0.35)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },

  themePicker: {
    position: "absolute",
    top: 72,
    right: 24,
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: 16,
    width: 360,
    zIndex: 5,
    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
  },

  themePickerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
  },

  themePickerClose: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: 8,
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 12,
    color: "#475569",
  },

  themeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 8,
  },

  themeSwatch: {
    aspectRatio: "1",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  themeSwatchCheck: {
    color: "white",
    fontSize: 16,
    fontWeight: 800,
    textShadow: "0 2px 4px rgba(0,0,0,0.4)",
  },

  themePickerHint: {
    fontSize: 11,
    color: "#94a3b8",
    margin: "12px 0 0",
    textAlign: "center",
    lineHeight: 1.4,
  },

  heroContent: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "60px 32px 0",
    display: "flex",
    alignItems: "flex-end",
    gap: 24,
    flexWrap: "wrap",
  },

  heroAvatarWrap: {
    position: "relative",
    flexShrink: 0,
    marginTop: 20,
  },

  heroAvatar: {
    width: 140,
    height: 140,
    borderRadius: "50%",
    border: "4px solid #ffffff",
    overflow: "hidden",
    cursor: "pointer",
    background: "#ffffff",
    boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  heroAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  heroAvatarFallback: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #22c55e, #0ea5e9)",
    color: "white",
    fontSize: 48,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: 2,
  },

  heroCameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#ffffff",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #e2e8f0",
    boxShadow: "0 6px 14px -4px rgba(15, 23, 42, 0.3)",
  },

  cameraSpinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(15,23,42,0.2)",
    borderTopColor: "#0f172a",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },

  heroIdentity: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 4,
    color: "white",
  },

  heroName: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1.15,
    textShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },

  heroEmail: {
    fontSize: 14,
    margin: "6px 0 12px",
    color: "rgba(255,255,255,0.85)",
    wordBreak: "break-all",
  },

  heroMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  roleBadge: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "4px 10px",
    borderRadius: 999,
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  },

  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    fontSize: 11.5,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
  },

  heroRemoveBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    alignSelf: "flex-end",
    marginBottom: 4,
    transition: "all 0.15s ease",
  },

  tabsWrap: {
    maxWidth: 1100,
    margin: "-28px auto 0",
    padding: "0 32px",
    position: "relative",
    zIndex: 2,
  },

  tabs: {
    display: "flex",
    gap: 4,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 6,
    boxShadow: "0 10px 30px -12px rgba(15, 23, 42, 0.15)",
    overflowX: "auto",
  },

  tab: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    borderRadius: 10,
    color: "#475569",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },

  tabActive: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    border: "none",
    borderRadius: 10,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 6px 14px -6px rgba(15, 23, 42, 0.4)",
  },

  body: { padding: "24px 32px 0" },

  content: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  section: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    marginBottom: 20,
  },

  sectionHeader: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid #f1f5f9",
  },

  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  sectionHeaderText: { flex: 1, minWidth: 0 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.01em",
  },

  sectionDesc: {
    fontSize: 12.5,
    color: "#94a3b8",
    margin: "4px 0 0",
    lineHeight: 1.4,
  },

  sectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  field: { display: "flex", flexDirection: "column", gap: 6 },

  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    transition: "all 0.15s ease",
    color: "#0f172a",
  },

  pwWrapper: { position: "relative" },

  pwInput: {
    width: "100%",
    padding: "12px 42px 12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    transition: "all 0.15s ease",
    color: "#0f172a",
  },

  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    padding: 6,
    borderRadius: 8,
  },

  errorMsg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 500,
  },

  successMsg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 12,
    color: "#059669",
    fontSize: 13,
    fontWeight: 500,
  },

  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    padding: "8px 0",
  },

  cancelBtn: {
    padding: "10px 20px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  saveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 24px",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    color: "white",
    boxShadow: "0 6px 14px -6px rgba(15, 23, 42, 0.5)",
  },

  spinner: {
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    display: "inline-block",
  },

  fullImgOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
  },

  fullImgContent: {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },

  fullImg: {
    maxWidth: "100%",
    maxHeight: "90vh",
    borderRadius: 16,
    objectFit: "contain",
    display: "block",
  },

  fullImgClose: {
    position: "absolute",
    top: -44,
    right: 0,
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
  },
};

const dz = {
  box: {
    background: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #fecaca",
  },
  warning: {
    fontSize: 13,
    color: "#991b1b",
    margin: "0 0 12px",
    lineHeight: 1.5,
  },
  initialBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmBox: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    border: "2px solid #fecaca",
    marginTop: 12,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 12,
  },
  lossBox: {
    background: "#f0fdf4",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  lossTitle: {
    fontWeight: 600,
    color: "#16a34a",
    marginBottom: 6,
    fontSize: 13,
  },
  lossList: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.8,
    paddingLeft: 16,
    margin: 0,
  },
  guiltText: {
    fontStyle: "italic",
    color: "#64748b",
    marginBottom: 14,
    fontSize: 13,
  },
  btnRow: { display: "flex", gap: 10, marginTop: 14 },
  cancelBtn: {
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    color: "#475569",
  },
  continueBtn: {
    padding: "8px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    marginBottom: 12,
    background: "#fff",
    boxSizing: "border-box",
  },
  typeLabel: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
  },
  typeHighlight: {
    background: "#fee2e2",
    padding: "2px 8px",
    borderRadius: 4,
    fontFamily: "monospace",
    fontWeight: 700,
    color: "#dc2626",
  },
  confirmInput: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    marginBottom: 8,
    boxSizing: "border-box",
  },
};

export default ProfileSettings;