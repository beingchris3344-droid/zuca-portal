// frontend/src/pages/HymnLyrics.jsx
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import logo from "../assets/zuca-logo.png";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiHeart, FiShare2, FiCopy, FiChevronLeft, FiChevronRight,
  FiDownload, FiPrinter,
} from "react-icons/fi";
import {
  BsWhatsapp, BsTelegram, BsTwitter, BsMusicNoteBeamed,
  BsFileImage, BsFilePdf, BsFileWord, BsFileText,
} from "react-icons/bs";
import { GiPrayerBeads } from "react-icons/gi";
import html2canvas from "html2canvas";
import BASE_URL from "../api";

export default function HymnLyrics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const songTitle = decodeURIComponent(id);
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [fontSize, setFontSize] = useState(16);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const saved = localStorage.getItem("songFavorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    fetchSong();
  }, [songTitle]);

  const fetchSong = async () => {
    try {
      setLoading(true);
      const title = decodeURIComponent(id);
      const res = await axios.get(
        `${BASE_URL}/api/public/hymns/search/${encodeURIComponent(title)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success && res.data?.hymns?.length > 0) {
        const exactMatch = res.data.hymns.find(
          (h) => h.title.toLowerCase() === title.toLowerCase()
        );
        const hymnToUse = exactMatch || res.data.hymns[0];

        const detailRes = await axios.get(
          `${BASE_URL}/api/public/hymns/${hymnToUse.id}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (detailRes.data.success) {
          setSong(detailRes.data.hymn);
          return;
        }
      }
      setError("Song not found");
    } catch (err) {
      setError("Failed to load song");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    localStorage.setItem("songFavorites", JSON.stringify(newFavorites));
    showToast(
      newFavorites.includes(id) ? "Added to favorites" : "Removed from favorites"
    );
  };

  const copyToClipboard = () => {
    if (!song) return;
    const stripBold = (text) => text.replace(/\*\*([^*]+)\*\*/g, "$1");
    const text = `${song.title}\n${song.reference ? `(${song.reference})\n` : ""}\n${stripBold(song.lyrics || "")}`;
    navigator.clipboard.writeText(text);
    showToast("Lyrics copied to clipboard");
  };

  const shareSong = (platform) => {
    if (!song) return;
    const hymnUrl = `${window.location.origin}/hymn/${encodeURIComponent(song.title)}`;
    const text = `Check out this hymn: ${song.title}${song.reference ? ` (${song.reference})` : ""}`;
    const fullMessage = `${text}\n\n${hymnUrl}`;

    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, "_blank");
    } else if (platform === "telegram") {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(hymnUrl)}&text=${encodeURIComponent(text)}`,
        "_blank"
      );
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}`, "_blank");
    }
    setShowShareMenu(false);
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  /* ---------------- TEXT FORMATTING ---------------- */
  const parseBoldText = (line) => {
    if (!line) return null;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="hl-strong">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const formatLyrics = (lyrics) => {
    if (!lyrics) return [];
    const verses = lyrics.split(/\n\s*\n/);
    return verses.filter((verse) => verse.trim() !== "");
  };

  const renderVerse = (verse) => {
    const lines = verse.split("\n");
    return lines.map((line, lineIndex) => (
      <p
        key={lineIndex}
        className="hl-line"
        style={{ fontSize: `${fontSize}px` }}
      >
        {line.trim() === "" ? "\u00A0" : parseBoldText(line)}
      </p>
    ));
  };

  /* ---------------- DOWNLOADS ---------------- */
  const downloadAsImage = async () => {
    try {
      showToast("Preparing image...");
      const element = document.createElement("div");
      element.style.cssText = `
        padding: 40px; background: #ffffff; font-family: 'Inter', sans-serif;
        max-width: 600px; margin: 0 auto; border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      `;

      const verses = formatLyrics(song.lyrics);
      const lyricsHtml = verses
        .map((verse) => {
          const lines = verse.split("\n");
          const linesHtml = lines
            .map((line) => {
              const boldRegex = /\*\*([^*]+)\*\*/g;
              const parsedLine = line.replace(
                boldRegex,
                '<strong style="color: #0f0f0f;">$1</strong>'
              );
              return `<p style="margin: 4px 0; text-align: center; font-size: ${fontSize}px;">${parsedLine || " "}</p>`;
            })
            .join("");
          return `<div style="margin-bottom: 24px;">${linesHtml}</div>`;
        })
        .join("");

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0f0f0f; font-size: 28px; margin-bottom: 8px;">${song.title}</h1>
          ${song.reference ? `<p style="color: #737373; font-size: 14px;">${song.reference}</p>` : ""}
        </div>
        <div style="line-height: 1.8; color: #171717;">${lyricsHtml}</div>
        <div style="text-align: center; margin-top: 30px; color: #a3a3a3; font-size: 12px;">
          ZUCA Hymn Book • Generated on ${new Date().toLocaleDateString()}
        </div>
      `;

      document.body.appendChild(element);
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(element);

      const link = document.createElement("a");
      link.download = `${song.title.replace(/[^a-z0-9]/gi, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Image downloaded");
    } catch (error) {
      console.error("Image download failed:", error);
      showToast("Failed to download image");
    }
  };

  const downloadAsPDF = async () => {
    try {
      showToast("Preparing PDF...");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;
      const LINE_HEIGHT = fontSize * 1.6;
      const VERSE_GAP = fontSize * 1.2;
      const TITLE_SIZE = 22;
      const REF_SIZE = 12;
      const FOOTER_SIZE = 9;
      let y = margin + 10;

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - margin - 20) {
          pdf.addPage();
          y = margin + 10;
        }
      };

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(TITLE_SIZE);
      pdf.setTextColor(15, 15, 15);
      const titleLines = pdf.splitTextToSize(song.title, contentWidth);
      titleLines.forEach((line) => {
        pdf.text(line, pageWidth / 2, y, { align: "center" });
        y += TITLE_SIZE + 6;
      });
      y += 6;

      if (song.reference) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(REF_SIZE);
        pdf.setTextColor(115, 115, 115);
        pdf.text(song.reference, pageWidth / 2, y, { align: "center" });
        y += REF_SIZE + 24;
      } else {
        y += 24;
      }

      pdf.setDrawColor(229, 229, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 28;

      if (song.lyrics) {
        const cleanLyrics = song.lyrics.replace(/\*\*([^*]+)\*\*/g, "$1");
        const verses = cleanLyrics.split(/\n\s*\n/).filter((v) => v.trim());
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(23, 23, 23);

        verses.forEach((verse, vIndex) => {
          const lines = verse.split("\n");
          lines.forEach((line) => {
            if (line.trim() === "") {
              y += LINE_HEIGHT * 0.5;
              return;
            }
            const wrapped = pdf.splitTextToSize(line.trim(), contentWidth);
            wrapped.forEach((wrappedLine) => {
              ensureSpace(LINE_HEIGHT);
              pdf.text(wrappedLine, pageWidth / 2, y, { align: "center" });
              y += LINE_HEIGHT;
            });
          });
          if (vIndex < verses.length - 1) y += VERSE_GAP;
        });
      }

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FOOTER_SIZE);
        pdf.setTextColor(163, 163, 163);
        const footerY = pageHeight - margin / 2;
        pdf.text("ZUCA Hymn Book", margin, footerY);
        pdf.text(
          `Generated on ${new Date().toLocaleDateString()}  •  Page ${i} of ${pageCount}`,
          pageWidth - margin,
          footerY,
          { align: "right" }
        );
      }

      pdf.save(`${song.title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
      showToast("PDF downloaded");
    } catch (error) {
      console.error("PDF download failed:", error);
      showToast("Failed to download PDF");
    }
  };

  const downloadAsWord = () => {
    try {
      showToast("Preparing Word document...");
      const verses = formatLyrics(song.lyrics);
      const lyricsHtml = verses
        .map((verse) => {
          const lines = verse.split("\n");
          const linesHtml = lines
            .map((line) => {
              const boldRegex = /\*\*([^*]+)\*\*/g;
              const parsedLine = line.replace(
                boldRegex,
                '<strong style="color: #0f0f0f;">$1</strong>'
              );
              return `<p style="margin: 4px 0; text-align: center; font-size: ${fontSize}px;">${parsedLine || "<br/>"}</p>`;
            })
            .join("");
          return `<div style="margin-bottom: 24px;">${linesHtml}</div>`;
        })
        .join("");

      const htmlContent = `<!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>${song.title}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; max-width: 600px; margin: 40px auto; padding: 20px; background: white; color: #171717; }
          h1 { color: #0f0f0f; text-align: center; font-size: 28px; margin-bottom: 8px; }
          .reference { color: #737373; text-align: center; font-size: 14px; margin-bottom: 30px; }
          .verse { margin-bottom: 24px; }
          .verse p { margin: 4px 0; text-align: center; font-size: ${fontSize}px; }
          strong { color: #0f0f0f; }
          .footer { text-align: center; margin-top: 40px; color: #a3a3a3; font-size: 12px; }
        </style></head><body>
          <h1>${song.title}</h1>
          ${song.reference ? `<div class="reference">${song.reference}</div>` : ""}
          ${lyricsHtml}
          <div class="footer">ZUCA Hymn Book • Generated on ${new Date().toLocaleDateString()}</div>
        </body></html>`;

      const blob = new Blob([htmlContent], { type: "application/msword" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${song.title.replace(/[^a-z0-9]/gi, "_")}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast("Word document downloaded");
    } catch (error) {
      console.error("Word download failed:", error);
      showToast("Failed to download Word document");
    }
  };

  const downloadAsText = () => {
    try {
      showToast("Preparing text file...");
      const stripBold = (text) => text.replace(/\*\*([^*]+)\*\*/g, "$1");
      const textContent = `${song.title}\n${song.reference ? `(${song.reference})\n` : ""}\n${"=".repeat(50)}\n\n${stripBold(song.lyrics || "")}\n\n${"=".repeat(50)}\nZUCA Hymn Book • Generated on ${new Date().toLocaleDateString()}`;

      const blob = new Blob([textContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${song.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast("Text file downloaded");
    } catch (error) {
      console.error("Text download failed:", error);
      showToast("Failed to download text file");
    }
  };

  /* ---------------- LOADING (unchanged) ---------------- */
  if (loading) {
    return (
      <div style={loadingContainer}>
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={loadingSpinner}
        >
          {loading && <img src={logo} alt="Loading..." style={{ width: "37px", height: "50px" }} />}
        </motion.div>
        <p style={loadingText}>Loading lyrics...</p>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="hl-error-page">
        <div className="hl-error-icon">😔</div>
        <h3 className="hl-error-title">Song not found</h3>
        <p className="hl-error-text">
          {error || "The hymn you're looking for doesn't exist"}
        </p>
        <button onClick={() => navigate("/hymns")} className="hl-error-btn">
          Back to Hymns
        </button>
      </div>
    );
  }

  const verses = formatLyrics(song.lyrics);
  const isFavorite = favorites.includes(id);
  const pageTitle = `${song.title} Lyrics | Zetech Catholic Action`;
  const pageDescription = `Read the full lyrics of ${song.title}${
    song.reference ? ` (${song.reference})` : ""
  } from the Zetech Catholic Action Hymn Book.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} key="description" />
        <link
          rel="canonical"
          href={`https://zetechcatholicaction.com/hymn/${encodeURIComponent(song.title)}`}
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta
          property="og:url"
          content={`https://zetechcatholicaction.com/hymn/${encodeURIComponent(song.title)}`}
        />
        <meta property="og:type" content="article" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hl-page"
      >
        <div className="hl-container">
          {/* ============= TOP BAR ============= */}
          <div className="hl-topbar">
            <button className="hl-back-btn" onClick={() => navigate("/hymns")}>
              <FiChevronLeft size={16} />
              Back
            </button>

            <div className="hl-topbar-actions">
              <button
                className={`hl-action-btn ${isFavorite ? "active" : ""}`}
                onClick={toggleFavorite}
                title="Favorite"
              >
                <FiHeart
                  size={15}
                  style={{ fill: isFavorite ? "currentColor" : "none" }}
                />
              </button>
              <button
                className="hl-action-btn"
                onClick={copyToClipboard}
                title="Copy lyrics"
              >
                <FiCopy size={15} />
              </button>
              <div className="hl-share-wrap">
                <button
                  className={`hl-action-btn ${showShareMenu ? "active" : ""}`}
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Share"
                >
                  <FiShare2 size={15} />
                </button>

                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="hl-share-menu"
                    >
                      <button onClick={() => shareSong("whatsapp")}>
                        <BsWhatsapp size={14} color="#25D366" /> WhatsApp
                      </button>
                      <button onClick={() => shareSong("telegram")}>
                        <BsTelegram size={14} color="#0088cc" /> Telegram
                      </button>
                      <button onClick={() => shareSong("twitter")}>
                        <BsTwitter size={14} color="#1DA1F2" /> Twitter
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ============= MAIN GRID ============= */}
          <div className="hl-grid">
            {/* ---- LYRICS COLUMN ---- */}
            <div className="hl-main">
              <div className="hl-title-block">
                <div className="hl-title-icon">
                  <GiPrayerBeads size={22} />
                </div>
                <h1 className="hl-title">{song.title}</h1>
                {song.reference && (
                  <div className="hl-reference">{song.reference}</div>
                )}
              </div>

              <div className="hl-lyrics">
                {verses.length > 0 ? (
                  verses.map((verse, index) => (
                    <div key={index} className="hl-verse">
                      {renderVerse(verse)}
                    </div>
                  ))
                ) : (
                  <p
                    className="hl-line"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {song.lyrics ? parseBoldText(song.lyrics) : "No lyrics available"}
                  </p>
                )}
              </div>
            </div>

            {/* ---- SIDEBAR COLUMN ---- */}
            <aside className="hl-side">
              {/* Font size */}
              <div className="hl-card">
                <div className="hl-card-title">Text size</div>
                <div className="hl-font-row">
                  <button
                    className="hl-font-btn"
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  >
                    A−
                  </button>
                  <span className="hl-font-value">{fontSize}px</span>
                  <button
                    className="hl-font-btn"
                    onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Download */}
              <div className="hl-card">
                <div className="hl-card-title">
                  <FiDownload size={13} /> Download
                </div>
                <div className="hl-download-grid">
                  <button className="hl-dl-btn" onClick={downloadAsImage}>
                    <BsFileImage size={14} /> Image
                  </button>
                  <button className="hl-dl-btn" onClick={downloadAsPDF}>
                    <BsFilePdf size={14} /> PDF
                  </button>
                  <button className="hl-dl-btn" onClick={downloadAsWord}>
                    <BsFileWord size={14} /> Word
                  </button>
                  <button className="hl-dl-btn" onClick={downloadAsText}>
                    <BsFileText size={14} /> Text
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="hl-card">
                <div className="hl-card-title">Navigation</div>
                <button
                  className="hl-nav-btn"
                  onClick={() => navigate(-1)}
                >
                  <FiChevronLeft size={14} /> Previous
                </button>
                <Link to="/hymns" className="hl-nav-btn">
                  <BsMusicNoteBeamed size={13} /> All hymns
                </Link>
                <button className="hl-nav-btn" disabled>
                  Next <FiChevronRight size={14} />
                </button>
              </div>
            </aside>
          </div>
        </div>

        <style>{mainCSS}</style>
      </motion.div>
    </>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const baseCSS = `
  .hl-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .hl-container {
    padding: 24px 32px 60px;
    max-width: 1100px;
    margin: 0 auto;
  }

  /* ---------- TOP BAR ---------- */
  .hl-topbar {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; margin-bottom: 24px;
  }
  .hl-back-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 8px 14px;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 9px; color: #262626;
    font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit;
  }
  .hl-back-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }

  .hl-topbar-actions { display: flex; gap: 8px; align-items: center; }

  .hl-action-btn {
    width: 38px; height: 38px;
    display: inline-flex; align-items: center; justify-content: center;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 9px; color: #525252;
    cursor: pointer; transition: all 0.15s ease;
  }
  .hl-action-btn:hover {
    background: #f5f5f5; color: #171717; border-color: #d4d4d4;
  }
  .hl-action-btn.active {
    color: #dc2626; border-color: #fecaca; background: #fef2f2;
  }

  .hl-share-wrap { position: relative; }
  .hl-share-menu {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: #ffffff; border: 1px solid #e5e5e5;
    border-radius: 10px; padding: 4px;
    min-width: 160px;
    box-shadow: 0 10px 25px -5px rgba(15,15,15,0.12);
    z-index: 30;
    display: flex; flex-direction: column; gap: 2px;
  }
  .hl-share-menu button {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; background: transparent;
    border: none; border-radius: 7px;
    font-size: 12.5px; font-weight: 600;
    color: #262626; text-align: left;
    cursor: pointer; transition: background 0.12s ease;
    font-family: inherit;
  }
  .hl-share-menu button:hover { background: #f5f5f5; }

  /* ---------- LAYOUT GRID ---------- */
  .hl-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 32px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .hl-grid { grid-template-columns: 1fr; gap: 24px; }
  }

  /* ---------- MAIN COLUMN ---------- */
  .hl-main {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 16px;
    padding: 40px 48px;
  }
  @media (max-width: 900px) {
    .hl-main { padding: 28px 24px; }
  }

  .hl-title-block {
    text-align: center;
    padding-bottom: 28px;
    margin-bottom: 32px;
    border-bottom: 1px solid #f0f0f0;
  }
  .hl-title-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: #f5f5f5; color: #262626;
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .hl-title {
    font-size: 26px; font-weight: 700; color: #0f0f0f;
    margin: 0 0 10px 0; letter-spacing: -0.4px;
    line-height: 1.25;
    word-break: break-word;
  }
  @media (max-width: 600px) {
    .hl-title { font-size: 22px; }
  }
  .hl-reference {
    display: inline-block;
    font-size: 12px; font-weight: 600;
    color: #737373;
    background: #f5f5f5;
    padding: 4px 12px;
    border-radius: 999px;
  }

  /* ---------- LYRICS ---------- */
  .hl-lyrics { padding: 0 12px; }
  .hl-verse { margin-bottom: 28px; }
  .hl-verse:last-child { margin-bottom: 0; }

  .hl-line {
    margin: 0;
    padding: 3px 0;
    color: #262626;
    line-height: 1.7;
    text-align: center;
    word-break: break-word;
  }
  .hl-strong {
    font-weight: 700;
    color: #0f0f0f;
  }

  /* ---------- SIDEBAR ---------- */
  .hl-side {
    display: flex; flex-direction: column; gap: 12px;
    position: sticky;
    top: 24px;
  }
  @media (max-width: 900px) {
    .hl-side { position: static; }
  }

  .hl-card {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 16px;
  }
  .hl-card-title {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; color: #737373;
    text-transform: uppercase; letter-spacing: 0.06em;
    margin-bottom: 12px;
  }

  /* Font size control */
  .hl-font-row {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; gap: 8px;
  }
  .hl-font-btn {
    padding: 9px 0;
    border: 1px solid #e5e5e5; border-radius: 8px;
    background: #ffffff; cursor: pointer;
    font-size: 13px; font-weight: 700;
    color: #262626; transition: all 0.15s ease;
    font-family: inherit;
  }
  .hl-font-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .hl-font-value {
    font-size: 12px; color: #737373; font-weight: 600;
    text-align: center; min-width: 46px;
  }

  /* Download grid */
  .hl-download-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .hl-dl-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    background: #fafafa; color: #262626;
    cursor: pointer; transition: all 0.15s ease;
    font-size: 12px; font-weight: 600;
    font-family: inherit;
  }
  .hl-dl-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }

  /* Navigation */
  .hl-nav-btn {
    display: flex; align-items: center; justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5; border-radius: 9px;
    background: #ffffff; color: #262626;
    cursor: pointer; transition: all 0.15s ease;
    font-size: 12.5px; font-weight: 600;
    font-family: inherit; text-decoration: none;
    margin-bottom: 8px;
  }
  .hl-nav-btn:last-child { margin-bottom: 0; }
  .hl-nav-btn:hover:not(:disabled) {
    background: #f5f5f5; border-color: #d4d4d4;
  }
  .hl-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ---------- ERROR PAGE ---------- */
  .hl-error-page {
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 24px; text-align: center;
    background: #fafafa;
  }
  .hl-error-icon {
    font-size: 48px; margin-bottom: 16px; opacity: 0.5;
  }
  .hl-error-title {
    font-size: 20px; font-weight: 700; color: #0f0f0f;
    margin: 0 0 8px 0;
  }
  .hl-error-text {
    font-size: 13.5px; color: #737373;
    margin: 0 0 20px 0; max-width: 380px;
  }
  .hl-error-btn {
    padding: 11px 22px;
    background: #0f0f0f; color: #ffffff;
    border: none; border-radius: 9px;
    font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s ease;
    font-family: inherit;
  }
  .hl-error-btn:hover { background: #262626; }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 640px) {
    .hl-container { padding: 16px 16px 40px; }
    .hl-topbar { margin-bottom: 16px; }
    .hl-lyrics { padding: 0; }
  }
`;

const mainCSS = `
  ${baseCSS}
  @keyframes slideIn {
    from { transform: translateX(-50%) translateY(10px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
`;

/* Loading screen — unchanged */
const loadingContainer = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#ffffff",
};

const loadingSpinner = {
  width: "60px",
  height: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  background: "#ffffff",
  borderRadius: "50%",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginBottom: "16px",
};

const loadingText = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: "4px",
};

const toastStyle = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f0f0f;
  color: white;
  padding: 12px 22px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(15,15,15,0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease;
  white-space: nowrap;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Inter', sans-serif;
`;

