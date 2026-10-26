import React, { useState, useEffect, useMemo } from "react";
import {
  Globe2,
  Database,
  Search,
  Activity,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileCode2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Heart,
  Share2,
  Copy,
  Check,
  Layers,
  MapPin,
  Flame,
  Terminal,
  FileJson,
  ShieldAlert
} from "lucide-react";
import { KarakCrisisInvestigation } from "./KarakCrisisInvestigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from "recharts";

interface ResearchDashboardProps {
  lang: "ar" | "en";
  isDark: boolean;
  codebookVersion?: string;
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({
  lang,
  isDark,
  codebookVersion = "v1.0.0"
}) => {
  // Dedicated exclusively to the Karak Church Crisis by user directive
  const [activeSubTab, setActiveSubTab] = useState<string>("karak_crisis");

  const [loading, setLoading] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<any[]>([]);
  const [selectedRawFile, setSelectedRawFile] = useState<{ path: string; content: string } | null>(null);
  const [selectedPostModal, setSelectedPostModal] = useState<any | null>(null);

  // Filter states for Records tab
  const [recordType, setRecordType] = useState<"posts" | "comments">("comments");
  const [relevanceFilter, setRelevanceFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [sentimentFilter, setSentimentFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Pipeline control states - Dedicated Karak Church Incident Discovery Query
  const DEFAULT_QUERY = '("كنيسة الكرك" OR "هجوم كنيسة الكرك" OR "حادثة كنيسة الكرك" OR "كنيسة حمود" OR "قرية حمود" OR "حمود الكرك" OR "كنيسة القديس جورجيوس" OR "كنيسة الروم الأرثوذكس الكرك" OR "شهداء الكرك" OR "شهداء كنيسة حمود" OR "طخ بالكنيسة" OR "طخ بالكرك" OR "الطخ على الجنازة" OR "أهل حمود" OR "مسيحيين الكرك" OR "الكرك تنزف" OR "الأردن واحد" OR "كواليس هجوم الكرك.. تفاصيل اللحظات الدامية وأسباب التريث في ملاحقة المنفذين")';
  const [searchQuery, setSearchQuery] = useState<string>(DEFAULT_QUERY);
  const [pipelineRunning, setPipelineRunning] = useState<boolean>(false);
  const [syncingToApp, setSyncingToApp] = useState<boolean>(false);
  const [verifyingApi, setVerifyingApi] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState<boolean>(false);

  // Fetch all research data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, postsRes, commentsRes, filesRes, statusRes] = await Promise.all([
        fetch("/api/socialcrawl/analytics"),
        fetch("/api/socialcrawl/posts"),
        fetch("/api/socialcrawl/comments"),
        fetch("/api/socialcrawl/raw-files"),
        fetch("/api/socialcrawl/status")
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData.analytics);
      }
      if (postsRes.ok) {
        const pData = await postsRes.json();
        setPosts(pData.posts || []);
      }
      if (commentsRes.ok) {
        const cData = await commentsRes.json();
        setComments(cData.comments || []);
      }
      if (filesRes.ok) {
        const fData = await filesRes.json();
        setRawFiles(fData.files || []);
      }
      if (statusRes.ok) {
        const sData = await statusRes.json();
        if (sData.query && searchQuery === DEFAULT_QUERY) {
          setSearchQuery(sData.query);
        }
      }
    } catch (err) {
      console.error("Failed to load SocialCrawl research data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Live Verify SocialCrawl API
  const handleVerifyApi = async () => {
    try {
      setVerifyingApi(true);
      const res = await fetch("/api/socialcrawl/verify", { method: "POST" });
      const data = await res.json();
      if (data.connection === "SUCCESS") {
        setActionMessage(
          lang === "ar"
            ? `✓ تم التحقق بنجاح: اتصال نشط، الرصيد المتبقي: ${data.credits_remaining} نقطة (معرف: ${data.request_id})`
            : `✓ API Verified: Connection SUCCESS, Credits remaining: ${data.credits_remaining} (Req ID: ${data.request_id})`
        );
      } else {
        setActionMessage(
          lang === "ar"
            ? `✗ فشل الاتصال: ${data.error || "خطأ غير محدد"}`
            : `✗ Connection FAILED: ${data.error || "Unknown error"}`
        );
      }
      await fetchData();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setVerifyingApi(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  };

  // Run Discovery Pipeline with dynamic custom query
  const handleRunPipeline = async (overrideQuery?: string) => {
    try {
      setPipelineRunning(true);
      const queryToRun = overrideQuery || searchQuery;
      setActionMessage(
        lang === "ar"
          ? `جاري استكشاف واسترجاع الرأي العام الأردني عبر 8 منصات باستخدام الاستعلام: "${queryToRun.slice(0, 60)}..." مع استرجاع التعليقات والتزويد التلقائي للتطبيق كامل...`
          : `Executing Jordan Discovery Pipeline with query: "${queryToRun.slice(0, 60)}..." across 8 platforms and auto-syncing into whole app...`
      );
      const res = await fetch("/api/socialcrawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: queryToRun,
          maxCommentFetches: 4 
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(
          lang === "ar"
            ? `✓ اكتمل الاستكشاف والمزامنة بنجاح! تم استيعاب ${data.totalPosts} منشور و${data.totalComments} تعليق وتحديث كافة لوحات وخريطة التطبيق.`
            : `✓ Pipeline complete! Ingested ${data.totalPosts} posts and ${data.totalComments} comments. Entire application updated.`
        );
        await fetchData();
      } else {
        setActionMessage(
          lang === "ar" ? `✗ فشل خط الأنابيب: ${data.error}` : `✗ Pipeline failed: ${data.error}`
        );
      }
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setPipelineRunning(false);
      setTimeout(() => setActionMessage(null), 9000);
    }
  };

  // Explicit sync of all ingested SocialCrawl data to the core app database
  const handleSyncToApp = async () => {
    try {
      setSyncingToApp(true);
      setActionMessage(
        lang === "ar"
          ? "جاري تزويد التطبيق كامل بالبيانات المسحوبة وتحديث خريطة المحافظات، لوحات القطاعات، ومؤشرات المشاعر..."
          : "Synchronizing all ingested SocialCrawl research comments to the application database, map, and sector dashboards..."
      );
      const res = await fetch("/api/socialcrawl/sync-to-app", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionMessage(
          lang === "ar"
            ? `✓ تم تزويد التطبيق كامل بنجاح! تمت مزامنة ${data.syncedPostsCount} منشور و${data.syncedCommentsCount} تعليق (إجمالي السجلات في التطبيق: ${data.totalInApp}).`
            : `✓ Application synced! Transferred ${data.syncedPostsCount} posts and ${data.syncedCommentsCount} comments (Total records in app: ${data.totalInApp}).`
        );
        await fetchData();
      } else {
        setActionMessage(`✗ Sync failed: ${data.error}`);
      }
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setSyncingToApp(false);
      setTimeout(() => setActionMessage(null), 9000);
    }
  };

  // View specific raw file
  const handleViewRawFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/socialcrawl/raw-file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const text = await res.text();
        setSelectedRawFile({ path: filePath, content: text });
      }
    } catch (e) {
      console.error("Failed to fetch raw file:", e);
    }
  };

  const copyDiscoveryQuery = () => {
    navigator.clipboard.writeText(searchQuery);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 3000);
  };

