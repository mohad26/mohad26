import React, { useState } from "react";
import { 
  ShieldAlert, Sun, Moon, Globe, 
  Key, ShieldCheck, Landmark
} from "lucide-react";
import { KarakCrisisInvestigation } from "./components/KarakCrisisInvestigation";

export default function App() {
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const isDark = themeMode === "dark";
  const bgClass = isDark ? "bg-[#0b0c10] text-[#dededf]" : "bg-[#f4f6f9] text-[#13151c]";

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${bgClass}`}>
      
      {/* 1. Official Institutional Header - Dedicated Crisis Operations Center */}
      <header className={`sticky top-0 z-40 border-b print:hidden ${
        isDark ? "bg-[#0c101d]/95 border-slate-800" : "bg-white/95 border-slate-200 shadow-xs"
      } backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Institutional Emblem & Crisis Mission Title */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#007A3D] via-[#111] to-[#CE1126] flex items-center justify-center shrink-0 shadow-md">
              <span className="text-xl">🇯🇴</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">
                  {lang === "ar" ? "المملكة الأردنية الهاشمية" : "Hashemite Kingdom of Jordan"}
                </span>
                <span className="text-[10px] bg-[#007A3D]/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                  {lang === "ar" ? "المجلس الاقتصادي والاجتماعي" : "Economic and Social Council"}
                </span>
                <span className="text-[10px] font-mono bg-rose-950/90 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded flex items-center gap-1 font-bold animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>{lang === "ar" ? "غرفة عمليات استكشاف الرأي العام — كنيسة القديس جورجيوس بقرية حمود / الكرك" : "Operations Room — St. George Church, Hammoud / Karak"}</span>
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-2">
                <span>
                  {lang === "ar" 
                    ? "استكشاف الرأي العام (SocialCrawl) — مرصد كنيسة القديس جورجيوس بقرية حمود"
                    : "SocialCrawl Public Opinion Engine — St. George Church Crisis Dossier"}
                </span>
              </h1>
            </div>
          </div>

          {/* Dedicated Operations Controls */}
          <div className="flex items-center gap-2 self-end md:self-auto">

            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition"
              title="Toggle Language"
            >
              {lang === "ar" ? "EN" : "عربي"}
            </button>

            <button
              onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer transition"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

        </div>
      </header>

      {/* 2. Primary Workspace Body: Dedicated Karak Crisis Storytelling Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <KarakCrisisInvestigation lang={lang} isDark={isDark} />
      </main>

      {/* 3. Official Sovereign Footer */}
      <footer className="border-t border-slate-800 bg-[#090b14] py-6 px-4 text-center text-xs text-slate-500 print:hidden space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span>🇯🇴</span>
          <span className="font-bold text-slate-400">المملكة الأردنية الهاشمية — المجلس الاقتصادي والاجتماعي</span>
        </div>
        <p className="text-[11px] text-slate-400 font-bold">
          {lang === "ar" 
            ? "غرفة عمليات استكشاف الرأي العام (SocialCrawl) — مرصد كنيسة القديس جورجيوس بقرية حمود / الكرك"
            : "Operations Room: St. George Church Crisis Public Opinion Observatory"}
        </p>
      </footer>

    </div>
  );
}
