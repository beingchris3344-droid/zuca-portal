// Trigger a browser download from a Blob or Uint8Array.
// Works in every modern browser, revokes the object URL after 1s to free memory.
export function downloadBlob(data, filename, mime = "application/pdf") {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "1234567" -> "1.2 MB"
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// "assignment.pdf" -> "assignment-merged.pdf"
// Used so the student never overwrites their original.
export function withSuffix(name, suffix) {
  if (!name) return `zuca-${suffix}.pdf`;
  const base = name.replace(/\.pdf$/i, "");
  return `${base}-${suffix}.pdf`;
}