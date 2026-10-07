import { useNavigate } from "react-router-dom";
import {
  FiImage, FiLayers, FiRotateCw,
  FiMinimize2, FiScissors, FiDroplet, FiHash, FiLock, FiType,
  FiFileText, FiExternalLink, FiCpu, FiZap, FiGlobe, FiEdit3, FiTrash2,
  FiCopy, FiTrendingUp, FiCamera,     
} from "react-icons/fi";
import { FaGlobe } from "react-icons/fa";



const SERVER_TOOL = [
  {
    id: "compress",
    label: "Zetech E-lerning portal",
    desc: "Open (ZDS) portal",
    icon: FaGlobe,
    url: "https://elearning.zetech.ac.ke/my/",
    ready: true,
  },
   {
    id: "compress",
    label: "Zetech Students portal",
    desc: "Open main students portal",
    icon: FiGlobe,
    url: "https://student.zetech.ac.ke/index.php",
    ready: false,
  },
]
// ================================================================
// BROWSER TOOLS — the ones you built. Untouched.
// ================================================================
const TOOLS = [
  
  {
    id: "image-to-pdf",
    label: "Image to PDF",
    desc: "Photos → one clean PDF",
    icon: FiImage,
    ready: true,
  },
  {
    id: "merge",
    label: "Merge PDFs",
    desc: "Combine multiple files",
    icon: FiLayers,
    ready: true,
  },
  {
    id: "rotate",
    label: "Rotate PDF",
    desc: "Fix sideways scans",
    icon: FiRotateCw,
    ready: true,
  },
  {
    id: "split",
    label: "Split PDF",
    desc: "Extract or remove pages",
    icon: FiScissors,
    ready: true,
  },
  {
    id: "watermark",
    label: "Watermark",
    desc: "Stamp name + reg number",
    icon: FiDroplet,
    ready: true,
  },
  {
    id: "page-numbers",
    label: "Page numbers",
    desc: "Number every page",
    icon: FiHash,
    ready: true,
  },
  {
    id: "fill-sign",
    label: "Sign PDF",
    desc: "Draw & place a signature",
    icon: FiType,
    ready: true,
  },
];

