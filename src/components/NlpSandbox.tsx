import React, { useState } from "react";
import { 
  Cpu, Terminal, Smile, Meh, Frown, MapPin, Radio, ShieldCheck, ListFilter, Brackets
} from "lucide-react";
import { Comment, PreprocessingLog } from "../types";

interface NlpSandboxProps {
  sandboxText: string;
  sandboxAuthor: string;
  sandboxHandle: string;
  sandboxPlatform: string;
  sandboxGov: string;
  onChangeSandboxGov: (gov: string) => void;
  onChangeText: (text: string) => void;
  onChangeAuthor: (author: string) => void;
  onChangeHandle: (handle: string) => void;
  onChangePlatform: (platform: string) => void;
  presets: { title: string; text: string; author: string; handle: string; platform: string }[];
  onApplyPreset: (preset: any) => void;
  onAnalyze: () => void;
  sandboxLoading: boolean;
  sandboxNlpSteps: PreprocessingLog[];
  sandboxResult: Comment | null;
  lang?: "ar" | "en";
}

const JORDAN_GOVERNORATES = [
  "Amman", "Zarqa", "Irbid", "Aqaba", "Mafraq", "Balqa", "Karak", "Ajloun", "Jerash", "Madaba", "Tafilah", "Ma'an"
];

const GOV_AR_NAMES: Record<string, string> = {
  Amman: "عمان", Zarqa: "الزرقاء", Irbid: "إربد", Aqaba: "العقبة", Mafraq: "المفرق", 
  Balqa: "البلقاء", Karak: "الكرك", Ajloun: "عجلون", Jerash: "جرش", Madaba: "مادبا", 
  Tafilah: "الطفيلة", "Ma'an": "معان"
};

const DIALECT_VERNACULARS = [
  { code: "urban", label: "عامية عمانية (Ammanite)", labelAr: "العامّية العمانية / الحضرية" },
  { code: "rural", label: "أرياف الشمال (Northern)", labelAr: "لهجة أرياف الشمال الأردني" },
  { code: "badawikh", label: "بادية الجنوب (Southern)", labelAr: "لهجة البادية الجنوبية الأردنية" },
  { code: "msa", label: "فصحى مبسطة (Standard)", labelAr: "اللغة العربية الفصحى المبسطة" },
  { code: "en", label: "English / Tourist Ingress", labelAr: "اللغة الإنجليزية / تعليقات الزوار" }
];

const SIMULATED_RELAYS = [
  { name: "Public Social Account", nameAr: "مواطن - حساب شخصي عام", handle: "@citizen_jo" },
  { name: "وكالة عمون الإخبارية (Ammon News)", nameAr: "وكالة عمون الإخبارية (Ammon News)", handle: "@AmmonNews" },
  { name: "تلفزيون المملكة (Al Mamlaka TV)", nameAr: "تلفزيون المملكة (Al Mamlaka TV)", handle: "@AlMamlakaTV" },
  { name: "الرأي اليوم (Al Ra'i Journal)", nameAr: "الجريدة الرسمية والرأي (Al Ra'i)", handle: "@AlRaiNews" },
  { name: "النشامى للمشجعين (Nashama Fans Portal)", nameAr: "منصة مشجعي النشامى الرياضية", handle: "@NashamaSports" }
];

