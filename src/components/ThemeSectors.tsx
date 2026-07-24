import React, { useState, useMemo } from "react";
import { 
  Building2, BookOpen, Heart, Landmark, Briefcase, Bus, Zap, Sparkles, TrendingUp, TrendingDown, Layers, BarChart4
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import { SectorMetric } from "../utils/analytics";
import { Comment, DBTrend } from "../types";

interface ThemeSectorsProps {
  sectors: Record<string, SectorMetric>;
  selectedTopicFilter: string;
  onSelectTopic: (topic: string) => void;
  themeMode: "dark" | "light";
  lang?: "ar" | "en";
  comments?: Comment[];
  keywordTrends?: DBTrend[];
}

const TOPIC_AR_NAMES: Record<string, string> = {
  "Tourism": "السياحة والآثار",
  "Education": "التعليم والمدارس",
  "Health": "الصحة والمستشفيات",
  "Gov Services": "الخدمات الحكومية وسند",
  "Economy": "الاقتصاد وغلاء المعيشة",
  "Transportation": "النقل وباص السريع",
  "Energy": "الطاقة والمياه والكهرباء",
  "Employment": "العمل والتوظيف والبطالة",
  "National Football Pride": "المنتخب والتشجيع والنشامى",
  "Tourism & Hospitality": "السياحة والضيافة الأردنية",
  "Cost of Living": "تكاليف وغلاء المعيشة",
  "BRT Public Transport": "الباص السريع والمواصلات",
  "Cultural Pride": "الاعتزاز الثقافي والتراث",
  "Digital Gov Services": "الخدمات الحكومية الرقمية",
  "Water Grid Security": "أمن التزويد المائي والترشيد",
  "Local Ajloun Cable Car": "تلفريك عجلون والتمكين المحلي",
  "All": "الكل",
  "all": "الكل"
};

const translateTopic = (topic: string, lang: "ar" | "en", keywordTrends: DBTrend[] = []) => {
  if (lang === "en") return topic;
  const foundTrend = keywordTrends.find(t => t.keyword === topic);
  if (foundTrend && foundTrend.keywordAr) {
    return foundTrend.keywordAr;
  }
  return TOPIC_AR_NAMES[topic] || topic;
};

const getThemeIcon = (name: string, keywordTrends: DBTrend[] = []) => {
  const foundTrend = keywordTrends.find(t => t.keyword === name);
  const cat = foundTrend ? foundTrend.category : "";
  const lower = (cat || name).toLowerCase();
  if (lower.includes("economy") || lower.includes("cost") || lower.includes("living") || lower.includes("اسعار") || lower.includes("سعر") || lower.includes("غلاء")) {
    return <Landmark className="w-4 h-4 text-amber-500" />;
  }
  if (lower.includes("edu") || lower.includes("school") || lower.includes("teach") || lower.includes("جامعة") || lower.includes("تعليم")) {
    return <BookOpen className="w-4 h-4 text-emerald-500" />;
  }
  if (lower.includes("health") || lower.includes("hospital") || lower.includes("مستشفى") || lower.includes("طبيب") || lower.includes("صحة")) {
    return <Heart className="w-4 h-4 text-rose-500" />;
  }
  if (lower.includes("tour") || lower.includes("cable") || lower.includes("petra") || lower.includes("rum") || lower.includes("سياحة") || lower.includes("تلفريك") || lower.includes("بترا") || lower.includes("sports") || lower.includes("نشامى") || lower.includes("منتخب")) {
    return <Sparkles className="w-4 h-4 text-indigo-400" />;
  }
  if (lower.includes("gov") || lower.includes("services") || lower.includes("sanad") || lower.includes("سند") || lower.includes("خدمات")) {
    return <Building2 className="w-4 h-4 text-cyan-500" />;
  }
  if (lower.includes("employ") || lower.includes("work") || lower.includes("job") || lower.includes("عمل") || lower.includes("وظيفة") || lower.includes("بطالة")) {
    return <Briefcase className="w-4 h-4 text-[#C5A880]" />;
  }
  if (lower.includes("bus") || lower.includes("transport") || lower.includes("traffic") || lower.includes("باص") || lower.includes("مرور") || lower.includes("طريق") || lower.includes("infrastructure")) {
    return <Bus className="w-4 h-4 text-purple-500" />;
  }
  if (lower.includes("energy") || lower.includes("light") || lower.includes("water") || lower.includes("كهرباء") || lower.includes("ماء") || lower.includes("طاقة") || lower.includes("utilities")) {
    return <Zap className="w-4 h-4 text-orange-500" />;
  }
  return <Sparkles className="w-4 h-4 text-slate-400" />;
};

export default function ThemeSectors({ 
  sectors, 
  selectedTopicFilter, 
  onSelectTopic,
  themeMode,
  lang = "ar",
  comments = [],
  keywordTrends = []
}: ThemeSectorsProps) {

  const [hoveredSect, setHoveredSect] = useState<string | null>(null);

  // Dynamically obtain associated trending hashtags/keywords for a specific sector from actual comments
  const getSectorKeywords = (sectorName: string): string[] => {
    // Collect all comments matching this sector/topic
    const sectorComments = comments.filter(c => {
      const topic = c.topic || "General Discussion";
      return topic.toLowerCase() === sectorName.toLowerCase() || 
             c.text.toLowerCase().includes(sectorName.toLowerCase());
    });

    const counts: Record<string, number> = {};
    
    // 1. Check for keywordTrends that match category
    const matchedTrends = keywordTrends.filter(t => {
      const categoryLower = (t.category || "").toLowerCase();
      const sNameLower = sectorName.toLowerCase();
      return sNameLower.includes(categoryLower) || 
             categoryLower.includes(sNameLower) ||
             t.keyword.toLowerCase() === sNameLower;
    });

    matchedTrends.forEach(t => {
      const displayWord = lang === "ar" ? t.keywordAr || t.keyword : t.keyword;
      const formatted = displayWord.startsWith("#") ? displayWord : `#${displayWord.replace(/\s+/g, "_")}`;
      counts[formatted] = (counts[formatted] || 0) + 12; // High weight for AI extracted database trends
    });

    // 2. Extract tags from comments
    sectorComments.forEach(c => {
      // Parse hashtags starting with #
      const hashtags = c.text.match(/#[^\s!@#$%^&*()\-+={}\[\]|\\:;"'<>,.?\/]+/g);
      if (hashtags) {
        hashtags.forEach(tag => {
          const clean = tag.trim();
          if (clean.length > 2) {
            counts[clean] = (counts[clean] || 0) + 4;
          }
        });
      }

      // Parse key phrases
      if (c.keyPhrases) {
        c.keyPhrases.forEach(phr => {
          const clean = phr.trim().replace(/\s+/g, "_");
          if (clean.length > 2) {
            const formatted = clean.startsWith("#") ? clean : `#${clean}`;
            counts[formatted] = (counts[formatted] || 0) + 2.5;
          }
        });
      }

      // Parse named entities
      if (c.namedEntities) {
        c.namedEntities.forEach(ent => {
          const clean = ent.trim().replace(/\s+/g, "_");
          if (clean.length > 2) {
            const formatted = clean.startsWith("#") ? clean : `#${clean}`;
            counts[formatted] = (counts[formatted] || 0) + 2;
          }
        });
      }
    });

    // Sort counts and take top 3-4 keywords
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([kw]) => kw)
      .filter(kw => kw.length > 2 && kw.length < 25);

    // If empty/sparse database, construct a dynamic hashtag based on the actual sector/topic name
    if (sorted.length === 0) {
      const cleanSect = translateTopic(sectorName, lang, keywordTrends).trim().replace(/[\s&]+/g, "_");
      return [`#${cleanSect}`];
    }

    return sorted.slice(0, 3);
  };

  const chartData = Object.entries(sectors).map(([name, data]) => ({
    name,
    displayName: translateTopic(name, lang, keywordTrends),
    volume: data.volume,
    sentiment: parseFloat(data.sentiment.toFixed(2)),
  }));

  // Dynamic extraction of treemap nodes from real comments and category-specific presets
  const treemapNodes = useMemo(() => {
    // Helper to determine the sector category for a comment dynamically based on content keywords and active sectors
    const getSectorForComment = (c: Comment): string => {
      const text = (c.text || "").toLowerCase();
      const topic = (c.topic || "").toLowerCase();
      const sectorKeys = Object.keys(sectors);
      
      // Look for an exact or substring match in active sector keys
      let found = sectorKeys.find(key => {
        const keyLower = key.toLowerCase();
        return topic === keyLower || text.includes(keyLower) || topic.includes(keyLower);
      });

      if (!found) {
        // Find a custom matching key based on keyword hits
        found = sectorKeys.find(key => {
          const keyLower = key.toLowerCase();
          const matches = [
            { terms: ["تلفريك", "بترا", "رم", "عجلون", "سياح", "اطلالة", "أثرية", "travel", "tourism", "cable car", "petra", "tourist"], category: "tour" },
            { terms: ["سند", "منصة", "حكومة", "طلب", "هوية", "sanad", "ministry", "portal", "خدمات"], category: "gov" },
            { terms: ["شغل", "عمل", "وظيفة", "عقود", "بطالة", "توظيف", "job", "unemployment", "hiring"], category: "employ" },
            { terms: ["باص", "سريع", "أزمة", "مرور", "سيارة", "طريق", "brt", "bus", "traffic", "transport"], category: "transport" },
            { terms: ["كهرباء", "ماء", "طاقة", "فاتورة", "فواتير", "بنزين", "energy", "electricity", "petrol", "water"], category: "energ" },
            { terms: ["مستشفى", "طبيب", "صحة", "مرض", "علاج", "health", "hospital", "doctor"], category: "health" },
            { terms: ["مدرسة", "جامعة", "تعليم", "طالب", "دراسة", "school", "university", "student"], category: "edu" },
            { terms: ["اسعار", "رواتب", "معيشة", "غلاء", "تضخم", "ضريبة", "اقتصاد", "salary", "price", "inflation", "tax", "economy"], category: "econ" }
          ];
          const matchedItem = matches.find(m => m.terms.some(term => text.includes(term)));
          return matchedItem ? keyLower.includes(matchedItem.category) : false;
        });
      }

      return found || sectorKeys[0] || "General Discussion";
    };

    // Filter active comments matching the selected topic filter
    const activeComments = comments.filter(c => {
      if (!selectedTopicFilter || selectedTopicFilter.toLowerCase() === "all" || selectedTopicFilter.toLowerCase() === "default") {
        return true;
      }
      const mappedSector = getSectorForComment(c);
      return mappedSector.toLowerCase() === selectedTopicFilter.toLowerCase();
    });

    const hashtagCounts: Record<string, { count: number; category: string }> = {};

    activeComments.forEach(c => {
      const cat = c.topic || (selectedTopicFilter && selectedTopicFilter !== "All" ? selectedTopicFilter : "General");
      
      // 1. Extract raw hashtags starting with '#' from the text
      const hashtagsInText = c.text.match(/#[^\s!@#$%^&*()\-+={}\[\]|\\:;"'<>,.?\/]+/g);
      if (hashtagsInText) {
        hashtagsInText.forEach(tag => {
          const cleanTag = tag.trim();
          if (cleanTag.length > 2) {
            hashtagCounts[cleanTag] = hashtagCounts[cleanTag] || { count: 0, category: cat };
            hashtagCounts[cleanTag].count += 1.8; // High weight for authentic user hashtags
          }
        });
      }

      // 2. Extract from keyPhrases array
      if (c.keyPhrases) {
        c.keyPhrases.forEach(phr => {
          let formatted = phr.trim().replace(/\s+/g, "_");
          if (formatted.length > 2 && formatted.length < 25) {
            const cleanTag = formatted.startsWith("#") ? formatted : `#${formatted}`;
            hashtagCounts[cleanTag] = hashtagCounts[cleanTag] || { count: 0, category: cat };
            hashtagCounts[cleanTag].count += 1.0;
          }
        });
      }

      // 3. Extract from namedEntities array
      if (c.namedEntities) {
        c.namedEntities.forEach(ent => {
          let formatted = ent.trim().replace(/\s+/g, "_");
          if (formatted.length > 2 && formatted.length < 25) {
            const cleanTag = formatted.startsWith("#") ? formatted : `#${formatted}`;
            hashtagCounts[cleanTag] = hashtagCounts[cleanTag] || { count: 0, category: cat };
            hashtagCounts[cleanTag].count += 0.8;
          }
        });
      }

      // 4. Semantic Fallback: Tokenizer words for rich context when hashtags are sparse
      const words = c.text.split(/\s+/);
      words.forEach(w => {
        const cleanWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
        const stopWordsAr = ["في", "من", "على", "هذا", "التي", "الذي", "ان", "انها", "هو", "هي", "لا", "ما", "مع", "كان", "كانت", "يا", "بس", "وين", "لكن", "عن", "إلى", "إن", "هذه", "ثم", "أو", "حتى", "الكل", "امس", "اليوم", "بكرا"];
        const stopWordsEn = ["the", "and", "this", "that", "with", "have", "here", "their", "there", "what", "will", "some", "more", "your"];
        if (cleanWord.length > 3 && cleanWord.length < 18 && !stopWordsAr.includes(cleanWord) && !stopWordsEn.includes(cleanWord.toLowerCase())) {
          const cleanTag = `#${cleanWord}`;
          hashtagCounts[cleanTag] = hashtagCounts[cleanTag] || { count: 0, category: cat };
          hashtagCounts[cleanTag].count += 0.3; // Low context weight
        }
      });
    });

    // Sort extracted trends by frequency
    const sortedTags = Object.entries(hashtagCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        category: data.category
      }))
      .filter(item => item.name.length > 2)
      .sort((a, b) => b.count - a.count);

    // Limit to the top 8 authentic nodes to perfectly fit the UI grid
    const top8 = sortedTags.slice(0, 8);
    const maxCount = Math.max(...top8.map(t => t.count), 1);
    
    const normalizedTop8 = top8.map(t => {
      // Scale weight logically so that sizes scale seamlessly in the UI (size representation % weight)
      const normalizedWeight = Math.round((t.count / maxCount) * 22) + 10;
      
      let colorClass = "bg-slate-500/10 border-slate-500/40";
      const catLower = t.category.toLowerCase();
      const nameLower = t.name.toLowerCase();
      
      // Map beautiful thematic color schemes dynamically
      if (catLower.includes("tour") || catLower.includes("سياح") || nameLower.includes("تلفريك") || nameLower.includes("جرش") || nameLower.includes("بترا") || nameLower.includes("رم")) {
        colorClass = "bg-emerald-500/25 border-emerald-400";
      } else if (catLower.includes("transport") || catLower.includes("باص") || catLower.includes("نقل") || nameLower.includes("باص") || nameLower.includes("سير")) {
        colorClass = "bg-[#7c3aed]/20 border-violet-400";
      } else if (catLower.includes("econ") || catLower.includes("اسعار") || catLower.includes("غلاء") || catLower.includes("معيش") || nameLower.includes("راتب") || nameLower.includes("شراء") || nameLower.includes("غلاء") || nameLower.includes("مال") || nameLower.includes("تضخم")) {
        colorClass = "bg-rose-500/10 border-rose-500/40";
      } else if (catLower.includes("gov") || catLower.includes("services") || catLower.includes("سند") || nameLower.includes("سند") || nameLower.includes("منصة")) {
        colorClass = "bg-cyan-500/20 border-cyan-400";
      } else if (catLower.includes("energ") || catLower.includes("كهرب") || catLower.includes("طاق") || nameLower.includes("كهرب") || nameLower.includes("ماء") || nameLower.includes("بترول")) {
        colorClass = "bg-orange-500/20 border-orange-400";
      } else if (catLower.includes("edu") || catLower.includes("جامع") || catLower.includes("تعلي") || nameLower.includes("يرموك") || nameLower.includes("طالب") || nameLower.includes("مدارس")) {
        colorClass = "bg-teal-500/25 border-teal-400";
      } else if (catLower.includes("health") || catLower.includes("صح") || catLower.includes("مستشف") || nameLower.includes("بشير") || nameLower.includes("علاج") || nameLower.includes("دواء")) {
        colorClass = "bg-rose-500/20 border-rose-450";
      } else if (catLower.includes("employ") || catLower.includes("عمل") || catLower.includes("وظيف") || nameLower.includes("فرصة") || nameLower.includes("بطالة") || nameLower.includes("توظيف")) {
        colorClass = "bg-amber-500/25 border-amber-400";
      }

      return {
        name: t.name,
        weight: normalizedWeight,
        category: t.category,
        color: colorClass
      };
    });

    return normalizedTop8.sort((a, b) => b.weight - a.weight);
  }, [comments, selectedTopicFilter]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#10141d] border border-[#DFB76C]/60 p-3 rounded-lg text-xs leading-normal text-white shadow-xl text-left font-sans">
          <p className="font-extrabold text-[#DFB76C] font-display">{data.displayName}</p>
          <div className="mt-1.5 space-y-0.5 font-mono text-[10.5px]">
            <p>{lang === "ar" ? "📊 حجم مدخلات الرأي:" : "📊 Ingest Volume:"} <strong className="text-white">{data.volume}</strong></p>
            <p>{lang === "ar" ? "⚡ مؤشر صافي الانطباعات:" : "⚡ Net Sentiment:"} <strong className={data.sentiment >= 0 ? "text-emerald-400" : "text-rose-450 text-red-450"}>
              {data.sentiment >= 0 ? "+" : ""}{data.sentiment}
            </strong></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">

      {/* Interactive Sector Diagnostics Chart Section */}
      <div className="bg-[#121620]/60 border border-slate-800/80 p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4 font-sans">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold font-mono tracking-wider text-[#DFB76C] uppercase flex items-center gap-1.5">
              <BarChart4 className="w-4 h-4 text-[#DFB76C]" />
              {lang === "ar" ? "مؤشر الرأي العام حسب القطاعات الوطنية (الوزن الكلي)" : "Sector Vector Analytics Index (Weighted Opinion Trajectory)"}
            </h4>
            <p className="text-[10px] text-slate-450 leading-normal">
              {lang === "ar" 
                ? "مقارنة لحجم تداول الموضوعات العامة (الأعمدة) بانطباع الرأي العام الأردني المقابل. انقر فوق عمود لتصفية لوحة التحكم بالكامل." 
                : "Comparing discussion density volume (bars) with corresponding public sentiments (dial indexes). Click a bar to filter dashboard focus."}
            </p>
          </div>
          <span className="text-[9px] font-mono border border-[#007A3D]/40 bg-[#007A3D]/10 text-emerald-400 px-2 py-0.5 rounded font-black">
            {lang === "ar" ? "تحليل ثنائي المنظور" : "BIVARIATE VIEW"}
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const clickedSect = e.activePayload[0].payload.name;
                  onSelectTopic(selectedTopicFilter === clickedSect ? "All" : clickedSect);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#252c3e" opacity={0.15} />
              <XAxis dataKey="displayName" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isSelected = selectedTopicFilter === entry.name;
                  const isNeg = entry.sentiment < -0.1;
                  const isPos = entry.sentiment > 0.15;
                  
                  let barColor = "#4f46e5"; 
                  if (isSelected) barColor = "#DFB76C"; 
                  else if (isNeg) barColor = "#CE1126"; 
                  else if (isPos) barColor = "#007A3D"; 
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={barColor}
                      fillOpacity={isSelected ? 1 : 0.75}
                      className="cursor-pointer transition hover:fill-opacity-100"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 8-Sector Master intelligence table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-[#131722]/40 backdrop-blur-md">
        <table className="w-full text-left text-xs text-slate-350 font-sans">
          <thead className="bg-[#181d2d]/60 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest font-mono">
            <tr>
              <th className="px-4 py-3 text-right">{lang === "ar" ? "القطاع الوطني الأردني" : "Jordan National Sector"}</th>
              <th className="px-4 py-3 text-center">{lang === "ar" ? "حجم التعليقات" : "Mentions Volume"}</th>
              <th className="px-4 py-3 text-center">{lang === "ar" ? "صافي مؤشر الانطباع" : "Net Index Score"}</th>
              <th className="px-4 py-3 text-center">{lang === "ar" ? "معدل الرواج والموثوقية" : "Growth Rate"}</th>
              <th className="px-4 py-3 text-right">{lang === "ar" ? "قنوات نشر واستيراد البيانات" : "Platform Ingress Channels"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {Object.entries(sectors).map(([name, data]) => {
              const isSelected = selectedTopicFilter === name;
              const isNegative = data.sentiment < -0.1;
              const isPositive = data.sentiment > 0.15;
              
              return (
                <tr 
                  key={name} 
                  className={`hover:bg-slate-800/30 transition cursor-pointer ${
                    isSelected ? "bg-[#007A3D]/10 border-r-4 border-[#007A3D]" : ""
                  }`}
                  onClick={() => onSelectTopic(isSelected ? "All" : name)}
                >
                  <td className="px-4 py-3 flex flex-col gap-1 text-right">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      {getThemeIcon(name, keywordTrends)}
                      <span>{translateTopic(name, lang, keywordTrends)}</span>
                    </div>
                    {/* Dynamic Trending hashtags & keywords derived from comment analytics */}
                    <div className="flex flex-wrap gap-1 mt-1 max-w-xs sm:max-w-md">
                      {getSectorKeywords(name).map(kw => (
                        <span 
                          key={kw} 
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700/30 text-amber-400 hover:text-white transition duration-200"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-100">
                    {data.volume}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold inline-block text-[10.5px] ${
                      isPositive 
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800/30" 
                        : isNegative
                          ? "bg-rose-950 text-rose-350 border border-rose-800/30"
                          : "bg-slate-800 text-slate-300 border border-slate-700/30"
                    }`}>
                      {data.sentiment > 0 ? "+" : ""}{data.sentiment.toFixed(2)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap font-mono font-black">
                    <span className={`flex items-center justify-center gap-1 ${
                      data.sentiment > 0 ? "text-emerald-400" : "text-rose-450 text-red-400"
                    }`}>
                      {data.sentiment > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {data.growth >= 0 ? "+" : ""}{data.growth}%
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {Object.entries(data.platformBreakdown).map(([plt, count]) => (
                        <span 
                          key={plt} 
                          className="text-[9px] font-mono font-bold bg-[#181d2d] hover:bg-slate-800 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400"
                          title={`${plt}: ${count} inputs`}
                        >
                          {plt[0]}:{count}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Semantic Keyword-Topic Cluster Treemap Layout */}
      <div className="space-y-2 font-sans text-right">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-500" />
            {lang === "ar" ? "خريطة شبكات الكلمات المفتاحية لمواضيع الرأي الأكثر رواجاً يومياً" : "Social Keyword Clusters Network Map (Treemap)"}
          </span>
          <span className="text-[9px] text-slate-500 font-bold">
            {lang === "ar" ? "أوزان متغيرة تُحسب حسب تركيز تداول المفردات الأردنية" : "Dynamic weights categorized across thematic networks"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {treemapNodes.length === 0 ? (
            <div className="col-span-full p-6 text-center text-slate-400 text-[11px] font-sans border border-dashed border-slate-800/80 rounded-xl bg-slate-900/10">
              {lang === "ar" 
                ? "💡 لم يتم رصد وسوم أو كلمات رنانة في هذه المجموعة من التعليقات بعد. قم بسحب المزيد من التعليقات أو اختيار قطاع آخر." 
                : "💡 No trending hashtags or keywords detected in this subset of comments yet. Try crawling more comments or selecting another sector."}
            </div>
          ) : (
            treemapNodes.map((node) => (
              <div 
                key={node.name}
                className={`p-3 border rounded-xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${node.color} select-none shadow-sm cursor-help`}
                title={`${lang === "ar" ? "تتبع شبكة النقاش الأعم" : "Network connection"}: ${translateTopic(node.category, lang, keywordTrends)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-100">{node.name}</span>
                  <span className="text-[9px] font-mono bg-slate-900/60 border border-slate-850 text-slate-300 px-1 py-0.5 rounded">
                    {node.weight}%
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-405 mt-2">{lang === "ar" ? `الموضوع الأصلي: ${translateTopic(node.category, lang, keywordTrends)}` : `Topic: ${node.category}`}</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
