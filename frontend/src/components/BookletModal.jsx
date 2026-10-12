import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX, FiPrinter, FiBook } from "react-icons/fi";
import { BsFilePdf, BsFileWord } from "react-icons/bs";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import BASE_URL from "../api";

/* =========================================================
   PAPER + LAYOUT DEFINITIONS
========================================================= */
const PAPER = {
  A4:     { w: 210, h: 297, padV: 14, padH: 12 },
  A5:     { w: 148, h: 210, padV: 11, padH: 9  },
  A6:     { w: 105, h: 148, padV: 8,  padH: 7  },
  A7:     { w: 74,  h: 105, padV: 6,  padH: 5  },
  Letter: { w: 216, h: 279, padV: 14, padH: 12 },
  Legal:  { w: 216, h: 356, padV: 16, padH: 12 },
  Half:   { w: 140, h: 216, padV: 11, padH: 9  },
};

const MAX_LINES = {
  A4:     { 1: 52, 2: 40, 3: 28 },
  A5:     { 1: 38, 2: 28, 3: 20 },
  A6:     { 1: 26, 2: 19, 3: 13 },
  A7:     { 1: 18, 2: 13, 3: 9  },
  Letter: { 1: 50, 2: 38, 3: 26 },
  Legal:  { 1: 66, 2: 50, 3: 34 },
  Half:   { 1: 36, 2: 26, 3: 18 },
};

const MM_TO_PX = 3.7795;