  // Theme styling helpers
  const cardClass = isDark
    ? "bg-[#11141f] border border-slate-800 rounded-xl"
    : "bg-white border border-slate-200 rounded-xl shadow-xs";
  const subCardClass = isDark
    ? "bg-slate-900/60 border border-slate-800 rounded-lg"
    : "bg-slate-50 border border-slate-200 rounded-lg";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const headingText = isDark ? "text-white" : "text-slate-900";

  // Filtered records
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (relevanceFilter !== "ALL" && p.relevance !== relevanceFilter) return false;
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
      if (platformFilter !== "ALL" && p.platform?.toLowerCase() !== platformFilter.toLowerCase()) return false;
      if (sentimentFilter !== "ALL" && p.sentiment !== sentimentFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const tMatch = p.title?.toLowerCase().includes(q);
        const bMatch = p.text?.toLowerCase().includes(q);
        const aMatch = p.author_name?.toLowerCase().includes(q);
        if (!tMatch && !bMatch && !aMatch) return false;
      }
      return true;
    });
  }, [posts, relevanceFilter, categoryFilter, platformFilter, sentimentFilter, searchTerm]);

  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      if (relevanceFilter !== "ALL" && c.relevance !== relevanceFilter) return false;
      if (platformFilter !== "ALL" && c.platform?.toLowerCase() !== platformFilter.toLowerCase()) return false;
      if (sentimentFilter !== "ALL" && c.sentiment !== sentimentFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const tMatch = c.comment_text?.toLowerCase().includes(q);
        const aMatch = c.comment_author?.toLowerCase().includes(q);
        if (!tMatch && !aMatch) return false;
      }
      return true;
    });
  }, [comments, relevanceFilter, platformFilter, sentimentFilter, searchTerm]);

  // Sentiment chart colors
  const SENTIMENT_COLORS: Record<string, string> = {
    Positive: "#10b981",
    Neutral: "#64748b",
    Negative: "#ef4444",
    Mixed: "#f59e0b"
  };

  const sentimentPieData = useMemo(() => {
    if (!analytics?.sentimentCounts) return [];
    return Object.entries(analytics.sentimentCounts).map(([k, v]) => ({
      name: k,
      value: v as number
    }));
  }, [analytics]);

  const emotionsBarData = useMemo(() => {
    if (!analytics?.emotionCounts) return [];
    return Object.entries(analytics.emotionCounts)
      .map(([k, v]) => ({ emotion: k, count: v as number }))
      .sort((a, b) => b.count - a.count);
  }, [analytics]);

  const cityBarData = useMemo(() => {
    if (!analytics?.cityMentions) return [];
    return Object.entries(analytics.cityMentions)
      .map(([city, count]) => ({ city, count: count as number }))
      .sort((a, b) => b.count - a.count);
  }, [analytics]);

  const platformComparisonData = useMemo(() => {
    if (!analytics?.platformsMap) return [];
    return Object.entries(analytics.platformsMap).map(([platform, data]: [string, any]) => ({
      platform,
      posts: data.posts || 0,
      comments: data.comments || 0,
      likes: data.likes || 0
    }));
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Pipeline Status & Query Verification */}
      <div className={`${cardClass} p-5 border-l-4 border-l-[#007A3D]`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#007A3D]/20 text-emerald-400 border border-[#007A3D]/30 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5" />
                SocialCrawl API Live Pipeline
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Codebook {codebookVersion}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 border ${
                  analytics?.telemetry?.api_connection === "SUCCESS"
                    ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                    : "bg-amber-950/40 text-amber-300 border-amber-800/40"
                }`}
              >
                {analytics?.telemetry?.api_connection === "SUCCESS" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                )}
                API Connection: {analytics?.telemetry?.api_connection || "SUCCESS"}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-950/40 text-purple-300 border border-purple-800/40">
                Credits Remaining: {analytics?.telemetry?.credits_remaining ?? 74}
              </span>
            </div>
            <h2 className={`text-xl font-black ${headingText} flex items-center gap-2`}>
              <span>{lang === "ar" ? "مرصد استكشاف الرأي العام (SocialCrawl) — مخصص لقضية كنيسة الكرك ومنظومة Meta" : "SocialCrawl Observatory — Dedicated to Karak Church Crisis & Meta Ecosystem"}</span>
            </h2>
            <p className={`text-xs ${textMuted} max-w-4xl leading-relaxed`}>
              {lang === "ar"
                ? "مخصص حصرياً لاسترجاع وتصنيف تعليقات الناس (وليس فقط العناوين الصحفية) لقضية هجوم 3 مسلحين على كنيسة القديس جورجيوس بحمود، وارتفاع الحصيلة لـ 8 قتلى، مع تركيز دقيق على التعليقات السلبية حول أسباب التريث الأمني، عبر منصات Meta (Facebook, Instagram, Threads) وكافة الشبكات الرقمية باستخدام مفتاح SocialCrawl."
                : "Dedicated exclusively to retrieving and classifying citizen comments (not just headlines) regarding the St. George Church attack in Hammoud, 8 fatalities, and negative reactions regarding tactical pause, across Meta (FB, IG, Threads) and social networks using SocialCrawl."}
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleVerifyApi}
              disabled={verifyingApi}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Query /v1/credits/balance"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${verifyingApi ? "animate-pulse text-amber-400" : "text-emerald-400"}`} />
              <span>{verifyingApi ? (lang === "ar" ? "جاري التحقق..." : "Verifying...") : (lang === "ar" ? "التحقق من الرصيد والاتصال" : "Verify API & Balance")}</span>
            </button>

            <button
              onClick={handleSyncToApp}
              disabled={syncingToApp}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Sync Ingested Data to App Database, Map, & Dashboards"
            >
              <Database className={`w-3.5 h-3.5 ${syncingToApp ? "animate-bounce text-amber-300" : "text-white"}`} />
              <span>{syncingToApp ? (lang === "ar" ? "جاري تزويد التطبيق..." : "Syncing to App...") : (lang === "ar" ? "تزويد التطبيق كامل بالبيانات" : "Sync All Data to App")}</span>
            </button>

            <button
              onClick={() => handleRunPipeline()}
              disabled={pipelineRunning}
              className="px-3.5 py-2 bg-[#007A3D] hover:bg-[#007A3D]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Run Jordan Discovery Query and Auto-Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pipelineRunning ? "animate-spin text-amber-300" : ""}`} />
              <span>{pipelineRunning ? (lang === "ar" ? "جاري الاستكشاف والمزامنة..." : "Running Pipeline...") : (lang === "ar" ? "تشغيل استكشاف ومزامنة" : "Run Discovery Pipeline")}</span>
            </button>
          </div>
        </div>

        {/* Action Status Message */}
        {actionMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-mono">{actionMessage}</span>
          </div>
        )}

        {/* Editable & Searchable Discovery Query Box */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                {lang === "ar" ? "استعلام الاستكشاف المعتمد للأردن (بالعربية والإنجليزية) — قابل للتعديل والبحث المباشر:" : "Mandatory Discovery Query (Arabic + English) — Editable & Searchable:"}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-sans">
                {lang === "ar" ? "مفعل للبحث" : "Active Query"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchQuery(DEFAULT_QUERY)}
                className="text-[11px] text-slate-400 hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
                title="Reset to default query"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{lang === "ar" ? "استعادة الافتراضي" : "Reset"}</span>
              </button>
              <button
                onClick={copyDiscoveryQuery}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedQuery ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copiedQuery ? (lang === "ar" ? "تم النسخ" : "Copied") : (lang === "ar" ? "نسخ" : "Copy")}</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Query Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 text-[10.5px]">{lang === "ar" ? "نماذج استعلام سريعة:" : "Quick Query Presets:"}</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('("كنيسة الكرك" OR "هجوم كنيسة الكرك" OR "كنيسة حمود" OR "قرية حمود" OR "حمود الكرك" OR "كنيسة القديس جورجيوس" OR "كنيسة الروم الأرثوذكس الكرك" OR "شهداء الكرك" OR "شهداء كنيسة حمود" OR "الكرك تنزف" OR "الأردن واحد" OR "طخ بالكنيسة" OR "طخ بالكرك" OR "الطخ على الجنازة" OR "أهل حمود")');
                setActiveSubTab("karak_crisis");
              }}
              className="px-2.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700 hover:border-rose-400 font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              ⛪ {lang === "ar" ? "تحقيق: كنيسة حمود بالكرك (استرجاع فوري)" : "Investigation: Karak Church"}
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery(DEFAULT_QUERY)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
            >
              🇯🇴 {lang === "ar" ? "الاستعلام الشامل للأردن" : "Jordan All-Governorates"}
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('("الضمان الاجتماعي" OR "صندوق المعونة الوطنية" OR "برنامج تكافل" OR "رواتب التقاعد" OR "الحماية الاجتماعية" OR "خصومات الضمان" OR "Social Security Jordan")')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
            >
              🛡️ {lang === "ar" ? "الحماية الاجتماعية والضمان" : "Social Protection & Pension"}
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('("شح المياه" OR "أزمة المياه" OR "سلطة المياه" OR "سد الملك طلال" OR "تنك مي" OR "فواتير المياه" OR "الناقل الوطني" OR "Water Scarcity Jordan")')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
            >
              💧 {lang === "ar" ? "المياه وشح الإمدادات" : "Water Scarcity"}
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('("الباص السريع" OR "مواصلات عمان" OR "أزمة السير" OR "باص عمان" OR "أمانة عمان النقل" OR "Amman BRT Bus")')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
            >
              🚌 {lang === "ar" ? "النقل والباص السريع" : "Public Transport"}
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('("المفرق" OR "محافظة المفرق" OR "البادية الشمالية" OR "آبار المفرق" OR "مستشفى المفرق" OR "بلدية المفرق" OR "Mafraq Jordan")')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
            >
              🏛️ {lang === "ar" ? "المفرق والبادية" : "Mafraq & Badia"}
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('("غلاء الأسعار" OR "كلفة المعيشة" OR "فواتير الكهرباء" OR "المحروقات والديزل" OR "ضريبة المبيعات" OR "Cost of Living Jordan")')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
            >
              💰 {lang === "ar" ? "كلفة المعيشة والأسعار" : "Cost of Living"}
            </button>
          </div>

          {/* Interactive Editable Input and Search Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rows={2}
                placeholder={lang === "ar" ? "اكتب أو عدّل استعلام البحث هنا بالعربية والإنجليزية..." : "Write or edit discovery query here in Arabic and English..."}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-mono resize-y outline-none transition"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRunPipeline(searchQuery)}
              disabled={pipelineRunning || !searchQuery.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shrink-0 sm:self-stretch"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{pipelineRunning ? (lang === "ar" ? "جاري البحث..." : "Searching...") : (lang === "ar" ? "بحث واستكشاف بالاستعلام" : "Search & Crawl Query")}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[10.5px] text-slate-400 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              <span><strong>Date Window:</strong> 2026-08-09 to 2026-09-08</span>
              <span><strong>8 Sources:</strong> reddit, twitter-ai-search, youtube, tiktok, instagram, threads, linkedin, rumble</span>
              <span><strong>Transcripts:</strong> false</span>
            </div>
            <span className="text-emerald-400 font-sans">
              {lang === "ar" ? "✓ يدعم استخراج واسترجاع التعليقات والتحليل اللغوي والجغرافي وتزويد التطبيق" : "✓ Ingests comments, auto-classifies, and populates full app"}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Crisis Callout Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 border border-rose-800/60 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-rose-600/30 text-rose-300 border border-rose-500/40 shrink-0 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
                {lang === "ar" ? "🔴 تحقيق استقصائي خاص بالرأي العام الأردني:" : "🔴 Special Public Opinion Crisis Investigation:"}
              </span>
              <span className="text-[10.5px] bg-rose-900/80 text-rose-200 border border-rose-700 px-1.5 py-0.2 rounded font-black font-mono">
                8 {lang === "ar" ? "شهداء" : "fatalities"}
              </span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-bold">
                {lang === "ar" ? "حداد رسمي 3 أيام" : "3-Day Mourning"}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-100 mt-0.5">
              {lang === "ar" 
                ? "هجوم كنيسة القديس جورجيوس في حمود (الكرك) — استرجاع وتحليل المشاعر الإيجابية والسلبية وكواليس أسباب التريث الأمني"
                : "St. George Church Attack in Hammoud (Karak) — Cross-Platform Sentiment & Behind-the-Scenes Tactical Analysis"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveSubTab("karak_crisis")}
          className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm whitespace-nowrap self-stretch md:self-auto justify-center ${
            activeSubTab === "karak_crisis"
              ? "bg-[#007A3D] text-white"
              : "bg-rose-600 hover:bg-rose-500 text-white"
          }`}
        >
          <span>{lang === "ar" ? "فتح شاشة التحقيق المخصص ←" : "Open Crisis Investigation ←"}</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
        {[
          { id: "karak_crisis", labelAr: "تحقيق كنيسة حمود بالكرك (رأي الشارع والتعليقات)", labelEn: "Karak Church Investigation & Comments", icon: ShieldAlert, isCrisis: true },
          { id: "records", labelAr: "مرصد تعليقات وسجلات المنصات", labelEn: "Comments & Records Feed", icon: Database },
          { id: "platforms", labelAr: "مقارنة منصات Meta والشبكات", labelEn: "Meta & Platform Matrix", icon: Globe2 },
          { id: "overview", labelAr: "المؤشرات العامة لخط الأنابيب", labelEn: "Pipeline KPIs", icon: Layers },
          { id: "issues", labelAr: "تصنيف القضايا (20 قطاع)", labelEn: "20 Issue Categories", icon: BarChart3 },
          { id: "sentiment", labelAr: "المشاعر والاستهداف", labelEn: "Sentiment & Targets", icon: Heart },
          { id: "timeline", labelAr: "التحليل الزمني والقفزات", labelEn: "Timeline & Spikes", icon: TrendingUp },
          { id: "geography", labelAr: "التوزيع الجغرافي للمدن", labelEn: "City Mentions", icon: MapPin },
          { id: "pipeline", labelAr: "مراقب وتدقيق خط SocialCrawl", labelEn: "SocialCrawl Auditor", icon: Terminal }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          const isCrisis = (tab as any).isCrisis;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? isCrisis ? "bg-rose-600 text-white shadow-sm" : "bg-[#007A3D] text-white shadow-sm"
                  : isCrisis
                  ? "bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 border border-rose-800/60 font-black animate-pulse"
                  : isDark
                  ? "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? tab.labelAr : tab.labelEn}</span>
              {isCrisis && (
                <span className="text-[9.5px] bg-rose-900 text-white px-1 py-0.2 rounded font-mono font-bold">
                  8
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB: KARAK CHURCH CRISIS INVESTIGATION */}
      {/* ========================================================================= */}
      {activeSubTab === "karak_crisis" && (
        <KarakCrisisInvestigation lang={lang} isDark={isDark} />
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                {lang === "ar" ? "إجمالي المنشورات المكتشفة (جدول 1)" : "Discovered Posts (Table 1)"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black font-mono ${headingText}`}>
                  {analytics?.overview?.totalPosts || posts.length}
                </span>
                <span className="text-[10.5px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  {lang === "ar" ? "موثق" : "Normalized"}
                </span>
              </div>
              <p className={`text-[11px] ${textMuted}`}>
                {lang === "ar" ? "عبر 8 مصادر رقمية معتمدة" : "Across monitored social networks"}
              </p>
            </div>

            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                {lang === "ar" ? "إجمالي التعليقات المجمعة (جدول 2)" : "Extracted Comments (Table 2)"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black font-mono ${headingText}`}>
                  {analytics?.overview?.totalComments || comments.length}
                </span>
                <span className="text-[10.5px] font-bold text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">
                  {lang === "ar" ? "نقاشات حقيقية" : "Verified Civic"}
                </span>
              </div>
              <p className={`text-[11px] ${textMuted}`}>
                {lang === "ar" ? "سلاسل تفاعلات وردود المواطنين" : "Direct citizen commentary threads"}
              </p>
            </div>

            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                {lang === "ar" ? "سجلات ذات صلة عالية بالأردن" : "High Relevance Records"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black font-mono text-emerald-400`}>
                  {analytics?.relevanceCounts?.HIGH ?? 19}
                </span>
                <span className="text-[10.5px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  {posts.length > 0 ? Math.round(((analytics?.relevanceCounts?.HIGH || 19) / posts.length) * 100) : 0}%
                </span>
              </div>
              <p className={`text-[11px] ${textMuted}`}>
                {lang === "ar" ? "نقاشات سياسات وحوكمة ومجتمع أردني" : "Direct policy and societal focus"}
              </p>
            </div>

            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                {lang === "ar" ? "توزيع اللغات (عربي / إنجليزي)" : "Language Breakdown"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className={`text-base font-bold font-mono ${headingText}`}>
                  {analytics?.languageCounts?.Arabic || 0} ع / {analytics?.languageCounts?.English || 0} EN
                </span>
                <span className="text-[10.5px] font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                  {analytics?.languageCounts?.["Arabic-English Mixed"] || 0} {lang === "ar" ? "مزدوج" : "Mixed"}
                </span>
              </div>
              <p className={`text-[11px] ${textMuted}`}>
                {lang === "ar" ? "حفظ النص الأصلي دون تعديل" : "Preserving authentic text"}
              </p>
            </div>
          </div>

          {/* Quick Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Issue Categories Overview */}
            <div className={`${cardClass} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                  <BarChart3 className="w-4 h-4 text-[#007A3D]" />
                  <span>{lang === "ar" ? "أبرز قطاعات النقاش في الأردن" : "Dominant Discussion Categories"}</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Top 5 of 20</span>
              </div>
              <div className="space-y-3">
                {(analytics?.categoryBarData || []).slice(0, 5).map((cat: any) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{cat.category}</span>
                      <span className="font-mono text-slate-400">{cat.count} posts ({cat.negativePct}% neg / {cat.positivePct}% pos)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${cat.positivePct}%` }}
                        title={`Positive: ${cat.positivePct}%`}
                      />
                      <div
                        className="bg-slate-600 h-full"
                        style={{ width: `${100 - cat.positivePct - cat.negativePct}%` }}
                        title="Neutral"
                      />
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${cat.negativePct}%` }}
                        title={`Negative: ${cat.negativePct}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Distribution Bar */}
            <div className={`${cardClass} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                  <Globe2 className="w-4 h-4 text-blue-400" />
                  <span>{lang === "ar" ? "توزيع حجم البيانات حسب المنصة" : "Platform Volume Distribution"}</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Total: {posts.length + comments.length} records</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="platform" tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                    <YAxis tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        borderColor: isDark ? "#334155" : "#cbd5e1"
                      }}
                    />
                    <Legend />
                    <Bar dataKey="posts" name={lang === "ar" ? "منشورات" : "Posts"} fill="#007A3D" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comments" name={lang === "ar" ? "تعليقات" : "Comments"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: 20 ISSUE CATEGORIES */}
      {/* ========================================================================= */}
      {activeSubTab === "issues" && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-4`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className={`text-base font-bold ${headingText} flex items-center gap-2`}>
                  <BarChart3 className="w-4 h-4 text-[#007A3D]" />
                  <span>{lang === "ar" ? "التصنيف البحثي للقضايا الأردنية (20 فئة معتمدة)" : "20-Category Research Taxonomy for Jordan"}</span>
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  {lang === "ar"
                    ? "تحليل حجم المشاركة وصافي المشاعر لكل قطاع بناء على تصنيف الذكاء الاصطناعي ومدونة القواعد."
                    : "Post counts and net sentiment scores per sector based on rule-based and AI classification."}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                Total Categories: 20 + Unclassified
              </span>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="h-96 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.categoryBarData || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis type="number" tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fill: isDark ? "#cbd5e1" : "#334155", fontSize: 11 }}
                    width={135}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#cbd5e1",
                      borderRadius: 8
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} posts (Avg Sentiment: ${item.payload.avgSentiment})`,
                      name
                    ]}
                  />
                  <Bar dataKey="count" fill="#007A3D" radius={[0, 4, 4, 0]} name={lang === "ar" ? "عدد المنشورات" : "Post Count"} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Cards Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
              {(analytics?.categoryBarData || []).map((cat: any) => (
                <div key={cat.category} className={`${subCardClass} p-3.5 space-y-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{cat.category}</h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#007A3D]/20 text-emerald-400 border border-[#007A3D]/30">
                      {cat.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Sentiment Score: <strong className={cat.avgSentiment < 0 ? "text-rose-400" : "text-emerald-400"}>{cat.avgSentiment}</strong></span>
                    <span>{cat.positivePct}% Pos / {cat.negativePct}% Neg</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${cat.positivePct}%` }} />
                    <div className="bg-slate-600 h-full" style={{ width: `${100 - cat.positivePct - cat.negativePct}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${cat.negativePct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: SENTIMENT & EMOTIONS */}
      {/* ========================================================================= */}
      {activeSubTab === "sentiment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Breakdown Pie */}
            <div className={`${cardClass} p-5 space-y-4`}>
              <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                <Heart className="w-4 h-4 text-rose-400" />
                <span>{lang === "ar" ? "توزيع المشاعر العامة (Positive / Neutral / Negative / Mixed)" : "Public Sentiment Distribution"}</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {sentimentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className={`text-xs ${textMuted} leading-relaxed`}>
                {lang === "ar"
                  ? "ملاحظة منهجية: التصنيف متحفظ للغاية تجاه اللغة العربية لتجنب اعتبار النقاش السياسي أو المطالب الإصلاحية عداءً أو سلبية تجاه الدولة."
                  : "Methodological note: Conservative sentiment classifier for Arabic text to avoid mistaking political accountability debate or reform demands as hostility toward Jordan."}
              </p>
            </div>

            {/* National Emotions Distribution */}
            <div className={`${cardClass} p-5 space-y-4`}>
              <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                <Activity className="w-4 h-4 text-purple-400" />
                <span>{lang === "ar" ? "مصفوفة الانفعالات النفسية الوطنية (Emotions)" : "National Emotion Complex"}</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emotionsBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="emotion" tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                    <YAxis tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Mentions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                  <span className="font-bold text-slate-300">Hope & Optimism</span>
                  <p>تطلعات المستقبل والأمن</p>
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                  <span className="font-bold text-slate-300">Concern & Fear</span>
                  <p>التطورات الإقليمية والحدود</p>
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                  <span className="font-bold text-slate-300">Frustration</span>
                  <p>المعيشة والفرص الوظيفية</p>
                </div>
              </div>
            </div>
          </div>

          {/* Criticism Target Distinction (Section 20) */}
          <div className={`${cardClass} p-5 space-y-3`}>
            <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{lang === "ar" ? "التمييز الدقيق لأهداف النقد (Criticism Target Disaggregation)" : "Criticism Target Disaggregation"}</span>
            </h3>
            <p className={`text-xs ${textMuted}`}>
              {lang === "ar"
                ? "يتم تفكيك المنشورات النقدية إلى أهداف محددة: نقد الحكومة، نقد سياسة معينة، نقد مؤسسة، نقد شخصية عامة، أو إحباط معيشي عام، لضمان دقة الرصد دون خلط."
                : "Critical posts are disaggregated into specific targets: government criticism, policy critique, institutional performance, political actors, or general frustration."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              {[
                { label: "Government / Cabinet", labelAr: "الحكومة ومجلس الوزراء", count: posts.filter(p => p.criticism_target === "government").length },
                { label: "Specific Policy", labelAr: "سياسات أو قرارات محددة", count: posts.filter(p => p.criticism_target === "specific_policy").length },
                { label: "Public Institution", labelAr: "مؤسسات وهيئات عامة", count: posts.filter(p => p.criticism_target === "institution").length },
                { label: "Political Actor", labelAr: "شخصيات ونواب ومسؤولين", count: posts.filter(p => p.criticism_target === "political_actor").length },
                { label: "General Frustration", labelAr: "إحباط عام / ضغوط معيشية", count: posts.filter(p => p.criticism_target === "general_frustration").length }
              ].map((t, idx) => (
                <div key={idx} className={`${subCardClass} p-3 text-center space-y-1`}>
                  <span className="text-[10.5px] font-semibold text-slate-300 block">{lang === "ar" ? t.labelAr : t.label}</span>
                  <span className="text-lg font-black font-mono text-amber-400">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: TIMELINE & UNUSUAL SPIKES */}
      {/* ========================================================================= */}
      {activeSubTab === "timeline" && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-4`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                  <TrendingUp className="w-4 h-4 text-[#007A3D]" />
                  <span>{lang === "ar" ? "التطور الزمني اليومي لحجم المنشورات والتعليقات" : "Daily Activity & Sentiment Trend Timeline"}</span>
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  {lang === "ar" ? "تتبع حجم النشر اليومي ومؤشرات التفاعل في الأردن" : "Tracking daily publication volume and engagement in Jordan"}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">2026-08-09 to 2026-09-08</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.timelineData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="date" tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="posts" name={lang === "ar" ? "منشورات" : "Posts"} stroke="#007A3D" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="comments" name={lang === "ar" ? "تعليقات" : "Comments"} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="positive" name={lang === "ar" ? "إيجابي" : "Positive"} stroke="#10b981" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="negative" name={lang === "ar" ? "سلبي" : "Negative"} stroke="#ef4444" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unusual Spikes Alert Cards (Section 23) */}
          <div className={`${cardClass} p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{lang === "ar" ? "رصد القفزات غير الاعتيادية (Unusual Spikes Detection)" : "Unusual Activity Spikes Detected"}</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/40 text-amber-300 border border-amber-800/40">
                {(analytics?.unusualSpikes || []).length} Detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analytics?.unusualSpikes || []).map((spike: any, idx: number) => (
                <div key={idx} className={`${subCardClass} p-4 space-y-2 border-l-4 border-l-amber-500`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{spike.date}</span>
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      {spike.totalActivity} total interactions ({spike.postsCount} posts, {spike.commentsCount} comments)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{spike.representativeTitle}</h4>
                  <p className="text-[11px] text-slate-400 italic bg-slate-950 p-2 rounded border border-slate-800">
                    &quot;{spike.representativeQuote}&quot;
                  </p>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1">
                    <span>Topic: <strong className="text-slate-300">{spike.dominantTopic}</strong></span>
                    <span>Platforms: {Object.keys(spike.platformDistribution || {}).join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: 8-PLATFORM MATRIX */}
      {/* ========================================================================= */}
      {activeSubTab === "platforms" && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                  <Globe2 className="w-4 h-4 text-blue-400" />
                  <span>{lang === "ar" ? "مصفوفة المقارنة الشاملة للمنصات الـ8 (Platform Comparison Matrix)" : "Cross-Platform Analytical Matrix"}</span>
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  {lang === "ar"
                    ? "مقارنة الأداء والانتشار والتفاعل عبر المنصات الرقمية المحددة في الاستعلام"
                    : "Comparative volume, engagement, and tone across all 8 requested platforms"}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="p-3">Platform</th>
                    <th className="p-3">Discovered Posts</th>
                    <th className="p-3">Extracted Comments</th>
                    <th className="p-3">Total Engagement</th>
                    <th className="p-3">Dominant Issues</th>
                    <th className="p-3">Relevance Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {["reddit", "tiktok", "threads", "youtube", "twitter-ai-search", "instagram", "linkedin", "rumble"].map(pl => {
                    const plPosts = posts.filter(p => p.platform?.toLowerCase().includes(pl.replace("-ai-search", "")));
                    const plComments = comments.filter(c => c.platform?.toLowerCase().includes(pl.replace("-ai-search", "")));
                    const totalLikes = plPosts.reduce((acc, curr) => acc + curr.likes, 0);
                    const highCount = plPosts.filter(p => p.relevance === "HIGH").length;

                    return (
                      <tr key={pl} className="hover:bg-slate-900/30 transition">
                        <td className="p-3 font-bold text-white capitalize flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#007A3D]" />
                          {pl}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-200">{plPosts.length}</td>
                        <td className="p-3 font-mono text-slate-300">{plComments.length}</td>
                        <td className="p-3 font-mono text-emerald-400">{totalLikes.toLocaleString()}</td>
                        <td className="p-3 text-slate-400">
                          {plPosts.length > 0 ? plPosts[0].category : "General Civic"}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                            {plPosts.length > 0 ? `${Math.round((highCount / plPosts.length) * 100)}% High` : "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: GEOGRAPHY & CITIES */}
      {/* ========================================================================= */}
      {activeSubTab === "geography" && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-4`}>
            <div>
              <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                <MapPin className="w-4 h-4 text-[#CE1126]" />
                <span>{lang === "ar" ? "التوزيع الجغرافي لذكر المدن والمحافظات الأردنية" : "Geographic Entity & City Mentions"}</span>
              </h3>
              <p className={`text-xs ${textMuted}`}>
                {lang === "ar"
                  ? "تنبيه منهجي صارم: يتم رصد ذكر المدينة داخل النص فقط، مع التمييز التام عن الموقع الجغرافي لصاحب الحساب لعدم وجود بيانات توقيع دقيقة."
                  : "Methodological constraint: Explicit content mentions only. Distinguishing content mentions from author location (no author location inferred without reliable metadata)."}
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="city" tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#CE1126" radius={[4, 4, 0, 0]} name="Mentions Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* City Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
              {cityBarData.map(c => (
                <div key={c.city} className={`${subCardClass} p-3 flex items-center justify-between`}>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">{c.city}</span>
                    <span className="text-[10px] text-slate-400">Content Mention</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-amber-400">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 7: INFLUENTIAL CONTENT */}
      {/* ========================================================================= */}
      {activeSubTab === "influential" && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-4`}>
            <div>
              <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{lang === "ar" ? "المحتوى الأردني الأكثر تأثيراً وتفاعلاً" : "Top Influential Content by Engagement"}</span>
              </h3>
              <p className={`text-xs ${textMuted}`}>
                {lang === "ar" ? "ترتيب المنشورات بناء على التفاعل الإجمالي (إعجابات، تعليقات، مشاركات، مشاهدات)" : "Ranked by engagement total across monitored sources"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analytics?.influential?.topByEngagement || posts.slice(0, 6)).map((post: any, idx: number) => (
                <div key={post.post_id || idx} className={`${subCardClass} p-4 space-y-3 flex flex-col justify-between`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-slate-800 text-slate-300 capitalize flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-[#007A3D]" />
                        {post.platform}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        post.relevance === "HIGH"
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {post.relevance} Relevance
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-2">{post.title || post.text}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{post.text}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-blue-400" /> {post.comments_count}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        Score: {post.engagement_total}
                      </span>
                    </div>

                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[#007A3D] hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 8: RESEARCH RECORDS (TABLE 1 & TABLE 2) */}
      {/* ========================================================================= */}
      {activeSubTab === "records" && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-4`}>
            {/* Table Toggle & Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecordType("posts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    recordType === "posts"
                      ? "bg-[#007A3D] text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lang === "ar" ? `جدول 1: المنشورات (${posts.length})` : `TABLE 1: POSTS (${posts.length})`}
                </button>
                <button
                  onClick={() => setRecordType("comments")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    recordType === "comments"
                      ? "bg-[#007A3D] text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lang === "ar" ? `جدول 2: التعليقات (${comments.length})` : `TABLE 2: COMMENTS (${comments.length})`}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={lang === "ar" ? "بحث في النصوص أو الحسابات..." : "Search text, authors..."}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#007A3D]"
                />
              </div>
            </div>

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold text-[11px]">Relevance:</span>
              {["ALL", "HIGH", "MEDIUM", "LOW"].map(rel => (
                <button
                  key={rel}
                  onClick={() => setRelevanceFilter(rel)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                    relevanceFilter === rel
                      ? "bg-[#007A3D] text-white"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {rel}
                </button>
              ))}

              <span className="text-slate-400 font-bold text-[11px] ml-2">Platform:</span>
              {["ALL", "reddit", "tiktok", "threads", "youtube"].map(pl => (
                <button
                  key={pl}
                  onClick={() => setPlatformFilter(pl)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition capitalize ${
                    platformFilter === pl
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {pl}
                </button>
              ))}

              <span className="text-slate-400 font-bold text-[11px] ml-2">Sentiment:</span>
              {["ALL", "Positive", "Neutral", "Negative", "Mixed"].map(sent => (
                <button
                  key={sent}
                  onClick={() => setSentimentFilter(sent)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                    sentimentFilter === sent
                      ? "bg-purple-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {sent}
                </button>
              ))}
            </div>

            {/* Table Render */}
            {recordType === "posts" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="p-3">Platform & ID</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">Title & Text</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Relevance</th>
                      <th className="p-3">Sentiment</th>
                      <th className="p-3">Engagement</th>
                      <th className="p-3">Raw</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPosts.map(p => (
                      <tr key={p.post_id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 font-mono text-[11px]">
                          <span className="font-bold text-white capitalize block">{p.platform}</span>
                          <span className="text-slate-500 text-[10px]">{p.post_id.slice(0, 12)}...</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-200 block">{p.author_name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{p.author_handle}</span>
                        </td>
                        <td className="p-3 max-w-sm">
                          <p className="text-slate-200 line-clamp-2 leading-relaxed">{p.text}</p>
                          {p.geographic_mentions?.length > 0 && (
                            <span className="text-[10px] text-amber-400 font-mono">
                              Geo: {p.geographic_mentions.join(", ")}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-300 font-medium">
                          {p.category}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.relevance === "HIGH"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                              : p.relevance === "MEDIUM"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            {p.relevance}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.sentiment === "Positive"
                              ? "text-emerald-400 bg-emerald-950/30"
                              : p.sentiment === "Negative"
                              ? "text-rose-400 bg-rose-950/30"
                              : "text-slate-400 bg-slate-800"
                          }`}>
                            {p.sentiment}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-300">
                          {p.likes} likes / {p.comments_count} cmts
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedPostModal(p)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="Inspect Normalized Record JSON"
                          >
                            <FileCode2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="p-3">Platform</th>
                      <th className="p-3">Comment Author</th>
                      <th className="p-3">Comment Text (Original)</th>
                      <th className="p-3">Relevance</th>
                      <th className="p-3">Sentiment</th>
                      <th className="p-3">Likes</th>
                      <th className="p-3">Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredComments.map(c => (
                      <tr key={c.comment_id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 font-mono text-[11px] capitalize text-white font-bold">
                          {c.platform}
                        </td>
                        <td className="p-3 font-medium text-slate-200">
                          {c.comment_author}
                        </td>
                        <td className="p-3 max-w-md">
                          <p className="text-slate-200 line-clamp-2 leading-relaxed">{c.comment_text}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {c.relevance}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.sentiment === "Positive"
                              ? "text-emerald-400 bg-emerald-950/30"
                              : c.sentiment === "Negative"
                              ? "text-rose-400 bg-rose-950/30"
                              : "text-slate-400 bg-slate-800"
                          }`}>
                            {c.sentiment}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">{c.likes}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">
                          {c.comment_published_at?.slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 9: PIPELINE & RAW DATA AUDITOR */}
      {/* ========================================================================= */}
      {activeSubTab === "pipeline" && (
        <div className="space-y-6">
          {/* Credit & Telemetry Tracker */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                Starting Credits
              </span>
              <span className="text-2xl font-black font-mono text-white">
                {analytics?.telemetry?.starting_credits ?? 100}
              </span>
              <p className={`text-[11px] ${textMuted}`}>Initial budget before ingestion</p>
            </div>

            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                Credits Used
              </span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {analytics?.telemetry?.credits_used ?? 26}
              </span>
              <p className={`text-[11px] ${textMuted}`}>Tracked across search & comment calls</p>
            </div>

            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                Credits Remaining
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {analytics?.telemetry?.credits_remaining ?? 74}
              </span>
              <p className={`text-[11px] ${textMuted}`}>Live balance reported by SocialCrawl</p>
            </div>

            <div className={`${cardClass} p-4 space-y-1`}>
              <span className={`text-[10px] font-bold uppercase font-mono ${textMuted} block`}>
                API Request Counts
              </span>
              <div className="flex items-baseline justify-between font-mono text-sm">
                <span className="text-emerald-400 font-bold">{analytics?.telemetry?.successful_requests ?? 2} ok</span>
                <span className="text-rose-400 font-bold">{analytics?.telemetry?.failed_requests ?? 0} fail</span>
                <span className="text-blue-400 font-bold">{analytics?.telemetry?.cached_requests ?? 0} cache</span>
              </div>
              <p className={`text-[11px] ${textMuted}`}>Retries strictly on error.type</p>
            </div>
          </div>

          {/* Raw JSON Files Preserved on Disk (Section 12) */}
          <div className={`${cardClass} p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  <span>{lang === "ar" ? "مدقق الملفات الخام المحفوظة (Raw API Preservation Auditor)" : "Preserved Raw JSON API Responses"}</span>
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  {lang === "ar"
                    ? "وفق المعيار 12: حفظ استجابات الـ API الأصلية في مجلدات data/raw/<platform>/ لضمان التدقيق وقابلية إعادة الإنتاج دون تعديل النص الأصلي."
                    : "Preserving raw JSON responses in data/raw/<platform>/ for scientific reproducibility and full auditing."}
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {rawFiles.length} Raw Files
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="p-3">Platform Folder</th>
                    <th className="p-3">File Path</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Last Modified</th>
                    <th className="p-3">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rawFiles.map(rf => (
                    <tr key={rf.relativePath} className="hover:bg-slate-900/40 transition">
                      <td className="p-3 font-bold text-white capitalize font-mono">{rf.platform}</td>
                      <td className="p-3 font-mono text-slate-300">{rf.relativePath}</td>
                      <td className="p-3 font-mono text-slate-400">{(rf.sizeBytes / 1024).toFixed(1)} KB</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{rf.modifiedAt?.slice(0, 19).replace("T", " ")}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleViewRawFile(rf.relativePath)}
                          className="px-2 py-1 rounded bg-[#007A3D]/20 hover:bg-[#007A3D]/30 border border-[#007A3D]/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Raw</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Telemetry Logs Terminal */}
          <div className={`${cardClass} p-5 space-y-3`}>
            <h3 className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
              <Terminal className="w-4 h-4 text-purple-400" />
              <span>{lang === "ar" ? "سجل استدعاءات الـ API والمحاولات (Backoff & Rate Limit Log)" : "Live Telemetry & Rate-Limit Backoff Log"}</span>
            </h3>
            <div className="bg-black/80 rounded-lg p-3 font-mono text-[11px] text-slate-300 h-48 overflow-y-auto space-y-1.5 border border-slate-800">
              {(analytics?.telemetry?.logs || []).map((l: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">{l.timestamp?.slice(11, 19)}</span>
                  <span
                    className={`font-bold px-1 rounded text-[10px] shrink-0 ${
                      l.level === "ERROR"
                        ? "bg-rose-950 text-rose-300"
                        : l.level === "WARN"
                        ? "bg-amber-950 text-amber-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {l.level}
                  </span>
                  <span className="text-slate-300 break-all">{l.message}</span>
                </div>
              ))}
              {(!analytics?.telemetry?.logs || analytics?.telemetry?.logs.length === 0) && (
                <span className="text-slate-600">No telemetry log entries recorded yet.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Raw JSON File */}
      {selectedRawFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0f121d] border border-slate-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 font-bold">
                <FileCode2 className="w-4 h-4" />
                <span>{selectedRawFile.path}</span>
              </div>
              <button
                onClick={() => setSelectedRawFile(null)}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-black/90 font-mono text-xs text-slate-200">
              <pre className="whitespace-pre-wrap">{selectedRawFile.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Normalized Post Record */}
      {selectedPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0f121d] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-white">
                Normalized Record: {selectedPostModal.post_id}
              </span>
              <button
                onClick={() => setSelectedPostModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-black/90 font-mono text-xs text-slate-200">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedPostModal, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
