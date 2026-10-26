import React, { useState } from "react";
import { 
  FileText, Printer, Copy, Check, Download, 
  ShieldAlert, TrendingDown, TrendingUp, Landmark, 
  Calendar, Building2, UserCheck, AlertCircle
} from "lucide-react";
import { PolicySectorMetric, RisingIssueAlert, Comment } from "../types";
import { POLICY_SECTOR_IDS } from "../utils/analytics";
import { CODEBOOK_VERSION, CODEBOOK_NAME } from "../utils/codebook";

interface ExecutiveReportViewProps {
  policySectors: Record<string, PolicySectorMetric>;
  risingIssues: RisingIssueAlert[];
  comments: Comment[];
  totalCollected: number;
  avgSentiment: number;
  distribution: { positive: number; neutral: number; negative: number };
  lang?: "ar" | "en";
  onClose?: () => void;
}

export default function ExecutiveReportView({
  policySectors,
  risingIssues,
  comments,
  totalCollected,
  avgSentiment,
  distribution,
  lang = "ar",
  onClose
}: ExecutiveReportViewProps) {
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "crisis" | "sectoral">("weekly");
  const [selectedSectorTab, setSelectedSectorTab] = useState<string>("cost_of_living");
  const [copied, setCopied] = useState(false);

  const reportDate = new Date().toLocaleDateString("ar-JO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const reportNumber = `ESC-SPC-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(Math.random() * 400 + 100)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `المملكة الأردنية الهاشمية - المجلس الاقتصادي والاجتماعي
لجنة السياسات الاجتماعية
تقرير دوري موثق: اتجاهات الرأي العام تجاه القضايا والسياسات الاجتماعية
رقم الوثيقة: ${reportNumber}
التاريخ: ${reportDate}

إجمالي البيانات المعالجة: ${totalCollected} منشور ومشاركة رقمية
مؤشر الرضا العام: ${avgSentiment >= 0 ? '+' : ''}${avgSentiment} (إيجابي: ${distribution.positive}% | محايد: ${distribution.neutral}% | سلبي: ${distribution.negative}%)

أبرز القطاعات المرصودة:
${POLICY_SECTOR_IDS.map(sId => {
  const s = policySectors[sId];
  if (!s) return "";
  return `- ${s.nameAr}: حجم التفاعل (${s.volume}) | صافي المشاعر (${s.sentiment}) | مستوى الخطر (${s.riskLevel})`;
}).join("\n")}

الموضوعات الصاعدة ذات الأولوية والإنذار المبكر:
${risingIssues.map(issue => `- [${issue.riskLevel === 'critical' ? 'حرج' : 'تنبيه'}] ${issue.titleAr}: نسبة السلبية ${issue.negativePct}% - التوصية المقترحة: ${issue.committeeRecommendationAr}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const rows = [
      ["Sector ID", "Sector Name (Ar)", "Volume", "Sentiment", "Positive %", "Neutral %", "Negative %", "Risk Level"],
      ...POLICY_SECTOR_IDS.map(sId => {
        const s = policySectors[sId];
        return [
          sId,
          s?.nameAr || "",
          s?.volume || 0,
          s?.sentiment || 0,
          s?.positivePct || 0,
          s?.neutralPct || 0,
          s?.negativePct || 0,
          s?.riskLevel || "low"
        ];
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ESC_Social_Policy_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-full" id="executive-report-view">
      {/* Control Bar (Hidden when printing) */}
      <div className="bg-[#11141f] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#007A3D]/20 text-[#007A3D]">
            <FileText className="w-5 h-5 text-emerald-400" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">
              {lang === "ar" ? "نظام إصدار التقارير التنفيذية للجنة السياسات الاجتماعية" : "Executive Social Policy Report Generator"}
            </h2>
            <span className="text-[11px] text-slate-400">
              {lang === "ar" ? "المجلس الاقتصادي والاجتماعي — المملكة الأردنية الهاشمية" : "Economic and Social Council — Hashemite Kingdom of Jordan"}
            </span>
          </div>
        </div>

        {/* Report type selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setReportType("weekly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              reportType === "weekly" ? "bg-[#007A3D] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {lang === "ar" ? "تقرير أسبوعي شامل" : "Weekly Brief"}
          </button>
          <button
            onClick={() => setReportType("monthly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              reportType === "monthly" ? "bg-[#007A3D] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {lang === "ar" ? "تقرير شهري استراتيجي" : "Monthly Barometer"}
          </button>
          <button
            onClick={() => setReportType("crisis")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              reportType === "crisis" ? "bg-rose-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {lang === "ar" ? "إحاطة أزمات طارئة" : "Crisis Brief"}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (lang === "ar" ? "تم النسخ" : "Copied") : (lang === "ar" ? "نسخ النص" : "Copy Brief")}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === "ar" ? "تصدير CSV" : "Export CSV"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "طباعة / حفظ PDF" : "Print / Save PDF"}</span>
          </button>
        </div>
      </div>

      {/* Official Printable Document Container */}
      <div className="bg-[#141824] print:bg-white text-slate-100 print:text-slate-900 border border-slate-800 print:border-none rounded-xl p-8 shadow-md space-y-6 print:p-4 print:space-y-4 font-sans">
        
        {/* Official Header */}
        <div className="border-b-2 border-[#007A3D] pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 print:text-slate-600 block">
              المملكة الأردنية الهاشمية
            </span>
            <h1 className="text-xl font-black text-white print:text-slate-900 tracking-tight">
              المجلس الاقتصادي والاجتماعي
            </h1>
            <span className="text-xs font-bold text-[#007A3D] block">
              لجنة السياسات الاجتماعية — المنصة الرقمية الوطنية لتحليل الرأي العام
            </span>
          </div>

          {/* Document metadata block */}
          <div className="bg-slate-900 print:bg-slate-100 border border-slate-800 print:border-slate-300 px-4 py-2.5 rounded-lg text-xs space-y-1 text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-slate-400 print:text-slate-600 font-semibold">رقم الوثيقة:</span>
              <span className="font-mono font-bold text-slate-200 print:text-slate-800">{reportNumber}</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-slate-400 print:text-slate-600 font-semibold">تاريخ الإصدار:</span>
              <span className="font-semibold text-slate-200 print:text-slate-800">{reportDate}</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-slate-400 print:text-slate-600 font-semibold">دليل التصنيف:</span>
              <span className="font-mono font-bold text-emerald-400 print:text-emerald-700 bg-slate-900 print:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-700 print:border-slate-400">
                {CODEBOOK_VERSION}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-slate-400 print:text-slate-600 font-semibold">درجة السرية:</span>
              <span className="font-bold text-rose-400 print:text-rose-700">وثيقة عمل رسمية — لصناع القرار</span>
            </div>
          </div>
        </div>

        {/* Report Title */}
        <div className="bg-slate-900/60 print:bg-slate-50 p-4 rounded-lg border border-slate-800 print:border-slate-300">
          <h2 className="text-base font-bold text-white print:text-slate-900">
            {reportType === "weekly" && "التقرير الدوري الأسبوعي لمؤشرات الرأي العام تجاه السياسات والقضايا الاجتماعية"}
            {reportType === "monthly" && "التقرير الشهري الاستراتيجي لاتجاهات الرأي العام ومؤشرات الأداء الاجتماعي في الأردن"}
            {reportType === "crisis" && "إحاطة طارئة: رصد الموضوعات الصاهرة ومخاطر الأزمات الاجتماعية المرتقبة"}
          </h2>
          <p className="text-xs text-slate-400 print:text-slate-600 mt-1 leading-relaxed">
            مستند تنفيذي مبني على جمع ومعالجة البيانات العامة وتطبيق معايير التحليل المعجمي المعتمدة بلجنة السياسات الاجتماعية وفق ({CODEBOOK_NAME} - {CODEBOOK_VERSION}).
          </p>
        </div>

        {/* Executive Summary Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 print:bg-slate-100 p-3 rounded-lg border border-slate-800 print:border-slate-300 text-center">
            <span className="text-[10.5px] text-slate-400 print:text-slate-600 block font-semibold">إجمالي البيانات المحللة</span>
            <span className="text-lg font-black text-white print:text-slate-900 font-mono mt-0.5 block">{totalCollected}</span>
            <span className="text-[9.5px] text-emerald-400 print:text-emerald-700">مشاركة موثقة ومحققة</span>
          </div>

          <div className="bg-slate-900 print:bg-slate-100 p-3 rounded-lg border border-slate-800 print:border-slate-300 text-center">
            <span className="text-[10.5px] text-slate-400 print:text-slate-600 block font-semibold">صافي مؤشر الرضا الوطني</span>
            <span className={`text-lg font-black font-mono mt-0.5 block ${avgSentiment >= 0 ? "text-emerald-400 print:text-emerald-700" : "text-rose-400 print:text-rose-700"}`}>
              {avgSentiment > 0 ? `+${avgSentiment}` : avgSentiment}
            </span>
            <span className="text-[9.5px] text-slate-400 print:text-slate-600">على مقياس (-1.00 إلى +1.00)</span>
          </div>

          <div className="bg-slate-900 print:bg-slate-100 p-3 rounded-lg border border-slate-800 print:border-slate-300 text-center">
            <span className="text-[10.5px] text-slate-400 print:text-slate-600 block font-semibold">توزيع المشاعر العام</span>
            <div className="text-xs font-bold mt-1 space-x-1 space-x-reverse">
              <span className="text-emerald-400 print:text-emerald-700 font-mono">{distribution.positive}% إيجابي</span>
              <span className="text-slate-400 print:text-slate-600 font-mono">/ {distribution.neutral}% محايد</span>
              <span className="text-rose-400 print:text-rose-700 font-mono">/ {distribution.negative}% سلبي</span>
            </div>
            <span className="text-[9.5px] text-slate-400 print:text-slate-600">وفق نماذج الـ NLP المعتمدة</span>
          </div>

          <div className="bg-slate-900 print:bg-slate-100 p-3 rounded-lg border border-slate-800 print:border-slate-300 text-center">
            <span className="text-[10.5px] text-slate-400 print:text-slate-600 block font-semibold">القطاعات تحت الملاحظة الحرجة</span>
            <span className="text-lg font-black text-rose-400 print:text-rose-700 font-mono mt-0.5 block">
              {POLICY_SECTOR_IDS.filter(id => policySectors[id]?.riskLevel === "critical").length} قطاعات
            </span>
            <span className="text-[9.5px] text-amber-400 print:text-amber-700">تتطلب مبادرات تدخل حكومي</span>
          </div>
        </div>

        {/* Section 1: 8 Policy Sectors Indicator Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
            <h3 className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#007A3D]" />
              <span>أولاً: مصفوفة مؤشرات القطاعات السياساتية الثمانية</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 print:text-emerald-700 bg-emerald-950/40 print:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-800/40 print:border-emerald-300">
                المعيار: {CODEBOOK_VERSION}
              </span>
              <span className="text-xs text-slate-400 print:text-slate-600">تحديث فوري لبيانات الرصد</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 print:bg-slate-200 border-b border-slate-800 print:border-slate-300 text-slate-300 print:text-slate-700">
                  <th className="p-2.5 font-bold">القطاع السياساتي</th>
                  <th className="p-2.5 font-bold text-center">حجم التفاعل</th>
                  <th className="p-2.5 font-bold text-center">صافي الرضا (-1 إلى +1)</th>
                  <th className="p-2.5 font-bold text-center">التوزيع (إيجابي / محايد / سلبي)</th>
                  <th className="p-2.5 font-bold text-center">تقييم المخاطر</th>
                  <th className="p-2.5 font-bold">أبرز الكلمات الدلالية المرصودة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                {POLICY_SECTOR_IDS.map(sId => {
                  const s = policySectors[sId];
                  if (!s) return null;
                  const riskStyle = s.riskLevel === "critical"
                    ? "text-rose-400 print:text-rose-700 bg-rose-950/20 print:bg-rose-50"
                    : s.riskLevel === "high"
                      ? "text-amber-400 print:text-amber-700 bg-amber-950/20 print:bg-amber-50"
                      : "text-slate-300 print:text-slate-700";

                  return (
                    <tr key={sId} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                      <td className="p-2.5 font-bold text-white print:text-slate-900">
                        {s.nameAr}
                        <span className="block text-[10px] font-normal text-slate-400 print:text-slate-500">{s.nameEn}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-semibold">{s.volume}</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        <span className={s.sentiment >= 0 ? "text-emerald-400 print:text-emerald-700" : "text-rose-400 print:text-rose-700"}>
                          {s.sentiment > 0 ? `+${s.sentiment}` : s.sentiment}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-[11px]">
                        <span className="text-emerald-400 print:text-emerald-700">{s.positivePct}%</span>
                        <span className="text-slate-400 print:text-slate-500"> / {s.neutralPct}%</span>
                        <span className="text-rose-400 print:text-rose-700"> / {s.negativePct}%</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${riskStyle}`}>
                          {s.riskLevel === "critical" ? "حرج (طوارئ)" : s.riskLevel === "high" ? "مرتفع" : s.riskLevel === "moderate" ? "متوسط" : "مستقر"}
                        </span>
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-400 print:text-slate-600">
                        {s.topKeywords.join("، ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Rising Issues & Crisis Early Warning */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
            <h3 className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>ثانياً: الموضوعات الصاعدة والإنذار المبكر للأزمات الاجتماعية</span>
            </h3>
            <span className="text-xs text-rose-400 print:text-rose-700 font-semibold">رصد وتنبيه مبكر</span>
          </div>

          <div className="space-y-3">
            {risingIssues.map((issue) => (
              <div 
                key={issue.id} 
                className="bg-slate-900/60 print:bg-slate-50 p-3.5 rounded-lg border border-slate-800 print:border-slate-300 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      issue.riskLevel === "critical" 
                        ? "bg-rose-950 text-rose-300 print:bg-rose-100 print:text-rose-800" 
                        : "bg-amber-950 text-amber-300 print:bg-amber-100 print:text-amber-800"
                    }`}>
                      {issue.riskLevel === "critical" ? "إنذار حرج" : "تنبيه مرتفع"}
                    </span>
                    <h4 className="text-xs font-bold text-white print:text-slate-900">{issue.titleAr}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-rose-400 print:text-rose-700 font-bold">تسارع: +{issue.growthRatePct}%</span>
                    <span className="text-slate-400 print:text-slate-600">سلبية: {issue.negativePct}%</span>
                    <span className="text-slate-400 print:text-slate-600 font-sans">{issue.detectedAt}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-slate-950/40 print:bg-white p-2.5 rounded border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] font-bold text-amber-400 print:text-amber-800 block mb-1">
                      تشخيص الأسباب الجذرية:
                    </span>
                    <p className="text-slate-300 print:text-slate-700 leading-relaxed">
                      {issue.rootCauseAr}
                    </p>
                  </div>

                  <div className="bg-emerald-950/20 print:bg-emerald-50 p-2.5 rounded border border-emerald-900/30 print:border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-400 print:text-emerald-800 block mb-1">
                      التدخل المقترح لأعضاء لجنة السياسات الاجتماعية:
                    </span>
                    <p className="text-emerald-200 print:text-emerald-900 font-medium leading-relaxed">
                      {issue.committeeRecommendationAr}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Concrete Policy Interventions Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
            <h3 className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>ثالثاً: حزمة التدخلات والسياسات المقترحة للجهات المعنية</span>
            </h3>
            <span className="text-xs text-slate-400 print:text-slate-600">توصيات عملية قابلة للتطبيق</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900/60 print:bg-slate-50 p-3 rounded-lg border border-slate-800 print:border-slate-300 space-y-1.5">
              <span className="text-[11px] font-bold text-cyan-400 print:text-cyan-800 block">
                وزارة الاقتصاد الرقمي والريادة (منصة سند)
              </span>
              <p className="text-slate-300 print:text-slate-700 leading-relaxed">
                توسيع قدرة المخدمات السحابية والربط البيني مع دائرة الأحوال المدنية والأراضي لتلافي انقطاع الخدمة في أوقات الذروة الصباحية.
              </p>
            </div>

            <div className="bg-slate-900/60 print:bg-slate-50 p-3 rounded-lg border border-slate-800 print:border-slate-300 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-400 print:text-amber-800 block">
                وزارة الصناعة والتجارة والتموين
              </span>
              <p className="text-slate-300 print:text-slate-700 leading-relaxed">
                تكثيف حملات التفتيش والرقابة الميدانية في أسواق التجزئة والمؤسسات الاستهلاكية، وتثبيت سقوف سعرية واضحة للسلع الأساسية.
              </p>
            </div>

            <div className="bg-slate-900/60 print:bg-slate-50 p-3 rounded-lg border border-slate-800 print:border-slate-300 space-y-1.5">
              <span className="text-[11px] font-bold text-teal-400 print:text-teal-800 block">
                المؤسسة العامة للضمان الاجتماعي
              </span>
              <p className="text-slate-300 print:text-slate-700 leading-relaxed">
                إطلاق حملة رقمية مبسطة تشرح للمواطنين آلية احتساب المنافع التقاعدية وشروط التقاعد المبكر بشفافية تامة لتطمين المشتركين.
              </p>
            </div>
          </div>
        </div>

        {/* Official Signature Footer */}
        <div className="border-t border-slate-800 print:border-slate-400 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 print:text-slate-600">
          <div className="text-center sm:text-right">
            <span className="block font-bold text-slate-300 print:text-slate-800">
              المجلس الاقتصادي والاجتماعي — المملكة الأردنية الهاشمية
            </span>
            <span>المنصة الرقمية الوطنية لمعالجة البيانات وتحليل الرأي العام</span>
          </div>
          <div className="text-center sm:text-left">
            <span className="block font-bold text-slate-300 print:text-slate-800">
              اعتماد: أمانة سر لجنة السياسات الاجتماعية
            </span>
            <span className="text-[10.5px]">
              تم التوليد وفق دليل التصنيف الوطني ({CODEBOOK_VERSION}) وتقنيات الذكاء الاصطناعي وNLP
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
