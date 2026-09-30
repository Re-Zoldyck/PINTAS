import React from "react";
import { ImageUp, X, CheckCircle2 } from "lucide-react";
import { FileDropzone } from "./FileDropzone";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { useFileUpload, UploadedFile } from "../helpers/useFileUpload";
import type { UploadKind } from "../endpoints/uploads/presign_POST.schema";
import styles from "./FileUploadField.module.css";

interface Props {
  kind: UploadKind;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  title?: string;
  subtitle?: string;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export const FileUploadField: React.FC<Props> = ({
  kind,
  value,
  onChange,
  title = "Klik atau seret file ke sini",
  subtitle = "PNG, JPG, atau WebP — maks. 4 MB",
  accept = "image/png,image/jpeg,image/webp",
  disabled,
  className,
}) => {
  const { upload, isUploading, error, clearError } = useFileUpload(kind);

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const result = await upload(file);
    if (result) onChange(result);
  };

  if (value) {
    return (
      <div className={`${styles.preview} ${className ?? ""}`}>
        <img src={value.url} alt={value.name} className={styles.image} />
        <div className={styles.previewMeta}>
          <span className={styles.previewName}>
            <CheckCircle2 size={16} className={styles.okIcon} /> {value.name}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)} disabled={disabled}>
            <X size={14} /> Ganti file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      {isUploading ? (
        <div className={styles.uploading}>
          <Spinner size="sm" /> Mengunggah…
        </div>
      ) : (
        <FileDropzone
          accept={accept}
          maxFiles={1}
          maxSize={10 * 1024 * 1024}
          disabled={disabled}
          onFilesSelected={handleFiles}
          icon={<ImageUp size={32} />}
          title={title}
          subtitle={subtitle}
        />
      )}
      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <Button variant="ghost" size="icon-sm" onClick={clearError} aria-label="Tutup">
            <X size={14} />
          </Button>
        </div>
      )}
    </div>
  );
};