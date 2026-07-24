import React, { useState } from "react";
import { MapPin, Smile, Frown, Meh, SlidersHorizontal, Layers } from "lucide-react";
import { GovernorateDetail } from "../utils/analytics";
import { JORDAN_SHAPES, coordsToPath, centroid } from "./JordanShapeData";

interface JordanMapProps {
  governorateData: Record<string, GovernorateDetail>;
  selectedGovFilter: string | null;
  onSelectGov: (govName: string | null) => void;
  themeMode: "dark" | "light";
  lang?: "ar" | "en";
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
  "Gov Services": "الخدمات الحكومية وسند",
  "Economy": "الاقتصاد وغلاء المعيشة",
  "Transportation": "النقل والمواصلات",
  "Energy": "الطاقة والمياه والكهرباء",
  "Employment": "العمل والتوظيف والبطالة"
};

export default function JordanMap({ 
  governorateData, 
  selectedGovFilter, 
  onSelectGov,
  themeMode,
  lang = "ar"
}: JordanMapProps) {
  const [hoveredGov, setHoveredGov] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"sentiment" | "volume">("sentiment");

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
    const data = governorateData[name];
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
    return themeMode === "dark"
      ? "stroke-slate-700/90 stroke-[1.2]"
      : "stroke-slate-300 stroke-[1.2]";
  };

  const activeGovData = hoveredGov ? governorateData[hoveredGov] : (selectedGovFilter ? governorateData[selectedGovFilter] : null);

  return (
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

        {/* GIS Dynamic Layer switch */}
        <div className="flex gap-1.5 mt-10 p-0.5 bg-slate-900/50 rounded-lg border border-slate-800 self-start ml-2 relative z-10 scale-90 mb-2 font-sans">
          <button
            onClick={() => setViewMode("sentiment")}
            className={`px-3 py-1.5 text-[10px] uppercase rounded-md transition-all duration-200 cursor-pointer ${
              viewMode === "sentiment"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/25 shadow-md font-bold"
                : "text-slate-450 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            🎭 {lang === "ar" ? "رصد المشاعر والأجواء" : "Sentiment Focus"}
          </button>
          <button
            onClick={() => setViewMode("volume")}
            className={`px-3 py-1.5 text-[10px] uppercase rounded-md transition-all duration-200 cursor-pointer ${
              viewMode === "volume"
                ? "bg-slate-800 text-violet-400 border border-violet-500/25 shadow-md font-bold"
                : "text-slate-455 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            📈 {lang === "ar" ? "حجم تداول المواطنين" : "Public Volume"}
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

            {/* Governorate Labels inside SVG Map with beautiful halo outline */}
            {mapRegions.map((region) => {
              const isSelected = selectedGovFilter === region.name;
              return (
                <text
                  key={`lbl-${region.name}`}
                  x={region.labelCoords.x}
                  y={region.labelCoords.y}
                  textAnchor="middle"
                  className={`pointer-events-none text-[8.5px] font-sans font-black select-none tracking-tight transition-all duration-300 ${
                    isSelected 
                      ? "fill-rose-500 font-extrabold text-[10px]" 
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

        {/* High-fidelity colored legend built dynamically */}
        <div className="mt-2 flex items-center justify-center gap-4 text-[9.5px] font-sans text-slate-450 bg-slate-900/20 border border-slate-800/40 px-3 py-1 rounded-lg">
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
          ) : (
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
          )}
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
                <span className="text-amber-400 font-bold">{lang === "ar" ? (TOPIC_AR_NAMES[activeGovData.topTopic] || activeGovData.topTopic) : activeGovData.topTopic}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-450">{lang === "ar" ? "الوسم الأكثر تفاعلاً:" : "Trending Local Hashtag:"}</span>
                <span className="text-[#007A3D] font-black" style={{ direction: "rtl" }}>
                  {activeGovData.trendingHashtag}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-4 leading-normal italic">
              {lang === "ar" 
                ? "* انقر فوق هذه المحافظة في الخريطة لتصفية لوحة البيانات بالكامل حسب المنطقة الجغرافية. مَرِر للاستعراض السريع." 
                : "* Click this governorate on the map to filter the entire dashboard by region. Hover to examine details."}
            </p>
          </div>
        ) : (
          <div className="p-5 border border-dashed border-slate-800 rounded-xl text-center bg-[#131722]/20 backdrop-blur-md font-sans">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
            <h5 className="text-xs font-bold text-slate-300">{lang === "ar" ? "خريطة الذكاء الجغرافي للرأي العام" : "Geographic Intelligence Map"}</h5>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
              {lang === "ar"
                ? "مَرّر الفأرة أو انقر فوق أي من محافظات الأردن الـ 12 لاستكشاف وتصفية نقاشات المحليات ومعدلات انطباعات المواطنين بدقة عالية."
                : "Hover over or click any of Jordan's 12 governorates to explore localized public discussion data, sentiment ratings, and trending hashtags."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