/* =========================================================
   SHARED PAGE CSS
========================================================= */
const buildPageCSS = (paperSize, columns) => {
  const p = PAPER[paperSize];
  const colGap = columns === 1 ? 0 : columns === 2 ? 7 : 5;

  const scale = p.w / 210;
  const coverLogo = Math.round(52 * scale);
  const coverOrg = Math.max(6, 8.5 * scale);
  const coverTitle = Math.max(12, 28 * scale);
  const coverSeason = Math.max(7, 10.5 * scale);
  const coverDate = Math.max(8, 11.5 * scale);
  const coverVenue = Math.max(7, 10 * scale);
  const coverRule = Math.max(15, 30 * scale);
  const coverSpace = Math.max(4, 10 * scale);

  return `
    @page {
      size: ${paperSize} portrait;
      margin: 0;
    }

    .bk-page {
      width: ${p.w}mm;
      min-height: ${p.h}mm;
      padding: ${p.padV}mm ${p.padH}mm;
      background: #ffffff;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      position: relative;
      display: flex;
      flex-direction: column;
      font-family: Georgia, "Times New Roman", Times, serif;
      color: #1a1a1a;
    }
    .bk-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .bk-body {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(${columns}, minmax(0, 1fr));
      gap: 0 ${colGap}mm;
      align-items: start;
    }

    .bk-col {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .section-header {
      font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #c0392b;
      margin: 12px 0 8px 0;
      padding: 2px 0 4px 10px;
      border-left: 4px solid #c0392b;
    }
    .bk-col > .section-header:first-child { margin-top: 0; }

    .song-title {
      font-family: Georgia, serif;
      font-size: 10.5pt;
      font-weight: 700;
      color: #2c3e50;
      margin: 10px 0 4px 0;
      padding-bottom: 3px;
      border-bottom: 2px solid #e0e0e0;
      letter-spacing: .02em;
    }
    .song-title:first-child { margin-top: 0; }

    .song-lyrics {
      font-size: 8.8pt;
      line-height: 1.5;
      color: #333;
      margin-left: 8px;
      display: block;
    }
    .song-lyrics .lyric-line {
      display: block;
      padding: 0.5px 0;
    }
    .song-lyrics .chorus-line {
      display: block;
      font-style: italic;
      color: #8b4513;
      margin: 4px 0 4px 6px;
      padding: 2px 10px;
      border-left: 3px solid #8b4513;
      background: rgba(139, 69, 19, 0.06);
      border-radius: 0 3px 3px 0;
    }
    .song-lyrics .verse-number {
      display: block;
      font-weight: 700;
      color: #2980b9;
      margin: 6px 0 2px 0;
      font-size: 9pt;
    }
    .song-lyrics .section-title-line {
      display: block;
      font-weight: 700;
      color: #2c3e50;
      margin: 6px 0 3px 0;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: .04em;
      border-bottom: 1px dashed #ccc;
      padding-bottom: 2px;
    }
    .song-lyrics .repeat-line {
      display: inline-block;
      color: #666;
      font-style: italic;
      font-size: 8.2pt;
      padding: 1px 6px;
      background: #f9f9f9;
      border-radius: 3px;
      margin: 2px 0;
    }
    .song-lyrics .voice-part {
      display: block;
      font-size: 8.2pt;
      padding: 1px 8px;
      margin: 2px 0;
      border-radius: 3px;
      font-weight: 500;
    }
    .song-lyrics .voice-part.sop   { color: #e74c3c; background: rgba(231, 76, 60, 0.08); }
    .song-lyrics .voice-part.alto  { color: #27ae60; background: rgba(39, 174, 96, 0.08); }
    .song-lyrics .voice-part.tenor { color: #2980b9; background: rgba(41, 128, 185, 0.08); }
    .song-lyrics .voice-part.bass  { color: #8e44ad; background: rgba(142, 68, 173, 0.08); }
    .song-lyrics .two-columns {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 2px 6px;
      background: #f8f8f8;
      border-radius: 3px;
      margin: 2px 0;
    }
    .song-lyrics .two-columns .col-left,
    .song-lyrics .two-columns .col-right { flex: 1; }
    .song-lyrics .spacer-line { height: 5px; display: block; }

    .bk-page-num {
      text-align: center;
      font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 7.5pt;
      color: #999;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding-top: 6mm;
      margin-top: auto;
    }

    .bk-cover {
      width: ${p.w}mm;
      min-height: ${p.h}mm;
      padding: ${p.padV + 6}mm ${p.padH + 4}mm;
      box-sizing: border-box;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
      break-after: page;
      font-family: Georgia, serif;
    }
    .bk-cover-logo {
      max-width: ${coverLogo}mm;
      height: auto;
      margin-bottom: ${coverSpace}mm;
      background: #fff;
      padding: 6px;
      border-radius: 6px;
    }
    .bk-cover-org {
      font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: ${coverOrg}pt;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.72);
      margin-bottom: ${coverSpace}mm;
    }
    .bk-cover-title {
      font-size: ${coverTitle}pt;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.15;
      margin: 0;
    }
    .bk-cover-rule {
      width: ${coverRule}mm;
      height: 1px;
      background: rgba(255,255,255,0.4);
      margin: ${coverSpace}mm auto;
    }
    .bk-cover-season {
      font-style: italic;
      font-size: ${coverSeason}pt;
      color: rgba(255,255,255,0.9);
      margin-bottom: ${coverSpace * 0.5}mm;
      line-height: 1.4;
    }
    .bk-cover-date {
      font-size: ${coverDate}pt;
      font-weight: 600;
      color: #fff;
      margin-bottom: 2mm;
    }
    .bk-cover-venue {
      font-size: ${coverVenue}pt;
      color: rgba(255,255,255,0.78);
      letter-spacing: .05em;
    }

    .bk-toc-head {
      text-align: center;
      margin-bottom: 8mm;
    }
    .bk-toc-org {
      font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4mm;
    }
    .bk-toc-rule {
      width: 25mm;
      height: 1px;
      background: #cbd5e1;
      margin: 3mm auto;
    }
    .bk-toc-subtitle {
      font-size: 9.5pt;
      font-style: italic;
      color: #64748b;
      margin-bottom: 5mm;
    }
    .bk-toc-title {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #1a1a1a;
      margin: 0;
    }

    .bk-toc-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 2mm;
    }

    .bk-toc-th {
      background: #0a0a0a;
      color: #fff;
      font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
      border-right: 1px solid rgba(255,255,255,0.08);
    }
    .bk-toc-th:last-child { border-right: 0; }

    .bk-toc-th-sched { width: 32%; }
    .bk-toc-th-song  { width: auto; }
    .bk-toc-th-page  { width: 12%; text-align: right; }

    .bk-toc-td {
      padding: 10px;
      border-bottom: 1px solid #e6eef9;
      vertical-align: top;
      font-size: 9pt;
    }

    .bk-toc-td-sched {
      font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      font-weight: 800;
      font-size: 9pt;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #c0392b;
      border-right: 1px solid #e6eef9;
      background: #f8fafc;
      word-break: break-word;
    }

    .bk-toc-td-song {
      color: #2c3e50;
      font-family: Georgia, serif;
      font-size: 9pt;
      line-height: 1.4;
    }
    .bk-toc-td-song .bk-toc-song-line {
      display: block;
      padding: 1px 0;
    }

    .bk-toc-td-page {
      text-align: right;
      font-weight: 800;
      font-size: 10pt;
      color: #1a1a1a;
      border-left: 1px solid #e6eef9;
      background: #f8fafc;
      font-variant-numeric: tabular-nums;
    }

    .bk-toc-row:nth-child(even) .bk-toc-td-sched,
    .bk-toc-row:nth-child(even) .bk-toc-td-song,
    .bk-toc-row:nth-child(even) .bk-toc-td-page {
      background: #fbfdff;
    }

    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .bk-cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bk-page { box-shadow: none; }
    }
  `;
};