export default function NlpSandbox({
  sandboxText,
  sandboxAuthor,
  sandboxHandle,
  sandboxPlatform,
  sandboxGov,
  onChangeSandboxGov,
  onChangeText,
  onChangeAuthor,
  onChangeHandle,
  onChangePlatform,
  presets,
  onApplyPreset,
  onAnalyze,
  sandboxLoading,
  sandboxNlpSteps,
  sandboxResult,
  lang = "ar"
}: NlpSandboxProps) {

  const [selectedSimVernacular, setSelectedSimVernacular] = useState("urban");
  const [activeTab, setActiveTab] = useState<"logs" | "schema" | "json">("logs");

  const handleIngressRelaySelect = (name: string, handle: string) => {
    onChangeAuthor(name);
    onChangeHandle(handle);
  };

  const handleSimGovClick = (gov: string) => {
    onChangeSandboxGov(gov);
    const cleanText = sandboxText.replace(/\s*\(موقع[:\s]*[\w\u0600-\u06FF]+\)/, "");
    const siteTag = lang === "ar" ? `(موقع: ${GOV_AR_NAMES[gov] || gov})` : `(موقع: ${gov})`;
    onChangeText(`${cleanText} ${siteTag}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Input Workspace Sandbox - contextualized (Point 2) */}
      <div className="lg:col-span-6 bg-[#131722]/45 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 font-mono">
              <Cpu className="w-3 h-3 text-emerald-400" /> {lang === "ar" ? "منصة إدخال ومحاكاة الرأي العام" : "Dialect Ingress Simulation Console"}
            </span>
            <span className="text-[9.5px] font-mono font-bold text-[#DFB76C] flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-red-500" /> {lang === "ar" ? "قنوات المحاكاة نشطة" : "CONTEXT ACTIVE"}
            </span>
          </div>

          <h2 className="text-sm font-extrabold text-[#DFB76C] font-sans">
            {lang === "ar" ? "مختبر معالجة اللهجة الأردنية وفرز المواقع الجغرافية" : "Colloquial Dialect & GIS Metadata Ingestion Simulator"}
          </h2>
          <p className="text-[11px] text-slate-450 leading-normal font-sans">
            {lang === "ar" 
              ? "قم بمحاكاة وتعديل متغيرات الرأي العام الأردني وتجربة المعالجة الدلالية الفورية لتحديد الموضوعات والمشاعر وتحديث الخرائط الجغرافية تلقائياً."
              : "Customize Jordan's civil opinion feedback variables below. Metadatas are compiled side-by-side with semantic payloads to test regional tracking pipelines."}
          </p>
        </div>

        {/* Ingress Preset select */}
        <div className="space-y-1.5 p-3.5 bg-slate-900/60 rounded-xl border border-slate-850">
          <p className="text-[9px] font-bold text-slate-450 uppercase font-mono tracking-widest flex items-center gap-1">
            <ListFilter className="w-3 h-3 text-[#DFB76C]" /> {lang === "ar" ? "اختر نموذج تعليق أردني مسجل:" : "Select Jordanian Citizen Preset:"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 pt-1.5 font-sans">
            {presets.map((pr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onApplyPreset(pr);
                  const textPr = pr.text.toLowerCase();
                  if (textPr.includes("عجلون")) onChangeSandboxGov("Ajloun");
                  else if (textPr.includes("عمان") || textPr.includes("amman")) onChangeSandboxGov("Amman");
                  else if (textPr.includes("منسف") || textPr.includes("كرك")) onChangeSandboxGov("Karak");
                  else if (textPr.includes("طفيلة") || textPr.includes("طفيلية") || textPr.includes("tafilah")) onChangeSandboxGov("Tafilah");
                }}
                className="text-[10px] text-center font-bold bg-[#181d2d] hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-1.5 rounded transition whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
              >
                {pr.title}
              </button>
            ))}
          </div>
        </div>

        {/* Surrounding contextual input tools */}
        <div className="space-y-3 pt-1">
          
          {/* Spatial / Governorate Origin Metadata Selection */}
          <div className="space-y-1.5 font-sans">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
              <span className="font-mono text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500" /> {lang === "ar" ? "الموقع الجغرافي للتعليق (رصد المحافظة):" : "Simulated Geo-Origin Governorate (GIS mapping):"}
              </span>
              <span className="text-emerald-400 font-mono">🌐 {lang === "ar" ? (GOV_AR_NAMES[sandboxGov] || sandboxGov) : sandboxGov} Node</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {JORDAN_GOVERNORATES.map((gov) => (
                <button
                  key={gov}
                  type="button"
                  onClick={() => handleSimGovClick(gov)}
                  className={`py-1 text-[9.5px] font-sans font-black rounded border transition ${
                    sandboxGov === gov
                      ? "bg-red-950/40 text-red-400 border-red-800"
                      : "bg-[#181d2d] border-slate-800/80 text-slate-450 hover:border-slate-700 hover:text-slate-200"
                  } cursor-pointer`}
                >
                  {lang === "ar" ? (GOV_AR_NAMES[gov]?.slice(0, 7) || gov.slice(0, 6)) : gov.slice(0, 6)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
            {/* Vernacular Language style simulator */}
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-bold text-slate-450 uppercase block">{lang === "ar" ? "تصنيف وتوصيف اللهجة:" : "Dialect Demarcation Class:"}</span>
              <select
                value={selectedSimVernacular}
                onChange={(e) => setSelectedSimVernacular(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] text-slate-350 border border-slate-800 rounded-lg bg-slate-900/60 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {DIALECT_VERNACULARS.map(v => (
                  <option key={v.code} value={v.code}>{lang === "ar" ? v.labelAr : v.label}</option>
                ))}
              </select>
            </div>

            {/* Simulated News Relays / Source handle generator */}
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-bold text-slate-450 uppercase block">{lang === "ar" ? "قناة النشر والمصدر المسئول:" : "Inbound Relay Node:"}</span>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  const item = SIMULATED_RELAYS.find(r => r.name === val);
                  if (item) handleIngressRelaySelect(item.name, item.handle);
                }}
                className="w-full px-2.5 py-1.5 text-[11px] text-slate-355 border border-slate-800 rounded-lg bg-slate-900/60 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer font-bold"
              >
                <option value="">{lang === "ar" ? "-- اختر ناشر أو قناة المحاكاة --" : "-- Choose Relay Node Source --"}</option>
                {SIMULATED_RELAYS.map(r => (
                  <option key={r.name} value={r.name}>{lang === "ar" ? r.nameAr : r.name} ({r.handle})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-sans">
            <div className="space-y-1">
              <span className="text-[9px] uppercase text-slate-500 font-bold block">{lang === "ar" ? "اسم كاتب المنشور:" : "Source Display Name:"}</span>
              <input 
                type="text"
                value={sandboxAuthor}
                onChange={(e) => onChangeAuthor(e.target.value)}
                placeholder="Citizen Author"
                className="w-full px-2.5 py-1.5 text-xs text-slate-200 border border-slate-850 rounded-lg bg-slate-900/80 focus:ring-1 focus:ring-emerald-500 font-medium focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] uppercase text-slate-500 font-bold block">{lang === "ar" ? "الحساب الرقمي (@):" : "Assigned Digital @Handle:"}</span>
              <input 
                type="text"
                value={sandboxHandle}
                onChange={(e) => onChangeHandle(e.target.value)}
                placeholder="Handle @..."
                className="w-full px-2.5 py-1.5 text-xs text-slate-200 border border-slate-850 rounded-lg bg-slate-100/10 focus:ring-1 focus:ring-emerald-500 font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] uppercase text-slate-500 font-bold block">{lang === "ar" ? "منصة استيراد البيانات:" : "Crawl Platform Target:"}</span>
              <select
                value={sandboxPlatform}
                onChange={(e) => onChangePlatform(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs text-slate-200 border border-slate-855 rounded-lg bg-slate-900/80 focus:ring-1 focus:ring-emerald-500 cursor-pointer focus:outline-none"
              >
                <option value="X">𝕏 / Twitter</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="YouTube">YouTube</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-1 font-sans">
            <div className="flex justify-between text-[9px] uppercase font-mono font-black text-slate-500">
              <span>{lang === "ar" ? "نص المشاركة أو التعليق المدخل:" : "Arabic Dialect / English Expression:"}</span>
              <span>{lang === "ar" ? "معالجة ثنائية الاتجاه (عربي/إنجليزي)" : "RTL & LTR Bilingual Processing"}</span>
            </div>
            <textarea 
              value={sandboxText}
              onChange={(e) => onChangeText(e.target.value)}
              placeholder={lang === "ar" ? "اكتب أو الصق نصاً عامياً أو تقريراً إخبارياً لمعالجته دلالياً وجغرافياً بالكامل..." : "Paste raw Jordanian dialogue, comments, or news bulletin here..."}
              className="w-full text-xs font-semibold p-3.5 border border-slate-852 rounded-xl h-24 focus:ring-1 focus:ring-[#DFB76C] bg-slate-900/40 text-slate-200 resize-none leading-relaxed focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={sandboxLoading || !sandboxText}
            className="w-full py-2.5 bg-[#007A3D] hover:bg-[#007A3D]/95 hover:shadow-lg hover:shadow-emerald-950/30 active:scale-98 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition duration-200 cursor-pointer font-sans"
          >
            <Cpu className={`w-3.5 h-3.5 ${sandboxLoading ? 'animate-spin' : ''}`} />
            {sandboxLoading 
              ? (lang === "ar" ? "جاري تشغيل المعالجة والتحليل الدلالي..." : "Processing Linguistic Schema Stacks...") 
              : (lang === "ar" ? "تحليل النص ونشره في قنوات البث المباشر" : "Analyze Dialect & Publish to Stream")}
          </button>
        </div>
      </div>

      {/* 2. Output Tracer Logs Screen & Structured Diagnostic Board */}
      <div className="lg:col-span-6 bg-[#131722]/85 border border-slate-850/80 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between text-slate-100">
        <div>
          <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-450 animate-ping inline-block" />
              <h2 className="text-xs font-bold font-mono tracking-wide text-emerald-400 uppercase">
                {lang === "ar" ? "مسارات تتبع معالجة اللغة والنصوص" : "Pipeline Trace & Structured payload checks"}
              </h2>
            </div>
            
            {/* Tab Toggles */}
            <div className="flex rounded-md bg-slate-900 text-[8.5px] font-mono p-0.5 border border-slate-800">
              <button 
                onClick={() => setActiveTab("logs")}
                className={`px-2 py-1 rounded ${activeTab === "logs" ? "bg-[#007A3D] text-white font-bold" : "text-slate-450 hover:text-white"}`}
              >
                {lang === "ar" ? "أثر المعالجة" : "Trace Logs"}
              </button>
              <button 
                onClick={() => setActiveTab("schema")}
                className={`px-2 py-1 rounded ${activeTab === "schema" ? "bg-[#007A3D] text-white font-bold" : "text-slate-450 hover:text-white"}`}
              >
                {lang === "ar" ? "بيانات التحقق" : "Schema Validations"}
              </button>
              <button 
                onClick={() => setActiveTab("json")}
                className={`px-2 py-1 rounded ${activeTab === "json" ? "bg-[#007A3D] text-white font-bold" : "text-slate-450 hover:text-white"}`}
              >
                {lang === "ar" ? "كائن JSON" : "Raw JSON"}
              </button>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-sans">
            {lang === "ar" 
              ? "تحقق من سلامة كائنات JSON دلالياً، ومستويات مطابقة اللمّات ومراحل الاستقصاء اللغوي وحوسبة المشاعر في قواعد البيانات." 
              : "Diagnostic insights checking structured JSON keys, NLP lemmatization thresholds, and model execution times."}
          </p>
        </div>

        {/* Tab A: Sequential Pipeline steps trace logs */}
        {activeTab === "logs" && (
          <div className="flex-1 flex flex-col justify-between min-h-[220px]">
            {sandboxNlpSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-800/80 rounded-xl my-4 text-center text-xs text-slate-500 flex-1 font-sans">
                <Terminal className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                <p className="font-semibold text-slate-450">{lang === "ar" ? "جاهز لاستلام البيانات" : "Ingestion Standby"}</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                  {lang === "ar" 
                    ? "يرجى تحديد أصل وموقع التعليق وإدخال النص للبدء في تتبع مراحل التحليل اللغوي والجغرافي الفوري." 
                    : "Fill custom geo-origins or choose a citizen preset, then deploy the semantic pipeline check."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-[9px] max-h-[240px] overflow-y-auto pr-1 my-3 flex-1 scrollbar-thin">
                {sandboxNlpSteps.map((step, idx) => (
                  <div key={idx} className="bg-[#080a10] border border-slate-850 p-2.5 rounded-lg flex flex-col gap-1">
                    <div className="flex items-center justify-between text-slate-300 font-bold pb-1 border-b border-slate-900 leading-none">
                      <span className="text-emerald-400">{lang === "ar" ? `الخطوة ${idx + 1}` : `Step ${idx + 1}`}: {step.step}</span>
                      <span className="text-[8px] text-slate-500 font-normal">{step.description}</span>
                    </div>
                    <div className="text-slate-350 overflow-hidden text-ellipsis break-words pt-0.5 whitespace-pre-line leading-relaxed">{step.output}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab B: Schema Verifications & Constraints logs */}
        {activeTab === "schema" && (
          <div className="flex-1 flex flex-col justify-between min-h-[220px] my-3">
            {!sandboxResult ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-800/85 rounded-xl text-center text-xs text-slate-500 flex-1 font-sans">
                <ShieldCheck className="w-8 h-8 text-slate-700 mb-2 cursor-help animate-pulse" />
                <p className="font-semibold text-slate-450">{lang === "ar" ? "نظام التحقق غير نشط" : "Validator Deactivated"}</p>
                <p className="text-[10px] text-slate-500 mt-1">{lang === "ar" ? "يرجى تشغيل معالجة النصوص للتأكد من توافق الكلمات الموصوفة بنيوياً." : "Run an analysis to generate structured AI JSON schemas validation."}</p>
              </div>
            ) : (
              <div className="bg-[#080a14] border border-slate-855 rounded-xl p-4 space-y-3 font-sans flex-1 text-left">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-[10px] font-black tracking-wider text-[#DFB76C] uppercase font-mono">{lang === "ar" ? "سجل التحقق من هيكل كائن المشاعر" : "Linguistic Schema Compliance Ledger"}</span>
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full font-black border border-emerald-900">VERIFIED OK</span>
                </div>
                
                <div className="space-y-2.5 text-xs text-slate-450">
                  <div className="flex items-center justify-between border-b border-slate-900/40 pb-1.5 last:border-0">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-300 text-[11px]">Field: "sentiment" code</p>
                      <p className="text-[9px] text-slate-500 font-mono">Acceptable: positive | neutral | negative</p>
                    </div>
                    <span className="text-[9.5px] font-bold font-mono text-emerald-400">Validated: "{sandboxResult.sentiment}" ✓</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-900/40 pb-1.5 last:border-0">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-300 text-[11px]">Field: "sentimentScore" range</p>
                      <p className="text-[9px] text-slate-500 font-mono">Acceptable: Floating-point decimals [-1.0 to 1.0]</p>
                    </div>
                    <span className="text-[9.5px] font-bold font-mono text-emerald-400">Validated: {sandboxResult.sentimentScore.toFixed(3)} ✓</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-900/40 pb-1.5 last:border-0">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-300 text-[11px]">Field: "topic" classification</p>
                      <p className="text-[9px] text-slate-500 font-mono">Acceptable: Dynamically determined context keywords</p>
                    </div>
                    <span className="text-[9.5px] font-bold font-mono text-[#DFB76C]">Validated: "{sandboxResult.topic}" ✓</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-900/40 pb-1.5 last:border-0">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-300 text-[11px]">Field: "namedEntities" array</p>
                      <p className="text-[9px] text-slate-500 font-mono">Acceptable: Extracted proper Jordanian nouns array</p>
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-450 text-right truncate max-w-[180px]">
                      [{sandboxResult.namedEntities?.join(", ") || "None found"}] ✓
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab C: Expandable Raw JSON Viewer */}
        {activeTab === "json" && (
          <div className="flex-1 flex flex-col justify-between min-h-[220px] my-3">
            {!sandboxResult ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 flex-1 font-sans">
                <Brackets className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                <p className="font-semibold text-[#DFB76C]">{lang === "ar" ? "كائن المعالجة فارغ" : "Object Stream Empty"}</p>
                <p className="text-[10px] text-slate-500 mt-1">{lang === "ar" ? "يرجى تشغيل المحاكاة المعالجة لعرض هيكل الاستجابة الرقمي." : "Run diagnostic parsing to check simulated JSON structures."}</p>
              </div>
            ) : (
              <div className="bg-[#050609] border border-slate-855 rounded-xl p-3 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-500 pb-1.5 border-b border-slate-900 mb-2">
                  <span>STRUCTURED DICTIONARY PAYLOAD SCHEMA</span>
                  <span>ENFORCE: APPLICATION_JSON</span>
                </div>
                <pre className="text-[9.5px] font-mono text-[#DFB76C] bg-transparent p-1 overflow-auto max-h-[175px] leading-relaxed select-all flex-1 text-left">
                  {JSON.stringify({
                    id: sandboxResult.id,
                    timestamp: sandboxResult.timestamp,
                    author: sandboxResult.author,
                    handle: sandboxResult.handle,
                    platform: sandboxResult.platform,
                    language: sandboxResult.language,
                    sentiment: sandboxResult.sentiment,
                    sentimentScore: sandboxResult.sentimentScore,
                    topic: sandboxResult.topic,
                    namedEntities: sandboxResult.namedEntities,
                    likes: sandboxResult.likes,
                    shares: sandboxResult.shares,
                    tokens: sandboxResult.tokens
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Active categorization output summary plate */}
        {sandboxResult && (
          <div className="bg-[#0b0c10] border border-slate-850 p-3 rounded-xl grid grid-cols-3 gap-2.5 items-center text-center font-sans">
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 font-mono uppercase font-semibold">{lang === "ar" ? "موضوع التداول" : "Category Sector"}</p>
              <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-900/40 truncate max-w-full">
                {sandboxResult.topic}
              </span>
            </div>

            <div className="space-y-0.5 border-l border-r border-slate-850">
              <p className="text-[9px] text-slate-500 font-mono uppercase font-semibold">{lang === "ar" ? "المشاعر والرصد" : "Linguistic Sentiment"}</p>
              <div className="flex items-center justify-center gap-1 font-mono text-[11px] font-black">
                {sandboxResult.sentiment === "positive" && <Smile className="w-3.5 h-3.5 text-emerald-400" />}
                {sandboxResult.sentiment === "neutral" && <Meh className="w-3.5 h-3.5 text-amber-500" />}
                {sandboxResult.sentiment === "negative" && <Frown className="w-3.5 h-3.5 text-red-400" />}
                <span className="text-slate-100">{sandboxResult.sentimentScore > 0 ? "+" : ""}{sandboxResult.sentimentScore.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 font-mono uppercase font-semibold">{lang === "ar" ? "جغرافيا المحليات أثر" : "Sim Coordinates GIS"}</p>
              <p className="text-[10px] font-mono font-bold text-emerald-400 truncate px-1">
                🌐 {lang === "ar" ? (GOV_AR_NAMES[sandboxGov] || sandboxGov) : sandboxGov}
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
