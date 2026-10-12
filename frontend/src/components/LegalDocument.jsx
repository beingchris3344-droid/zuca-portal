import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import slide1 from "../assets/background2.webp";
import slide2 from "../assets/2.jpg";
import slide3 from "../assets/3.jpg";
import slide4 from "../assets/4.jpg";
import slide5 from "../assets/5.jpg";
import slide6 from "../assets/6.jpg";
import slide7 from "../assets/7.jpg";
import slide8 from "../assets/8.jpg";
import slide9 from "../assets/9.jpg";
import slide10 from "../assets/10.jpg";
import slide11 from "../assets/11.jpg";
import slide12 from "../assets/12.jpg";

/* ============================================================
   LegalDocument — bilingual premium document renderer
   ============================================================ */

const slides = [
  slide1, slide2, slide3, slide4, slide5, slide6,
  slide7, slide8, slide9, slide10, slide11, slide12,
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
];

function makeSectionId(title, index) {
  const n = String(title).match(/^(\d+)/);
  if (n) return `section${n[1]}`;
  return `section${index + 1}`;
}

/* Detect user's preferred language from browser */
function detectDefaultLanguage() {
  try {
    const saved = localStorage.getItem("zucaLanguage");
    if (saved === "en" || saved === "sw") return saved;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("sw")) return "sw";
  } catch {
    /* noop */
  }
  return "en";
}

