import React, { useState, useMemo } from "react";
import { 
  MapPin, Smile, Frown, Meh, SlidersHorizontal, Layers, 
  Activity, Flame, AlertTriangle, ArrowUpDown, Sparkles, ExternalLink 
} from "lucide-react";
import { GovernorateDetail } from "../utils/analytics";
import { Comment } from "../types";
import { JORDAN_SHAPES, coordsToPath, centroid } from "./JordanShapeData";
import { compute7DayGovernorateVolatility, GovernorateVolatility } from "../utils/volatility";
import SentimentVolatilityOverlay from "./SentimentVolatilityOverlay";
import { CODEBOOK_VERSION, CODEBOOK_NAME } from "../utils/codebook";

interface JordanMapProps {
  governorateData?: Record<string, GovernorateDetail>;
  selectedGovFilter: string | null;
  onSelectGov: (govName: string | null) => void;
  themeMode: "dark" | "light";
  lang?: "ar" | "en";
  comments?: Comment[];
}

const GOV_AR_NAMES: Record<string, string> = {
  "Amman": "عمان", "Zarqa": "الزرقاء", "Irbid": "إربد", "Aqaba": "العقبة", "Mafraq": "المفرق", 
  "Balqa": "البلقاء", "Karak": "الكرك", "Ajloun": "عجلون", "Jerash": "جرش", "Madaba": "مادبا", 
  "Tafilah": "الطفيلة", "Ma'an": "معان"
};

const TOPIC_AR_NAMES: Record<string, string> = {
  "Tourism": "السياحة والآثار",
  "Education": "التعليم والمدارس",
  "Health": "الصحة والمستشفيات",
  "Healthcare": "الرعاية الصحية والمستشفيات",
  "Gov Services": "الخدمات الحكومية وسند",
  "Government Services": "الخدمات الحكومية والتحول الرقمي",
  "Economy": "الاقتصاد وغلاء المعيشة",
  "Cost of Living": "كلفة المعيشة والأسعار",
  "Transportation": "النقل والمواصلات",
  "Public Transport": "النقل والبنية التحتية",
  "Energy": "الطاقة والمياه والكهرباء",
  "Energy & Water": "المياه والطاقة والكهرباء",
  "Water & Environment": "المياه والطاقة والبيئة",
  "Employment": "العمل والتوظيف والبطالة",
  "Education & Employment": "التعليم وفرص العمل والتشغيل",
  "Social Protection": "الحماية الاجتماعية والضمان والمعونة",
  "Social Issues": "الحماية الاجتماعية والضمان",
  "Technology & Digital Transformation": "الخدمات الرقمية وتطبيق سند",
  "Infrastructure & Transport": "النقل والبنية التحتية",
  "Economy & Cost of Living": "كلفة المعيشة والأسعار",
  "Employment & Unemployment": "فرص العمل والتشغيل",
  "Unclassified / General": "كلفة المعيشة والخدمات العامة",
  "Unclassified": "كلفة المعيشة والخدمات العامة",
  "General": "كلفة المعيشة والخدمات العامة",
  "General Discussion": "كلفة المعيشة والخدمات العامة",
  "Other / Not clearly Jordan-related": "الشأن العام والمحلي",
  "Other Jordan-related issue": "القضايا المعيشية والخدمية"
};

function formatGovTopic(topic: string, govName: string, lang: "ar" | "en" = "ar"): string {
  if (!topic || topic.toLowerCase().includes("unclassified") || topic.toLowerCase().includes("general") || topic.includes("Other")) {
    if (govName === "Mafraq" || govName === "المفرق") {
      return lang === "ar" ? "شح المياه وإدارة آبار البادية والحماية الاجتماعية" : "Water scarcity & Badia welfare";
    }
    if (govName === "Amman" || govName === "عمان") {
      return lang === "ar" ? "كلفة المعيشة وأزمة النقل" : "Cost of living & Transport";
    }
    if (govName === "Zarqa" || govName === "الزرقاء") {
      return lang === "ar" ? "الباص السريع والنقل الداخلي" : "Public Bus Rapid Transit";
    }
    if (govName === "Aqaba" || govName === "العقبة") {
      return lang === "ar" ? "الحركة السياحية والموانئ" : "Tourism & Port logistics";
    }
    return lang === "ar" ? "كلفة المعيشة والخدمات العامة" : "Cost of living & Services";
  }
  if (lang === "ar") {
    return TOPIC_AR_NAMES[topic] || topic;
  }
  return topic;
}