/* =========================================================
   MODAL
========================================================= */
const BookletModal = ({ program, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookletData, setBookletData] = useState(null);
  const [busy, setBusy] = useState(null); // null | "pdf" | "word" | "print"

  const [paperSize, setPaperSize] = useState("A4");
  const [columns, setColumns] = useState(2);

  const scrollRef = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(900);

  /* ---------- fetch ---------- */
  useEffect(() => {
    if (!program?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BASE_URL}/api/mass-programs/${program.id}/booklet-data`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!cancelled) setBookletData(res.data);
      } catch (err) {
        console.error("Failed to load booklet:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [program]);

  /* ---------- measure preview ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setPreviewWidth(el.clientWidth - 40);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, bookletData]);

  /* ---------- smooth paper/column change ---------- */
  const handlePaperChange = (size) => {
    if (size === paperSize) return;
    const scrollTop = scrollRef.current?.scrollTop || 0;
    const oldH = PAPER[paperSize].h;
    const newH = PAPER[size].h;
    setPaperSize(size);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollTop * (newH / oldH);
      }
    });
  };

  const handleColumnsChange = (c) => {
    if (c === columns) return;
    const scrollTop = scrollRef.current?.scrollTop || 0;
    setColumns(c);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollTop;
    });
  };

  /* =========================================================
     LYRIC FORMATTER
  ========================================================= */
  const formatLyricLine = (line) => {
    if (!line || line.trim() === "") {
      return '<div class="spacer-line">&nbsp;</div>';
    }
    const t = line.trim();

    if (t.includes("**{") && t.includes("}**")) {
      const m = t.match(/\*\*\{([^}]+)\}\*\*/);
      if (m) {
        const chorus = m[1];
        const rep = chorus.match(/(.+?)\s*[xX×]\s*(\d+)/);
        if (rep) return `<div class="chorus-line">${rep[1].trim()} ×${rep[2]}</div>`;
        return `<div class="chorus-line">${chorus}</div>`;
      }
    }
    if (t.includes("**") && !t.includes("\\*\\*")) {
      let out = t;
      const bolds = t.match(/\*\*([^*]+)\*\*/g);
      if (bolds) {
        bolds.forEach((b) => {
          out = out.replace(b, `<strong>${b.replace(/\*\*/g, "")}</strong>`);
        });
      }
      return `<div class="lyric-line">${out}</div>`;
    }
    if (t.match(/^(\d+)\./)) return `<div class="verse-number">${t}</div>`;

    const rep2 = t.match(/\{([^}]+)\}\s*[xX×]\s*(\d+)/);
    if (rep2) return `<div class="repeat-line">${rep2[1].trim()} ×${rep2[2]}</div>`;

    const voice = t.match(/\*\*(Sop|Alto|Tenor|Bass)\*\*/i);
    if (voice) {
      const v = voice[1];
      const rest = t
        .replace(/\*\*Sop\*\*/i, "")
        .replace(/\*\*Alto\*\*/i, "")
        .replace(/\*\*Tenor\*\*/i, "")
        .replace(/\*\*Bass\*\*/i, "")
        .trim();
      return `<div class="voice-part ${v.toLowerCase()}">${v}: ${rest}</div>`;
    }
    const cols = t.split(/\s{3,}/);
    if (cols.length >= 2) {
      return `<div class="two-columns"><div class="col-left">${cols[0].trim()}</div><div class="col-right">${cols.slice(1).join("   ").trim()}</div></div>`;
    }
    if (t.includes("*2") || t.includes("x2") || t.includes("×2")) {
      return `<div class="repeat-line">${t.replace(/\*2/g, "×2").replace(/x2/g, "×2").replace(/X2/g, "×2")}</div>`;
    }
    if (t === t.toUpperCase() && t.length > 3 && !t.includes("*")) {
      return `<div class="section-title-line">${t}</div>`;
    }
    return `<div class="lyric-line">${t}</div>`;
  };

  /* =========================================================
     BREAK INTO LINES
  ========================================================= */
  const breakIntoLines = (sections) => {
    const all = [];
    sections.forEach((section) => {
      all.push({
        type: "section-header",
        content: section.label || "",
        html: `<div class="section-header">${section.label || ""}</div>`,
        lines: 1.5,
        group: "header",
      });
      if (section.songs) {
        section.songs.forEach((song, sIdx) => {
          const groupId = `song-${sIdx}-${(song.title || "").slice(0, 20)}`;
          all.push({
            type: "song-title",
            content: song.title || "",
            html: `<div class="song-title">${song.title || ""}</div>`,
            lines: 1.5,
            group: groupId,
          });
          if (song.lyrics && song.lyrics !== "[Pending - Add lyrics]") {
            const lines = song.lyrics.split("\n");
            lines.forEach((l) => {
              if (l && l.trim() !== "") {
                all.push({
                  type: "lyric",
                  html: `<div class="song-lyrics">${formatLyricLine(l)}</div>`,
                  lines: 1,
                  group: groupId,
                });
              } else {
                all.push({
                  type: "spacer",
                  html: '<div class="song-lyrics"><div class="spacer-line">&nbsp;</div></div>',
                  lines: 0.4,
                  group: groupId,
                });
              }
            });
          } else {
            all.push({
              type: "lyric",
              html: '<div class="song-lyrics"><div class="lyric-line">Lyrics not available yet</div></div>',
              lines: 1,
              group: groupId,
            });
          }
        });
      }
    });
    return all;
  };

  /* =========================================================
     FLOW INTO PAGES
  ========================================================= */
  const flowIntoPages = (all, maxLinesPerColumn, colCount) => {
    const pages = [];
    let page = { cols: Array.from({ length: colCount }, () => []) };
    let colIdx = 0;
    let colLines = 0;

    const colLineCount = (col) => col.reduce((s, l) => s + l.lines, 0);

    const nextColumn = () => {
      if (colIdx < colCount - 1) {
        colIdx++;
        colLines = 0;
      } else {
        pages.push(page);
        page = { cols: Array.from({ length: colCount }, () => []) };
        colIdx = 0;
        colLines = 0;
      }
    };

    let i = 0;
    while (i < all.length) {
      const line = all[i];

      let groupEnd = i;
      while (groupEnd < all.length && all[groupEnd].group === line.group) groupEnd++;
      const groupLines = all.slice(i, groupEnd).reduce((s, l) => s + l.lines, 0);

      const remaining = maxLinesPerColumn - colLines;

      if (groupLines <= remaining) {
        for (let k = i; k < groupEnd; k++) {
          page.cols[colIdx].push(all[k]);
          colLines += all[k].lines;
        }
        i = groupEnd;
        continue;
      }

      if (remaining >= 3) {
        let taken = 0;
        let localLines = 0;
        for (let k = i; k < groupEnd; k++) {
          if (localLines + all[k].lines > remaining - 1) break;
          page.cols[colIdx].push(all[k]);
          localLines += all[k].lines;
          taken++;
        }
        if (taken >= 2) {
          colLines += localLines;
          i += taken;
          nextColumn();
          continue;
        }
      }

      nextColumn();
    }

    if (page.cols.some((c) => c.length > 0)) pages.push(page);

    if (pages.length >= 2) {
      const last = pages[pages.length - 1];
      const before = pages[pages.length - 2];
      const lastLines = last.cols.reduce((s, c) => s + colLineCount(c), 0);
      const beforeLastCol = before.cols[before.cols.length - 1];
      const beforeLines = colLineCount(beforeLastCol);

      if (
        lastLines < maxLinesPerColumn * colCount * 0.3 &&
        beforeLines > maxLinesPerColumn * 0.85
      ) {
        last.cols.unshift(beforeLastCol);
        before.cols[before.cols.length - 1] = [];
        if (before.cols.every((c) => c.length === 0)) {
          pages.splice(pages.length - 2, 1);
        }
      }
    }

    return pages;
  };

  /* =========================================================
     COMPUTED
  ========================================================= */
  const computed = useMemo(() => {
    if (!bookletData) return { pages: [], lines: 0, toc: [] };

    const all = breakIntoLines(bookletData.sections);
    const maxLines = MAX_LINES[paperSize][columns];
    const pages = flowIntoPages(all, maxLines, columns);

    const toc = [];
    const seen = new Set();
    pages.forEach((page, pageIdx) => {
      page.cols.forEach((col) => {
        col.forEach((line) => {
          if (line.type === "section-header" && !seen.has(line.content)) {
            seen.add(line.content);
            toc.push({
              label: line.content,
              page: pageIdx + 1,
              songs: [],
            });
          }
          if (line.type === "song-title" && toc.length > 0) {
            toc[toc.length - 1].songs.push(line.content);
          }
        });
      });
    });

    const totalLines = all.reduce((s, l) => s + l.lines, 0);
    return { pages, lines: Math.round(totalLines), toc };
  }, [bookletData, paperSize, columns]);

  /* =========================================================
     BUILDERS
  ========================================================= */
  const orgLabel =
    bookletData?.program?.org ||
    bookletData?.program?.parish ||
    "";

  const buildCoverHTML = () =>
    `<div class="bk-cover">
      <img src="/zuca-logo.png" alt="Logo" class="bk-cover-logo" />
      ${orgLabel ? `<div class="bk-cover-org">${orgLabel}</div>` : ""}
      <div class="bk-cover-rule"></div>
      <h1 class="bk-cover-title">Mass Program</h1>
      <div class="bk-cover-rule"></div>
      <div class="bk-cover-season">${bookletData.program?.season || ""}</div>
      <div class="bk-cover-date">${bookletData.program?.formattedDate || ""}</div>
      <div class="bk-cover-venue">${bookletData.program?.venue || ""}</div>
    </div>`;

  const buildTOCHTML = () =>
    `<div class="bk-page bk-toc-page">
      <div class="bk-toc-head">
        ${orgLabel ? `<div class="bk-toc-org">${orgLabel}</div>` : ""}
        <div class="bk-toc-rule"></div>
        <div class="bk-toc-subtitle">${bookletData.program?.formattedDate || ""}</div>
        <h1 class="bk-toc-title">PROGRAM</h1>
      </div>

      <table class="bk-toc-table">
        <thead>
          <tr>
            <th class="bk-toc-th bk-toc-th-sched">TIME</th>
            <th class="bk-toc-th bk-toc-th-song">Song</th>
            <th class="bk-toc-th bk-toc-th-page">Page</th>
          </tr>
        </thead>
        <tbody>
          ${computed.toc
            .map(
              (entry) => `
            <tr class="bk-toc-row">
              <td class="bk-toc-td bk-toc-td-sched">${entry.label}</td>
              <td class="bk-toc-td bk-toc-td-song">
                ${entry.songs
                  .map((s) => `<span class="bk-toc-song-line">${s}</span>`)
                  .join("")}
              </td>
              <td class="bk-toc-td bk-toc-td-page">${entry.page}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;

  const buildPageHTML = (page, idx) => `
    <div class="bk-page">
      <div class="bk-body">
        ${page.cols
          .map((col) => `<div class="bk-col">${col.map((l) => l.html).join("")}</div>`)
          .join("")}
      </div>
      <div class="bk-page-num">Page ${idx + 1}</div>
    </div>`;

  const buildFullDocument = () => `
    ${buildCoverHTML()}
    ${buildTOCHTML()}
    ${computed.pages.map((p, i) => buildPageHTML(p, i)).join("")}
  `;

  /* =========================================================
     EXPORTERS
  ========================================================= */

  const generatePDF = async () => {
    if (!bookletData || busy) return;
    setBusy("pdf");

    const css = buildPageCSS(paperSize, columns);
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      left: -10000px;
      top: 0;
      width: ${PAPER[paperSize].w}mm;
      background: #fff;
      pointer-events: none;
      z-index: -1;
    `;
    container.innerHTML = `<style>${css}</style>${buildFullDocument()}`;
    document.body.appendChild(container);

    try {
      const pageEls = Array.from(
        container.querySelectorAll(".bk-cover, .bk-page")
      );

      const pdfW = PAPER[paperSize].w;
      const pdfH = PAPER[paperSize].h;
      const orientation = pdfW > pdfH ? "landscape" : "portrait";

      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: [pdfW, pdfH],
        compress: true,
      });

      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);

        if (i > 0) pdf.addPage([pdfW, pdfH], orientation);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH, undefined, "FAST");
      }

      pdf.save(
        `Mass_Booklet_${bookletData.program?.date || "mass"}_${paperSize}.pdf`
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      document.body.removeChild(container);
      setBusy(null);
    }
  };

  const downloadWord = () => {
    if (!bookletData || busy) return;
    setBusy("word");

    try {
      const css = buildPageCSS(paperSize, columns);
      const html = `<!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <meta name="ProgId" content="Word.Document">
          <title>Mass Program - ${bookletData.program?.formattedDate || "Mass"}</title>
          <style>${css}</style>
        </head>
        <body>
          ${buildFullDocument()}
        </body>
        </html>`;
      const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mass_Booklet_${bookletData.program?.date || "mass"}_${paperSize}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Word export failed:", err);
      alert("Could not generate Word document.");
    } finally {
      setTimeout(() => setBusy(null), 500);
    }
  };

  const printFromModal = () => {
    if (!bookletData || busy) return;
    setBusy("print");

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups for this site");
        setBusy(null);
        return;
      }
      const css = buildPageCSS(paperSize, columns);
      const html = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Mass Program - ${bookletData.program?.formattedDate || "Mass"}</title>
          <style>${css}</style>
        </head>
        <body>
          ${buildFullDocument()}
        </body>
        </html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 400);
    } catch (err) {
      console.error("Print failed:", err);
    } finally {
      setTimeout(() => setBusy(null), 600);
    }
  };

  /* =========================================================
     SCALE
  ========================================================= */
  const paperPx = PAPER[paperSize].w * MM_TO_PX;
  const scale = Math.min(1, previewWidth / paperPx);

  /* =========================================================
     RENDER
  ========================================================= */
  if (!loading && !bookletData && !error) return null;

  return createPortal(
    <>
      <div className="booklet-overlay" onClick={onClose}>
        <div className="booklet-modal" onClick={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <div className="booklet-header">
            <div className="booklet-header-left">
              <h2><FiBook size={16} /> Booklet</h2>
              <span className="booklet-header-sub">
                {bookletData?.program?.formattedDate || ""}
              </span>
            </div>

            <div className="booklet-actions">
              <button
                onClick={downloadWord}
                className="btn-word"
                disabled={busy !== null}
                title="Download Word"
              >
                <BsFileWord size={14} />
                <span>Word</span>
              </button>

              <button
                onClick={generatePDF}
                className="btn-pdf"
                disabled={busy !== null}
                title="Download PDF"
              >
                <BsFilePdf size={14} />
                <span>PDF</span>
              </button>

              <button
                onClick={printFromModal}
                className="btn-print"
                disabled={busy !== null}
                title="Print"
              >
                <FiPrinter size={14} />
                <span>Print</span>
              </button>

              <button onClick={onClose} className="btn-close" title="Close">
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="booklet-toolbar">
            <div className="booklet-toolbar-group">
              <span className="booklet-toolbar-label">Paper</span>
              <div className="booklet-chips">
                {Object.keys(PAPER).map((p) => (
                  <button
                    key={p}
                    className={`booklet-chip ${paperSize === p ? "on" : ""}`}
                    onClick={() => handlePaperChange(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="booklet-toolbar-group">
              <span className="booklet-toolbar-label">Columns</span>
              <div className="booklet-chips">
                {[1, 2, 3].map((c) => (
                  <button
                    key={c}
                    className={`booklet-chip ${columns === c ? "on" : ""}`}
                    onClick={() => handleColumnsChange(c)}
                  >
                    {c} col
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FIT BAR */}
          <div className="booklet-fit-bar">
            {error ? (
              <span>Could not load booklet</span>
            ) : loading ? (
              <span>Loading…</span>
            ) : (
              <>
                <span><b>{paperSize}</b></span>
                <span>·</span>
                <span>{columns} column{columns !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{computed.pages.length + 2} page{computed.pages.length + 2 !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{computed.lines} lines</span>
                <span>·</span>
                <span>{computed.toc.length} moment{computed.toc.length !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>

          {/* PREVIEW */}
          <div className="booklet-preview" ref={scrollRef}>
            {loading ? (
              <div className="booklet-state">
                <div className="spinner" />
                <p>Loading booklet…</p>
                <button onClick={onClose} className="btn-cancel">Cancel</button>
              </div>
            ) : error ? (
              <div className="booklet-state">
                <p>Could not load the booklet for this program.</p>
                <button onClick={onClose} className="btn-cancel">Close</button>
              </div>
            ) : (
              <div
                className="preview-pages"
                key={`${paperSize}-${columns}`}
              >
                <div className="preview-frame">
                  <div className="preview-page-label">Cover</div>
                  <div
                    className="preview-scale-wrap"
                    style={{
                      width: `${paperPx * scale}px`,
                      height: `${PAPER[paperSize].h * MM_TO_PX * scale}px`,
                    }}
                  >
                    <div
                      className="preview-scale-inner"
                      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                      dangerouslySetInnerHTML={{ __html: buildCoverHTML() }}
                    />
                  </div>
                </div>

                <div className="preview-frame">
                  <div className="preview-page-label">PROGRAM</div>
                  <div
                    className="preview-scale-wrap"
                    style={{
                      width: `${paperPx * scale}px`,
                      height: `${PAPER[paperSize].h * MM_TO_PX * scale}px`,
                    }}
                  >
                    <div
                      className="preview-scale-inner"
                      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                      dangerouslySetInnerHTML={{ __html: buildTOCHTML() }}
                    />
                  </div>
                </div>

                {computed.pages.map((page, idx) => (
                  <div className="preview-frame" key={idx}>
                    <div className="preview-page-label">
                      Page {idx + 1}
                      <span className="preview-page-lines">
                        · {page.cols.reduce((s, c) => s + c.reduce((a, l) => a + l.lines, 0), 0).toFixed(0)} lines
                      </span>
                    </div>
                    <div
                      className="preview-scale-wrap"
                      style={{
                        width: `${paperPx * scale}px`,
                        height: `${PAPER[paperSize].h * MM_TO_PX * scale}px`,
                      }}
                    >
                      <div
                        className="preview-scale-inner"
                        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                        dangerouslySetInnerHTML={{ __html: buildPageHTML(page, idx) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- VISIBLE BUSY OVERLAY ---------- */}
          {busy && (
            <div className="booklet-busy-overlay">
              <div className="booklet-busy-card">
                <div className="booklet-busy-spinner" />
                <div className="booklet-busy-title">
                  {busy === "pdf" && "Making your PDF"}
                  {busy === "word" && "Making your Word document"}
                  {busy === "print" && "Opening print dialog"}
                </div>
                <div className="booklet-busy-sub">
                  {busy === "pdf" && "Rendering pages… this can take a few seconds"}
                  {busy === "word" && "Packaging your booklet…"}
                  {busy === "print" && "Sending to your printer…"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shared page CSS */}
      <style>{buildPageCSS(paperSize, columns)}</style>

      {/* Modal chrome CSS */}
      <style>{`
        .booklet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.85);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .booklet-modal {
          position: relative;
          width: 100%;
          max-width: 1200px;
          height: 92vh;
          background: #f1f5f9;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 30px 60px -20px rgba(0,0,0,0.55);
        }

        .booklet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          flex-shrink: 0;
        }
        .booklet-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .booklet-header-left h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -.01em;
          flex-shrink: 0;
        }
        .booklet-header-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .booklet-header-sub { display: none; }
        }

        .booklet-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .booklet-actions button {
          padding: 7px 12px;
          border-radius: 8px;
          border: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all .15s ease;
          font-family: inherit;
        }
        .booklet-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        .btn-word { background: #2b5797; color: #fff; }
        .btn-word:hover { background: #1e3a6f; }
        .btn-pdf { background: #dc2626; color: #fff; }
        .btn-pdf:hover:not(:disabled) { background: #b91c1c; }
        .btn-print { background: #334155; color: #fff; }
        .btn-print:hover { background: #1f2937; }
        .btn-close { background: #334155; color: #fff; padding: 7px 9px; }
        .btn-close:hover { background: #1f2937; }

        .booklet-toolbar {
          display: flex;
          align-items: center;
          gap: 22px;
          padding: 10px 18px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          flex-shrink: 0;
        }
        .booklet-toolbar::-webkit-scrollbar { display: none; }

        .booklet-toolbar-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .booklet-toolbar-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #94a3b8;
          flex-shrink: 0;
        }

        .booklet-chips {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .booklet-chip {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all .15s ease;
        }
        .booklet-chip:hover {
          border-color: #94a3b8;
          color: #0f172a;
        }
        .booklet-chip.on {
          background: #0f172a;
          border-color: #0f172a;
          color: #fff;
        }

        .booklet-fit-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 8px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: .04em;
          color: #64748b;
          flex-shrink: 0;
        }
        .booklet-fit-bar b { color: #0f172a; font-weight: 800; }

        .booklet-preview {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px 40px;
          background: #e2e8f0;
        }

        .preview-pages {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 26px;
          animation: bookletSwap .28s cubic-bezier(.4, 0, .2, 1);
        }
        @keyframes bookletSwap {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .preview-frame {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .preview-page-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #64748b;
        }
        .preview-page-lines {
          font-weight: 500;
          color: #94a3b8;
          text-transform: none;
          letter-spacing: 0;
        }

        .preview-scale-wrap {
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 40px -14px rgba(15,23,42,0.35);
          background: #fff;
        }
        .preview-scale-inner {
          width: fit-content;
        }

        .booklet-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          height: 100%;
          color: #475569;
          font-size: 13.5px;
          font-weight: 600;
          text-align: center;
        }
        .booklet-state p { margin: 0; }

        .btn-cancel {
          padding: 9px 18px;
          background: #0f172a;
          color: #fff;
          border: 0;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-cancel:hover { background: #1e293b; }

        .spinner {
          width: 34px;
          height: 34px;
          border: 3px solid #cbd5e1;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ---------- VISIBLE BUSY OVERLAY ---------- */
        .booklet-busy-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15,23,42,0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          animation: busyFadeIn .2s ease;
        }

        @keyframes busyFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .booklet-busy-card {
          background: #fff;
          border-radius: 16px;
          padding: 32px 40px;
          max-width: 380px;
          width: 90%;
          text-align: center;
          box-shadow: 0 30px 60px -20px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          animation: busyCardIn .25s cubic-bezier(.4,0,.2,1);
        }

        @keyframes busyCardIn {
          from { opacity: 0; transform: translateY(8px) scale(.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .booklet-busy-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: busySpin 0.85s linear infinite;
        }

        @keyframes busySpin {
          to { transform: rotate(360deg); }
        }

        .booklet-busy-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -.01em;
        }

        .booklet-busy-sub {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
          line-height: 1.5;
        }

        /* ---------- mobile ---------- */
        @media (max-width: 640px) {
          .booklet-overlay { padding: 0; }
          .booklet-modal { height: 100vh; border-radius: 0; max-width: 100%; }

          .booklet-header { padding: 10px 12px; gap: 10px; }
          .booklet-header-left h2 { font-size: 14px; }

          .booklet-actions { gap: 6px; }
          .booklet-actions button {
            padding: 11px 14px;
            font-size: 13px;
            border-radius: 10px;
            min-height: 42px;
            min-width: 42px;
            gap: 0;
            justify-content: center;
          }
          .booklet-actions button span { display: none; }
          .booklet-actions button svg { width: 18px; height: 18px; }

          .booklet-toolbar { gap: 16px; padding: 12px 12px; }
          .booklet-toolbar-label { font-size: 9px; }

          .booklet-chip {
            padding: 9px 14px;
            font-size: 13px;
            border-radius: 10px;
            min-height: 38px;
          }

          .booklet-fit-bar { padding: 8px 12px; font-size: 11px; gap: 6px; }

          .booklet-preview { padding: 16px 10px 30px; }
          .preview-pages { gap: 20px; }

          .booklet-busy-card {
            padding: 26px 24px;
            max-width: 300px;
          }
          .booklet-busy-spinner {
            width: 40px;
            height: 40px;
            border-width: 3.5px;
          }
          .booklet-busy-title { font-size: 15px; }
          .booklet-busy-sub { font-size: 12px; }
        }
      `}</style>
    </>,
    document.body
  );
};

export default BookletModal;