// ================================================================
// SERVER TOOLS — open iLovePDF in a new tab
// ================================================================
const SERVER_TOOLS = [
  
  {
    id: "compress",
    label: "Compress PDF",
    desc: "Shrink file size",
    icon: FiMinimize2,
    url: "https://www.ilovepdf.com/compress_pdf",
  },
  {
    id: "word-to-pdf",
    label: "Word to PDF",
    desc: "DOCX → PDF",
    icon: FiFileText,
    url: "https://www.ilovepdf.com/word_to_pdf",
  },
  {
    id: "pdf-to-word",
    label: "PDF to Word",
    desc: "PDF → editable DOCX",
    icon: FiEdit3,
    url: "https://www.ilovepdf.com/pdf_to_word",
  },
  {
    id: "pdf-to-excel",
    label: "PDF to Excel",
    desc: "Extract tables → XLSX",
    icon: FiCopy,
    url: "https://www.ilovepdf.com/pdf_to_excel",
  },
  {
    id: "excel-to-pdf",
    label: "Excel to PDF",
    desc: "XLSX → PDF",
    icon: FiFileText,
    url: "https://www.ilovepdf.com/excel_to_pdf",
  },
  {
    id: "ppt-to-pdf",
    label: "PowerPoint to PDF",
    desc: "PPTX → PDF",
    icon: FiFileText,
    url: "https://www.ilovepdf.com/powerpoint_to_pdf",
  },
  {
    id: "pdf-to-jpg",
    label: "PDF to JPG",
    desc: "Extract pages as images",
    icon: FiImage,
    url: "https://www.ilovepdf.com/pdf_to_jpg",
  },
  {
    id: "protect",
    label: "Protect PDF",
    desc: "Add a password",
    icon: FiLock,
    url: "https://www.ilovepdf.com/protect-pdf",
  },
  {
    id: "unlock",
    label: "Unlock PDF",
    desc: "Remove password",
    icon: FiLock,
    url: "https://www.ilovepdf.com/unlock_pdf",
  },
  {
    id: "ocr",
    label: "OCR PDF",
    desc: "Make scans searchable",
    icon: FiGlobe,
    url: "https://www.ilovepdf.com/ocr-pdf",
  },
  {
    id: "edit",
    label: "Edit PDF",
    desc: "Add text & shapes",
    icon: FiEdit3,
    url: "https://www.ilovepdf.com/edit-pdf",
  },
  {
    id: "organize",
    label: "Organize PDF",
    desc: "Reorder or delete pages",
    icon: FiLayers,
    url: "https://www.ilovepdf.com/organize-pdf",
  },
  {
    id: "crop",
    label: "Crop PDF",
    desc: "Trim margins",
    icon: FiScissors,
    url: "https://www.ilovepdf.com/crop-pdf",
  },
  {
    id: "repair",
    label: "Repair PDF",
    desc: "Fix corrupted files",
    icon: FiTrendingUp,
    url: "https://www.ilovepdf.com/repair-pdf",
  },
  {
    id: "redact",
    label: "Redact PDF",
    desc: "Remove sensitive info",
    icon: FiTrash2,
    url: "https://www.ilovepdf.com/redact-pdf",
  },

    {
    id: "remove-pages",
    label: "Remove pages",
    desc: "Delete pages from a PDF",
    icon: FiTrash2,
    url: "https://www.ilovepdf.com/remove-pages",
  },
  {
    id: "extract-pages",
    label: "Extract pages",
    desc: "Pull pages into a new PDF",
    icon: FiScissors,
    url: "https://www.ilovepdf.com/split_pdf#split,extract",
  },
  {
    id: "scan-to-pdf",
    label: "Scan to PDF",
    desc: "Camera scan → PDF",
    icon: FiCamera,
    url: "https://www.ilovepdf.com/scan-pdf",
  },
  {
    id: "html-to-pdf",
    label: "HTML to PDF",
    desc: "Webpage URL → PDF",
    icon: FiGlobe,
    url: "https://www.ilovepdf.com/html-to-pdf",
  },
  {
    id: "pdf-to-ppt",
    label: "PDF to PowerPoint",
    desc: "PDF → editable PPTX",
    icon: FiEdit3,
    url: "https://www.ilovepdf.com/pdf_to_powerpoint",
  },
  {
    id: "pdf-to-pdfa",
    label: "PDF to PDF/A",
    desc: "Archive-safe format",
    icon: FiFileText,
    url: "https://www.ilovepdf.com/convert-pdf-to-pdfa",
  },
  {
    id: "pdf-forms",
    label: "PDF Forms",
    desc: "Fill or create forms",
    icon: FiEdit3,
    url: "https://www.ilovepdf.com/pdf-forms",
  },
  {
    id: "compare-pdf",
    label: "Compare PDF",
    desc: "Spot changes between files",
    icon: FiCopy,
    url: "https://www.ilovepdf.com/compare-pdf",
  },
];

// ================================================================
// AI TOOLS — iLovePDF's AI-powered features
// ================================================================
const AI_TOOLS = [
  {
    id: "ai-summary",
    label: "AI Summarizer",
    desc: "Summarize long PDFs",
    icon: FiCpu,
    url: "https://www.ilovepdf.com/pdf-summarize",
  },
  {
    id: "translate",
    label: "Translate PDF",
    desc: "AI-powered translation",
    icon: FiGlobe,
    url: "https://www.ilovepdf.com/translate-pdf",
  },
  {
    id: "pdf-to-md",
    label: "PDF to Markdown",
    desc: "For notes & LLMs",
    icon: FiZap,
    url: "https://www.ilovepdf.com/pdf-to-markdown",
  },
];

