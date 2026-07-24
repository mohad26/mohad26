import React, { useState } from "react";
import { 
  Settings, Save, Activity, Wifi, Terminal, ShieldAlert, Radio, Database, RefreshCw
} from "lucide-react";

interface ControlCenterProps {
  monitoredAccounts: Record<string, string[]>;
  editingCategory: string;
  categoryInputText: string;
  onCategorySwitch: (cat: string) => void;
  onInputChange: (text: string) => void;
  onSaveAccounts: () => void;
  registryMessage: string;
  quotaExhausted: boolean;
  activeSource: string;
  requestsUsed: number;
  syncStatus: any;
  onResetQuota: () => void;
  velocityThreshold: number;
  onVelocityThresholdChange: (value: number) => void;
  enableVelocityAlerts: boolean;
  onEnableVelocityAlertsChange: (enabled: boolean) => void;
  lang?: "ar" | "en";
}

export default function ControlCenter({
  monitoredAccounts,
  editingCategory,
  categoryInputText,
  onCategorySwitch,
  onInputChange,
  onSaveAccounts,
  registryMessage,
  quotaExhausted,
  activeSource,
  requestsUsed,
  syncStatus,
  onResetQuota,
  velocityThreshold,
  onVelocityThresholdChange,
  enableVelocityAlerts,
  onEnableVelocityAlertsChange,
  lang = "ar"
}: ControlCenterProps) {
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Supervised Handles Admin Config module */}
      <div className="bg-[#131722]/40 border border-slate-800/60 rounded-xl p-5 shadow-sm lg:col-span-8 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-bold font-mono tracking-widest text-[#007A3D] uppercase flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-[#007A3D]" />
              Supervised Jordan Digital Handle Registry
            </h2>
            <span className="text-[9px] bg-slate-800 text-slate-350 font-bold px-2 py-0.5 rounded uppercase">
              Admin Supervisor Board
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Configure targeted public figures, government agencies, universities, and banks parsed by background crawl daemons. Organized by thematic societal sections.
          </p>
        </div>

        {/* Dynamic Category Toggles */}
        <div className="flex flex-wrap gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-850">
          {Object.keys(monitoredAccounts).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategorySwitch(cat)}
              className={`px-3 py-1 text-[10px] font-extrabold rounded-md uppercase transition cursor-pointer ${
                editingCategory === cat
                  ? "bg-[#007A3D] text-white shadow-sm border border-[#007A3D]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Text area input block */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="uppercase font-mono text-[#C5A880]">
              Ingestion targets — <span className="text-white">{editingCategory}</span>
            </span>
            <span className="text-slate-450">
              {monitoredAccounts[editingCategory]?.length || 0} items active
            </span>
          </div>

          <textarea
            value={categoryInputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type comma separated public accounts e.g. @RoyaNews, @AmmonNews, @AlMamlakaTV, @jordan_football"
            className="w-full text-xs font-mono font-bold p-3 bg-slate-900 border border-slate-800 rounded-lg h-22 focus:ring-1 focus:ring-emerald-500 text-slate-200 resize-none leading-relaxed focus:outline-none"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-emerald-400 font-bold font-mono">{registryMessage}</span>
            <button
              onClick={onSaveAccounts}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#007A3D] hover:bg-[#007A3D]/90 active:scale-95 text-white px-4 py-1.5 rounded-lg transition shadow cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Registry Categories
            </button>
          </div>
        </div>
      </div>

      {/* 2. Telemetry monitors complex */}
      <div className="bg-[#131722]/60 border border-slate-800/80 rounded-xl p-5 shadow-sm lg:col-span-4 flex flex-col justify-between text-slate-200 space-y-4">
        <div>
          <h2 className="text-xs font-bold font-mono tracking-widest text-[#CE1126] uppercase flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> System Telemetry & Quota Monitor
          </h2>
          <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
            Real-time diagnostics of active Google API rate limits, firestore nodes, and RSS crawlers.
          </p>
        </div>

        <div className="space-y-2.5 my-1">
          {/* Active NLP Indicator */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase font-mono">Core NLP Model</span>
            <span className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold ${
              quotaExhausted 
                ? "bg-rose-950 text-rose-300 border border-rose-900/40" 
                : "bg-emerald-950 text-emerald-300 border border-emerald-950"
            }`}>
              {quotaExhausted ? "HEURISTIC HEURIST_FALLBACK" : "GEMINI ACTIVE"}
            </span>
          </div>

          {/* Sync Time */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase font-mono">Last Ingest Pull</span>
            <span className="text-[10px] text-slate-100 font-mono font-bold text-right">
              {syncStatus?.lastSyncTime || "Queue Synchronized"}
            </span>
          </div>

          {/* Feed statuses */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase font-mono">Crawlers Status</span>
            <div className="flex gap-1.5">
              <span className={`text-[8.5px] font-mono px-1 rounded ${syncStatus?.redditSuccess ? 'bg-emerald-950 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-500'}`} title="Reddit r/jordan tracker">REDDIT</span>
              <span className={`text-[8.5px] font-mono px-1 rounded ${syncStatus?.gdeltSuccess ? 'bg-emerald-950 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-500'}`} title="GDELT Jordan tracker">GDELT</span>
              <span className={`text-[8.5px] font-mono px-1 rounded ${syncStatus?.rssSuccess ? 'bg-emerald-950 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-500'}`} title="Petra RSS Feeds">Petra RSS</span>
            </div>
          </div>

          {/* Gemini usages count */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase font-mono">API Requests Budget</span>
            <span className="text-xs font-mono font-extrabold text-emerald-400">
              {requestsUsed} Calls executed
            </span>
          </div>
        </div>

         {/* Diagnostics trace area */}
        <div className="bg-[#0b0c10] p-2 border border-slate-850 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8.5px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1 font-mono">
              <Terminal className="w-2.5 h-2.5 text-slate-400" /> RSS Stream Logging Trace
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="max-h-16 overflow-y-auto space-y-1 font-mono text-[9px] text-slate-400 leading-normal pr-1">
            {syncStatus?.logs && syncStatus.logs.length > 0 ? (
              syncStatus.logs.slice(0, 3).map((log: string, lIdx: number) => (
                <div key={lIdx} className="border-b border-slate-900 pb-0.5 last:border-0 truncate font-mono">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">Connected. Standing by for feed logs...</div>
            )}
          </div>
        </div>

        {/* Sentiment Velocity Alert Configuration sub-module */}
        <div className="border-t border-slate-800/80 pt-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#DFB76C] uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#DFB76C]" />
              {lang === "ar" ? "إنذار تسارع الرأي السريع" : "Sentiment Velocity Threshold"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={enableVelocityAlerts} 
                onChange={(e) => onEnableVelocityAlertsChange(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-900"></div>
            </label>
          </div>

          <p className="text-[9.5px] text-slate-400 leading-normal font-sans">
            {lang === "ar" 
              ? "يقوم بفحص سرعة تغير مستويات الرضا العام لحظياً وإصدار إشعار تنبيهي بارز عند تجاوز العتبة المعينة." 
              : "Scans real-time citizen feed rate changes and displays visual overlay banners when public sentiment index shifts exceed settings."}
          </p>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400">
              <span>{lang === "ar" ? "عتبة كشف التحول:" : "VELOCITY THRESHOLD:"}</span>
              <span className="text-[#DFB76C] font-extrabold">{velocityThreshold} score</span>
            </div>
            <input 
              type="range" 
              min="0.05" 
              max="0.80" 
              step="0.05" 
              value={velocityThreshold} 
              onChange={(e) => onVelocityThresholdChange(parseFloat(e.target.value))} 
              className="w-full accent-[#DFB76C] bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[8px] font-mono text-slate-500">
              <span>0.05 ({lang === "ar" ? "حساس جداً" : "Ultra Sensitive"})</span>
              <span>0.80 ({lang === "ar" ? "تغير حاد" : "Extreme Spike"})</span>
            </div>
          </div>
        </div>

        {quotaExhausted && (
          <button 
            onClick={onResetQuota}
            className="w-full text-[10px] font-bold bg-[#CE1126] hover:bg-[#CE1126]/90 text-white py-1.5 rounded transition shadow-md cursor-pointer text-center"
          >
            Clear Out of Quota Error & Force Gemini Reactivate
          </button>
        )}
      </div>

    </div>
  );
}