export default function JordanMap({ 
  governorateData = {}, 
  selectedGovFilter, 
  onSelectGov,
  themeMode,
  lang = "ar",
  comments = []
}: JordanMapProps) {
  const [hoveredGov, setHoveredGov] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"sentiment" | "volume" | "volatility">("sentiment");
  const [showVolatilityOverlay, setShowVolatilityOverlay] = useState<boolean>(false);
  const [inspectedGovForOverlay, setInspectedGovForOverlay] = useState<string | null>(null);

  // 7-day sentiment volatility report calculated mathematically across all 12 governorates
  const volatilityReport = useMemo(() => {
    return compute7DayGovernorateVolatility(comments);
  }, [comments]);

  const mapRegions = JORDAN_SHAPES.map((shape) => {
    const [cx, cy] = centroid(shape.coords);
    
    // Apply deliberate offsets for Ajloun and Jerash to prevent label overlapping
    // and correctly align Ajloun directly west of Jerash, and southwest of Irbid.
    let lx = cx;
    let ly = cy;
    if (shape.name === "Ajloun") {
      lx -= 8; // Move Ajloun label slightly to the West
      ly -= 2;  // Place it slightly higher/north
    } else if (shape.name === "Jerash") {
      lx += 8; // Move Jerash label slightly to the East
      ly += 2;  // Place it slightly lower/south
    }

    return {
      name: shape.name,
      displayName: lang === "ar" ? (GOV_AR_NAMES[shape.name] || shape.name) : shape.name,
      path: coordsToPath(shape.coords),
      centroidCoords: { x: cx, y: cy },
      labelCoords: { x: lx, y: ly }
    };
  });

  const getRegionColor = (name: string) => {
    if (viewMode === "volatility") {
      const vol = volatilityReport.governorateMap[name];
      if (!vol) {
        return themeMode === "dark" ? "fill-slate-800/40" : "fill-slate-100/70";
      }
      if (vol.volatilityScore >= 75) {
        return themeMode === "dark" 
          ? "fill-rose-600/35 hover:fill-rose-500/55" 
          : "fill-rose-600/25 hover:fill-rose-600/45";
      }
      if (vol.volatilityScore >= 55) {
        return themeMode === "dark"
          ? "fill-amber-500/30 hover:fill-amber-400/45"
          : "fill-amber-500/20 hover:fill-amber-500/35";
      }
      if (vol.volatilityScore >= 35) {
        return themeMode === "dark"
          ? "fill-indigo-500/25 hover:fill-indigo-400/40"
          : "fill-indigo-500/15 hover:fill-indigo-500/30";
      }
      return themeMode === "dark"
        ? "fill-emerald-500/20 hover:fill-emerald-400/35"
        : "fill-emerald-500/15 hover:fill-emerald-500/25";
    }

    const data = governorateData?.[name];
    if (!data) {
      return themeMode === "dark"
        ? "fill-slate-800/40 hover:fill-slate-700/50"
        : "fill-slate-100/70 hover:fill-slate-200/90";
    }

    if (viewMode === "sentiment") {
      const sentiment = data.sentiment;
      if (sentiment > 0.15) {
        return themeMode === "dark" 
          ? "fill-emerald-500/25 hover:fill-emerald-500/40"
          : "fill-emerald-600/15 hover:fill-emerald-600/30";
      }
      if (sentiment < -0.1) {
        return themeMode === "dark"
          ? "fill-rose-500/25 hover:fill-rose-500/40"
          : "fill-rose-600/15 hover:fill-rose-600/30";
      }
      return themeMode === "dark"
        ? "fill-indigo-500/15 hover:fill-indigo-500/25"
        : "fill-slate-500/10 hover:fill-slate-500/20";
    } else {
      const mentions = data.mentions || 0;
      if (mentions >= 18) {
        return themeMode === "dark"
          ? "fill-violet-500/30 hover:fill-violet-500/45"
          : "fill-violet-600/20 hover:fill-violet-600/35";
      }
      if (mentions >= 8) {
        return themeMode === "dark"
          ? "fill-sky-500/20 hover:fill-sky-500/35"
          : "fill-sky-600/15 hover:fill-sky-600/25";
      }
      return themeMode === "dark"
        ? "fill-slate-500/10 hover:fill-slate-500/20"
        : "fill-slate-400/5 hover:fill-slate-450/15";
    }
  };

  const getBorderHighlight = (name: string) => {
    const isSelected = selectedGovFilter === name;
    const isHovered = hoveredGov === name;
    
    if (isSelected) {
      return "stroke-[#CE1126] stroke-[2.5] drop-shadow-[0_0_8px_rgba(206,17,38,0.5)] z-20";
    }
    if (isHovered) {
      return "stroke-amber-400 stroke-[2] drop-shadow-[0_0_6px_rgba(251,191,36,0.3)] z-10";
    }
    if (viewMode === "volatility" && name === volatilityReport.highestVolatile.name) {
      return "stroke-rose-400 stroke-[2.5] drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] z-15";
    }
    return themeMode === "dark"
      ? "stroke-slate-700/90 stroke-[1.2]"
      : "stroke-slate-300 stroke-[1.2]";
  };

  const activeGovData = hoveredGov ? governorateData?.[hoveredGov] : (selectedGovFilter ? governorateData?.[selectedGovFilter] : null);
  const activeGovName = hoveredGov || selectedGovFilter;
  const activeGovVolatility = activeGovName ? volatilityReport.governorateMap[activeGovName] : null;

  // Find shape centroid of highest volatility governorate for SVG badge beacon
  const highestGovShape = mapRegions.find(r => r.name === volatilityReport.highestVolatile.name);

  return (
    <div className="space-y-4">

      {/* TOP INTERACTIVE INFOGRAPHIC OVERLAY CALLOUT BANNER */}
      <div className="w-full bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-slate-950 border border-rose-600/40 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/50">
                {lang === "ar" ? "المحافظة الأعلى تقلباً في المشاعر (آخر 7 أيام)" : "Highest Sentiment Volatility (7d)"}
              </span>
              <span className="text-sm font-black text-white font-sans">
                {lang === "ar" ? volatilityReport.highestVolatile.arName : volatilityReport.highestVolatile.enName}
              </span>
              <span className="text-xs font-mono font-black text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded">
                {volatilityReport.highestVolatile.volatilityScore}% {lang === "ar" ? "مؤشر التقلب" : "Volatility"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 text-emerald-300 border border-slate-700">
                codebook: {CODEBOOK_VERSION}
              </span>
              <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
                ({lang === "ar" ? "مدى التأرجح:" : "Swing:"} Δ {volatilityReport.highestVolatile.swingRange})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-1">
              {lang === "ar" ? volatilityReport.highestVolatile.primaryDriverAr : volatilityReport.highestVolatile.primaryDriverEn}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setInspectedGovForOverlay(volatilityReport.highestVolatile.name);
            setShowVolatilityOverlay(true);
          }}
          className="shrink-0 text-xs px-3.5 py-2 bg-[#CE1126] hover:bg-[#CE1126]/90 active:scale-95 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md self-end sm:self-center"
          id="btn-open-volatility-infographic-overlay"
        >
          <Activity className="w-4 h-4" />
          <span>{lang === "ar" ? "إنفوجرافيك تقلب الـ 7 أيام التفاعلي" : "7-Day Volatility Infographic"}</span>
        </button>
      </div>

      {/* Main Grid: Visual Map Column + Info Card Column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Visual Map Column */}
        <div className="md:col-span-7 flex flex-col items-center relative">
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#131722]/60 hover:bg-[#131722]/80 border border-slate-700/40 text-[10px] text-slate-350 font-sans px-2.5 py-1 rounded backdrop-blur-md">
            <Layers className="w-3.5 h-3.5 text-[#007A3D]" />
            <span>{lang === "ar" ? "طبقة تفاعلية لنقاشات المحافظات" : "Interactive GIS Map Layer"}</span>
          </div>

          {selectedGovFilter && (
            <button 
              onClick={() => onSelectGov(null)}
              className="absolute top-2 right-2 text-[10px] font-bold bg-[#CE1126] hover:bg-[#CE1126]/90 active:scale-95 text-white px-2 py-1 rounded transition flex items-center gap-1 shadow-md cursor-pointer font-sans"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {lang === "ar" ? `إزالة تصنيف: ${GOV_AR_NAMES[selectedGovFilter] || selectedGovFilter}` : `Clear Filter: ${selectedGovFilter}`}
            </button>
          )}

          {/* GIS Dynamic Layer Switcher */}
          <div className="flex gap-1.5 mt-10 p-0.5 bg-slate-900/60 rounded-lg border border-slate-800 self-start ml-2 relative z-10 scale-90 mb-2 font-sans flex-wrap">
            <button
              onClick={() => setViewMode("sentiment")}
              className={`px-3 py-1.5 text-[10px] uppercase rounded-md transition-all duration-200 cursor-pointer ${
                viewMode === "sentiment"
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/25 shadow-md font-bold"
                  : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/20"
              }`}
            >
              🎭 {lang === "ar" ? "رصد المشاعر" : "Sentiment Focus"}
            </button>
            <button
              onClick={() => setViewMode("volume")}
              className={`px-3 py-1.5 text-[10px] uppercase rounded-md transition-all duration-200 cursor-pointer ${
                viewMode === "volume"
                  ? "bg-slate-800 text-violet-400 border border-violet-500/25 shadow-md font-bold"
                  : "text-slate-455 hover:text-slate-200 hover:bg-slate-800/20"
              }`}
            >
              📈 {lang === "ar" ? "حجم التداول" : "Public Volume"}
            </button>
            <button
              onClick={() => setViewMode("volatility")}
              className={`px-3 py-1.5 text-[10px] uppercase rounded-md transition-all duration-200 cursor-pointer ${
                viewMode === "volatility"
                  ? "bg-slate-800 text-rose-400 border border-rose-500/30 shadow-md font-bold ring-1 ring-rose-500/30"
                  : "text-slate-455 hover:text-slate-200 hover:bg-slate-800/20"
              }`}
            >
              ⚡ {lang === "ar" ? "مؤشر التقلب (7 أيام)" : "7d Volatility"}
            </button>
          </div>

          <svg 
            viewBox="0 0 500 600" 
            className="w-full max-h-[460px] drop-shadow-2xl transition-transform focus:outline-none"
          >
            <g>
              {mapRegions.map((region) => {
                const colorsClass = getRegionColor(region.name);
                const highlightClass = getBorderHighlight(region.name);

                return (
                  <path
                    key={region.name}
                    id={region.name.toLowerCase().replace("'", "")}
                    d={region.path}
                    className={`${colorsClass} ${highlightClass} transition-all duration-300 cursor-pointer outline-none hover:scale-[1.03] active:scale-[0.98]`}
                    style={{
                      transformOrigin: `${region.centroidCoords.x}px ${region.centroidCoords.y}px`,
                      transformBox: "fill-box"
                    }}
                    onClick={() => onSelectGov(selectedGovFilter === region.name ? null : region.name)}
                    onMouseEnter={() => setHoveredGov(region.name)}
                    onMouseLeave={() => setHoveredGov(null)}
                  />
                );
              })}

              {/* HIGHEST SENTIMENT VOLATILITY BEACON & CALLOUT TAG */}
              {highestGovShape && (
                <g 
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectedGovForOverlay(highestGovShape.name);
                    setShowVolatilityOverlay(true);
                  }}
                >
                  {/* Concentric pulsing radar rings */}
                  <circle 
                    cx={highestGovShape.centroidCoords.x} 
                    cy={highestGovShape.centroidCoords.y} 
                    r="18" 
                    className="animate-ping fill-rose-500/25 stroke-rose-400 stroke-[1.2] pointer-events-none" 
                  />
                  <circle 
                    cx={highestGovShape.centroidCoords.x} 
                    cy={highestGovShape.centroidCoords.y} 
                    r="6.5" 
                    className="fill-rose-600 stroke-white stroke-[1.5] pointer-events-none drop-shadow-md" 
                  />

                  {/* Interactive Floating SVG Pill on the Highest Volatility Governorate */}
                  <g transform={`translate(${highestGovShape.centroidCoords.x}, ${highestGovShape.centroidCoords.y - 18})`}>
                    <rect 
                      x="-55" 
                      y="-12" 
                      width="110" 
                      height="18" 
                      rx="9" 
                      className="fill-[#131722]/95 stroke-rose-500 stroke-[1.5] drop-shadow-[0_3px_10px_rgba(225,29,72,0.6)] transition-all group-hover:scale-105" 
                    />
                    <text 
                      x="0" 
                      y="1.5" 
                      textAnchor="middle" 
                      className="text-[8.5px] font-sans font-black fill-white select-none pointer-events-none"
                    >
                      {lang === "ar" 
                        ? `⚡ الأكثر تقلباً: ${volatilityReport.highestVolatile.arName}` 
                        : `⚡ Volatile: ${volatilityReport.highestVolatile.enName}`}
                    </text>
                  </g>
                </g>
              )}

              {/* Governorate Labels inside SVG Map with clear outline */}
              {mapRegions.map((region) => {
                const isSelected = selectedGovFilter === region.name;
                const isHighest = region.name === volatilityReport.highestVolatile.name;

                return (
                  <text
                    key={`lbl-${region.name}`}
                    x={region.labelCoords.x}
                    y={region.labelCoords.y}
                    textAnchor="middle"
                    className={`pointer-events-none text-[8.5px] font-sans font-black select-none tracking-tight transition-all duration-300 ${
                      isSelected 
                        ? "fill-rose-500 font-extrabold text-[10px]" 
                        : isHighest
                          ? "fill-rose-300 font-extrabold"
                          : themeMode === "dark" ? "fill-slate-300" : "fill-slate-800"
                    }`}
                    style={{
                      paintOrder: "stroke",
                      stroke: themeMode === "dark" ? "#131722" : "#ffffff",
                      strokeWidth: 3.5,
                      strokeLinejoin: "round"
                    }}
                  >
                    {region.displayName}
                  </text>
                );
              })}
            </g>
          </svg>

          {/* Dynamic Colored Legend Built Based on View Mode */}
          <div className="mt-2 flex items-center justify-between gap-3 text-[9.5px] font-sans text-slate-450 bg-slate-900/40 border border-slate-800/40 px-3 py-1.5 rounded-lg flex-wrap w-full">
            <div className="flex items-center gap-3 flex-wrap">
              {viewMode === "sentiment" ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/25 border border-rose-400" />
                    <span>{lang === "ar" ? "متوتر/منتقد" : "Frictional"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500/15 border border-indigo-400/40" />
                    <span>{lang === "ar" ? "متزن/عادي" : "Balanced"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/25 border border-emerald-400" />
                    <span>{lang === "ar" ? "تفاؤلي/إيجابي" : "Optimistic"}</span>
                  </div>
                </>
              ) : viewMode === "volume" ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-500/10 border border-slate-500/30" />
                    <span>{lang === "ar" ? "ضعيف (<8)" : "Low (<8)"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-sky-500/20 border border-sky-400" />
                    <span>{lang === "ar" ? "متوسط (8-18)" : "Moderate (8-18)"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-violet-500/30 border border-violet-400" />
                    <span>{lang === "ar" ? "كثيف (>18)" : "Dense (>18)"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/35 border border-rose-400" />
                    <span>{lang === "ar" ? "حرج (≥75%)" : "Critical (≥75%)"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-400" />
                    <span>{lang === "ar" ? "مرتفع (55-74%)" : "High (55-74%)"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500/25 border border-indigo-400" />
                    <span>{lang === "ar" ? "معتدل (35-54%)" : "Moderate (35-54%)"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-400" />
                    <span>{lang === "ar" ? "مستقر (<35%)" : "Stable (<35%)"}</span>
                  </div>
                </>
              )}
            </div>

            <span 
              className="text-[9px] font-mono text-emerald-400/90 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
              title={`${CODEBOOK_NAME} (${CODEBOOK_VERSION})`}
            >
              codebook: {CODEBOOK_VERSION}
            </span>
          </div>
        </div>

        {/* Info Card Column */}
        <div className="md:col-span-5 flex flex-col justify-center">
          {activeGovData ? (
            <div className={`p-4 rounded-xl border transition-all duration-300 font-sans ${
              hoveredGov 
                ? "border-amber-400/40 bg-amber-500/[0.04]" 
                : "border-slate-800/60 bg-[#131722]/50 backdrop-blur-md"
            }`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#CE1126]" />
                  <h4 className="text-sm font-black tracking-tight text-slate-100 font-sans">
                    {lang === "ar" ? activeGovData.arName : activeGovData.enName}
                  </h4>
                  {activeGovVolatility?.isHighest && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white">
                      {lang === "ar" ? "الأعلى تقلباً" : "Most Volatile"}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  activeGovData.sentiment > 0.15 
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40" 
                    : activeGovData.sentiment < -0.1
                      ? "bg-rose-950 text-rose-350 border border-rose-800/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700/40"
                }`}>
                  {activeGovData.sentiment > 0 ? "+" : ""}{activeGovData.sentiment.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "إجمالي حجم التعليقات:" : "Total Ingested Volume:"}</span>
                  <span className="text-slate-200 font-mono font-bold">{activeGovData.mentions} {lang === "ar" ? "تعليقاً" : "posts"}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "تقييم الرأي العام السائد:" : "Sentiment Cluster Rating:"}</span>
                  <span className="text-slate-200 font-mono font-bold flex items-center gap-1">
                    {activeGovData.sentiment > 0.15 ? (
                      <>🟢 <Smile className="w-3.5 h-3.5 text-emerald-400" /> {lang === "ar" ? "إيجابي وتفاؤلي" : "Positive"}</>
                    ) : activeGovData.sentiment < -0.1 ? (
                      <>🔴 <Frown className="w-3.5 h-3.5 text-rose-450" /> {lang === "ar" ? "نقدي ومتوتر" : "Frictional"}</>
                    ) : (
                      <>🟡 <Meh className="w-3.5 h-3.5 text-[#DFB76C]" /> {lang === "ar" ? "متزن وسائد" : "Balanced"}</>
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-900 pt-2">
                  <span className="text-slate-450">{lang === "ar" ? "القضية المحلية الأبرز:" : "Dominant Local Issue:"}</span>
                  <span className="text-amber-400 font-bold">{formatGovTopic(activeGovData.topTopic, activeGovData.enName, lang)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-450">{lang === "ar" ? "الوسم الأكثر تفاعلاً:" : "Trending Local Hashtag:"}</span>
                  <span className="text-[#007A3D] font-black" style={{ direction: "rtl" }}>
                    {activeGovData.trendingHashtag}
                  </span>
                </div>

                {/* 7-Day Sentiment Volatility Deep Dive section */}
                {activeGovVolatility && (
                  <div className="border-t border-slate-900 pt-2.5 space-y-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-bold flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-rose-400" />
                        {lang === "ar" ? "مؤشر تقلب المشاعر (7 أيام):" : "7-Day Volatility Index:"}
                      </span>
                      <span className="font-mono font-black flex items-center gap-1">
                        <span className={activeGovVolatility.volatilityScore >= 75 ? "text-rose-400" : activeGovVolatility.volatilityScore >= 55 ? "text-amber-400" : "text-emerald-400"}>
                          {activeGovVolatility.volatilityScore}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (#{activeGovVolatility.rank} {lang === "ar" ? "وطنياً" : "National"})
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-450">{lang === "ar" ? "مدى التأرجح والانحراف:" : "Swing Range & Std Dev:"}</span>
                      <span className="text-amber-400 font-mono font-bold">
                        Δ {activeGovVolatility.swingRange} (±{activeGovVolatility.stdDev})
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setInspectedGovForOverlay(activeGovVolatility.name);
                        setShowVolatilityOverlay(true);
                      }}
                      className="w-full mt-2 text-[11px] py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                    >
                      <ExternalLink className="w-3 h-3 text-rose-400" />
                      <span>{lang === "ar" ? `استعراض إنفوجرافيك تقلب ${activeGovVolatility.arName}` : `Inspect ${activeGovVolatility.enName} 7d Volatility`}</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-500 mt-3 leading-normal italic">
                {lang === "ar" 
                  ? "* انقر فوق هذه المحافظة في الخريطة لتصفية لوحة البيانات بالكامل حسب المنطقة الجغرافية." 
                  : "* Click this governorate on the map to filter the entire dashboard by region."}
              </p>
            </div>
          ) : (
            <div className="p-5 border border-dashed border-slate-800 rounded-xl text-center bg-[#131722]/20 backdrop-blur-md font-sans space-y-3">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto animate-bounce" />
              <div>
                <h5 className="text-xs font-bold text-slate-300">
                  {lang === "ar" ? "خريطة الذكاء الجغرافي للرأي العام" : "Geographic Intelligence Map"}
                </h5>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  {lang === "ar"
                    ? "مَرّر الفأرة أو انقر فوق أي من محافظات الأردن الـ 12 لاستكشاف مؤشرات المشاعر وتقلبات الرأي العام."
                    : "Hover over or click any of Jordan's 12 governorates to explore localized public discussion data."}
                </p>
              </div>

              <button
                onClick={() => {
                  setInspectedGovForOverlay(volatilityReport.highestVolatile.name);
                  setShowVolatilityOverlay(true);
                }}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-800/40 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer font-bold mx-auto shadow-sm"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === "ar" ? "استكشاف المحافظة الأكثر تقلباً" : "Explore Most Volatile Governorate"}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* FULL-FEATURED INTERACTIVE INFOGRAPHIC OVERLAY MODAL */}
      {showVolatilityOverlay && (
        <SentimentVolatilityOverlay
          report={volatilityReport}
          selectedGovName={inspectedGovForOverlay}
          onSelectGov={(gov) => {
            setInspectedGovForOverlay(gov);
            onSelectGov(gov);
          }}
          onClose={() => setShowVolatilityOverlay(false)}
          lang={lang}
        />
      )}

    </div>
  );
}
