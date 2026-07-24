import React, { useState } from "react";
import { 
  Smile, Frown, Shield, Flame, Search, TrendingUp, Compass, ArrowUpDown
} from "lucide-react";

interface EmotionAnalyticsProps {
  emotionData: {
    happiness: number;
    anger: number;
    fear: number;
    sadness: number;
    trust: number;
    surprise: number;
  };
  wordcloud: {
    ar: { text: string; value: number }[];
    en: { text: string; value: number }[];
  };
  themeMode: "dark" | "light";
}

export default function EmotionAnalytics({ 
  emotionData, 
  wordcloud,
  themeMode 
}: EmotionAnalyticsProps) {
  const [sortField, setSortField] = useState<"text" | "value">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const EMOTION_PROPS = [
    { name: "Happiness (الرغبة/الفرح)", value: emotionData.happiness, bg: "bg-emerald-500/20", progress: "bg-emerald-500", text: "text-emerald-400", icon: <Smile className="w-4 h-4 text-emerald-400" /> },
    { name: "Anger (الاحتقان/الغضب)", value: emotionData.anger, bg: "bg-rose-500/20", progress: "bg-rose-500", text: "text-rose-400", icon: <Flame className="w-4 h-4 text-rose-400" /> },
    { name: "Fear (التوجس/الخوف)", value: emotionData.fear, bg: "bg-amber-500/20", progress: "bg-amber-500", text: "text-amber-400", icon: <Shield className="w-4 h-4 text-amber-400" /> },
    { name: "Sadness (الحزن/الإحباط)", value: emotionData.sadness, bg: "bg-blue-500/20", progress: "bg-blue-500", text: "text-blue-400", icon: <Frown className="w-4 h-4 text-blue-500" /> },
    { name: "Trust (الثقة/الأصالة)", value: emotionData.trust, bg: "bg-purple-500/20", progress: "bg-purple-500", text: "text-purple-400", icon: <Smile className="w-4 h-4 text-purple-400" /> },
    { name: "Surprise (الدهشة/الاستغراب)", value: emotionData.surprise, bg: "bg-cyan-500/20", progress: "bg-cyan-500", text: "text-cyan-400", icon: <Compass className="w-4 h-4 text-cyan-400" /> }
  ];

  const handleSort = (field: "text" | "value") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortedKeywords = () => {
    const combined = [...(wordcloud.ar || []), ...(wordcloud.en || [])];
    return combined.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
    });
  };

  const activeKeywords = getSortedKeywords().slice(0, 8);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. Emotion Complex breakdown */}
      <div className="bg-[#131722]/40 rounded-xl border border-slate-800/60 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#CE1126]" />
            National Emotion Complex Analysis
          </h4>
          <span className="text-[10px] bg-indigo-950 text-indigo-400 font-bold px-2 py-0.5 rounded">
            Linguistic Tone models
          </span>
        </div>
        
        <p className="text-[11px] text-slate-400 leading-normal">
          Real-time emotion model aggregates parsed from citizen posts. Useful for detecting sudden crises, sports celebrations, and economic stress spikes.
        </p>

        <div className="space-y-3.5 pt-1">
          {EMOTION_PROPS.map((em) => (
            <div key={em.name} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-slate-350">
                  {em.icon}
                  {em.name}
                </span>
                <span className={`font-mono font-bold ${em.text}`}>{em.value}%</span>
              </div>
              <div className="w-full bg-[#181d2d] h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                <div className={`${em.progress} h-full rounded-full transition-all duration-500`} style={{ width: `${em.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Bilingual Token Search keywords tables */}
      <div className="bg-[#131722]/40 rounded-xl border border-slate-800/60 p-5 space-y-4 shadow-sm flex flex-col justify-between">
        <div className="space-y-1">
          <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#007A3D]" />
            Extracted Keywords sortable Matrix
          </h4>
          <p className="text-[11px] text-slate-500">
            Highly structured frequency index of Arabic/English tokens. Useful for research analysts.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#181d2d]/30 flex-1 my-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181d2d] border-b border-slate-800 text-[10px] text-slate-400 uppercase font-mono">
              <tr>
                <th className="px-3 py-2 cursor-pointer hover:text-slate-100" onClick={() => handleSort("text")}>
                  Keyword Token <ArrowUpDown className="w-3 h-3 inline pb-0.5" />
                </th>
                <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-100" onClick={() => handleSort("value")}>
                  Frequency Count <ArrowUpDown className="w-3 h-3 inline pb-0.5" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {activeKeywords.length > 0 ? (
                activeKeywords.map((tok, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20 transition">
                    <td className="px-3 py-2 font-mono font-bold text-slate-100" style={{ direction: "rtl" }}>
                      {tok.text}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 font-extrabold">
                      {tok.value} occurrences
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-slate-500 italic">
                    Awaiting crawler tokenization updates...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-800 pt-3 flex flex-wrap gap-1">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block w-full mb-1">
            Core bilingual lexical density:
          </span>
          <span className="text-[10px] bg-[#007A3D]/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-990/20 font-bold">
            Arabic (Ammiya Normalizer): 72%
          </span>
          <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/30 font-bold">
            English (Foreign Trade): 28%
          </span>
        </div>
      </div>

    </div>
  );
}
