import React, { useState } from "react";
import { 
  Activity, AlertTriangle, TrendingUp, TrendingDown, 
  ChevronLeft, ChevronRight, X, ExternalLink, ShieldAlert,
  Flame, CheckCircle2, ArrowUpDown, Info, Copy, Check
} from "lucide-react";
import { 
  GovernorateVolatility, 
  VolatilityReport 
} from "../utils/volatility";
import { CODEBOOK_VERSION, CODEBOOK_NAME } from "../utils/codebook";
import { FileCode2 } from "lucide-react";

interface SentimentVolatilityOverlayProps {
  report: VolatilityReport;
  selectedGovName: string | null;
  onSelectGov: (govName: string) => void;
  onClose: () => void;
  lang?: "ar" | "en";
}

export default function SentimentVolatilityOverlay({
  report,
  selectedGovName,
  onSelectGov,
  onClose,
  lang = "ar"
}: SentimentVolatilityOverlayProps) {
  const [copied, setCopied] = useState(false);

  // Active inspected governorate: selected one or fallback to highest volatile
  const activeGov = (selectedGovName && report.governorateMap[selectedGovName])
    ? report.governorateMap[selectedGovName]
    : report.highestVolatile;

  const highest = report.highestVolatile;

  const getTierBadge = (tier: GovernorateVolatility["volatilityTier"]) => {
    switch (tier) {
      case "critical":
        return {
          bg: "bg-rose-950/80 text-rose-300 border-rose-800/60",
          icon: <Flame className="w-3 h-3 text-rose-400" />,
          labelAr: "تقلب حرج (غير مستقر)",
          labelEn: "Critical Volatility"
        };
      case "high":
        return {
          bg: "bg-amber-950/80 text-amber-300 border-amber-800/60",
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
          labelAr: "تقلب مرتفع",
          labelEn: "High Volatility"
        };
      case "moderate":
        return {
          bg: "bg-indigo-950/80 text-indigo-300 border-indigo-800/60",
          icon: <ArrowUpDown className="w-3 h-3 text-indigo-400" />,
          labelAr: "تقلب معتدل",
          labelEn: "Moderate"
        };
      default:
        return {
          bg: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          labelAr: "مستقر ومتزن",
          labelEn: "Stable Sentiment"
        };
    }
  };

  const handleCopySummary = () => {
    const text = lang === "ar"
      ? `تقرير مؤشر تقلب المشاعر (آخر 7 أيام) - المجلس الاقتصادي والاجتماعي:\n` +
        `• المحافظة الأكثر تقلباً في المشاعر: ${highest.arName} (مؤشر: ${highest.volatilityScore}/100)\n` +
        `• مدى التأرجح: من ${highest.minSentiment > 0 ? "+" : ""}${highest.minSentiment} إلى ${highest.maxSentiment > 0 ? "+" : ""}${highest.maxSentiment} (تذبذب: ${highest.swingRange})\n` +
        `• الانحراف المعياري: ±${highest.stdDev}\n` +
        `• السبب الرئيسي: ${highest.primaryDriverAr}\n` +
        `• التوصية: توجيه استجابة إعلامية وتنسيقية عاجلة لاحتواء التذبذب الحاد في الرأي العام.`
      : `Jordan Sentiment Volatility Report (Last 7 Days) - Economic & Social Council:\n` +
        `• Highest Volatility Governorate: ${highest.enName} (Score: ${highest.volatilityScore}/100)\n` +
        `• Swing Range: ${highest.minSentiment} to ${highest.maxSentiment} (Delta: ${highest.swingRange})\n` +
        `• Standard Deviation: ±${highest.stdDev}\n` +
        `• Primary Driver: ${highest.primaryDriverEn}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-[#0e121d] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        id="sentiment-volatility-infographic-overlay"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#CE1126]/15 border border-[#CE1126]/30 flex items-center justify-center shadow-inner">
              <Activity className="w-5 h-5 text-[#CE1126]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  {lang === "ar" ? "إنفوجرافيك الذكاء الجغرافي" : "Geographic Intelligence Infographic"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {report.timeWindow.startDate} ➔ {report.timeWindow.endDate} (7 {lang === "ar" ? "أيام" : "Days"})
                </span>
                <span 
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-600/40 flex items-center gap-1"
                  title={CODEBOOK_NAME}
                >
                  <FileCode2 className="w-3 h-3 text-emerald-400" />
                  <span>codebook: {CODEBOOK_VERSION}</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
                {lang === "ar" 
                  ? "مؤشر تقلب واستقرار المشاعر عبر المحافظات" 
                  : "7-Day Governorate Sentiment Volatility Barometer"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer font-medium"
              title={lang === "ar" ? "نسخ ملخص تقلب المشاعر" : "Copy summary"}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? (lang === "ar" ? "تم النسخ!" : "Copied!") : (lang === "ar" ? "نسخ الإحاطة" : "Copy Brief")}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition cursor-pointer border border-slate-700/60"
              aria-label="Close overlay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* PRIMARY HIGHEST VOLATILITY ALERT CALLOUT */}
          <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-slate-900/60 border-2 border-rose-600/40 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-xs font-black tracking-wider text-rose-400 uppercase font-sans">
                    {lang === "ar" ? "المحافظة الأعلى تقلباً في المشاعر خلال آخر 7 أيام" : "Highest Sentiment Volatility (Last 7 Days)"}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {lang === "ar" ? highest.arName : highest.enName}
                  </h2>
                  <span className="text-xs font-bold text-slate-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    {lang === "ar" ? highest.enName : highest.arName}
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-sm flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {lang === "ar" ? `مؤشر التقلب: ${highest.volatilityScore}%` : `Volatility: ${highest.volatilityScore}%`}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {lang === "ar" ? highest.primaryDriverAr : highest.primaryDriverEn}
                </p>
              </div>

              {/* Quick Key Stat Pills */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 self-start md:self-center min-w-[280px]">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">{lang === "ar" ? "مدى التأرجح (Δ)" : "Swing Range"}</span>
                  <span className="text-sm font-black font-mono text-amber-400">{highest.swingRange}</span>
                </div>
                <div className="text-center border-x border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{lang === "ar" ? "الانحراف (σ)" : "Std Deviation"}</span>
                  <span className="text-sm font-black font-mono text-rose-400">±{highest.stdDev}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">{lang === "ar" ? "المعدل الصافي" : "Net Avg"}</span>
                  <span className={`text-sm font-black font-mono ${highest.avgSentiment >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {highest.avgSentiment > 0 ? "+" : ""}{highest.avgSentiment}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE GOVERNORATE DEEP DIVE WITH 7-DAY DAY-BY-DAY SPARKLINE */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {lang === "ar" ? "المحافظة قيد المعاينة التفصيلية:" : "Inspected Governorate Profile:"}
                  </span>
                  <h4 className="text-base font-black text-slate-100 flex items-center gap-1.5">
                    {lang === "ar" ? activeGov.arName : activeGov.enName}
                    {activeGov.isHighest && (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/50 px-1.5 py-0.2 rounded">
                        {lang === "ar" ? "الأعلى تقلباً" : "Highest"}
                      </span>
                    )}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === "ar" 
                    ? "مسار المشاعر اليومية والتذبذبات خلال الـ 7 أيام الماضية، مع تحديد أسباب التغيرات المفاجئة" 
                    : "Day-by-day sentiment score trajectory and primary drivers across the 7-day observation window"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getTierBadge(activeGov.volatilityTier).bg}`}>
                  {getTierBadge(activeGov.volatilityTier).icon}
                  {lang === "ar" ? getTierBadge(activeGov.volatilityTier).labelAr : getTierBadge(activeGov.volatilityTier).labelEn}
                </span>

                <button
                  onClick={() => onSelectGov(activeGov.name)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#CE1126] hover:bg-[#CE1126]/90 text-white font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  {lang === "ar" ? "تصفية الخريطة" : "Filter Map"}
                </button>
              </div>
            </div>

            {/* Visual 7-Day Trend Chart Representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>+1.0 {lang === "ar" ? "تفاؤلي إيجابي" : "Optimistic"}</span>
                <span className="text-slate-500">0.0 {lang === "ar" ? "خط التوازن المحايد" : "Neutral Baseline"}</span>
                <span>-1.0 {lang === "ar" ? "نقدي متوتر" : "Critical/Negative"}</span>
              </div>

              {/* 7-Day Day-by-Day Visual Timeline Grid */}
              <div className="grid grid-cols-7 gap-2 pt-2">
                {activeGov.dailyPoints.map((point) => {
                  // Normalize -1 to +1 into a visual percentage 0% to 100%
                  const isPositive = point.sentiment >= 0;
                  const absVal = Math.abs(point.sentiment);
                  const barHeightPct = Math.max(8, Math.round(absVal * 80));

                  return (
                    <div 
                      key={point.dateStr}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 flex flex-col items-center justify-between text-center hover:border-slate-700 transition group relative"
                    >
                      <span className="text-[10px] font-bold text-slate-300 font-sans">
                        {lang === "ar" ? point.dayLabelAr : point.dayLabelEn}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {point.dateStr.slice(5)}
                      </span>

                      {/* Mini visual sentiment column */}
                      <div className="h-20 w-full flex items-center justify-center my-2 relative">
                        {/* Neutral center line */}
                        <div className="absolute w-full h-[1px] bg-slate-700/60 top-1/2 -translate-y-1/2" />
                        
                        {/* Sentiment Bar */}
                        <div 
                          className={`w-3.5 rounded-sm transition-all duration-300 ${
                            point.sentiment > 0.15 
                              ? "bg-emerald-500/80 group-hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                              : point.sentiment < -0.15
                                ? "bg-rose-500/80 group-hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                : "bg-indigo-500/70 group-hover:bg-indigo-400"
                          }`}
                          style={{
                            height: `${barHeightPct}%`,
                            transform: isPositive ? "translateY(-25%)" : "translateY(25%)"
                          }}
                        />
                      </div>

                      {/* Score Value */}
                      <span className={`text-[11px] font-black font-mono ${
                        point.sentiment > 0.15 ? "text-emerald-400" : point.sentiment < -0.15 ? "text-rose-400" : "text-slate-300"
                      }`}>
                        {point.sentiment > 0 ? "+" : ""}{point.sentiment}
                      </span>

                      {/* Tooltip on hover */}
                      <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 bg-slate-900 border border-slate-700 rounded-lg p-2 text-left z-30 shadow-xl pointer-events-none text-[10px]">
                        <div className="font-bold text-slate-200 mb-1 flex justify-between">
                          <span>{lang === "ar" ? point.dayLabelAr : point.dayLabelEn} ({point.dateStr})</span>
                          <span className="text-amber-400">{point.volume} {lang === "ar" ? "مشاركة" : "posts"}</span>
                        </div>
                        <p className="text-slate-400 leading-tight">
                          {lang === "ar" ? point.dominantIssueAr : point.dominantIssueEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contextual Driver note */}
            <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-800 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">
                  {lang === "ar" ? "تحليل مسببات التقلب في هذه المحافظة:" : "Governorate Volatility Driver Analysis:"}{" "}
                </span>
                <span className="text-slate-400">
                  {lang === "ar" ? activeGov.primaryDriverAr : activeGov.primaryDriverEn}
                </span>
              </div>
            </div>
          </div>

          {/* ALL 12 GOVERNORATES RANKINGS TABLE / LEADERBOARD */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-[#007A3D]" />
                  {lang === "ar" 
                    ? "ترتيب محافظات الأردن الـ 12 حسب مؤشر تقلب المشاعر (7 أيام)" 
                    : "Jordan 12-Governorate Volatility Matrix Ranking"}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === "ar"
                    ? "انقر فوق أي محافظة لتحديدها وتحديث منحنى الـ 7 أيام في الأعلى واستكشاف مسارها"
                    : "Click any governorate to inspect its 7-day sentiment trajectory and update the focal card"}
                </p>
              </div>

              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                {lang === "ar" ? `المعدل الوطني للتقلب: ${report.nationalAvgVolatility}%` : `National Volatility Avg: ${report.nationalAvgVolatility}%`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {report.rankings.map((gov) => {
                const isSelected = activeGov.name === gov.name;
                const tierInfo = getTierBadge(gov.volatilityTier);

                return (
                  <div
                    key={gov.name}
                    onClick={() => onSelectGov(gov.name)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-slate-800/90 border-[#CE1126] shadow-md ring-1 ring-[#CE1126]/40"
                        : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        gov.isHighest 
                          ? "bg-rose-600 text-white" 
                          : gov.rank <= 3 
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                            : "bg-slate-800 text-slate-400"
                      }`}>
                        {gov.rank}
                      </span>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-200 truncate font-sans">
                            {lang === "ar" ? gov.arName : gov.enName}
                          </span>
                          {gov.isHighest && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white">
                              {lang === "ar" ? "الأعلى تقلباً" : "Highest"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang === "ar" ? `التأرجح: ${gov.swingRange} (±${gov.stdDev})` : `Swing: ${gov.swingRange} (±${gov.stdDev})`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Volatility progress bar */}
                      <div className="w-16 sm:w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            gov.volatilityScore >= 75 
                              ? "bg-rose-500" 
                              : gov.volatilityScore >= 55 
                                ? "bg-amber-500" 
                                : gov.volatilityScore >= 35 
                                  ? "bg-indigo-500" 
                                  : "bg-emerald-500"
                          }`}
                          style={{ width: `${gov.volatilityScore}%` }}
                        />
                      </div>

                      <span className="text-xs font-black font-mono text-slate-200 w-9 text-right">
                        {gov.volatilityScore}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SOCIAL POLICY COMMITTEE ACTIONABLE INSIGHT */}
          <div className="bg-[#007A3D]/10 border border-[#007A3D]/30 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#007A3D] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h5 className="font-black text-slate-200 font-sans">
                {lang === "ar" 
                  ? "توصية تحليلية للجنة السياسات الاجتماعية (المجلس الاقتصادي والاجتماعي)" 
                  : "Analytical Directive for the Social Policy Committee (ESC)"}
              </h5>
              <p className="text-slate-300 leading-relaxed">
                {lang === "ar"
                  ? `المحافظة الأعلى تقلباً (${highest.arName}) تعكس سرعة استجابة وتأثر الرأي العام بالخدمات اليومية (خاصة النقل العام وكلفة المعيشة). التذبذب الحاد يعني أن الرأي العام لم يستقر بعد في منطقة سلبية دائمة، مما يتيح فرصة ثمينة للتدخل الحكومي الاستباقي (تعديل الجداول، التواصل الإعلامي الميداني) لامتصاص الاحتكاك وتعزيز الرضا المستدام.`
                  : `The highest volatility governorate (${highest.enName}) demonstrates rapid citizen sentiment sensitivity to local service adjustments. High volatility signifies fluid, non-entrenched public perceptions—providing a strategic window for swift institutional communication and operational service tweaks before sentiment turns permanently negative.`}
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>{lang === "ar" ? "12 محافظة أردنية موثقة بالكامل" : "12 Jordanian Governorates Analyzed"}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400/90">{CODEBOOK_NAME} ({CODEBOOK_VERSION})</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => onSelectGov(activeGov.name)}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer font-bold"
            >
              {lang === "ar" ? `عرض ${activeGov.arName} على الخريطة` : `View ${activeGov.enName} on Map`}
            </button>
            <button
              onClick={onClose}
              className="text-xs px-4 py-1.5 bg-[#CE1126] hover:bg-[#CE1126]/90 text-white rounded-lg font-bold transition shadow-sm cursor-pointer"
            >
              {lang === "ar" ? "إغلاق الإنفوجرافيك" : "Close"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
