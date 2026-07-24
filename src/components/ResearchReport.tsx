import React from "react";
import { Sparkles, Cpu, BookOpen } from "lucide-react";

interface ResearchReportProps {
  reportTopic: string;
  reportText: string;
  reportLoading: boolean;
  activeTopics: string[];
  onChangeTopic: (topic: string) => void;
  onGenerateReport: () => void;
  parseMarkdownToJSX: (text: string) => React.ReactNode;
  lang?: "ar" | "en";
}

export default function ResearchReport({
  reportTopic,
  reportText,
  reportLoading,
  activeTopics,
  onChangeTopic,
  onGenerateReport,
  parseMarkdownToJSX,
  lang = "ar"
}: ResearchReportProps) {

  return (
    <div className="bg-[#131722]/40 border border-slate-800/60 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="space-y-1 font-sans">
          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center w-fit gap-1 font-mono">
            <Sparkles className="w-3 h-3 text-indigo-400" /> {lang === "ar" ? "غرفة التقارير والدراسات والمجلس الاستشاري" : "Executive Advisory Council Room"}
          </span>
          <h2 className="text-sm font-bold text-slate-100 font-sans flex items-center gap-2">
            {lang === "ar" ? "تقرير استشراف السياسات وصياغة الرأي العام الوطني" : "National Policy Strategic & Public Opinion Report"}
          </h2>
          <p className="text-[11px] text-slate-400 leading-normal">
            {lang === "ar" ? "تلخيص وإعداد تقارير الرأي العام والتقييمات الاستشارية للشؤون العامة ببلدنا الأردني بالاعتماد على ذكاء نماذج المعالجة." : "Synthesize collected streams and draft high-level strategic summaries, risk assessments, and recommendations regarding Jordan public issues."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-sans">
          <select
            value={reportTopic}
            onChange={(e) => onChangeTopic(e.target.value)}
            className="px-2.5 py-1.5 text-xs text-slate-200 border border-slate-800 bg-slate-900 rounded-lg hover:border-slate-700/60 font-bold cursor-pointer focus:outline-none"
          >
            {activeTopics.map((topic) => (
              <option key={topic} value={topic}>
                {lang === "ar" ? `الموضوع: ${topic}` : `Topic: ${topic}`}
              </option>
            ))}
          </select>

          <button
            onClick={onGenerateReport}
            disabled={reportLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#007A3D] text-white hover:bg-[#007A3D]/90 hover:shadow-lg hover:shadow-[#007A3D]/10 rounded-lg disabled:opacity-50 transition cursor-pointer"
          >
            <Cpu className={`w-3.5 h-3.5 text-amber-300 ${reportLoading ? 'animate-spin' : ''}`} />
            {reportLoading ? (lang === "ar" ? "جاري صياغة التقرير اللغوي..." : "Synthesizing briefing...") : (lang === "ar" ? "إعداد تقرير الرأي العام التلقائي" : "Draft Executive Advisory Report")}
          </button>
        </div>
      </div>

      {!reportText ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 text-center text-slate-500 font-sans">
          <BookOpen className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
          <p className="text-xs font-bold text-slate-400">{lang === "ar" ? "سجل التقارير المحفوظة فارغ حالياً" : "Buffer Report Registry Empty"}</p>
          <p className="text-[10px] text-slate-500 max-w-sm mt-1 leading-relaxed">
            {lang === "ar" ? "يرجى تحديد موضوع النقاش النشط أعلاه والنقر فوق 'إعداد تقرير الرأي العام التلقائي' من أجل معالجة تقرير سحابي وصياغة التوصيات الاستراتيجية." : "Select an active national policy topic above and click 'Draft Executive Advisory Report' to coordinate text summarizations under deep Gemini NLP models."}
          </p>
        </div>
      ) : (
        <div className="bg-[#0e121c]/45 p-6 rounded-xl border border-slate-850 max-h-96 overflow-y-auto text-xs text-slate-300 space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-[#CE1126] flex items-center justify-center text-[10px] text-white font-extrabold shadow-sm select-none">★</div>
              <h3 className="font-bold text-xs text-slate-100 font-sans tracking-tight">
                {lang === "ar" ? `تقرير استشاري وطني عام لصياغة السياسة الأردنية — موضوع: ${reportTopic}` : `Jordan National Policy Strategic Briefing — ${reportTopic} Edition`}
              </h3>
            </div>
            <span className="text-[9px] text-[#CE1126] font-extrabold font-mono tracking-widest border border-[#CE1126]/30 px-1.5 py-0.5 rounded bg-rose-950/20 shadow-md">
              {lang === "ar" ? "سري للغاية" : "HIGHLY CONFIDENTIAL"}
            </span>
          </div>
          
          <div className="p-1 space-y-2 text-slate-300 select-text selection:bg-rose-500/20 leading-relaxed font-sans">
            {parseMarkdownToJSX(reportText)}
          </div>
        </div>
      )}
    </div>
  );
}
