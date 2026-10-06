// ---- File reader helpers ------------------------------------------------

// Read any File/Blob as ArrayBuffer (used by pdf-lib to load PDFs)
export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsArrayBuffer(file);
  });
}

// Read any File/Blob as DataURL (used to embed images in pdf-lib)
export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

// ---- File type detection -----------------------------------------------

// Returns "pdf", "image", or "unknown" for any File object.
export function kindOf(file) {
  if (!file) return "unknown";
  const mime = file.type || "";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  // Fallbacks based on extension when the browser doesn't set a mime.
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (/\.(jpe?g|png|gif|webp|bmp)$/.test(name)) return "image";
  return "unknown";
}

// HEIC/HEIF files come from iPhones and pdf-lib cannot read them.
// We detect them here so the UI can show a friendly warning.
export function isHeic(file) {
  if (!file) return false;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return mime.includes("heic") || mime.includes("heif") ||
         name.endsWith(".heic") || name.endsWith(".heif");
}