import { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  ShieldCheck,
  RefreshCw,
  ZoomIn,
  HardDrive,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  category: "client_skin" | "doctor_cert" | "clinic_facility" | "admin_banner";
  originalSize: string;
  compressedSize: string;
  timestamp: string;
}

type FileCategory = UploadedFile["category"];

export interface ImageUploadWidgetProps {
  currentRole?: "super_admin" | "country_admin" | "center_owner" | "doctor" | "customer";
  onFileUploadSuccess?: (file: UploadedFile) => void;
}

function defaultCategory(role: ImageUploadWidgetProps["currentRole"]): FileCategory {
  if (role === "customer") return "client_skin";
  if (role === "doctor") return "doctor_cert";
  if (role === "center_owner") return "clinic_facility";
  return "admin_banner";
}

const DEMO_GALLERY: UploadedFile[] = [
  {
    id: "IMG-01",
    name: "forehead_diagnostic_raw.jpg",
    url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=80",
    category: "client_skin",
    originalSize: "4.8 MB",
    compressedSize: "1.9 MB",
    timestamp: "2026-05-25 14:20",
  },
  {
    id: "IMG-02",
    name: "laser_safety_cert.pdf",
    url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
    category: "doctor_cert",
    originalSize: "8.2 MB",
    compressedSize: "2.4 MB",
    timestamp: "2026-05-25 15:10",
  },
  {
    id: "IMG-03",
    name: "clinic_reception.jpg",
    url: "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=300&auto=format&fit=crop&q=80",
    category: "clinic_facility",
    originalSize: "12.4 MB",
    compressedSize: "3.8 MB",
    timestamp: "2026-05-25 11:45",
  },
];

const FALLBACK_URLS: Record<FileCategory, string> = {
  client_skin: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=80",
  doctor_cert: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&auto=format&fit=crop&q=80",
  clinic_facility: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=300&auto=format&fit=crop&q=80",
  admin_banner: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&auto=format&fit=crop&q=80",
};

export function ImageUploadWidget({
  currentRole = "customer",
  onFileUploadSuccess,
}: ImageUploadWidgetProps) {
  const { t } = useI18n();

  const [dragActive, setDragActive] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>(
    defaultCategory(currentRole)
  );
  const [uploadedGallery, setUploadedGallery] = useState<UploadedFile[]>(DEMO_GALLERY);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sizeLog, setSizeLog] = useState<{ original: string; compressed: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const processFile = (file: File) => {
    setCompressing(true);
    setProgress(0);
    setPreviewImage(null);
    setSizeLog(null);

    const originalKb = Math.floor(file.size / 1024);
    const originalStr =
      originalKb > 1024
        ? `${(originalKb / 1024).toFixed(1)} MB`
        : `${originalKb} KB`;

    const compressedKb = Math.floor(originalKb * 0.38);
    const compressedStr =
      compressedKb > 1024
        ? `${(compressedKb / 1024).toFixed(1)} MB`
        : `${compressedKb} KB`;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);

          const reader = new FileReader();
          reader.onloadend = () => {
            const url = (reader.result as string) || FALLBACK_URLS[selectedCategory];
            setPreviewImage(url);
            setCompressing(false);

            const newFile: UploadedFile = {
              id: `IMG-${Math.floor(100 + Math.random() * 900)}`,
              name: file.name,
              url,
              category: selectedCategory,
              originalSize: originalStr,
              compressedSize: compressedStr,
              timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
            };

            setUploadedGallery((prev) => [newFile, ...prev]);
            setSizeLog({ original: originalStr, compressed: compressedStr });
            onFileUploadSuccess?.(newFile);
          };
          reader.readAsDataURL(file);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  const filteredGallery = uploadedGallery.filter((f) => f.category === selectedCategory);

  const CATEGORY_TABS: { id: FileCategory; label: string }[] = [
    { id: "client_skin", label: t("image_upload.diagnostic_skin") },
    { id: "doctor_cert", label: t("image_upload.doctor_certs") },
    { id: "clinic_facility", label: t("image_upload.facilities") },
  ];

  return (
    <div className="p-5 bg-card border border-border rounded-2xl shadow-soft">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-primary" />
            {t("image_upload.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("image_upload.subtitle")}
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex bg-secondary p-0.5 rounded-lg border border-border text-xs font-semibold">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-2.5 py-1 rounded transition-all ${
                selectedCategory === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60 bg-muted/20"
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileInput}
          className="hidden"
          accept="image/*,application/pdf"
        />
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-primary">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {t("image_upload.drag_drop")}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP, PDF</p>
        </div>
      </div>

      {/* Progress bar */}
      {compressing && (
        <div className="mt-4 p-3 bg-muted/50 border border-border rounded-xl space-y-2 animate-pulse">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span className="font-mono">{progress}%</span>
            <span className="font-semibold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {t("image_upload.processing")}
            </span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success banner */}
      {sizeLog && !compressing && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs text-emerald-600 dark:text-emerald-300">
            <span className="font-bold block">{t("image_upload.success")}</span>
            <span className="font-mono">
              {t("image_upload.size_before")} {sizeLog.original} &nbsp;|&nbsp;{" "}
              {t("image_upload.size_after")} <strong>{sizeLog.compressed}</strong>
            </span>
          </div>
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      )}

      {/* Preview */}
      {previewImage && (
        <div className="mt-4 p-3 bg-secondary border border-border rounded-xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-1.5 mb-2">
            <span className="font-semibold">{t("image_upload.preview")}</span>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">
              {t("image_upload.staging_ready")}
            </span>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden relative border border-border bg-background/40">
            <img
              src={previewImage}
              alt="Upload preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2.5">
              <span className="text-xs text-white/80 font-mono flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-primary" />
                {t("image_upload.click_inspect")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className="mt-5 space-y-2.5">
        <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider font-mono border-b border-border pb-1">
          {t("image_upload.gallery")}
        </h4>

        {filteredGallery.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-2 text-center">
            {t("image_upload.empty")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredGallery.map((img) => (
              <div
                key={img.id}
                className="p-1.5 bg-muted/60 rounded-xl border border-border hover:border-primary/30 transition-all flex flex-col gap-1"
              >
                <div className="aspect-square w-full rounded-lg overflow-hidden border border-border bg-background/20">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-semibold text-foreground block truncate">
                    {img.name}
                  </span>
                  <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground mt-0.5">
                    <span>{img.compressedSize}</span>
                    <span>{img.timestamp.split(" ")[1]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
