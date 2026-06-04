import { useRef, useState } from "react";

const ACCEPTED = ".docx,.doc,.md,.markdown,.txt";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Dropzone({
  file,
  onSelect,
  onClear,
  disabled = false,
  icon = "📄",
  title = "Drag & drop a file",
  hint = "or browse files · .docx, .md, .txt",
  label,
  status,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    if (files && files.length > 0) onSelect(files[0]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="dropzone-block">
      {label && <p className="dropzone-block__label">{label}</p>}
      <div
        className={`dropzone ${dragging ? "dropzone--active" : ""} ${
          file ? "dropzone--has-file" : ""
        } ${disabled ? "dropzone--disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          hidden
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {!file ? (
          <div className="dropzone__empty">
            <div className="dropzone__icon">{icon}</div>
            <p className="dropzone__title">{title}</p>
            <p className="dropzone__hint">{hint}</p>
          </div>
        ) : (
          <div className="file-chip">
            <span className="file-chip__icon">📑</span>
            <div className="file-chip__meta">
              <span className="file-chip__name">{file.name}</span>
              <span className="file-chip__size">{formatSize(file.size)}</span>
            </div>
            {status && <span className="file-chip__status">{status}</span>}
            {!disabled && (
              <button
                className="file-chip__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                aria-label="Remove file"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
