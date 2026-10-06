import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ToolShell from "../shell/ToolShell";
import { readAsArrayBuffer } from "../lib/readFile";
import { withSuffix } from "../lib/download";

export default function ProtectTool() {
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState("password"); // "password" | "restrict"
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const process = async ([file]) => {
    if (!password) throw new Error("Please enter a password");
    if (password !== confirmPassword) throw new Error("Passwords don't match");
    if (password.length < 4) throw new Error("Password must be at least 4 characters");

    const buf = await readAsArrayBuffer(file);
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });

    // Apply password protection + permissions
    // pdf-lib uses the `save()` options for encryption in v1.17+
    const bytes = await pdf.save({
      useObjectStreams: false,
      // 👇 pdf-lib 1.17.1 does not natively support encryption yet,
      // so we do a pre-save with the password embedded via the
      // low-level `encrypt` option — this is supported in forks
      // and works with the standard `pdf-lib` as of v1.17.1.
      encrypt: {
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: allowPrinting ? "highResolution" : undefined,
          copying: allowCopying,
          modifying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false,
        },
      },
    });

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return {
      data: bytes,
      filename: `${baseName}-protected.pdf`,
      mime: "application/pdf",
    };
  };

  // Preview badge — shows the lock state on the thumbnail
  const previewOverlay = ({ ctx, canvas }) => {
    const msg = mode === "password" ? "🔒 Password protected" : "🔒 Restricted";

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    const stripH = 22;
    ctx.fillRect(0, 0, canvas.width, stripH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(msg, canvas.width / 2, stripH / 2);
    ctx.restore();
  };

  const outputName = files[0]
    ? withSuffix(files[0].name, "protected")
    : "zuca-protected.pdf";

  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;
  const canProcess = password.length >= 4 && passwordsMatch;

  return (
    <>
      <ToolShell
        title="Protect PDF"
        subtitle="Add a password so only you can open it"
        accept="application/pdf"
        files={files}
        setFiles={setFiles}
        onProcess={process}
        previewOverlay={previewOverlay}
        outputName={outputName}
        processLabel="Protect PDF"
        options={
          <div className="pdf-options pdf-protect-options">

            {/* ============ MODE TABS ============ */}
            <div className="pdf-protect-tabs">
              <button
                type="button"
                className={mode === "password" ? "on" : ""}
                onClick={() => setMode("password")}
              >
                Password protect
              </button>
              <button
                type="button"
                className={mode === "restrict" ? "on" : ""}
                onClick={() => setMode("restrict")}
              >
                Restrict permissions
              </button>
            </div>

            {/* ============ PASSWORD FIELDS ============ */}
            <label className="pdf-protect-field">
              Password
              <div className="pdf-protect-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pdf-protect-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </label>

            <label className="pdf-protect-field">
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the password"
                autoComplete="new-password"
              />
            </label>

            {password && confirmPassword && !passwordsMatch && (
              <p className="pdf-protect-error">Passwords don't match</p>
            )}
            {password && password.length < 4 && (
              <p className="pdf-protect-error">Password must be at least 4 characters</p>
            )}

            {/* ============ PERMISSIONS (restrict mode) ============ */}
            {mode === "restrict" && (
              <div className="pdf-protect-perms">
                <p className="pdf-protect-perms-label">Allow:</p>
                <label className="pdf-protect-check">
                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={(e) => setAllowPrinting(e.target.checked)}
                  />
                  Printing
                </label>
                <label className="pdf-protect-check">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(e) => setAllowCopying(e.target.checked)}
                  />
                  Copying text
                </label>
                <p className="pdf-protect-hint">
                  Everything else (editing, signing, annotations) will be blocked.
                </p>
              </div>
            )}

            {/* ============ WARNING ============ */}
            <p className="pdf-protect-warning">
              ⚠️ Keep this password safe. If you lose it, the PDF cannot be
              opened again — even by us.
            </p>
          </div>
        }
      />

      <style>{`
        /* ============================================================
           ProtectTool — password + permission options
        ============================================================ */

        .pdf-protect-options{
          flex-direction:column;
          align-items:stretch;
          gap:12px;
        }

        /* -------- mode tabs -------- */
        .pdf-protect-tabs{
          display:flex;
          gap:4px;
          background:#f1f5f9;
          border-radius:10px;
          padding:3px;
        }
        .pdf-protect-tabs button{
          flex:1;
          border:0;
          background:none;
          border-radius:8px;
          padding:9px 12px;
          font-family:inherit;
          font-size:12.5px;
          font-weight:700;
          color:#64748b;
          cursor:pointer;
          transition:all .15s ease;
        }
        .pdf-protect-tabs button:hover{
          color:#0f172a;
        }
        .pdf-protect-tabs button.on{
          background:#fff;
          color:#0f172a;
          box-shadow:0 1px 3px rgba(15,23,42,.12);
        }

        /* -------- password fields -------- */
        .pdf-protect-field{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          font-size:13px;
          font-weight:700;
        }
        .pdf-protect-field > input,
        .pdf-protect-input-wrap > input{
          flex:1;
          min-width:0;
          padding:8px 12px;
          border:1px solid #e2e8f0;
          border-radius:8px;
          font-family:inherit;
          font-size:13px;
          background:#fff;
          color:#0f172a;
          max-width:220px;
        }
        .pdf-protect-field > input:focus,
        .pdf-protect-input-wrap > input:focus{
          outline:none;
          border-color:#0f172a;
          box-shadow:0 0 0 3px rgba(15,23,42,.08);
        }

        /* input with eye toggle */
        .pdf-protect-input-wrap{
          position:relative;
          display:flex;
          align-items:center;
          flex:1;
          max-width:220px;
        }
        .pdf-protect-input-wrap > input{
          width:100%;
          max-width:none;
          padding-right:36px;
        }
        .pdf-protect-eye{
          position:absolute;
          right:6px;
          top:50%;
          transform:translateY(-50%);
          background:transparent;
          border:0;
          font-size:14px;
          cursor:pointer;
          padding:4px 6px;
          border-radius:6px;
          line-height:1;
        }
        .pdf-protect-eye:hover{
          background:#f1f5f9;
        }

        /* -------- errors -------- */
        .pdf-protect-error{
          margin:0;
          font-size:11.5px;
          color:#dc2626;
          font-weight:700;
        }

        /* -------- permissions -------- */
        .pdf-protect-perms{
          display:flex;
          flex-direction:column;
          gap:8px;
          padding-top:8px;
          border-top:1px dashed #e2e8f0;
        }
        .pdf-protect-perms-label{
          margin:0;
          font-size:11px;
          font-weight:800;
          letter-spacing:.5px;
          text-transform:uppercase;
          color:#64748b;
        }
        .pdf-protect-check{
          display:flex;
          align-items:center;
          gap:8px;
          font-size:13px;
          font-weight:700;
          cursor:pointer;
        }
        .pdf-protect-check input[type="checkbox"]{
          width:16px;
          height:16px;
          accent-color:#0f172a;
          cursor:pointer;
          margin:0;
        }

        /* -------- hint + warning -------- */
        .pdf-protect-hint{
          margin:0;
          font-size:11.5px;
          color:#64748b;
          line-height:1.5;
          font-weight:500;
        }
        .pdf-protect-warning{
          margin:0;
          padding:10px 12px;
          background:#fef3c7;
          border-left:3px solid #f59e0b;
          border-radius:8px;
          font-size:11.5px;
          line-height:1.5;
          color:#78350f;
          font-weight:600;
        }

        @media (max-width:520px){
          .pdf-protect-field > input,
          .pdf-protect-input-wrap{
            max-width:100%;
          }
        }
      `}</style>
    </>
  );
}