export default function LegalDocument({ data }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [language, setLanguage] = useState(detectDefaultLanguage);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchInputRef = useRef(null);
  const bodyRef = useRef(null);

  /* Persist language */
  useEffect(() => {
    try {
      localStorage.setItem("zucaLanguage", language);
    } catch {
      /* noop */
    }
  }, [language]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = data.documentTitle || "ZUCA";
  }, [data.documentTitle]);

  /* Slideshow */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* Build section list with ids and language-aware titles */
  const sections = useMemo(
    () =>
      (data.sections || []).map((s, i) => {
        const sw = s.kiswahili || {};
        return {
          ...s,
          id: makeSectionId(s.title, i),
          displayTitle: language === "sw" && sw.title ? sw.title : s.title,
          paragraphs:
            language === "sw" && sw.paragraphs
              ? sw.paragraphs
              : s.paragraphs || [],
          list: language === "sw" && sw.list ? sw.list : s.list || [],
          orderedList:
            language === "sw" && sw.orderedList
              ? sw.orderedList
              : s.orderedList || [],
          paragraphsAfter:
            language === "sw" && sw.paragraphsAfter
              ? sw.paragraphsAfter
              : s.paragraphsAfter || [],
          tables:
            language === "sw" && sw.tables ? sw.tables : s.tables || [],
          subsections:
            language === "sw" && sw.subsections
              ? sw.subsections
              : s.subsections || [],
        };
      }),
    [data.sections, language]
  );

  /* Display header text per language */
  const headerTitle =
    language === "sw" && data.kiswahili?.title
      ? data.kiswahili.title
      : data.title;
  const headerSubtitle =
    language === "sw" && data.kiswahili?.subtitle
      ? data.kiswahili.subtitle
      : data.subtitle;
  const headerMeta =
    language === "sw" && data.kiswahili?.meta
      ? data.kiswahili.meta
      : data.meta;
  const headerFooterNote =
    language === "sw" && data.kiswahili?.footerNote
      ? data.kiswahili.footerNote
      : data.footerNote;
  const headerReference = headerMeta?.[2]?.value || "ZUCA LEGAL";

  /* Scroll spy */
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.max(0, Math.min(100, pct)));
      setShowBackToTop(scrollTop > 400);

      let current = "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - 120 <= 0) current = s.id;
        else break;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !searchOpen) {
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
      if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
        if (mobileTocOpen) setMobileTocOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, mobileTocOpen]);

  /* Deep-link pulse */
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      el.classList.add("isPulsing");
      setTimeout(() => el.classList.remove("isPulsing"), 2200);
    }, 200);
  }, []);

  const goToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
    setMobileTocOpen(false);
    setSearchOpen(false);
  };

  const copySectionLink = (id) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard?.writeText(url);
  };

  const handlePrint = () => window.print();

  /* Search matches across the currently displayed language */
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches = new Set();
    sections.forEach((s) => {
      const blocks = [];
      (s.paragraphs || []).forEach((p) => blocks.push(stripHtml(p)));
      (s.list || []).forEach((p) => blocks.push(stripHtml(p)));
      (s.orderedList || []).forEach((p) => blocks.push(stripHtml(p)));
      (s.tables || []).forEach((t) => {
        t.rows?.forEach((row) =>
          row.forEach((cell) => blocks.push(stripHtml(cell)))
        );
      });
      blocks.forEach((text) => {
        if (text.toLowerCase().includes(q)) matches.add(s.id);
      });
    });
    return Array.from(matches);
  }, [searchQuery, sections]);

  const nextMatch = () => {
    if (!searchMatches.length) return;
    const idx = searchMatches.indexOf(activeSection);
    const next = searchMatches[(idx + 1) % searchMatches.length];
    goToSection(next);
  };

  /* Reading time */
  const readingMinutes = useMemo(() => {
    let words = 0;
    sections.forEach((s) => {
      const blocks = [];
      (s.paragraphs || []).forEach((p) => blocks.push(stripHtml(p)));
      (s.list || []).forEach((p) => blocks.push(stripHtml(p)));
      (s.orderedList || []).forEach((p) => blocks.push(stripHtml(p)));
      (s.tables || []).forEach((t) => {
        t.rows?.forEach((row) =>
          row.forEach((cell) => blocks.push(stripHtml(cell)))
        );
      });
      blocks.forEach((text) => {
        words += text.trim().split(/\s+/).length;
      });
    });
    return Math.max(1, Math.round(words / 220));
  }, [sections]);

  /* Current section index for progress text */
  const currentIndex =
    sections.findIndex((s) => s.id === activeSection) + 1;

  /* Labels per language */
  const L = language === "sw"
    ? {
        contents: "Yaliyomo",
        search: "Tafuta",
        print: "Chapisha",
        backToTop: "Juu",
        readingTime: "dakika",
        readLabel: "Kusoma",
        noMatches: "Hakuna matokeo",
        matches: "matokeo",
        next: "Ifuatayo",
        wasHelpful: "Je, ukurasa huu ulikusaidia?",
        yes: "Ndiyo",
        no: "Hapana",
        issuedBy: "Imetolewa kwa niaba ya",
      }
    : {
        contents: "Contents",
        search: "Search",
        print: "Print",
        backToTop: "Back to top",
        readingTime: "min read",
        readLabel: "",
        noMatches: "No matches",
        matches: "matches",
        next: "Next",
        wasHelpful: "Was this document helpful?",
        yes: "Yes",
        no: "No",
        issuedBy: "Issued on behalf of",
      };

  return (
    <div className="doc">
      <div className="docBackground" aria-hidden="true">
        {slides.map((img, i) => (
          <div
            key={i}
            className={`docBackgroundSlide ${i === currentSlide ? "isActive" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="docBackgroundVeil" />
      </div>

      <div className="docProgress" aria-hidden="true">
        <div className="docProgressBar" style={{ width: `${progress}%` }} />
      </div>

      <div className="docToolbar">
        <div className="docToolbarInner">
          <div className="docToolbarBrand">
            <span className="docToolbarRef">{headerReference}</span>
          </div>

          <div className="docToolbarSearch">
            <button
              type="button"
              className="docSearchTrigger"
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 30);
              }}
            >
              <span>{L.search}</span>
              <span className="docSearchKbd">/</span>
            </button>
          </div>

          <div className="docToolbarActions">
            <div className="docLang">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`docLangButton ${language === lang.code ? "isActive" : ""}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="docToolbarButton"
            >
              {L.print}
            </button>
            <button
              type="button"
              onClick={() => setMobileTocOpen((v) => !v)}
              className="docToolbarButton docToolbarButtonToc"
            >
              {L.contents}
            </button>
          </div>
        </div>

        {mobileTocOpen && (
          <nav className="docMobileToc">
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToSection(s.id)}
                    className={`docMobileTocLink ${activeSection === s.id ? "isActive" : ""}`}
                  >
                    {s.displayTitle}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      <div className="docLayout">
        <aside className="docSidebar">
          <div className="docSidebarInner">
            <p className="docSidebarTitle">{L.contents}</p>
            <ol className="docSidebarList">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToSection(s.id)}
                    className={`docSidebarLink ${activeSection === s.id ? "isActive" : ""}`}
                  >
                    <span className="docSidebarNum">
                      {s.id.replace("section", "").padStart(2, "0")}
                    </span>
                    <span className="docSidebarLabel">{s.displayTitle}</span>
                  </button>
                </li>
              ))}
            </ol>
            {currentIndex > 0 && (
              <p className="docSidebarProgress">
                {currentIndex} / {sections.length}
              </p>
            )}
          </div>
        </aside>

        <main className="docPage" ref={bodyRef}>
          <article className="docBody">
           <header className="docHeader">
  <div className="docHeaderBack">
    <button
      type="button"
      className="docBackLink"
      onClick={() => window.history.back()}
    >
      <span aria-hidden="true">←</span>
      {language === "sw" ? "Rudi Nyuma" : "Back"}
    </button>
  </div>
  <p className="docReference">{headerReference}</p>
  <h1 className="docTitle">{headerTitle}</h1>
  {headerSubtitle && (
    <p className="docSubtitle">{headerSubtitle}</p>
  )}
  <p className="docReadingTime">
    {L.readLabel} {readingMinutes} {L.readingTime}
  </p>
</header>

            {headerMeta && headerMeta.length > 0 && (
              <div className="docChips">
                {headerMeta.map((item, i) => (
                  <span key={i} className="docChip">
                    <span className="docChipLabel">{item.label}</span>
                    <span className="docChipValue">{item.value}</span>
                  </span>
                ))}
              </div>
            )}

            {sections.map((section) => (
              <Section
                key={section.id}
                section={section}
                searchQuery={searchQuery}
                onCopyLink={() => copySectionLink(section.id)}
              />
            ))}

            {headerFooterNote && (
              <footer className="docFooterNote">
                <p>{headerFooterNote}</p>
              </footer>
            )}

            <footer className="docSignature">
              <p className="docSignatureLine">{L.issuedBy}</p>
              <p className="docSignatureName">
                Zetech University Catholic Action
              </p>
            </footer>

            <div className="docHelpful">
              <span className="docHelpfulLabel">{L.wasHelpful}</span>
              <button type="button" className="docHelpfulBtn">
                👍 {L.yes}
              </button>
              <button type="button" className="docHelpfulBtn">
                👎 {L.no}
              </button>
            </div>
          </article>
        </main>
      </div>

      {searchOpen && (
        <div
          className="docSearchOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="docSearchPalette">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={L.search}
              className="docSearchPaletteInput"
            />
            <div className="docSearchMeta">
              {searchQuery
                ? searchMatches.length > 0
                  ? `${searchMatches.length} ${L.matches}`
                  : L.noMatches
                : ""}
              {searchQuery && searchMatches.length > 0 && (
                <button
                  type="button"
                  onClick={nextMatch}
                  className="docSearchNext"
                >
                  {L.next}
                </button>
              )}
            </div>
            {searchQuery && searchMatches.length > 0 && (
              <ul className="docSearchResults">
                {searchMatches.map((id) => {
                  const s = sections.find((x) => x.id === id);
                  if (!s) return null;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => goToSection(id)}
                        className="docSearchResultItem"
                      >
                        {s.displayTitle}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {showBackToTop && (
        <button
          type="button"
          className="docBackTop"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          }
        >
          {L.backToTop}
        </button>
      )}

      <style>{`
        .doc {
          position: relative;
          min-height: 100vh;
          padding: 72px 16px 80px;
          background: #071936;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }

        .docBackground {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .docBackgroundSlide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1.4s ease;
        }
        .docBackgroundSlide.isActive { opacity: 1; }
        .docBackgroundVeil {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(6, 17, 38, 0.62) 0%,
            rgba(6, 17, 38, 0.78) 50%,
            rgba(6, 17, 38, 0.9) 100%
          );
          backdrop-filter: blur(3px);
          webkitBackdropFilter: blur(3px);
        }

        .docProgress {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: transparent;
          z-index: 40;
        }
        .docProgressBar {
          height: 100%;
          background: linear-gradient(90deg, #0ea5e9, #34d399);
          transition: width 0.08s linear;
        }

        .docToolbar {
          position: fixed;
          top: 3px; left: 0; right: 0;
          z-index: 30;
          background: rgba(9, 24, 48, 0.92);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(10px);
          webkitBackdropFilter: blur(10px);
        }
        .docToolbarInner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .docToolbarBrand { flex: 0 0 auto; }
        .docToolbarRef {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: rgba(255,255,255,0.72);
          text-transform: uppercase;
        }

        .docToolbarSearch { flex: 1 1 auto; display: flex; justify-content: center; }
        .docSearchTrigger {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7);
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 220px;
          justify-content: space-between;
        }
        .docSearchTrigger:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.22);
          color: #fff;
        }
        .docSearchKbd {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10.5px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .docToolbarActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }
        .docLang {
          display: inline-flex;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 7px;
          overflow: hidden;
          background: rgba(255,255,255,0.04);
        }
        .docLangButton {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.66);
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .docLangButton:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
        }
        .docLangButton.isActive {
          background: #0ea5e9;
          color: #fff;
        }
        .docToolbarButton {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.16);
          color: rgba(255,255,255,0.82);
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .docToolbarButton:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.28);
          color: #fff;
        }
        .docToolbarButtonToc { display: none; }

        .docMobileToc {
          background: rgba(9, 24, 48, 0.98);
          border-top: 1px solid rgba(255,255,255,0.08);
          max-height: 60vh;
          overflow-y: auto;
          padding: 8px 0 12px;
        }
        .docMobileToc ol { list-style: none; margin: 0; padding: 0; }
        .docMobileToc li { margin: 0; }
        .docMobileTocLink {
          display: block;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.75);
          font-family: inherit;
          font-size: 13px;
          padding: 10px 22px;
          cursor: pointer;
          border-left: 3px solid transparent;
        }
        .docMobileTocLink:hover {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .docMobileTocLink.isActive {
          color: #fff;
          border-left-color: #0ea5e9;
          background: rgba(14,165,233,0.1);
        }

        .docLayout {
          position: relative;
          z-index: 2;
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 32px;
          align-items: start;
        }

        .docSidebar {
          position: sticky;
          top: 88px;
          align-self: start;
        }
        .docSidebarInner {
          padding: 20px 16px;
          background: rgba(9, 24, 48, 0.72);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          backdrop-filter: blur(8px);
          webkitBackdropFilter: blur(8px);
        }
        .docSidebarTitle {
          margin: 0 0 14px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }
        .docSidebarList {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 66vh;
          overflow-y: auto;
        }

        .footer-legal button {
  font-size: 0.85em;
  opacity: 0.75;
}
        .docSidebarList li { margin: 0; }
        .docSidebarLink {
          display: flex;
          align-items: baseline;
          gap: 10px;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.66);
          font-family: inherit;
          font-size: 12px;
          line-height: 1.4;
          padding: 7px 10px;
          border-left: 2px solid transparent;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
        }
        .docSidebarNum {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10.5px;
          color: rgba(255,255,255,0.4);
          flex: 0 0 22px;
        }
        .docSidebarLabel {
          flex: 1;
        }
        .docSidebarLink:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }
        .docSidebarLink.isActive {
          color: #fff;
          border-left-color: #0ea5e9;
          background: rgba(14,165,233,0.12);
        }
        .docSidebarLink.isActive .docSidebarNum {
          color: #38bdf8;
        }
        .docSidebarProgress {
          margin: 14px 0 0;
          font-size: 10.5px;
          font-family: ui-monospace, monospace;
          color: rgba(255,255,255,0.4);
          text-align: right;
          letter-spacing: 0.06em;
        }

        .docPage {
          background: #ffffff;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow:
            0 40px 100px rgba(0,0,0,0.5),
            0 6px 20px rgba(0,0,0,0.25);
        }

        .docBody {
          padding: 72px 80px 80px;
          font-size: 15px;
          line-height: 1.75;
          color: #1e293b;
        }

        /* Header */
        .docHeader {
          text-align: center;
          padding-bottom: 30px;
          margin-bottom: 32px;
          border-bottom: 1px solid #e2e8f0;
        }
        .docReference {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #64748b;
          margin: 0 0 18px;
        }
        .docTitle {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 40px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0;
          line-height: 1.1;
        }
        .docSubtitle {
          margin: 10px 0 0;
          font-size: 15px;
          color: #64748b;
          font-style: italic;
        }
        .docReadingTime {
          margin: 14px 0 0;
          font-size: 12.5px;
          color: #94a3b8;
          letter-spacing: 0.02em;
        }

        .docHeaderBack {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
}
.docBackLink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.docBackLink:hover {
  color: #0ea5e9;
  background: #f0f9ff;
}

       /* Meta — plain text lines, no background */
.docChips {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 40px;
  margin: 0 0 44px;
  padding: 0 0 22px;
  border-bottom: 1px solid #e2e8f0;
}
.docChip {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 0;
  font-size: 13.5px;
  color: #0f172a;
  border-bottom: 1px solid #f1f5f9;
}
.docChip:last-child {
  border-bottom: none;
}
.docChipLabel {
  flex: 0 0 130px;
  font-weight: 600;
  color: #64748b;
  font-size: 12.5px;
  letter-spacing: 0.01em;
}
.docChipValue {
  font-weight: 500;
  color: #0f172a;
  font-size: 13.5px;
}
        /* Sections */
        .docSection {
          margin: 0 0 40px;
          scroll-margin-top: 100px;
          padding: 4px 0 4px 0;
          transition: background 0.6s ease;
          border-radius: 6px;
        }
        .docSection.isPulsing {
          background: #fef9c3;
          animation: docPulse 2.2s ease-out;
        }
        @keyframes docPulse {
          0% { background: #fef3c7; }
          100% { background: transparent; }
        }
        .docSectionHeader {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 18px;
        }
        .docSection:first-child .docSectionHeader { margin-top: 0; }
        .docH2 {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: baseline;
          gap: 14px;
        }
        .docH2Num {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 13px;
          font-weight: 600;
          color: #0ea5e9;
          letter-spacing: 0.04em;
        }
        .docCopyLink {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-family: inherit;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 5px;
          opacity: 0;
          transition: opacity 0.15s, color 0.15s, background 0.15s;
          font-weight: 600;
        }
        .docSectionHeader:hover .docCopyLink { opacity: 1; }
        .docCopyLink:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .docH3 {
          font-size: 15.5px;
          font-weight: 700;
          color: #0f172a;
          margin: 26px 0 10px;
          letter-spacing: -0.005em;
        }

        .docP {
          margin: 0 0 14px;
          color: #334155;
        }

        .docList {
          margin: 0 0 16px;
          padding-left: 22px;
          color: #334155;
        }
        .docList li {
          margin-bottom: 8px;
          padding-left: 4px;
        }
        .docList li::marker { color: #94a3b8; }

        .docAddress {
          margin: 0 0 16px;
          padding: 14px 18px;
          background: #f8fafc;
          border-left: 3px solid #0ea5e9;
          border-radius: 4px;
          font-size: 14.5px;
          color: #334155;
        }
        .docAddress p { margin: 0 0 4px; }
        .docAddress p:last-child { margin-bottom: 0; }

        /* Tables — soft, premium */
        .docTableWrap {
          margin: 0 0 26px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          background: #fff;
        }
        .docTableCaption {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
          margin: 0;
          padding: 14px 18px 0;
        }
        .docTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .docTable th,
        .docTable td {
          padding: 12px 18px;
          text-align: left;
          vertical-align: top;
          border-bottom: 1px solid #f1f5f9;
        }
        .docTable th {
          font-weight: 700;
          font-size: 11.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
          background: #f8fafc;
        }
        .docTable tbody tr:last-child td { border-bottom: none; }
        .docTable tbody tr:hover td { background: #fbfdff; }
        .docTable td:first-child {
          font-weight: 600;
          color: #0f172a;
          width: 34%;
        }

        /* Footer */
        .docFooterNote {
          margin: 48px 0 0;
          padding: 20px 22px;
          background: #f8fafc;
          border-left: 3px solid #0ea5e9;
          border-radius: 4px;
          font-size: 13px;
          color: #475569;
          font-style: italic;
        }
        .docFooterNote p { margin: 0; }

        .docSignature {
          margin: 40px 0 0;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          font-size: 13.5px;
        }
        .docSignatureLine {
          margin: 0 0 4px;
          color: #64748b;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .docSignatureName {
          margin: 0;
          font-weight: 700;
          color: #0f172a;
        }

        .docHelpful {
          margin: 36px 0 0;
          padding: 20px 22px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }
        .docHelpfulLabel {
          flex: 1;
          font-size: 13.5px;
          font-weight: 600;
          color: #475569;
          min-width: 200px;
        }
        .docHelpfulBtn {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .docHelpfulBtn:hover {
          border-color: #0ea5e9;
          background: #f0f9ff;
          color: #0369a1;
        }

        .docBody a {
          color: #0369a1;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Search palette overlay */
        .docSearchOverlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(6, 17, 38, 0.75);
          backdrop-filter: blur(6px);
          webkitBackdropFilter: blur(6px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
        }
        .docSearchPalette {
          width: 100%;
          max-width: 560px;
          margin: 0 16px;
          background: #0b2347;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 30px 90px rgba(0,0,0,0.6);
        }
        .docSearchPaletteInput {
          width: 100%;
          padding: 18px 20px;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .docSearchPaletteInput::placeholder { color: rgba(255,255,255,0.4); }
        .docSearchMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          font-size: 11.5px;
          color: rgba(255,255,255,0.6);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          letter-spacing: 0.04em;
        }
        .docSearchNext {
          background: rgba(14,165,233,0.25);
          color: #fff;
          border: 1px solid rgba(14,165,233,0.55);
          padding: 4px 12px;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
        }
        .docSearchNext:hover { background: rgba(14,165,233,0.4); }
        .docSearchResults {
          list-style: none;
          margin: 0;
          padding: 6px 0 10px;
          max-height: 46vh;
          overflow-y: auto;
        }
        .docSearchResultItem {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.82);
          font-family: inherit;
          font-size: 13px;
          padding: 11px 20px;
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: all 0.12s ease;
        }
        .docSearchResultItem:hover {
          background: rgba(255,255,255,0.05);
          color: #fff;
          border-left-color: #0ea5e9;
        }

        .docBackTop {
          position: fixed;
          bottom: 22px;
          right: 22px;
          z-index: 25;
          background: rgba(9, 24, 48, 0.94);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 11px 16px;
          border-radius: 999px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          webkitBackdropFilter: blur(8px);
          transition: all 0.15s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .docBackTop:hover {
          background: #0ea5e9;
          border-color: #0ea5e9;
        }

        @media (max-width: 1020px) {
          .docLayout {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .docSidebar { display: none; }
          .docToolbarButtonToc { display: inline-flex; }
        }

        @media (max-width: 720px) {
          .doc { padding: 68px 8px 40px; }
          .docBody { padding: 32px 20px 44px; font-size: 14.5px; }
          .docTitle { font-size: 28px; }
          .docH2 { font-size: 18px; }
          .docTable { font-size: 13px; }
          .docTable th,
          .docTable td { padding: 10px 12px; }
          .docToolbarInner { padding: 8px 12px; gap: 10px; }
          .docToolbarRef { display: none; }
          .docToolbarSearch { order: 3; flex: 1 1 100%; }
          .docSearchTrigger { min-width: 0; width: 100%; justify-content: center; }
          .docToolbarActions { margin-left: auto; }
          .docBackTop { bottom: 14px; right: 14px; padding: 9px 13px; font-size: 11.5px; }
           .docChips {
    grid-template-columns: 1fr;
    gap: 0;
    margin-bottom: 32px;
  }
  .docChip {
    flex-direction: row;
    padding: 8px 0;
    font-size: 13px;
  }
  .docChipLabel {
    flex: 0 0 130px;
    font-size: 12px;
  }
  .docChipValue {
    font-size: 13px;
  }
}

        @media print {
          .doc { background: #fff; padding: 0; }
          .docBackground,
          .docToolbar,
          .docProgress,
          .docSidebar,
          .docBackTop,
          .docSearchOverlay,
          .docHelpful { display: none !important; }
          .docLayout { display: block; max-width: none; margin: 0; }
          .docPage { border: none; box-shadow: none; border-radius: 0; }
          .docBody { padding: 0; font-size: 11pt; }
          .docTitle { font-family: "Times New Roman", serif; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   Section renderer
   ============================================================ */
function Section({ section, searchQuery, onCopyLink }) {
  const numMatch = String(section.title).match(/^(\d+)/);
  const num = numMatch ? numMatch[1].padStart(2, "0") : "";
  const cleanedTitle = numMatch
    ? String(section.title).replace(/^\d+\.\s*/, "")
    : section.title;

  return (
    <section className="docSection" id={section.id}>
      {section.title && (
        <div className="docSectionHeader">
          <h2 className="docH2">
            {num && <span className="docH2Num">{num}</span>}
            <span>{cleanedTitle}</span>
          </h2>
          <button
            type="button"
            className="docCopyLink"
            onClick={onCopyLink}
            title="Copy link to this section"
          >
            Copy link
          </button>
        </div>
      )}

      {section.paragraphs?.map((p, i) => (
        <p
          key={i}
          className="docP"
          dangerouslySetInnerHTML={{ __html: highlight(stripHtml(p), searchQuery) }}
        />
      ))}

      {section.address && (
        <div className="docAddress">
          {section.address.map((line, i) => (
            <p
              key={i}
              dangerouslySetInnerHTML={{ __html: highlight(stripHtml(line), searchQuery) }}
            />
          ))}
        </div>
      )}

      {section.list && (
        <ul className="docList">
          {section.list.map((item, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: highlight(stripHtml(item), searchQuery) }}
            />
          ))}
        </ul>
      )}

      {section.orderedList && (
        <ol className="docList">
          {section.orderedList.map((item, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: highlight(stripHtml(item), searchQuery) }}
            />
          ))}
        </ol>
      )}

      {section.tables?.map((tbl, ti) => (
        <div key={ti} className="docTableWrap">
          {tbl.caption && <p className="docTableCaption">{tbl.caption}</p>}
          <table className="docTable">
            <thead>
              <tr>
                {tbl.headers.map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tbl.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      dangerouslySetInnerHTML={{
                        __html: highlight(stripHtml(cell), searchQuery),
                      }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {section.paragraphsAfter?.map((p, i) => (
        <p
          key={`pa${i}`}
          className="docP"
          dangerouslySetInnerHTML={{ __html: highlight(stripHtml(p), searchQuery) }}
        />
      ))}

      {section.subsections?.map((sub, i) => (
        <div key={i}>
          {sub.title && <h3 className="docH3">{sub.title}</h3>}

          {sub.paragraphs?.map((p, j) => (
            <p
              key={j}
              className="docP"
              dangerouslySetInnerHTML={{ __html: highlight(stripHtml(p), searchQuery) }}
            />
          ))}

          {sub.list && (
            <ul className="docList">
              {sub.list.map((item, j) => (
                <li
                  key={j}
                  dangerouslySetInnerHTML={{ __html: highlight(stripHtml(item), searchQuery) }}
                />
              ))}
            </ul>
          )}

          {sub.orderedList && (
            <ol className="docList">
              {sub.orderedList.map((item, j) => (
                <li
                  key={j}
                  dangerouslySetInnerHTML={{ __html: highlight(stripHtml(item), searchQuery) }}
                />
              ))}
            </ol>
          )}

          {sub.paragraphsAfter?.map((p, j) => (
            <p
              key={`spa${j}`}
              className="docP"
              dangerouslySetInnerHTML={{ __html: highlight(stripHtml(p), searchQuery) }}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

/* ---------- helpers ---------- */
function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlight(text, query) {
  const safe = escapeHtml(text);
  if (!query || !query.trim()) return safe;
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${q})`, "gi");
  return safe.replace(
    regex,
    '<mark style="background:#fef3c7;padding:0 2px;border-radius:2px;">$1</mark>'
  );
}