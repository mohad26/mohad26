import React, { useState, useMemo } from "react";
import { 
  Building2, Landmark, MapPin, User, Search, Filter, 
  TrendingUp, TrendingDown, Layers, ShieldAlert, Sparkles, 
  ExternalLink, ChevronRight, X, BarChart3, AlertCircle, 
  CheckCircle, ArrowUpRight, MessageSquare, PlayCircle, Eye
} from "lucide-react";
import { EntityTopicInsight, EntityCategory, Comment, PlatformType, SentimentType } from "../types";
import { ENTITY_TYPE_LABELS, filterEntityInsights } from "../utils/ner";
import { POLICY_SECTOR_IDS, POLICY_SECTORS_META } from "../utils/analytics";

interface EntityTopicIntelligenceProps {
  entityInsights: EntityTopicInsight[];
  comments: Comment[];
  lang: "ar" | "en";
  themeMode: "dark" | "light";
  selectedSectorFilter?: string | null;
  onSelectSector?: (sectorId: string | null) => void;
}

export default function EntityTopicIntelligence({
  entityInsights,
  comments,
  lang,
  themeMode,
  selectedSectorFilter,
  onSelectSector
}: EntityTopicIntelligenceProps) {
  const isDark = themeMode === "dark";
  const cardClass = isDark ? "bg-[#11141f] border border-slate-800 rounded-xl" : "bg-white border border-slate-200 rounded-xl shadow-xs";
  const badgeClass = isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700";

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<EntityCategory | "all">("all");
  const [selectedSector, setSelectedSector] = useState<string>(selectedSectorFilter || "all");
  const [selectedSentiment, setSelectedSentiment] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [sortBy, setSortBy] = useState<"mentions" | "sentiment_desc" | "sentiment_asc">("mentions");
  const [selectedEntityForModal, setSelectedEntityForModal] = useState<EntityTopicInsight | null>(null);

  // Live NER Sandbox state
  const [sandboxText, setSandboxText] = useState(
    "أمانة عمان الكبرى والباص سريع التردد في مجمع صويلح ساعدوا المواطنين، لكن أسعار التذاكر وخدمة سند بدها مراجعة عاجلة من وزارة الاقتصاد الرقمي."
  );
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Sync external sector filter
  React.useEffect(() => {
    if (selectedSectorFilter) {
      setSelectedSector(selectedSectorFilter);
    }
  }, [selectedSectorFilter]);

  // Compute category totals
  const counts = useMemo(() => {
    let loc = 0, org = 0, per = 0;
    entityInsights.forEach(e => {
      if (e.type === "location") loc++;
      else if (e.type === "organization") org++;
      else if (e.type === "person") per++;
    });
    return {
      total: entityInsights.length,
      locations: loc,
      organizations: org,
      people: per
    };
  }, [entityInsights]);

  // Top entities summary
  const topEntities = useMemo(() => {
    const locs = entityInsights.filter(e => e.type === "location");
    const orgs = entityInsights.filter(e => e.type === "organization");
    const people = entityInsights.filter(e => e.type === "person");

    return {
      topLoc: locs[0] || null,
      topOrg: orgs[0] || null,
      topPerson: people[0] || null
    };
  }, [entityInsights]);

  // Filtered & sorted entities
  const filteredEntities = useMemo(() => {
    const base = filterEntityInsights(
      entityInsights,
      searchQuery,
      selectedType,
      selectedSector,
      selectedSentiment
    );

    return [...base].sort((a, b) => {
      if (sortBy === "mentions") return b.totalMentions - a.totalMentions;
      if (sortBy === "sentiment_desc") return b.avgSentiment - a.avgSentiment;
      if (sortBy === "sentiment_asc") return a.avgSentiment - b.avgSentiment;
      return 0;
    });
  }, [entityInsights, searchQuery, selectedType, selectedSector, selectedSentiment, sortBy]);

  // Run Sandbox NER analysis
  const runSandboxAnalysis = async () => {
    if (!sandboxText.trim()) return;
    try {
      setSandboxLoading(true);
      const res = await fetch("/api/ner/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sandboxText })
      });
      if (res.ok) {
        const json = await res.json();
        setSandboxResult(json);
      }
    } catch (e) {
      console.error("NER sandbox analysis error:", e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const getCategoryIcon = (type: EntityCategory) => {
    switch (type) {
      case "location":
        return <MapPin className="w-4 h-4 text-emerald-400" />;
      case "organization":
        return <Building2 className="w-4 h-4 text-cyan-400" />;
      case "person":
        return <User className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Institutional Hero & Overview Banner */}
      <div className={`${cardClass} p-5 bg-gradient-to-r ${
        isDark ? "from-[#11141f] via-[#141b2d] to-[#11141f]" : "from-slate-50 via-white to-slate-50"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-950/50 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Advanced NER Engine v2.0</span>
              </span>
              <span className="text-[10px] font-bold bg-[#007A3D]/20 text-emerald-400 border border-emerald-800/30 px-2 py-0.5 rounded font-mono">
                {lang === "ar" ? "تكامل الكيانات والموضوعات" : "Topic & Entity Cross-Matrix"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>
                {lang === "ar" 
                  ? "مرصد الكيانات الوطنية وتحليل الموضوعات (NER & Topic Modeling)" 
                  : "National Entity Observatory & Topic Modeling"}
              </span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === "ar"
                ? "خوارزمية ذكية متقدمة للتعرف على الكيانات المسماة وتصنيفها إلى (المواقع الجغرافية، المؤسسات والوزارات، والشخصيات العامة) وربطها بالقطاعات السياساتية الثمانية ومؤشرات المشاعر."
                : "Advanced Named Entity Recognition and classification across Jordanian locations, ministries/organizations, and public figures, mapped directly to the 8 official Policy Sectors."}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">
                {lang === "ar" ? "إجمالي الكيانات" : "Total Entities"}
              </span>
              <span className="text-lg font-black text-white font-mono">{counts.total}</span>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-2.5 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-emerald-400 font-mono block">
                {lang === "ar" ? "مواقع جغرافية" : "Locations"}
              </span>
              <span className="text-lg font-black text-emerald-300 font-mono">{counts.locations}</span>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-800/40 rounded-lg p-2.5 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-cyan-400 font-mono block">
                {lang === "ar" ? "مؤسسات وهيئات" : "Organizations"}
              </span>
              <span className="text-lg font-black text-cyan-300 font-mono">{counts.organizations}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2.5 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-amber-400 font-mono block">
                {lang === "ar" ? "شخصيات عامة" : "Public Figures"}
              </span>
              <span className="text-lg font-black text-amber-300 font-mono">{counts.people}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Driving Entities Spotlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Top Location */}
        <div className={`${cardClass} p-4 space-y-2 relative overflow-hidden border-emerald-900/40 bg-gradient-to-br from-emerald-950/10 to-transparent`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase font-mono text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "الموقع الجغرافي الأبرز" : "Top Geographic Entity"}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
              {topEntities.topLoc?.totalMentions || 0} {lang === "ar" ? "إشارة" : "mentions"}
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white">
              {topEntities.topLoc?.name || "عمان"}
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {topEntities.topLoc?.nameEn || "Amman"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 text-[11px]">{lang === "ar" ? "صافي الرضا:" : "Net Sentiment:"}</span>
            <span className={`font-mono font-bold ${(topEntities.topLoc?.avgSentiment || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {(topEntities.topLoc?.avgSentiment || 0) > 0 ? `+${topEntities.topLoc?.avgSentiment}` : topEntities.topLoc?.avgSentiment}
            </span>
          </div>
        </div>

        {/* Top Organization */}
        <div className={`${cardClass} p-4 space-y-2 relative overflow-hidden border-cyan-900/40 bg-gradient-to-br from-cyan-950/10 to-transparent`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase font-mono text-cyan-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "المؤسسة / الوزارة الأبرز" : "Top Organization"}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
              {topEntities.topOrg?.totalMentions || 0} {lang === "ar" ? "إشارة" : "mentions"}
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white truncate" title={topEntities.topOrg?.name}>
              {topEntities.topOrg?.name || "أمانة عمان الكبرى"}
            </h4>
            <span className="text-[11px] text-slate-400 font-mono truncate block">
              {topEntities.topOrg?.nameEn || "Greater Amman Municipality"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 text-[11px]">{lang === "ar" ? "صافي الرضا:" : "Net Sentiment:"}</span>
            <span className={`font-mono font-bold ${(topEntities.topOrg?.avgSentiment || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {(topEntities.topOrg?.avgSentiment || 0) > 0 ? `+${topEntities.topOrg?.avgSentiment}` : topEntities.topOrg?.avgSentiment}
            </span>
          </div>
        </div>

        {/* Top Person */}
        <div className={`${cardClass} p-4 space-y-2 relative overflow-hidden border-amber-900/40 bg-gradient-to-br from-amber-950/10 to-transparent`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase font-mono text-amber-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "الشخصية العامة الأبرز" : "Top Public Figure"}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
              {topEntities.topPerson?.totalMentions || 0} {lang === "ar" ? "إشارة" : "mentions"}
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white">
              {topEntities.topPerson?.name || "الملك عبدالله الثاني"}
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {topEntities.topPerson?.nameEn || "King Abdullah II"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 text-[11px]">{lang === "ar" ? "صافي الرضا:" : "Net Sentiment:"}</span>
            <span className={`font-mono font-bold ${(topEntities.topPerson?.avgSentiment || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {(topEntities.topPerson?.avgSentiment || 0) > 0 ? `+${topEntities.topPerson?.avgSentiment}` : topEntities.topPerson?.avgSentiment}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Filter & Search Controls Bar */}
      <div className={`${cardClass} p-4 space-y-3.5`}>
        
        {/* Policy Sector Pills */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-2">
            {lang === "ar" ? "تصفية حسب القطاع السياساتي (الموضوع):" : "Filter by Policy Theme / Sector:"}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
            <button
              onClick={() => {
                setSelectedSector("all");
                if (onSelectSector) onSelectSector(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedSector === "all"
                  ? "bg-[#007A3D] text-white shadow-xs"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
              }`}
            >
              {lang === "ar" ? "جميع القطاعات" : "All Sectors"}
            </button>
            {POLICY_SECTOR_IDS.map(secId => {
              const meta = POLICY_SECTORS_META[secId];
              const isSelected = selectedSector === secId;
              return (
                <button
                  key={secId}
                  onClick={() => {
                    setSelectedSector(secId);
                    if (onSelectSector) onSelectSector(secId);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-[#007A3D] text-white shadow-xs"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  {lang === "ar" ? meta.nameAr : meta.nameEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filters Row: Search, Type, Sentiment, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/60">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute top-2.5 start-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "ar" ? "بحث عن كيان أو مسؤول أو موقع..." : "Search entity, ministry, location..."}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg ps-9 pe-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-2.5 end-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Entity Category Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{lang === "ar" ? "كل أنواع الكيانات (مواقع / مؤسسات / شخصيات)" : "All Entity Types"}</option>
            <option value="location">{lang === "ar" ? "المواقع الجغرافية فقط" : "Locations Only"}</option>
            <option value="organization">{lang === "ar" ? "المؤسسات والوزارات فقط" : "Organizations Only"}</option>
            <option value="person">{lang === "ar" ? "الشخصيات والمسؤولين فقط" : "People / Figures Only"}</option>
          </select>

          {/* Sentiment Filter */}
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{lang === "ar" ? "كل مستويات المشاعر" : "All Sentiment"}</option>
            <option value="positive">{lang === "ar" ? "إيجابي فقط (+)" : "Positive Only"}</option>
            <option value="neutral">{lang === "ar" ? "محايد فقط (•)" : "Neutral Only"}</option>
            <option value="negative">{lang === "ar" ? "سلبي / نقدي فقط (-)" : "Critical / Negative Only"}</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="mentions">{lang === "ar" ? "الأعلى ذكراً وتداولاً" : "Most Mentioned"}</option>
            <option value="sentiment_desc">{lang === "ar" ? "الأعلى إيجابية ورضا" : "Highest Sentiment"}</option>
            <option value="sentiment_asc">{lang === "ar" ? "الأكثر انتقاداً (الأقل رضا)" : "Most Critical (Negative)"}</option>
          </select>

        </div>

      </div>

      {/* 4. Entity Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
          <span>
            {lang === "ar" 
              ? `عرض ${filteredEntities.length} من أصل ${entityInsights.length} كيان مرصود` 
              : `Showing ${filteredEntities.length} of ${entityInsights.length} recognized entities`}
          </span>
          {selectedSector !== "all" && (
            <span className="text-emerald-400 font-bold">
              {lang === "ar" ? `القطاع المختار: ${POLICY_SECTORS_META[selectedSector as keyof typeof POLICY_SECTORS_META]?.nameAr}` : `Sector: ${selectedSector}`}
            </span>
          )}
        </div>

        {filteredEntities.length === 0 ? (
          <div className={`${cardClass} p-8 text-center space-y-2`}>
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-slate-300">
              {lang === "ar" ? "لم يتم العثور على كيانات تطابق معايير التصفية الحالية" : "No entities match the current filter criteria."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
                setSelectedSector("all");
                setSelectedSentiment("all");
              }}
              className="text-xs text-emerald-400 hover:underline cursor-pointer"
            >
              {lang === "ar" ? "إعادة تعيين كافة الفلاتر" : "Reset all filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredEntities.map((ent) => {
              const typeMeta = ENTITY_TYPE_LABELS[ent.type];
              return (
                <div
                  key={ent.id}
                  onClick={() => setSelectedEntityForModal(ent)}
                  className={`${cardClass} p-4 space-y-3 hover:border-purple-600/50 transition cursor-pointer flex flex-col justify-between group`}
                >
                  <div className="space-y-2">
                    
                    {/* Card Header: Type Badge & Mentions Count */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${typeMeta.badgeBg}`}>
                        {getCategoryIcon(ent.type)}
                        <span>{lang === "ar" ? typeMeta.ar : typeMeta.en}</span>
                      </span>

                      <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        {ent.totalMentions} {lang === "ar" ? "إشارة" : "mentions"}
                      </span>
                    </div>

                    {/* Entity Name & English Subtitle */}
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                        {ent.name}
                      </h4>
                      {ent.nameEn && (
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {ent.nameEn}
                        </p>
                      )}
                    </div>

                    {/* Associated Policy Themes */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {ent.associatedThemes.slice(0, 3).map(theme => (
                        <span 
                          key={theme.themeId}
                          className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded font-mono"
                        >
                          {lang === "ar" ? theme.themeNameAr : theme.themeNameEn} ({theme.mentions})
                        </span>
                      ))}
                      {ent.associatedThemes.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          +{ent.associatedThemes.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sentiment Bar & Score */}
                  <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        {lang === "ar" ? "مؤشر الرأي العام:" : "Net Sentiment:"}
                      </span>
                      <span className={`font-mono font-black ${ent.avgSentiment >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {ent.avgSentiment > 0 ? `+${ent.avgSentiment}` : ent.avgSentiment}
                      </span>
                    </div>

                    {/* Proportional Sentiment Split Bar */}
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${ent.positivePct}%` }} title={`Positive: ${ent.positivePct}%`} />
                      <div className="bg-slate-600 h-full" style={{ width: `${ent.neutralPct}%` }} title={`Neutral: ${ent.neutralPct}%`} />
                      <div className="bg-rose-500 h-full" style={{ width: `${ent.negativePct}%` }} title={`Negative: ${ent.negativePct}%`} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <span className="text-emerald-400">{ent.positivePct}% {lang === "ar" ? "إيجابي" : "Pos"}</span>
                      <span className="text-slate-400">{ent.neutralPct}% {lang === "ar" ? "محايد" : "Neu"}</span>
                      <span className="text-rose-400">{ent.negativePct}% {lang === "ar" ? "سلبي" : "Neg"}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Topic-Entity Co-Occurrence Matrix Section */}
      <div className={`${cardClass} p-5 space-y-4`}>
        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>{lang === "ar" ? "مصفوفة ترابط الموضوعات بالكيانات (Topic-Entity Co-Occurrence)" : "Topic-Entity Co-Occurrence Matrix"}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === "ar" 
                ? "استعراض أبرز الفاعلين والمواقع والمؤسسات المؤثرة في نقاش كل قطاع من القطاعات الثمانية" 
                : "Top recognized entities driving citizen discourse across each of the 8 policy sectors"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {POLICY_SECTOR_IDS.map(secId => {
            const meta = POLICY_SECTORS_META[secId];
            
            // Find top entities for this sector
            const matchingEntities = entityInsights
              .filter(e => e.associatedThemes.some(t => t.themeId === secId))
              .map(e => {
                const themeData = e.associatedThemes.find(t => t.themeId === secId)!;
                return {
                  ...e,
                  sectorMentions: themeData.mentions,
                  sectorSentiment: themeData.avgSentiment
                };
              })
              .sort((a, b) => b.sectorMentions - a.sectorMentions)
              .slice(0, 4);

            return (
              <div key={secId} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    {lang === "ar" ? meta.nameAr : meta.nameEn}
                  </h4>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/30">
                    {matchingEntities.length} {lang === "ar" ? "كيانات" : "entities"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {matchingEntities.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic block">
                      {lang === "ar" ? "لا توجد كيانات كافية مسجلة" : "No entities registered"}
                    </span>
                  ) : (
                    matchingEntities.map(me => (
                      <div 
                        key={me.id}
                        onClick={() => setSelectedEntityForModal(me)}
                        className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-950/60 hover:bg-slate-800/80 cursor-pointer transition border border-slate-800/40"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                          {getCategoryIcon(me.type)}
                          <span className="truncate text-slate-200 text-[11px]" title={me.name}>
                            {me.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[10.5px]">
                          <span className="text-slate-400">{me.sectorMentions}</span>
                          <span className={me.sectorSentiment >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            ({me.sectorSentiment > 0 ? `+${me.sectorSentiment}` : me.sectorSentiment})
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Live Interactive NER & Topic Sandbox */}
      <div className={`${cardClass} p-5 space-y-4 border-purple-900/30 bg-gradient-to-br from-purple-950/10 via-transparent to-transparent`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{lang === "ar" ? "مختبر تحليل النصوص الحي (NER Interactive Sandbox)" : "Live Interactive NER Sandbox"}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === "ar" 
                ? "أدخل أي نص أو تصريح أو منشور عام لفحص استخراج الكيانات وتصنيفها وربطها بالموضوع تلقائياً" 
                : "Input any public statement or post to test real-time entity recognition and policy theme modeling"}
            </p>
          </div>
          <button
            onClick={runSandboxAnalysis}
            disabled={sandboxLoading || !sandboxText.trim()}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <PlayCircle className={`w-3.5 h-3.5 ${sandboxLoading ? "animate-spin" : ""}`} />
            <span>{sandboxLoading ? (lang === "ar" ? "جاري التحليل..." : "Extracting...") : (lang === "ar" ? "تشغيل النموذج" : "Run Model")}</span>
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            value={sandboxText}
            onChange={(e) => setSandboxText(e.target.value)}
            rows={3}
            placeholder={lang === "ar" ? "اكتب أو الصق نصاً للتحليل..." : "Paste or type text for NER analysis..."}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-hidden focus:border-purple-500 transition leading-relaxed"
          />

          {sandboxResult && (
            <div className="bg-slate-900/80 border border-purple-800/40 rounded-lg p-3.5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{lang === "ar" ? "الموضوع المصنف:" : "Classified Topic:"}</span>
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded font-mono">
                    {sandboxResult.topic || "General"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{lang === "ar" ? "المشاعر المحسوبة:" : "Sentiment:"}</span>
                  <span className={`font-bold font-mono ${sandboxResult.sentimentScore >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {sandboxResult.sentiment} ({sandboxResult.sentimentScore > 0 ? `+${sandboxResult.sentimentScore}` : sandboxResult.sentimentScore})
                  </span>
                </div>
              </div>

              {/* Extracted Entities List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
                  {lang === "ar" ? "الكيانات المستخرجة والمصنفة:" : "Extracted & Classified Entities:"}
                </span>

                {(!sandboxResult.entities || sandboxResult.entities.length === 0) ? (
                  <span className="text-xs text-slate-500 italic block">
                    {lang === "ar" ? "لم يتم رصد كيانات محددة في هذا النص" : "No specific entities recognized."}
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {sandboxResult.entities.map((e: any, idx: number) => {
                      const meta = ENTITY_TYPE_LABELS[e.type as EntityCategory] || ENTITY_TYPE_LABELS.location;
                      return (
                        <div 
                          key={idx}
                          className={`text-xs px-2.5 py-1 rounded border flex items-center gap-1.5 font-mono ${meta.badgeBg}`}
                        >
                          {getCategoryIcon(e.type)}
                          <span className="font-bold">{e.name}</span>
                          <span className="text-[10px] opacity-80">({meta.ar})</span>
                          <span className="text-[10px] opacity-75">
                            [{e.sentiment === 'positive' ? '+pos' : e.sentiment === 'negative' ? '-neg' : 'neu'}]
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7. Detailed Entity Inspector Modal */}
      {selectedEntityForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className={`${cardClass} max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border-purple-500/50 shadow-2xl relative`}>
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    ENTITY_TYPE_LABELS[selectedEntityForModal.type].badgeBg
                  }`}>
                    {getCategoryIcon(selectedEntityForModal.type)}
                    <span>{lang === "ar" ? ENTITY_TYPE_LABELS[selectedEntityForModal.type].ar : ENTITY_TYPE_LABELS[selectedEntityForModal.type].en}</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {selectedEntityForModal.totalMentions} {lang === "ar" ? "إشارة في القاعدة" : "Total Mentions"}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  {selectedEntityForModal.name}
                </h3>
                {selectedEntityForModal.nameEn && (
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedEntityForModal.nameEn}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedEntityForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sentiment Meter Row */}
            <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">
                  {lang === "ar" ? "مؤشر الرضا العام الصافي حول الكيان:" : "Net Public Stance on Entity:"}
                </span>
                <span className={`text-sm font-black font-mono ${
                  selectedEntityForModal.avgSentiment >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {selectedEntityForModal.avgSentiment > 0 ? `+${selectedEntityForModal.avgSentiment}` : selectedEntityForModal.avgSentiment}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${selectedEntityForModal.positivePct}%` }} />
                <div className="bg-slate-600 h-full" style={{ width: `${selectedEntityForModal.neutralPct}%` }} />
                <div className="bg-rose-500 h-full" style={{ width: `${selectedEntityForModal.negativePct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="text-emerald-400">{selectedEntityForModal.positivePct}% {lang === "ar" ? "إيجابي" : "Positive"}</span>
                <span className="text-slate-400">{selectedEntityForModal.neutralPct}% {lang === "ar" ? "محايد" : "Neutral"}</span>
                <span className="text-rose-400">{selectedEntityForModal.negativePct}% {lang === "ar" ? "سلبي" : "Negative"}</span>
              </div>
            </div>

            {/* Associated Themes & Governorates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Associated Policy Sectors */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>{lang === "ar" ? "القطاعات الأكثر ارتباطاً:" : "Linked Policy Sectors:"}</span>
                </h4>
                <div className="space-y-1">
                  {selectedEntityForModal.associatedThemes.map(th => (
                    <div key={th.themeId} className="flex items-center justify-between text-xs text-slate-300">
                      <span>{lang === "ar" ? th.themeNameAr : th.themeNameEn}</span>
                      <span className="font-mono text-slate-400">{th.mentions} {lang === "ar" ? "إشارة" : "mentions"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Associated Governorates */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === "ar" ? "التوزيع الإقليمي والمحافظات:" : "Governorate Spread:"}</span>
                </h4>
                <div className="space-y-1">
                  {selectedEntityForModal.associatedGovernorates.slice(0, 5).map(gov => (
                    <div key={gov.governorate} className="flex items-center justify-between text-xs text-slate-300">
                      <span>{gov.governorate}</span>
                      <span className="font-mono text-slate-400">{gov.count}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Verbatim Sample Quotes from Public Comments */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === "ar" ? "شواهد من منشورات وتعليقات الرأي العام:" : "Sample Public Quotes with Provenance:"}</span>
              </h4>

              {selectedEntityForModal.recentQuotes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  {lang === "ar" ? "لا توجد شواهد نصية مباشرة مسجلة" : "No direct quotes recorded."}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEntityForModal.recentQuotes.map((quote, qIdx) => (
                    <div key={qIdx} className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300">{quote.author}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded">{quote.platform}</span>
                          <span className={quote.sentiment === 'positive' ? 'text-emerald-400' : quote.sentiment === 'negative' ? 'text-rose-400' : 'text-slate-400'}>
                            {quote.sentiment} ({quote.sentimentScore})
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-200 leading-relaxed italic">
                        "{quote.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedEntityForModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
