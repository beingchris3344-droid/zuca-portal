import { useNavigate } from "react-router-dom";
import {
  FiImage, FiLayers, FiRotateCw,
  FiMinimize2, FiScissors, FiDroplet, FiHash, FiLock, FiType,
} from "react-icons/fi";

const TOOLS = [
  // ---- Ready now ----
  {
    id: "image-to-pdf",
    label: "Image to PDF",
    desc: "Photos → one clean PDF",
    icon: FiImage,
    ready: true,
    accent: "#0ea5e9",
  },
  {
    id: "merge",
    label: "Merge PDFs",
    desc: "Combine multiple files",
    icon: FiLayers,
    ready: true,
    accent: "#8b5cf6",
  },
  {
    id: "rotate",
    label: "Rotate PDF",
    desc: "Fix sideways scans",
    icon: FiRotateCw,
    ready: true,
    accent: "#10b981",
  },

  // ---- Coming soon ----
  {
    id: "compress",
    label: "Compress PDF",
    desc: "Shrink file size for uploads",
    icon: FiMinimize2,
    ready: false,
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
  ready: true,  },
  {
    id: "protect",
    label: "Protect PDF",
    desc: "Add a password",
    icon: FiLock,
    ready: true,
  },
  {
    id: "fill-sign",
    label: "Fill & Sign",
    desc: "Add text or signature",
    icon: FiType,
    ready: true,
  },
];

export default function PdfToolHub() {
  const navigate = useNavigate();

  return (
    <div className="pdf-hub">
      <header className="pdf-hub-head">
        <h1>PDF Tools</h1>
        <p>
          Prepare your documents before you upload.
          Everything runs on your device — nothing is sent to the server.
        </p>
      </header>

      <div className="pdf-hub-grid">
        {TOOLS.map(({ id, label, desc, icon: Icon, ready, accent }) => (
          <button
            key={id}
            type="button"
            className={`pdf-hub-card ${ready ? "" : "soon"}`}
            onClick={() => ready && navigate(`/tools/pdf/${id}`)}
            disabled={!ready}
            style={ready ? { "--accent": accent } : undefined}
          >
            <span className="pdf-hub-icon">
              <Icon size={22} />
            </span>
            <b>{label}</b>
            <span className="pdf-hub-desc">{desc}</span>
            {!ready && <em>Coming soon</em>}
          </button>
        ))}
      </div>

      <footer className="pdf-hub-foot">
        <p>
          🔒 Files never leave your phone. All processing happens in your browser.
        </p>
      </footer>
    </div>
  );
}