export default function PdfToolHub() {
  const navigate = useNavigate();

  return (
    <div className="pdf-hub">
      <header className="pdf-hub-head">
        <h1>PDF Tools</h1>
        <p>
          Prepare your documents before you upload. All in one place.
        </p>
      </header>


       {/* ========== SERVER TOOLS ========== */}
      <section className="pdf-hub-section">
        <div className="pdf-hub-section-head">
          <h2>ZETECH LINKS</h2>
          <p>Useful links to open school portals</p>
        </div>
        <div className="pdf-hub-grid">
          {SERVER_TOOL.map(({ id, label, desc, icon: Icon, url }) => (
            <a
              key={id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-hub-card pdf-hub-card-external"
            >
              <span className="pdf-hub-icon"><Icon size={22} /></span>
              <b>{label}</b>
              <span className="pdf-hub-desc">{desc}</span>
              <FiExternalLink size={13} className="pdf-hub-external-badge" />
            </a>
          ))}
        </div>
      </section>

      {/* ========== BROWSER TOOLS ========== */}
      <section className="pdf-hub-section">
        <div className="pdf-hub-section-head">
          <h2>On your device</h2>
          <p>Private files never leave your phone</p>
        </div>
        <div className="pdf-hub-grid">
          {TOOLS.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="pdf-hub-card"
              onClick={() => navigate(`/tools/pdf/${id}`)}
            >
              <span className="pdf-hub-icon"><Icon size={22} /></span>
              <b>{label}</b>
              <span className="pdf-hub-desc">{desc}</span>
            </button>
          ))}
        </div>
      </section>

      

      {/* ========== SERVER TOOLS ========== */}
      <section className="pdf-hub-section">
        <div className="pdf-hub-section-head">
          <h2>WEB TOOLS</h2>
          <p>Convert any document here in ZUCA app</p>
        </div>
        <div className="pdf-hub-grid">
          {SERVER_TOOLS.map(({ id, label, desc, icon: Icon, url }) => (
            <a
              key={id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-hub-card pdf-hub-card-external"
            >
              <span className="pdf-hub-icon"><Icon size={22} /></span>
              <b>{label}</b>
              <span className="pdf-hub-desc">{desc}</span>
              <FiExternalLink size={13} className="pdf-hub-external-badge" />
            </a>
          ))}
        </div>
      </section>


      

      {/* ========== AI TOOLS ========== */}
      <section className="pdf-hub-section">
        <div className="pdf-hub-section-head">
          <h2>✨ AI tools</h2>
          <p>Smart document processing</p>
        </div>
        <div className="pdf-hub-grid">
          {AI_TOOLS.map(({ id, label, desc, icon: Icon, url }) => (
            <a
              key={id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-hub-card pdf-hub-card-external"
            >
              <span className="pdf-hub-icon"><Icon size={22} /></span>
              <b>{label}</b>
              <span className="pdf-hub-desc">{desc}</span>
              <FiExternalLink size={13} className="pdf-hub-external-badge" />
            </a>
          ))}
        </div>
      </section>

      <footer className="pdf-hub-foot">
        <p>
           Please note that <strong>ZUCA</strong> values your <strong>privacy</strong>; hence, On-device tools never upload your files they are processed locally on your device.
          
        </p>
      </footer>

      <style>{`
        /* Section layout */
        .pdf-hub-section{
          margin-bottom:32px;
        }
        .pdf-hub-section-head{
          margin-bottom:12px;
        }
        .pdf-hub-section-head h2{
          font-size:15px;
          font-weight:800;
          letter-spacing:-.2px;
          margin:0 0 2px;
          color:#0f172a;
        }
        .pdf-hub-section-head p{
          margin:0;
          font-size:12px;
          color:#64748b;
          font-weight:500;
        }

        /* External cards are <a> tags — make them match the button cards */
        .pdf-hub-card-external{
          text-decoration:none;
          color:inherit;
          position:relative;
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:10px;
          padding:18px;
          background:#fff;
          border:1px solid #e2e8f0;
          border-radius:16px;
          cursor:pointer;
          text-align:left;
          transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease;
        }
        .pdf-hub-card-external:hover{
          border-color:#0f172a;
          transform:translateY(-2px);
          box-shadow:0 12px 26px -16px rgba(15,23,42,.35);
        }
        .pdf-hub-external-badge{
          position:absolute;
          top:14px;
          right:14px;
          color:#94a3b8;
          transition:color .18s ease;
        }
        .pdf-hub-card-external:hover .pdf-hub-external-badge{
          color:#0f172a;
        }

        @media (max-width:520px){
          .pdf-hub-card-external{
            padding:14px;
            border-radius:14px;
          }
        }
      `}</style>
    </div>
  );
}