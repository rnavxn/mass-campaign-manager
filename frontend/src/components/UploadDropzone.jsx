import { UploadCloud, FileText } from 'lucide-react';

export function UploadDropzone({ file, onChange }) {
  return (
    <label className="relative border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer group">
      <input
        type="file"
        accept=".csv"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={e => onChange(e.target.files[0])}
      />
      {file ? (
        <>
          <FileText className="text-accent mb-3" size={32} />
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
        </>
      ) : (
        <>
          <UploadCloud className="text-muted group-hover:text-accent transition-colors mb-3" size={32} />
          <p className="text-sm font-medium">Click or drag CSV here</p>
          <p className="text-xs text-muted mt-1">contact, name columns required</p>
        </>
      )}
    </label>
  );
}