import { useRef, useState } from 'react';
import './FileDropzone.css';

interface Props {
  file: File | null;
  onChange: (file: File) => void;
  accept?: string;
  hint?: string;
  multiple?: false;
}

export default function FileDropzone({ file, onChange, accept, hint = 'PDF, Word, Excel, PowerPoint, Imagens' }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  }

  function formatSize(bytes: number) {
    return bytes >= 1024 * 1024
      ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
      : Math.round(bytes / 1024) + ' KB';
  }

  return (
    <div
      className={`file-dropzone${dragging ? ' file-dropzone--dragging' : ''}${file ? ' file-dropzone--has-file' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }}
      />

      {file ? (
        <>
          <span className="material-symbols-outlined file-dropzone__icon file-dropzone__icon--file">description</span>
          <span className="file-dropzone__filename">{file.name}</span>
          <span className="file-dropzone__size">{formatSize(file.size)}</span>
          <span className="file-dropzone__change">Clique para trocar o arquivo</span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined file-dropzone__icon">upload_file</span>
          <span className="file-dropzone__label">
            Arraste o arquivo aqui ou <strong>clique para selecionar</strong>
          </span>
          <span className="file-dropzone__hint">{hint}</span>
        </>
      )}
    </div>
  );
}
