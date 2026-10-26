import React from "react";
import { 
  ShoppingBag, Bus, GraduationCap, HeartPulse, 
  Landmark, Zap, Palmtree, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
  FileCode2, Info
} from "lucide-react";
import { PolicySectorMetric, PolicySectorId, Comment } from "../types";
import { POLICY_SECTOR_IDS } from "../utils/analytics";
import { CODEBOOK_VERSION, CODEBOOK_NAME } from "../utils/codebook";

interface PolicySectorsMatrixProps {
  policySectors: Record<string, PolicySectorMetric>;
  selectedSector: string | null;
  onSelectSector: (sectorId: string | null) => void;
  lang?: "ar" | "en";
  themeMode?: "dark" | "light";
  comments?: Comment[];
}

const SECTOR_ICONS: Record<PolicySectorId, React.ReactNode> = {
  cost_of_living: <ShoppingBag className="w-5 h-5" />,
  public_transport: <Bus className="w-5 h-5" />,
  education_employment: <GraduationCap className="w-5 h-5" />,
  healthcare: <HeartPulse className="w-5 h-5" />,
  gov_services: <Landmark className="w-5 h-5" />,
  energy_water: <Zap className="w-5 h-5" />,
  tourism: <Palmtree className="w-5 h-5" />,
  social_protection: <ShieldCheck className="w-5 h-5" />
};

export default function PolicySectorsMatrix({
  policySectors,
  selectedSector,
  onSelectSector,
  lang = "ar",
  themeMode = "dark"
}: PolicySectorsMatrixProps) {
  const isDark = themeMode === "dark";

  return (
    <div className="space-y-4" id="policy-sectors-matrix">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-4 bg-[#007A3D] rounded-sm inline-block" />
              {lang === "ar" 
                ? "مصفوفة القطاعات السياساتية الثمانية (لجنة السياسات الاجتماعية)" 
                : "8 Priority Social Policy Sectors Matrix"}
            </h2>
            <span 
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center gap-1 shadow-xs" 
              title={CODEBOOK_NAME}
            >
              <FileCode2 className="w-3 h-3 text-emerald-400" />
              <span>codebook: {CODEBOOK_VERSION}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === "ar"
              ? `تصنيف المحتوى ورصد مؤشرات الرأي العام ومستوى المخاطر للقطاعات المعتمدة وفق دليل التصنيف الوطني (${CODEBOOK_VERSION})`
              : `Content classification, public opinion indices, and risk assessment calibrated to National Codebook (${CODEBOOK_VERSION})`}
          </p>
        </div>

        {selectedSector && (
          <button
            onClick={() => onSelectSector(null)}
            className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition cursor-pointer self-start sm:self-auto"
          >
            {lang === "ar" ? "إلغاء التحديد (عرض الكل)" : "Clear Filter (Show All)"}
          </button>
        )}
      </div>

      {/* Grid of 8 Policy Sectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {POLICY_SECTOR_IDS.map((sId) => {
          const s = policySectors[sId];
          if (!s) return null;

          const isSelected = selectedSector === sId;
          const isCritical = s.riskLevel === "critical";
          const isHigh = s.riskLevel === "high";

          const sentimentScore = s.sentiment;
          const isPositive = sentimentScore > 0.05;
          const isNegative = sentimentScore < -0.05;

          return (
            <div
              key={sId}
              onClick={() => onSelectSector(isSelected ? null : sId)}
              className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-[#182238] border-[#007A3D] ring-2 ring-[#007A3D]/40 shadow-lg"
                  : isDark
                    ? "bg-[#11141f] border-slate-800 hover:border-slate-700 hover:bg-[#141826]"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
              }`}
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-lg ${
                      isCritical 
                        ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" 
                        : isHigh 
                          ? "bg-amber-950/40 text-amber-400 border border-amber-900/30"
                          : "bg-slate-800 text-slate-300"
                    }`}>
                      {SECTOR_ICONS[sId]}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-tight">
                        {lang === "ar" ? s.nameAr : s.nameEn}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {s.volume} {lang === "ar" ? "مشاركة" : "posts"}
                      </span>
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCritical
                      ? "bg-rose-950/60 text-rose-300 border-rose-800/40"
                      : isHigh
                        ? "bg-amber-950/60 text-amber-300 border-amber-800/40"
                        : s.riskLevel === "moderate"
                          ? "bg-blue-950/60 text-blue-300 border-blue-800/40"
                          : "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                  }`}>
                    {isCritical ? (lang === "ar" ? "خطر حرج" : "Critical") :
                     isHigh ? (lang === "ar" ? "مخاطر مرتفعة" : "High Risk") :
                     s.riskLevel === "moderate" ? (lang === "ar" ? "متوسط" : "Moderate") :
                     (lang === "ar" ? "مستقر" : "Stable")}
                  </span>
                </div>

                {/* Net Sentiment display */}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {lang === "ar" ? "صافي الرأي العام:" : "Net Sentiment:"}
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-sm">
                    {isPositive ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : isNegative ? (
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    ) : null}
                    <span className={
                      isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-slate-300"
                    }>
                      {sentimentScore > 0 ? `+${sentimentScore}` : sentimentScore}
                    </span>
                  </div>
                </div>

                {/* Sentiment Distribution Bar */}
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${s.positivePct}%` }} 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title={`إيجابي: ${s.positivePct}%`}
                    />
                    <div 
                      style={{ width: `${s.neutralPct}%` }} 
                      className="bg-slate-500 h-full transition-all duration-300"
                      title={`محايد: ${s.neutralPct}%`}
                    />
                    <div 
                      style={{ width: `${s.negativePct}%` }} 
                      className="bg-rose-500 h-full transition-all duration-300"
                      title={`سلبي: ${s.negativePct}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
                    <span className="text-emerald-400">{s.positivePct}% إيجابي</span>
                    <span className="text-slate-400">{s.neutralPct}% محايد</span>
                    <span className="text-rose-400">{s.negativePct}% سلبي</span>
                  </div>
                </div>
              </div>

              {/* Keywords chips */}
              <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                {s.topKeywords.slice(0, 3).map((kw, i) => (
                  <span key={i} className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-sans">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Codebook Provenance & Classification Standard Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/50 border border-slate-800/70 px-3.5 py-2.5 rounded-lg font-sans">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lang === "ar"
              ? `معيار التصنيف المعتمد: ${CODEBOOK_NAME} (الإصدار النشط: ${CODEBOOK_VERSION})`
              : `Active Classification Standard: ${CODEBOOK_NAME} (Active Version: ${CODEBOOK_VERSION})`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400/90 self-start sm:self-auto">
          <Info className="w-3 h-3 text-slate-400" />
          <span>config/codebook_v1.json</span>
        </div>
      </div>
    </div>
  );
}
