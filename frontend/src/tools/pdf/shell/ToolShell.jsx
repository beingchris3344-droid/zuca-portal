import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUpload, FiX, FiDownload, FiLoader, FiCheckCircle, FiArrowLeft, FiPlus,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { downloadBlob, formatBytes } from "../lib/download";
import { kindOf, isHeic } from "../lib/readFile";

export default function ToolShell({
  title,
  subtitle,
  accept = "application/pdf",
  multiple = false,
  files,
  setFiles,
  onProcess,                 // async (files) => Uint8Array | Blob
  outputName = "zuca-output.pdf",
  processLabel = "Process",
  options,                   // optional JSX between filelist and button
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // --- pick new files -----------------------------------------------------
  const pick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";                 // allow re-picking same file
    if (!picked.length) return;

    // Reject HEIC immediately (pdf-lib can't read it)
    const heic = picked.find(isHeic);
    if (heic) {
      toast.error(`${heic.name} is HEIC (iPhone). Please convert it to JPG first.`);
      return;
    }

    // Reject unsupported types
    const bad = picked.find((f) => kindOf(f) === "unknown");
    if (bad) {
      toast.error(`${bad.name} is not a supported file.`);
      return;
    }

    setFiles(multiple ? [...files, ...picked] : [picked[0]]);
    setDone(false);
  };

  const remove = (i) => {
    setFiles(files.filter((_, idx) => idx !== i));
    setDone(false);
  };

  // --- run the tool -------------------------------------------------------
  const run = async () => {
    if (!files.length) return toast.error("Choose a file first");
    setBusy(true);
    setDone(false);

    // Optimistic: show success state immediately after start feels smooth
    // (real completion replaces it below; errors revert it)
    const t = toast.loading("Processing…");
    try {
      const result = await onProcess(files);
      downloadBlob(result, outputName);
      toast.success("Done — check your downloads", { id: t });
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Something went wrong", { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pdf-shell">
      <button className="pdf-back" onClick={() => navigate("/tools/pdf")}>
        <FiArrowLeft /> All tools
      </button>

      <header className="pdf-shell-head">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>

      {!files.length ? (
        <label className="pdf-drop">
          <FiUpload size={36} />
          <b>Choose {multiple ? "files" : "a file"}</b>
          <span>
            {accept.includes("image")
              ? "PDF or JPG/PNG photos"
              : "PDF files only"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            hidden
            onChange={pick}
          />
        </label>
      ) : (
        <div className="pdf-filelist">
          {files.map((f, i) => (
            <div key={i} className="pdf-file">
              <span className="pdf-file-name">{f.name}</span>
              <span className="pdf-file-size">{formatBytes(f.size)}</span>
              <button onClick={() => remove(i)} aria-label="Remove">
                <FiX />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="pdf-addmore"
            onClick={() => inputRef.current?.click()}
          >
            <FiPlus /> Add more
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            hidden
            onChange={pick}
          />
        </div>
      )}

      {options}

      <button
        type="button"
        className="pdf-run"
        onClick={run}
        disabled={busy || !files.length}
      >
        {busy ? (
          <>
            <FiLoader className="spin" /> Working…
          </>
        ) : done ? (
          <>
            <FiCheckCircle /> Done — process again
          </>
        ) : (
          <>
            <FiDownload /> {processLabel}
          </>
        )}
      </button>
    </div>
  );
}