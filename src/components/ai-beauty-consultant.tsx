import { useState, useCallback } from "react";
import {
  Sparkles, ShieldAlert, Activity, Zap, Check, Loader2,
  RotateCcw, FileText, AlertTriangle, UploadCloud, HeartPulse,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

// ── types ─────────────────────────────────────────────────────────────────

interface LaserSettings {
  device: string;
  suitability: string;
  fluence: string;
  pulseDuration: string;
  cooling: string;
  reasoning: string;
}

interface AnalysisReport {
  analysis: string;
  fitzpatrickDangers: string;
  laserSettings: LaserSettings;
  treatmentSuggestions: string[];
  productRecommendations: string[];
  skincareRoutine: { morning: string; night: string };
}

// ── static metadata ───────────────────────────────────────────────────────

const SKIN_TYPES = [
  { title: "دهنية (Oily)",      desc: "إفراز دهني نشط، مسام واسعة، استعداد لحب الشباب.",                         value: "دهنية" },
  { title: "جافة (Dry)",        desc: "ملمس خشن، تقشر طفيف، خطوط تعبيرية مبكرة.",                                value: "جافة" },
  { title: "مختلطة (Combined)", desc: "منطقة T-Zone لامعة مع جفاف الوجنتين.",                                    value: "مختلطة" },
  { title: "حساسة (Sensitive)", desc: "احمرار فوري، تهيج سريع من المستحضرات.",                                   value: "حساسة" },
  { title: "عادية (Normal)",    desc: "إفرازات متوازنة، ملمس ناعم وخالٍ من العيوب البارزة.",                     value: "عادية" },
];

const FITZPATRICK_TYPES = [
  { type: "Type I",  title: "أبيض عاجي",       desc: "يحترق فوراً، لا يكتسب سمرة (حساسية مفرطة)." },
  { type: "Type II", title: "أبيض فاتح",        desc: "يحترق بسهولة، يكتسب سمرة طفيفة بصعوبة." },
  { type: "Type III", title: "أبيض متوسط",      desc: "يحترق أحياناً، يكتسب سمرة معتدلة تدريجياً." },
  { type: "Type IV", title: "حنطي شرقي",        desc: "يحترق نادراً، يكتسب سمرة داكنة فوراً (الشرق الأوسط)." },
  { type: "Type V",  title: "أسمر غامق",        desc: "لا يحترق، يكتسب سمرة كثيفة وعميقة." },
  { type: "Type VI", title: "أسمر داكن جداً",   desc: "بشرة صبغية عميقة، حساسة جداً لليزر." },
];

const CONCERNS = [
  { text: "حب الشباب والندوب",          val: "حب الشباب والندوب الجدارية" },
  { text: "الكلف والبقع والتصبغات",     val: "الكلف والتصبغات الداكنة" },
  { text: "الخطوط الدقيقة والتجاعيد",  val: "الخطوط والتجاعيد وفقدان الكولاجين" },
  { text: "المسام الواسعة",             val: "المسام الواسعة واحتقان الدهون" },
  { text: "الاحمرار والالتهاب",         val: "التهيج والالتهاب الوعائي السطحي" },
  { text: "الجفاف والبهتان",            val: "البهتان ونقص رطوبة الخلايا" },
];

const SKIN_SAMPLES = [
  { id: "dry_flake",    name: "تقشر وجفاف خلوي" },
  { id: "oily_pore",   name: "مسام واسعة ودهنية" },
  { id: "pigment_spot", name: "كلف وتصبغات سطحية" },
];

const SCAN_PHRASES = [
  "بدء تسلسل فحص الجلد البصري...",
  "تحديد معدلات الميلانين الصبغي...",
  "مطابقة الفئة الفيتزبارتيكية...",
  "صياغة معادلة حرق الطاقة لـ Nd:YAG...",
  "الربط بمستودع المستحضرات...",
  "مراجعة بروتوكولات الأمان الجلدي...",
  "صياغة التشخيص النهائي...",
];

// ── component ─────────────────────────────────────────────────────────────

export function AIBeautyConsultant() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState<"welcome" | "wizard" | "scanning" | "report">("welcome");
  const [wizardStep, setWizardStep] = useState(1);
  const [skinType, setSkinType] = useState("مختلطة (Combined)");
  const [fitzpatrick, setFitzpatrick] = useState("Type IV");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhrase, setScanPhrase] = useState(SCAN_PHRASES[0]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleConcern = useCallback((val: string) => {
    setSelectedConcerns(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    );
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUploadedBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startAnalysis = () => {
    setStep("scanning");
    setScanProgress(0);
    setError(null);
    let phraseIdx = 0;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          triggerApi();
          return 100;
        }
        if (prev > 0 && prev % 15 === 0 && phraseIdx < SCAN_PHRASES.length - 1) {
          phraseIdx++;
          setScanPhrase(SCAN_PHRASES[phraseIdx]);
        }
        return prev + 4;
      });
    }, 100);
  };

  const triggerApi = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/fn/analyze-skin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinType,
          concerns: selectedConcerns.join("، ") || "نضارة وصيانة عامة",
          fitzpatrick,
          customInput: customInput || null,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data: AnalysisReport = await res.json();
      setReport(data);
      setStep("report");
    } catch {
      setError("حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.");
      setStep("wizard");
      setWizardStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep("welcome");
    setWizardStep(1);
    setSelectedConcerns([]);
    setCustomInput("");
    setSelectedSample(null);
    setUploadedBase64(null);
    setReport(null);
    setError(null);
  };

  const hydrationPct = skinType.includes("Oily") || skinType.includes("عادية") ? "85%" : "44%";
  const melaninPct = fitzpatrick === "Type I" || fitzpatrick === "Type II" ? "20%"
    : fitzpatrick === "Type IV" ? "65%"
    : fitzpatrick === "Type V" || fitzpatrick === "Type VI" ? "90%" : "35%";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      {/* ── WELCOME ─────────────────────────────────────────────── */}
      {step === "welcome" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
                {t("ai_consultant.badge")}
              </span>
              <h3 className="text-sm font-bold text-foreground">{t("ai_consultant.title")}</h3>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed text-right">
            {t("ai_consultant.subtitle")}
          </p>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-[10px] text-muted-foreground text-right space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>بروتوكول فيتزباتريك للأمان الكامل</span>
            </div>
            <p className="mr-5">يُحدد كمية الميلانين ويحمي من التصبغات والحروق عند الجلسات.</p>
          </div>

          <Button onClick={() => setStep("wizard")} className="w-full rounded-xl">
            {t("ai_consultant.start")}
          </Button>
        </div>
      )}

      {/* ── WIZARD ──────────────────────────────────────────────── */}
      {step === "wizard" && (
        <div className="space-y-4">
          {/* header */}
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <span className="text-[8px] text-primary font-bold uppercase tracking-wider">Skin Consultation</span>
              <h3 className="text-xs font-bold text-foreground">{t("ai_consultant.wizard_header")}</h3>
            </div>
            <span className="text-[10px] bg-card border border-border px-2 py-0.5 rounded-lg text-muted-foreground font-mono">
              {t("ai_consultant.step_of")} {wizardStep} {t("ai_consultant.of")} 4
            </span>
          </div>

          {/* progress bar */}
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${(wizardStep / 4) * 100}%` }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Skin type */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-primary">
                {t("ai_consultant.step1_label")} — حددي نوع وطبيعة بشرتك
              </label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {SKIN_TYPES.map(item => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setSkinType(item.title)}
                    className={`w-full p-2.5 rounded-xl border text-right transition-all ${
                      skinType === item.title
                        ? "bg-primary/10 border-primary"
                        : "bg-card/50 border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-foreground">{item.title}</h4>
                      {skinType === item.title && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Fitzpatrick */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[9px] text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{t("ai_consultant.fitzpatrick_warning")}</p>
              </div>
              <label className="block text-[11px] font-bold text-primary">
                {t("ai_consultant.step2_label")} — تصنيف Fitzpatrick الصبغي
              </label>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {FITZPATRICK_TYPES.map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setFitzpatrick(item.type)}
                    className={`w-full p-2.5 rounded-xl border text-right transition-all ${
                      fitzpatrick === item.type
                        ? "bg-primary/10 border-primary"
                        : "bg-card/50 border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[9px] font-bold text-muted-foreground font-mono">{item.type}</span>
                        <h4 className="text-[10px] font-bold text-foreground">{item.title}</h4>
                      </div>
                      {fitzpatrick === item.type && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Concerns */}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-primary">
                {t("ai_consultant.step3_label")} — {t("ai_consultant.concerns_multi")}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {CONCERNS.map(item => {
                  const selected = selectedConcerns.includes(item.val);
                  return (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => toggleConcern(item.val)}
                      className={`p-3 rounded-xl border text-right flex flex-col justify-between min-h-[70px] transition-all ${
                        selected ? "bg-primary/10 border-primary" : "bg-card/50 border-border hover:border-border/80"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-foreground leading-tight">{item.text}</span>
                      <div className="flex justify-end pt-1">
                        <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-all ${
                          selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}>
                          {selected && <Check className="h-2.5 w-2.5" />}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground font-medium">
                  {t("ai_consultant.custom_concern")}
                </span>
                <textarea
                  rows={2}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  placeholder="مثال: كلف بسيط بعد الصيف..."
                  className="w-full text-[10px] bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-right resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4 — Photo */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <label className="block text-[11px] font-bold text-primary">
                {t("ai_consultant.step4_label")}
              </label>

              <div className="space-y-2">
                <span className="text-[9px] text-muted-foreground font-medium block">
                  {t("ai_consultant.photo_option_a")}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {SKIN_SAMPLES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelectedSample(s.id); setUploadedBase64(null); }}
                      className={`p-2 rounded-lg border text-[9px] text-center transition-all flex flex-col justify-between min-h-[50px] ${
                        selectedSample === s.id
                          ? "bg-primary/15 border-primary text-primary font-bold"
                          : "bg-card/50 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block">{s.name}</span>
                      <span className="text-[7px] text-muted-foreground block mt-0.5">محاكاة</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <span className="text-[9px] text-muted-foreground font-medium block">
                  {t("ai_consultant.photo_option_b")}
                </span>
                <label className="flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-xl border border-dashed border-border bg-muted/20 p-6 hover:border-primary transition-all">
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{t("ai_consultant.upload_hint")}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                {uploadedBase64 && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[9px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> صورة جاهزة للتحليل
                    </span>
                    <button onClick={() => setUploadedBase64(null)} className="text-destructive border border-destructive/20 px-1.5 rounded text-[8px]">
                      حذف
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* nav buttons */}
          <div className="flex gap-2 pt-3 border-t border-border">
            {wizardStep > 1 ? (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setWizardStep(p => p - 1)}>
                {t("ai_consultant.prev")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep("welcome")}>
                {t("ai_consultant.cancel")}
              </Button>
            )}

            {wizardStep < 4 ? (
              <Button size="sm" className="flex-[2]" onClick={() => setWizardStep(p => p + 1)}>
                {t("ai_consultant.next")}
              </Button>
            ) : (
              <Button size="sm" className="flex-[2] animate-pulse" onClick={startAnalysis} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                {t("ai_consultant.analyze")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── SCANNING ────────────────────────────────────────────── */}
      {step === "scanning" && (
        <div className="py-12 text-center space-y-6">
          <div className="relative mx-auto h-24 w-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-primary/40 animate-pulse" />
            <div className="h-16 w-16 rounded-full bg-card border border-primary flex items-center justify-center shadow-lg">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground">{t("ai_consultant.scanning")}</h4>
            <div className="mx-auto w-full max-w-xs h-2.5 rounded-full overflow-hidden bg-muted border border-border">
              <div
                className="bg-primary h-full transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-primary font-mono font-bold animate-pulse">
              {scanProgress}% — {scanPhrase}
            </p>
          </div>
        </div>
      )}

      {/* ── REPORT ──────────────────────────────────────────────── */}
      {step === "report" && report && (
        <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
          {/* header */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div>
              <span className="text-[7px] text-emerald-500 font-bold block uppercase tracking-widest">
                {t("ai_consultant.report_certified")}
              </span>
              <h3 className="text-xs font-bold text-foreground">{t("ai_consultant.report_title")}</h3>
            </div>
            <span className="rounded-full bg-emerald-500/20 text-emerald-500 font-mono font-bold px-2 py-0.5 text-[10px]">
              ✓ معتمد
            </span>
          </div>

          {/* quick stats */}
          <div className="grid grid-cols-2 gap-2 bg-card/50 p-2.5 rounded-xl border border-border">
            {[
              { label: t("ai_consultant.hydration_index"), pct: hydrationPct, color: "bg-primary" },
              { label: t("ai_consultant.melanin_index"),   pct: melaninPct,   color: "bg-amber-500" },
            ].map(s => (
              <div key={s.label} className="text-right">
                <span className="text-[8px] text-muted-foreground">{s.label}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: s.pct }} />
                  </div>
                  <span className="text-[9px] font-mono text-foreground font-bold">{s.pct}</span>
                </div>
              </div>
            ))}
          </div>

          {/* diagnosis */}
          <div className="space-y-1 rounded-xl border border-border bg-card/70 p-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-primary">
              <HeartPulse className="h-3.5 w-3.5" />
              {t("ai_consultant.section_diagnosis")}
            </h4>
            <p className="text-[10px] text-foreground leading-relaxed text-right">{report.analysis}</p>
          </div>

          {/* fitzpatrick danger */}
          <div className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              تنبيهات الأمان لـ {fitzpatrick}
            </h4>
            <p className="text-[10px] text-foreground leading-relaxed text-right">{report.fitzpatrickDangers}</p>
          </div>

          {/* laser protocol */}
          <div className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-primary">
              <Zap className="h-3.5 w-3.5" />
              {t("ai_consultant.section_laser")}
            </h4>
            {[
              { label: t("ai_consultant.device"),      val: report.laserSettings.device },
              { label: t("ai_consultant.suitability"), val: report.laserSettings.suitability },
              { label: t("ai_consultant.fluence"),     val: report.laserSettings.fluence },
              { label: t("ai_consultant.pulse"),       val: report.laserSettings.pulseDuration },
              { label: t("ai_consultant.cooling"),     val: report.laserSettings.cooling },
            ].map(row => (
              <div key={row.label} className="flex justify-between gap-2 text-right border-b border-border/40 pb-1 last:border-0 last:pb-0">
                <span className="text-[8px] text-primary font-bold font-mono shrink-0">{row.label}</span>
                <span className="text-[9px] text-foreground">{row.val}</span>
              </div>
            ))}
            <p className="mt-1 text-[9px] text-muted-foreground text-right italic">{report.laserSettings.reasoning}</p>
          </div>

          {/* treatment suggestions */}
          <div className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-primary">
              <Activity className="h-3.5 w-3.5" />
              {t("ai_consultant.section_treatments")}
            </h4>
            <ol className="space-y-1">
              {report.treatmentSuggestions.map((s, i) => (
                <li key={i} className="flex gap-2 items-start text-right">
                  <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold font-mono">{i + 1}</span>
                  <p className="text-[10px] text-foreground">{s}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* products */}
          <div className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-primary">
              <FileText className="h-3.5 w-3.5" />
              {t("ai_consultant.section_products")}
            </h4>
            <ul className="space-y-1">
              {report.productRecommendations.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-right">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-[10px] text-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* routine */}
          <div className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
            <h4 className="flex items-center gap-1 text-[10px] font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("ai_consultant.section_routine")}
            </h4>
            {[
              { label: t("ai_consultant.morning"), val: report.skincareRoutine.morning },
              { label: t("ai_consultant.night"),   val: report.skincareRoutine.night },
            ].map(row => (
              <div key={row.label} className="text-right">
                <span className="text-[9px] font-bold text-primary">{row.label}</span>
                <p className="text-[10px] text-foreground mt-0.5">{row.val}</p>
              </div>
            ))}
          </div>

          {/* actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={reset} className="flex-1">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {t("ai_consultant.reset")}
            </Button>
            <Button size="sm" className="flex-[2]" onClick={() => navigate({ to: "/centers" })}>
              {t("ai_consultant.book_now")} →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
