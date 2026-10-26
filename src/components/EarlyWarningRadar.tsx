import React, { useState } from "react";
import { 
  AlertTriangle, ShieldAlert, ArrowUpRight, Clock, MessageSquare, 
  ChevronRight, CheckCircle2, Filter, Sparkles, Building2, Bus, 
  GraduationCap, HeartPulse, Zap, Compass, ShieldCheck, Landmark,
  FileCode2
} from "lucide-react";
import { PolicySectorId, RisingIssueAlert } from "../types";
import { POLICY_SECTORS_META } from "../utils/analytics";
import { CODEBOOK_VERSION, CODEBOOK_NAME } from "../utils/codebook";

interface EarlyWarningRadarProps {
  risingIssues: RisingIssueAlert[];
  selectedSectorFilter: string;
  onSelectSector: (sectorId: string) => void;
  lang?: "ar" | "en";
}

export default function EarlyWarningRadar({
  risingIssues,
  selectedSectorFilter,
  onSelectSector,
  lang = "ar"
}: EarlyWarningRadarProps) {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("all");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(risingIssues[0]?.id || null);

  const getSectorIcon = (sectorId: PolicySectorId) => {
    switch (sectorId) {
      case "cost_of_living": return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
      case "public_transport": return <Bus className="w-3.5 h-3.5 text-purple-400" />;
      case "education_employment": return <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />;
      case "healthcare": return <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
      case "gov_services": return <Building2 className="w-3.5 h-3.5 text-cyan-400" />;
      case "energy_water": return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case "tourism": return <Compass className="w-3.5 h-3.5 text-indigo-400" />;
      case "social_protection": return <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const filteredIssues = risingIssues.filter(issue => {
    if (selectedSectorFilter !== "all" && issue.sectorId !== selectedSectorFilter) {
      return false;
    }
    if (selectedRiskFilter !== "all" && issue.riskLevel !== selectedRiskFilter) {
      return false;
    }
    return true;
  });

  const criticalCount = risingIssues.filter(i => i.riskLevel === "critical").length;
  const highCount = risingIssues.filter(i => i.riskLevel === "high").length;

  return (
    <div className="bg-[#11141f] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5" id="early-warning-radar-container">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
              {lang === "ar" ? "نظام الاستشعار المبكر للأزمات الاجتماعية" : "Social Crisis Early Warning Radar"}
            </span>
            <span 
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-rose-300 border border-rose-600/40 flex items-center gap-1"
              title={CODEBOOK_NAME}
            >
              <FileCode2 className="w-3 h-3 text-rose-400" />
              <span>codebook: {CODEBOOK_VERSION}</span>
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            {lang === "ar" ? "رصد الموضوعات الصاعدة والإنذار المبكر قبل تحولها لأزمات" : "Emerging Public Issues & Crisis Prevention Radar"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            {lang === "ar" 
              ? `يقوم المحرك برصد التسارع المفاجئ في وتيرة النقد العام والشكاوى الميدانية ومعايرتها وفق دليل التصنيف (${CODEBOOK_VERSION})، لتزويد لجنة السياسات الاجتماعية بمؤشرات استباقية فورية.`
              : `Detects rapid negative sentiment acceleration calibrated against National Codebook (${CODEBOOK_VERSION}) to provide the Social Policy Committee with proactive intervention alerts.`}
          </p>
        </div>

        {/* Executive Stats Summary */}
        <div className="flex items-center gap-2">
          <div className="bg-rose-950/30 border border-rose-900/40 px-3 py-2 rounded-lg text-center">
            <span className="text-[10px] text-rose-400 block font-semibold">{lang === "ar" ? "قضايا حرجة (تدخل فوري)" : "Critical Alerts"}</span>
            <span className="text-base font-black text-rose-300 font-mono">{criticalCount}</span>
          </div>
          <div className="bg-amber-950/30 border border-amber-900/40 px-3 py-2 rounded-lg text-center">
            <span className="text-[10px] text-amber-400 block font-semibold">{lang === "ar" ? "تنبيه مرتفع" : "High Alerts"}</span>
            <span className="text-base font-black text-amber-300 font-mono">{highCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">{lang === "ar" ? "إجمالي القضايا النشطة" : "Total Tracked"}</span>
            <span className="text-base font-black text-slate-200 font-mono">{risingIssues.length}</span>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 ml-2">
            <Filter className="w-3 h-3 text-slate-400" />
            {lang === "ar" ? "تصفية حسب القطاع:" : "Sector Filter:"}
          </span>
          <button
            onClick={() => onSelectSector("all")}
            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition cursor-pointer ${
              selectedSectorFilter === "all" 
                ? "bg-[#007A3D] text-white shadow-sm" 
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {lang === "ar" ? "جميع القطاعات" : "All Sectors"}
          </button>
          {(Object.keys(POLICY_SECTORS_META) as PolicySectorId[]).map(sId => {
            const isSelected = selectedSectorFilter === sId;
            return (
              <button
                key={sId}
                onClick={() => onSelectSector(sId)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? "bg-[#007A3D] text-white shadow-sm" 
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {getSectorIcon(sId)}
                <span>{lang === "ar" ? POLICY_SECTORS_META[sId].nameAr : POLICY_SECTORS_META[sId].nameEn}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <span 
            className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 flex items-center gap-1"
            title={`${CODEBOOK_NAME} (${CODEBOOK_VERSION})`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Taxonomy: {CODEBOOK_VERSION}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-semibold">{lang === "ar" ? "مستوى الخطر:" : "Risk Level:"}</span>
          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-750 text-slate-200 rounded-md font-semibold cursor-pointer focus:outline-none"
          >
            <option value="all">{lang === "ar" ? "جميع المستويات" : "All Levels"}</option>
            <option value="critical">{lang === "ar" ? "🔴 حرج (طوارئ)" : "🔴 Critical"}</option>
            <option value="high">{lang === "ar" ? "🟠 تنبيه مرتفع" : "🟠 High Alert"}</option>
            <option value="moderate">{lang === "ar" ? "🟡 مراقبة استباقية" : "🟡 Moderate"}</option>
          </select>
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-300">
              {lang === "ar" ? "لا توجد مؤشرات أزمات حرجة في القطاع المحدد حالياً" : "No critical risk alerts found for the selected filter"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {lang === "ar" ? "المؤشرات العامة ضمن الحدود الطبيعية المستقرة." : "Sentiment velocity remains within nominal baseline."}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;
            const sector = POLICY_SECTORS_META[issue.sectorId];

            const riskBadge = issue.riskLevel === "critical" 
              ? { bg: "bg-rose-950/40 text-rose-300 border-rose-900/50", labelAr: "إنذار حرج — تدخل فوري", labelEn: "Critical Alert" }
              : issue.riskLevel === "high"
                ? { bg: "bg-amber-950/40 text-amber-300 border-amber-900/50", labelAr: "تنبيه مرتفع", labelEn: "High Alert" }
                : { bg: "bg-yellow-950/30 text-yellow-300 border-yellow-900/40", labelAr: "مراقبة استباقية", labelEn: "Proactive Watch" };

            return (
              <div 
                key={issue.id}
                className={`border rounded-xl transition overflow-hidden ${
                  issue.riskLevel === "critical"
                    ? "border-rose-900/40 bg-rose-950/10 hover:border-rose-800/60"
                    : "border-slate-800 bg-[#141824]/50 hover:border-slate-700"
                }`}
              >
                {/* Main Card Header */}
                <div 
                  onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${riskBadge.bg}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                        {lang === "ar" ? riskBadge.labelAr : riskBadge.labelEn}
                      </span>
                      
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50 flex items-center gap-1">
                        {getSectorIcon(issue.sectorId)}
                        {lang === "ar" ? sector.nameAr : sector.nameEn}
                      </span>

                      <span className="text-[10.5px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {issue.detectedAt}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">
                      {lang === "ar" ? issue.titleAr : issue.titleEn}
                    </h3>
                  </div>

                  {/* Velocity & Sentiment Metrics */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                      <span className="text-[9.5px] text-slate-400 block font-semibold">{lang === "ar" ? "تسارع الشكاوى" : "Velocity"}</span>
                      <span className="text-xs font-black text-rose-400 font-mono flex items-center gap-0.5 justify-end">
                        <ArrowUpRight className="w-3 h-3" /> +{issue.growthRatePct}%
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                      <span className="text-[9.5px] text-slate-400 block font-semibold">{lang === "ar" ? "نسبة السلبية" : "Negative %"}</span>
                      <span className="text-xs font-black text-rose-300 font-mono">
                        {issue.negativePct}%
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rtl:rotate-180'}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 bg-slate-950/30">
                    {/* Root Cause & Diagnostic */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
                          {lang === "ar" ? "تشخيص المشكلة ومكمن الخلل:" : "Root Cause Diagnostic:"}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {issue.rootCauseAr}
                        </p>
                      </div>

                      {/* Policy Committee Recommendation */}
                      <div className="space-y-1.5 bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-900/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono block flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {lang === "ar" ? "التوصية الإجرائية المقترحة للجنة السياسات الاجتماعية:" : "Recommended Policy Intervention:"}
                        </span>
                        <p className="text-xs text-emerald-200 leading-relaxed font-semibold">
                          {issue.committeeRecommendationAr}
                        </p>
                      </div>
                    </div>

                    {/* Verified Citizen Public Quotes */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        {lang === "ar" ? "نماذج موثقة من الآراء والمنشورات العامة المرصودة:" : "Documented Public Citizen Quotes:"}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {issue.sampleQuotes.map((quote, idx) => (
                          <div 
                            key={idx} 
                            className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 italic leading-relaxed text-right"
                          >
                            "{quote}"
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
