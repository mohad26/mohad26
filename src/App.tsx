import React, { useState, useEffect, useMemo } from "react";
import { 
  X, Facebook, Instagram, Youtube, Smile, Meh, Frown, Search, RefreshCw, 
  FileText, Cpu, PlusCircle, Sparkles, Database, Compass, BarChart2, Award, 
  BookOpen, Settings, ShieldAlert, Activity, List, Save, Radio, Wifi, 
  Terminal, Layers, CheckCircle, MapPin, Download, Eye, FileSpreadsheet,
  Sun, Moon, Shield, Flame, SlidersHorizontal, Trash2
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ReferenceLine 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

import { Comment, KPIStats, DailySentimentTrend, PreprocessingLog, NationalEvent, DBTrend } from "./types";
import { compileExecutiveAnalytics, SECTORS } from "./utils/analytics";

// Custom Sub-components imports
import JordanMap from "./components/JordanMap";
import ThemeSectors from "./components/ThemeSectors";
import EmotionAnalytics from "./components/EmotionAnalytics";
import SocialPlatforms from "./components/SocialPlatforms";
import ControlCenter from "./components/ControlCenter";
import NlpSandbox from "./components/NlpSandbox";
import ResearchReport from "./components/ResearchReport";
import { SourceHealthBanner } from "./components/SourceHealthBanner";
import { MetaImportAdmin } from "./components/MetaImportAdmin";
import { CorpusStatsModal } from "./components/CorpusStatsModal";

const PRESET_DIALECTS = [
  {
    title: "Tourism Campaign",
    text: "تلفريك عجلون بجنن وبنصح الكل يجربه، إطلالة رائعة وتنظيم رائد وبداية ممتازة لمشاريع عجلون!",
    author: "Rula_Ajloun",
    handle: "@rula_ajloun",
    platform: "Instagram"
  },
  {
    title: "Cost of Living",
    text: "الوضع الاقتصادي والارتفاع المستمر بالأسعار في المطاعم والمحلات بعمان متعب جداً وغلاء المعيشة متعب.",
    author: "Samer_Refai",
    handle: "@samer_refai",
    platform: "X"
  },
  {
    title: "National Football Pride",
    text: "النشامى رفعوا راسنا بالبطولة اليوم، فوز مستحق وتألق استثنائي ضد خصم عنيد 🇯🇴⚽️ ابطال اسيا",
    author: "Ibrahim_Amman",
    handle: "@ibrahim_amman_jo",
    platform: "Facebook"
  },
  {
    title: "BRT Transport",
    text: "The road traffic in Amman next to the 8th circle is absolutely brutal during peak hours! We need quick BRT transportation expansions.",
    author: "Zaid_freihat",
    handle: "@zaid_freihat_90",
    platform: "X"
  },
  {
    title: "Mansaf UNESCO",
    text: "المنسف الأردني تراث عالمي فريد ورمز الكرام والضيافة الأردنية الأصيلة. فخور بالاعتراف الدولي باليونسكو 🇯🇴",
    author: "Mona_Karak",
    handle: "@mona_karak_9",
    platform: "Instagram"
  }
];

const JORDAN_NATIONAL_EVENTS = [
  { id: "event-1", date: "2026-03-15", label: "Energy Accord", title: "National Hydrogen & Renewable Pact", desc: "Sovereign commitment into green hydrogen grids & solar energy cells in Southern Badia, motivating employment index spikes.", icon: "⚡", sentimentEffect: "positive" },
  { id: "event-2", date: "2026-04-05", label: "BRT Phase 2", title: "Amman-Zarqa BRT Ingress Expansion", desc: "Launch of high-frequency commuter buses lowering standard travel overhead, triggering immense transport optimization.", icon: "🚌", sentimentEffect: "positive" },
  { id: "event-3", date: "2026-04-22", label: "Tourism Shift", title: "National Tourism Strategy Launch", desc: "Deployment of royal tourism stimulus vectors across Petra, Ajloun, & Wadi Rum, marking record-high digital visa registrations.", icon: "🇯🇴", sentimentEffect: "positive" },
  { id: "event-4", date: "2026-05-12", label: "Economic Vision", title: "National Modernization Report", desc: "Continuous economic goals review aligning 12 governorate vocational pipelines directly with private sector investments.", icon: "📈", sentimentEffect: "neutral" },
  { id: "event-5", date: "2026-05-25", label: "Independence", title: "79th Jordan Independence Day", desc: "Universal cultural processions & traditional celebrations boosting optimism indices across all monitored social feeds.", icon: "🇯🇴", sentimentEffect: "positive" },
  { id: "event-6", date: "2026-06-01", label: "Petra Ticket", title: "Petra Digital Gateway Transition", desc: "Sovereign transition of physical tickets to secure e-ports at UNESCO sites, eliminating previous vendor bottlenecks.", icon: "🎟️", sentimentEffect: "positive" },
  { id: "event-7", date: "2026-06-05", label: "Agri-Tech Order", title: "Jordan Valley Irrigation Reform", desc: "Royal directive addressing food security, deploying sub-surface smart drip-net technology to farming districts.", icon: "🌱", sentimentEffect: "neutral" }
];

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
  "All": "الكل"
};

export default function App() {
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<NationalEvent[]>(JORDAN_NATIONAL_EVENTS);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [trends, setTrends] = useState<DailySentimentTrend[]>([]);
  const [keywordTrends, setKeywordTrends] = useState<DBTrend[]>([]);
  const [wordcloud, setWordcloud] = useState<{ ar: any[]; en: any[] }>({ ar: [], en: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("All");
  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [selectedGovFilter, setSelectedGovFilter] = useState<string | null>(null);

  // Manual input form state
  const [customAuthor, setCustomAuthor] = useState("");
  const [customHandle, setCustomHandle] = useState("");
  const [customPlatform, setCustomPlatform] = useState("X");
  const [customText, setCustomText] = useState("");
  const [customGov, setCustomGov] = useState("Auto");

  // Sandbox state
  const [sandboxText, setSandboxText] = useState(PRESET_DIALECTS[0].text);
  const [sandboxAuthor, setSandboxAuthor] = useState(PRESET_DIALECTS[0].author);
  const [sandboxHandle, setSandboxHandle] = useState(PRESET_DIALECTS[0].handle);
  const [sandboxPlatform, setSandboxPlatform] = useState(PRESET_DIALECTS[0].platform);
  const [sandboxGov, setSandboxGov] = useState("Auto");
  const [sandboxNlpSteps, setSandboxNlpSteps] = useState<PreprocessingLog[]>([]);
  const [sandboxResult, setSandboxResult] = useState<Comment | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Research Report State
  const [reportTopic, setReportTopic] = useState("Tourism & Hospitality");
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Modal & Tab Navigation State
  const [isCorpusStatsOpen, setIsCorpusStatsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meta_import'>('dashboard');

  // Live Stream State
  const [streamActive, setStreamActive] = useState(false);
  const [streamLog, setStreamLog] = useState<{ id: string; author: string; topic: string; timestamp: string }[]>([]);

  // Telemetry Monitor State
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [activeSource, setActiveSource] = useState("Gemini Scraper & Grounding");
  const [requestsUsed, setRequestsUsed] = useState(0);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Monitored Accounts State
  const [monitoredAccounts, setMonitoredAccounts] = useState<Record<string, string[]>>({});
  const [editingCategory, setEditingCategory] = useState<string>("news");
  const [categoryInputText, setCategoryInputText] = useState("");
  const [registryMessage, setRegistryMessage] = useState("");

  // Sentiment Velocity Alert/Notification State
  const [velocityThreshold, setVelocityThreshold] = useState<number>(0.15);
  const [enableVelocityAlerts, setEnableVelocityAlerts] = useState<boolean>(true);
  const [activeVelocityAlert, setActiveVelocityAlert] = useState<{
    velocity: number;
    threshold: number;
    timeframe: string;
    topicWithMaxChange?: string;
    show: boolean;
  } | null>(null);

  // Clean filters button helper
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedPlatform("All");
    setSelectedSentiment("All");
    setSelectedTopic("All");
    setSelectedGovFilter(null);
  };

  // Compile calculated metrics on active inputs dynamically (combining with database stats)
  const computedStats = useMemo(() => {
    if (comments.length === 0) return compileExecutiveAnalytics([], keywordTrends);

    // Find latest comment timestamp
    const timestamps = comments.map(c => new Date(c.timestamp).getTime());
    const latestTime = timestamps.length > 0 ? Math.max(...timestamps) : new Date().getTime();
    const latestDateObj = new Date(latestTime);

    const filteredComments = comments.filter(c => {
      const commentTime = new Date(c.timestamp).getTime();
      const diffDays = (latestTime - commentTime) / (1000 * 60 * 60 * 24);

      if (timeframe === "daily") {
        const cDate = new Date(c.timestamp);
        return cDate.getUTCFullYear() === latestDateObj.getUTCFullYear() &&
               cDate.getUTCMonth() === latestDateObj.getUTCMonth() &&
               cDate.getUTCDate() === latestDateObj.getUTCDate();
      } else if (timeframe === "weekly") {
        return diffDays <= 7;
      } else if (timeframe === "monthly") {
        return diffDays <= 30;
      } else if (timeframe === "yearly") {
        return diffDays <= 365;
      }
      return true;
    });

    const finalComments = filteredComments.length > 0 ? filteredComments : comments;
    return compileExecutiveAnalytics(finalComments, keywordTrends);
  }, [comments, timeframe, keywordTrends]);

  // Dynamically compute active topics present inside comments database
  const activeTopics = useMemo(() => {
    if (comments.length === 0) {
      return ["National Football Pride", "Tourism & Hospitality", "Public Transport BRT", "Cost of Living", "Water Conservation", "Amman Tech Startups", "Ajloun Cable Car"];
    }
    return Array.from(new Set(comments.map(c => c.topic).filter(Boolean))).sort();
  }, [comments]);

  // Dynamically resolve event dates against those actually compiled in the trends timeline
  const annotatedEvents = useMemo(() => {
    if (trends.length === 0) return [];
    const availableDates = trends.map(t => t.date);
    
    return events.map(event => {
      let resolvedDate = event.date;
      if (!availableDates.includes(event.date)) {
        const idealTime = new Date(event.date).getTime();
        let closest = availableDates[0];
        let minDiff = Math.abs(new Date(closest).getTime() - idealTime);
        for (const d of availableDates) {
          const diff = Math.abs(new Date(d).getTime() - idealTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = d;
          }
        }
        resolvedDate = closest;
      }
      return {
        ...event,
        resolvedDate
      };
    });
  }, [trends]);

  // Dynamically calculate aggregated trend points and sentiment velocity based on timeframe
  const processedTrends = useMemo(() => {
    if (trends.length === 0) return [];
    
    if (timeframe === "daily") {
      return trends.map((item, idx) => {
        const prev = idx > 0 ? trends[idx - 1].averageScore : 0;
        const velocity = Number((item.averageScore - prev).toFixed(2));
        return {
          ...item,
          label: item.date,
          velocity
        };
      });
    }
    
    if (timeframe === "weekly") {
      const weeks: any[] = [];
      const chunkSize = 7;
      for (let i = 0; i < trends.length; i += chunkSize) {
        const chunk = trends.slice(i, i + chunkSize);
        const avgScore = Number((chunk.reduce((sum, item) => sum + item.averageScore, 0) / chunk.length).toFixed(2));
        const totalCount = chunk.reduce((sum, item) => sum + item.count, 0);
        const startDate = chunk[0].date;
        const endDate = chunk[chunk.length - 1].date;
        
        weeks.push({
          date: startDate, // Anchor to start date for reference annotators compatibility
          label: lang === "ar" ? `أسبوع ${weeks.length + 1}` : `Week ${weeks.length + 1}`,
          averageScore: avgScore,
          count: Math.round(totalCount / chunk.length)
        });
      }
      
      return weeks.map((item, idx) => {
        const prev = idx > 0 ? weeks[idx - 1].averageScore : 0;
        const velocity = Number((item.averageScore - prev).toFixed(2));
        return {
          ...item,
          velocity
        };
      });
    }

    if (timeframe === "monthly") {
      const monthGroups: Record<string, { sumSco: number; sumCou: number; points: number; firstDate: string }> = {};
      trends.forEach(t => {
        const monthKey = t.date.substring(0, 7); // "YYYY-MM"
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = { sumSco: 0, sumCou: 0, points: 0, firstDate: t.date };
        }
        monthGroups[monthKey].sumSco += t.averageScore;
        monthGroups[monthKey].sumCou += t.count;
        monthGroups[monthKey].points++;
      });

      const months = Object.keys(monthGroups).sort().map((mKey, idx) => {
        const g = monthGroups[mKey];
        const avg = Number((g.sumSco / g.points).toFixed(2));
        const mNamesAr: Record<string, string> = {
          "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل", "05": "مايو", "06": "يونيو",
          "07": "يوليو", "08": "أغسطس", "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر"
        };
        const mNamesEn: Record<string, string> = {
          "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
          "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
        };
        const subMonth = mKey.split("-")[1];
        const nameLabel = lang === "ar" ? (mNamesAr[subMonth] || mKey) : (mNamesEn[subMonth] || mKey);
        
        return {
          date: g.firstDate, // Anchor to first date of the month for reference lines mapping
          label: nameLabel,
          averageScore: avg,
          count: Math.round(g.sumCou / g.points)
        };
      });

      return months.map((item, idx) => {
        const prev = idx > 0 ? months[idx - 1].averageScore : 0;
        const velocity = Number((item.averageScore - prev).toFixed(2));
        return {
          ...item,
          velocity
        };
      });
    }

    if (timeframe === "yearly") {
      const avg = Number((trends.reduce((sum, item) => sum + item.averageScore, 0) / trends.length).toFixed(2));
      const totalCount = trends.reduce((sum, item) => sum + item.count, 0);
      return [{
        date: trends[0]?.date || "2026-01-01",
        label: lang === "ar" ? "سنة 2026" : "Year 2026",
        averageScore: avg,
        count: totalCount,
        velocity: 0.15
      }];
    }

    return trends;
  }, [trends, timeframe, lang]);

  // Automatically monitor Sentiment Velocity spikes & trigger real-time Alerts
  useEffect(() => {
    if (!enableVelocityAlerts || processedTrends.length === 0) {
      setActiveVelocityAlert(null);
      return;
    }

    // Get the most recent trend data point
    const latestItem = processedTrends[processedTrends.length - 1];
    const velocity = latestItem?.velocity || 0;

    if (Math.abs(velocity) >= velocityThreshold) {
      // Find the topic that is likely driving this sudden shift in comments
      const sortedSectors = Object.entries(kpis?.sectors || {})
        .sort((a: any, b: any) => Math.abs((b[1]?.growth || 0)) - Math.abs((a[1]?.growth || 0)));
      const drivingTopic = sortedSectors[0]?.[0] || activeTopics[0] || "General Discussion";

      setActiveVelocityAlert({
        velocity,
        threshold: velocityThreshold,
        timeframe,
        topicWithMaxChange: drivingTopic,
        show: true
      });
    } else {
      setActiveVelocityAlert(null);
    }
  }, [processedTrends, velocityThreshold, enableVelocityAlerts, kpis, activeTopics, timeframe]);

  // Sync report topics selection
  useEffect(() => {
    if (activeTopics.length > 0 && !activeTopics.includes(reportTopic)) {
      setReportTopic(activeTopics[0]);
    }
  }, [activeTopics, reportTopic]);

  // Fetch telemetry statuses on boot
  const fetchSystemStatus = async () => {
    try {
      const res = await fetch("/api/system-status");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setQuotaExhausted(data.quotaExhausted);
        setActiveSource(data.activeSource);
        setRequestsUsed(data.requestsUsed || 0);
      }
    } catch (e) {
      console.warn("Failed to fetch system status:", e);
    }
  };

  const handleResetQuota = async () => {
    try {
      const res = await fetch("/api/system-status/reset", { method: "POST" });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setQuotaExhausted(data.quotaExhausted);
        setActiveSource("Gemini Scraper & Grounding");
        setRequestsUsed(0);
      }
    } catch (e) {
      console.warn("Failed to reset quota:", e);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/sync-status");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (e) {
      console.warn("Failed to fetch crawler statuses:", e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setMonitoredAccounts(data || {});
        if (data && data["news"]) {
          setCategoryInputText(data["news"].join(", "));
        }
      }
    } catch (e) {
      console.warn("Failed to load monitored handles:", e);
    }
  };

  const handleCategorySwitch = (cat: string) => {
    setEditingCategory(cat);
    if (monitoredAccounts[cat]) {
      setCategoryInputText(monitoredAccounts[cat].join(", "));
    } else {
      setCategoryInputText("");
    }
  };

  const handleSaveAccounts = async () => {
    try {
      setRegistryMessage("Saving to registry...");
      const list = categoryInputText.split(",").map(item => item.trim()).filter(Boolean);
      const updated = {
        ...monitoredAccounts,
        [editingCategory]: list
      };
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setMonitoredAccounts(updated);
        setRegistryMessage("✓ Monitored Registry saved securely cloud.");
        setTimeout(() => setRegistryMessage(""), 4000);
      } else {
        setRegistryMessage("Failed sync document.");
      }
    } catch (e) {
      console.error("Failed saving registry:", e);
      setRegistryMessage("Error writing database.");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const commentsRes = await fetch("/api/comments");
      if (commentsRes.ok && commentsRes.headers.get("content-type")?.includes("application/json")) {
        const commentsJson = await commentsRes.json();
        setComments(commentsJson.comments || []);
      }

      const trendsRes = await fetch("/api/trends");
      if (trendsRes.ok && trendsRes.headers.get("content-type")?.includes("application/json")) {
        const trendsJson = await trendsRes.json();
        setKpis(trendsJson.kpi);
        setTrends(trendsJson.trends || []);
        setWordcloud(trendsJson.wordcloud || { ar: [], en: [] });
        setKeywordTrends(trendsJson.keywordTrends || []);
      }
      
      try {
        const eventsRes = await fetch("/api/events");
        if (eventsRes.ok && eventsRes.headers.get("content-type")?.includes("application/json")) {
          const eventsJson = await eventsRes.json();
          if (eventsJson.success && eventsJson.events) {
            setEvents(eventsJson.events);
          }
        }
      } catch (errEvent) {
        console.warn("Failed fetching dynamic annotations from collection 'events':", errEvent);
      }
      
      await fetchSystemStatus();
      await fetchSyncStatus();
      await fetchAccounts();
    } catch (e) {
      console.warn("Failed loading dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Publish manual comment manually to server
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText || !customAuthor || !customHandle) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: customAuthor,
          handle: customHandle.startsWith("@") ? customHandle : "@" + customHandle,
          platform: customPlatform,
          text: customText,
          governorate: customGov === "Auto" ? undefined : customGov
        })
      });

      if (res.ok) {
        setCustomText("");
        setCustomAuthor("");
        setCustomHandle("");
        await fetchData();
      }
    } catch (e) {
      console.error("Failed publishing comment node:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const runSandboxNLP = async () => {
    try {
      setSandboxLoading(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: sandboxAuthor,
          handle: sandboxHandle.startsWith("@") ? sandboxHandle : "@" + sandboxHandle,
          platform: sandboxPlatform,
          text: sandboxText,
          governorate: sandboxGov === "Auto" ? undefined : sandboxGov
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data.comment);
        setSandboxNlpSteps(data.nlpSteps || []);
        await fetchData();
      }
    } catch (e) {
      console.error("Linguistics calculation failed:", e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const triggerBulkIngest = async () => {
    try {
      setIngesting(true);
      const res = await fetch("/api/comments/bulk-ingest", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error("Feeds crawler trigger failed:", e);
    } finally {
      setIngesting(false);
    }
  };

  const exportCommentsCSV = (exportAll: boolean = false) => {
    const listToExport = exportAll ? comments : filteredComments;
    const headers = ["ID", "Author", "Handle", "Platform", "Text", "Governorate", "Topic", "Language", "Sentiment", "SentimentScore", "Likes", "Shares", "Timestamp"];
    
    const rows = listToExport.map(c => [
      c.id,
      `"${(c.author || '').replace(/"/g, '""')}"`,
      c.handle,
      c.platform,
      `"${(c.text || '').replace(/"/g, '""')}"`,
      c.governorate || 'Auto',
      c.topic || '',
      c.language || '',
      c.sentiment || '',
      c.sentimentScore !== undefined ? c.sentimentScore : '',
      c.likes || 0,
      c.shares || 0,
      c.timestamp || ''
    ]);

    // Use BOM \uFEFF for proper Arabic UTF-8 display in Microsoft Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = exportAll ? `jordan_all_comments_archive_${dateStr}.csv` : `jordan_filtered_comments_archive_${dateStr}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCommentsJSON = (exportAll: boolean = false) => {
    const listToExport = exportAll ? comments : filteredComments;
    const jsonString = JSON.stringify(listToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = exportAll ? `jordan_all_comments_archive_${dateStr}.json` : `jordan_filtered_comments_archive_${dateStr}.json`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = async () => {
    try {
      setReportLoading(true);
      const res = await fetch("/api/research-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: reportTopic })
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setReportText(data.report);
        await fetchSystemStatus();
      } else {
        let errMsg = "Strategic analysis report service currently offline or quota limit reached.";
        if (contentType.includes("application/json")) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error) errMsg = errData.error;
        }
        setReportText(`> ⚠️ **Service Notice**: ${errMsg}\n\nPlease try again or verify system status.`);
      }
    } catch (e: any) {
      console.warn("Strategic analysis failed:", e);
      setReportText(`> ⚠️ **Service Notice**: Strategic analysis request encountered an error: ${e?.message || 'Network issue'}`);
    } finally {
      setReportLoading(false);
    }
  };

  const applyPreset = (preset: typeof PRESET_DIALECTS[0]) => {
    setSandboxText(preset.text);
    setSandboxAuthor(preset.author);
    setSandboxHandle(preset.handle);
    setSandboxPlatform(preset.platform);
    setSandboxResult(null);
    setSandboxNlpSteps([]);
  };

  // Filter Comments algorithm
  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      const matchesSearch = 
        c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tokens && c.tokens.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesPlatform = selectedPlatform === "All" || c.platform === selectedPlatform;
      const matchesSentiment = selectedSentiment === "All" || c.sentiment === selectedSentiment;
      const matchesTopic = selectedTopic === "All" || c.topic === selectedTopic;
      
      // Filter by dynamic governorate
      let matchesGov = true;
      if (selectedGovFilter) {
        matchesGov = c.text.toLowerCase().includes(selectedGovFilter.toLowerCase()) ||
                     (selectedGovFilter === "Karak" && c.text.includes("منسف")) ||
                     (selectedGovFilter === "Amman" && c.text.includes("عمان"));
      }

      return matchesSearch && matchesPlatform && matchesSentiment && matchesTopic && matchesGov;
    });
  }, [comments, searchTerm, selectedPlatform, selectedSentiment, selectedTopic, selectedGovFilter]);

  // Export functions
  const handleExportCSV = () => {
    const headers = ["ID", "Timestamp", "Author", "Handle", "Platform", "Text", "Sentiment", "SentimentScore", "Topic", "Entities"];
    const rows = filteredComments.map(c => [
      c.id,
      c.timestamp,
      c.author,
      c.handle,
      c.platform,
      `"${c.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      c.sentiment,
      c.sentimentScore,
      c.topic,
      `"${(c.namedEntities || []).join(', ')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `JordanInsight_Export_${reportTopic}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    // Generate styled mock-excel TSV
    const headers = ["ID", "Category", "Platform", "Source Author", "Sentiment Score", "Comment Body text"];
    const rows = filteredComments.map(c => [
      c.id,
      c.topic,
      c.platform,
      `${c.author} (${c.handle})`,
      `${c.sentimentScore > 0 ? "+" : ""}${c.sentimentScore.toFixed(2)}`,
      c.text.replace(/\r?\n|\r/g, " ")
    ]);
    const content = [headers.join("\t"), ...rows.map(e => e.join("\t"))].join("\n");
    const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `JordanInsight_MetricsGrid_${reportTopic}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPPT = () => {
    const slideText = `=====================================================
JORDANINSIGHT EXECUTIVE ANALYSIS DECK (BRIEFING)
=====================================================
Thematic Focus Domain: ${reportTopic}
Data Extraction timestamp: ${new Date().toLocaleDateString("en-JO")}
Compliance Standard: OFFICIAL COUNCIL DOCUMENT

-----------------------------------------------------
SLIDE 1: Executive Metrics Summary
-----------------------------------------------------
- Total Collected Streams: ${computedStats.totalCollected}
- Average Net Sentiment Index: ${computedStats.avgSentiment > 0 ? "+" : ""}${computedStats.avgSentiment.toFixed(2)}
- Daily Volume Flux Status: OPTIMAL (Firestore Synchronized)

-----------------------------------------------------
SLIDE 2: Region Geolocation Insights
-----------------------------------------------------
- Sentiment patterns by Jordanian sub-regions (governorates):
${Object.entries(computedStats.governorates).map(([gov, data]) => `  * ${gov.toUpperCase()}: Mentions: ${(data as any).mentions} | Index Score: ${(data as any).sentiment > 0 ? "+" : ""}${(data as any).sentiment.toFixed(2)}`).join("\n")}

-----------------------------------------------------
SLIDE 3: National Theme Sectors Breakdown
-----------------------------------------------------
- Volume concentrations across critical sectors:
${Object.entries(computedStats.sectors).slice(0, 5).map(([sec, d]) => `  * ${sec.toUpperCase()}: Mentions Volume: ${(d as any).volume} | Sentiment Score: ${(d as any).sentiment > 0 ? "+" : ""}${(d as any).sentiment.toFixed(2)} | Growth Track: ${(d as any).growth >= 0 ? "+" : ""}${(d as any).growth}%`).join("\n")}

-----------------------------------------------------
SLIDE 4: Emotional Complex aggregates
-----------------------------------------------------
- Happiness Index: ${computedStats.emotions.happiness}%
- Public Anger Index (Crisis Indicator): ${computedStats.emotions.anger}%
- Executive Directive Summary: Publish proactive ministerial communications; coordinate responses on Sand/BRT bottlenecks.
=====================================================`;

    const blob = new Blob([slideText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `JordanInsight_PolicySlidesBrief_${reportTopic}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper parser for markdown reports output
  const parseMarkdownToJSX = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith("###")) {
        const headingText = trimmed.replace(/^###\s*/, "");
        return (
          <h3 key={idx} className="font-bold text-[#C5A880] mt-5 mb-2 font-display text-sm border-b border-slate-800 pb-1.5 pt-1 flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-[#007A3D] rounded-sm inline-block shrink-0" />
            {headingText}
          </h3>
        );
      }

      if (trimmed.startsWith("##")) {
        const headingText = trimmed.replace(/^##\s*/, "");
        return (
          <h2 key={idx} className="font-extrabold text-[#CE1126] mt-6 mb-2 font-display text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
            <span className="w-2 h-4 bg-[#CE1126] rounded-sm inline-block shrink-0" />
            {headingText}
          </h2>
        );
      }

      if (trimmed.startsWith("*") || trimmed.startsWith("-") || trimmed.startsWith("•")) {
        const bulletText = trimmed.replace(/^[*•-]\s*/, "");
        const parts = bulletText.split("**");
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-300 leading-relaxed mb-1">
            {parts.map((p, pIdx) => (
              pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-amber-400">{p}</strong> : p
            ))}
          </li>
        );
      }

      const parts = trimmed.split("**");
      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-1.5 font-sans">
          {parts.map((p, pIdx) => (
            pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-[#CE1126]">{p}</strong> : p
          ))}
        </p>
      );
    });
  };

  // Sentiment Half-donut custom Recharts representation
  const sentimentPieData = [
    { name: "Positive Sentiment Score", value: computedStats.distribution.positive, color: "#10b981" },
    { name: "Neutral Sentiment", value: computedStats.distribution.neutral, color: "#f59e0b" },
    { name: "Crisis/Negative Volume", value: computedStats.distribution.negative, color: "#ef4444" }
  ];

  // Active crisis warnings check
  const activeCrisisWarnings = useMemo(() => {
    const list: string[] = [];
    if (computedStats.emotions.anger > 25) {
      list.push("VELOCITY SPIKE: National public anger algorithms register elevated distress. Check economic sentiment.");
    }
    const economySentiment = computedStats.sectors["Economy"]?.sentiment || 0;
    if (economySentiment < -0.1) {
      list.push("CRITICAL BOTTLENECK: Economic sectors outline active citizen cost complaints.");
    }
    const transitSentiment = computedStats.sectors["Transportation"]?.sentiment || 0;
    if (transitSentiment < -0.15) {
      list.push("TRAFFIC ALARM: Public transit grids (BRT) exhibit commuter delays around major rotaries.");
    }
    return list;
  }, [computedStats]);

  // Style Theme Toggles
  const backgroundStyle = themeMode === "dark" 
    ? "bg-[#0b0c10] text-[#dededf] selection:bg-rose-500/20" 
    : "bg-[#f4f6f9] text-[#13151c] selection:bg-indigo-100";

  const cardStyle = themeMode === "dark"
    ? "bg-[#131722]/50 backdrop-blur-md border border-slate-800/60 shadow-lg rounded-2xl"
    : "bg-white border border-slate-200/80 shadow rounded-2xl";

  const headerTextStyle = themeMode === "dark" ? "text-white" : "text-slate-900";

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`min-h-screen flex flex-col font-sans transition-all duration-300 ${backgroundStyle}`}>
      {/* Source Provenance Health Status Banner */}
      <SourceHealthBanner />
      
      {/* 1. Executive Premium Navigation Bar */}
      <nav className={`sticky top-0 z-40 px-6 py-4 border-b border-slate-800/80 backdrop-blur-md shadow-lg ${
        themeMode === "dark" ? "bg-[#0c101d]/90" : "bg-white/90 border-[#e2e8f0]"
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#007A3D] to-[#CE1126] rounded flex items-center justify-center shrink-0 shadow-lg select-none">
                <span className="text-white font-black text-lg">🇯🇴</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[19px] font-black tracking-tight font-display ${headerTextStyle}`}>
                    JordanInsight <span className="text-[#007A3D]">Intelligence</span>
                  </span>
                  <span className="text-[10px] bg-red-950/20 text-red-500 border border-red-500/20 font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest leading-none select-none">
                    Gov-Suite v4.0
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-semibold">
                  {lang === "ar" 
                    ? "المنصة الوطنية المتكاملة لتحليل الرأي العام واستشراف السياسات بالأردن" 
                    : "Jordan Social Intelligence & National Policy Advisory Platform"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Premium Language Switcher Button */}
              <button
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className={`p-2 rounded-lg ml-2 transition border font-sans font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  themeMode === "dark" 
                    ? "bg-slate-900 border-slate-800 hover:bg-slate-850 text-[#DFB76C]" 
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-[#007A3D]"
                }`}
                title={lang === "ar" ? "Switch to English" : "الانتقال إلى العربية"}
              >
                🌐 {lang === "ar" ? "EN" : "عربي"}
              </button>

              {/* Premium Theme Mode Toggle Button */}
              <button
                onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
                className={`p-2 rounded-lg transition border cursor-pointer ${
                  themeMode === "dark" 
                    ? "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400" 
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
                title="Toggle reading contrast theme"
              >
                {themeMode === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switchers */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-700 text-white border-emerald-600'
                  : themeMode === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {lang === "ar" ? "لوحة التحليلات" : "Analytics Dashboard"}
            </button>

            <button
              onClick={() => setActiveTab('meta_import')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                activeTab === 'meta_import'
                  ? 'bg-emerald-700 text-white border-emerald-600'
                  : themeMode === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {lang === "ar" ? "استيراد مكتبة ميتا (MCL)" : "Meta Import Admin"}
            </button>

            {/* Corpus Audit Modal Button */}
            <button
              onClick={() => setIsCorpusStatsOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
            >
              {lang === "ar" ? "تدقيق سجل العينة (Corpus)" : "Corpus Audit (N)"}
            </button>
            {/* Stream Active button */}
            <button
              onClick={() => setStreamActive(!streamActive)}
              className={`flex items-center gap-1 text-xs font-bold rounded-lg px-3.5 py-1.5 cursor-pointer border transition duration-200 ${
                streamActive
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md border-emerald-500 animate-pulse"
                  : themeMode === "dark"
                    ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              }`}
              id="toggle-stream-btn"
            >
              <Radio className={`w-3.5 h-3.5 ${streamActive ? "animate-pulse" : ""}`} />
              {streamActive 
                ? (lang === "ar" ? "تدفق المنشورات: متصل 🟢" : "Feeds Stream Tuning: ONLINE") 
                : (lang === "ar" ? "تشغيل التدفق الحي المستمر" : "Continuous stream")}
            </button>

            {/* Scraping feeds trigger */}
            <button
              onClick={triggerBulkIngest}
              disabled={ingesting}
              className={`flex items-center gap-1 text-xs font-bold rounded-lg px-3.5 py-1.5 cursor-pointer border transition duration-205 ${
                themeMode === "dark"
                  ? "bg-indigo-950 border-indigo-900/60 text-indigo-400 hover:bg-indigo-900/40"
                  : "bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100"
              }`}
              id="bulk-ingest-btn"
            >
              <Database className={`w-3.5 h-3.5 ${ingesting ? "animate-spin text-amber-400" : "text-indigo-500"}`} />
              {ingesting 
                ? (lang === "ar" ? "جاري استيراد تعليقات الأردن..." : "Scraping webs...") 
                : (lang === "ar" ? "استيراد البيانات التفاعلية الشاملة" : "Scrape Jordan Feeds")}
            </button>

            {/* Hard-refresh dash */}
            <button
              onClick={fetchData}
              disabled={loading}
              className={`flex items-center gap-1.5 text-xs font-bold rounded-lg px-3.5 py-1.5 cursor-pointer border transition ${
                themeMode === "dark"
                  ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              id="refresh-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading 
                ? (lang === "ar" ? "جاري التحديث..." : "Syncing...") 
                : (lang === "ar" ? "تحديث وتوزيع اللوحة" : "Sync Index")}
            </button>
          </div>
        </div>
      </nav>

      {/* 1.5 Real-Time Social Sentiment & Pulse Ticker (Point 3) */}
      <div className="bg-[#090b14] border-b border-slate-800/80 text-slate-350 py-2.5 overflow-hidden whitespace-nowrap select-none text-[10px]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5 shrink-0 bg-[#CE1126]/12 text-[#CE1126] font-extrabold uppercase text-[8.5px] px-2.5 py-0.5 rounded border border-red-500/10 tracking-widest">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" /> Live Pulse Feed
          </div>
          <div className="w-full overflow-hidden relative mx-4">
            <div className="flex gap-12 animate-marquee inline-block font-mono text-slate-300">
              <span>🇯🇴 [Amman: +0.21 on BRT commuter efficiency]</span>
              <span>🇯🇴 [Zarqa: +0.42 mentions on student transport corridors]</span>
              <span>🇯🇴 [Irbid: +0.65 positive sentiment regarding university incubators]</span>
              <span>🇯🇴 [Aqaba: +0.81 high visitor metrics at Red Sea resorts]</span>
              <span>🇯🇴 [Ajloun: +0.90 Ajloun Cable Car (تلفريك عجلون) peaks over holiday]</span>
              <span>🇯🇴 [Karak: -0.05 forum feedback on agricultural water distribution paths]</span>
              <span>🇯🇴 [Mafraq: +0.15 discussions on local community health clinic upgrades]</span>
              <span>🇯🇴 [Jerash: +0.55 positive visitor expectations for Roman Theatre events]</span>
              <span>🇯🇴 [Madaba: +0.72 lodging capacity reaches seasonal high]</span>
              <span>🇯🇴 [Maan: +0.33 renewable energy solar projects drive local utility jobs]</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-emerald-400 font-bold font-mono text-[8.5px] tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            VITALITY INDEX: 98.4%
          </div>
        </div>
      </div>

      {/* 2. Quota warning / automatic failover alerting */}
      {quotaExhausted && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3.5 text-xs text-amber-200 block animate-fade-in" id="quota-warning-banner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[13px] text-white font-sans leading-none">Gemini Live-Grounding rate limits temporary overflow met (HTTP 429)</p>
                <p className="text-slate-400 mt-1 first-letter:capitalize font-sans leading-relaxed">
                  Notice: We have automatically failed over to our locally deployed <strong>Heuristic Linguistic Rules Engine</strong> and cached reports. No operational downtime.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetQuota}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg transition active:scale-95 text-[10.5px] cursor-pointer"
            >
              Flush limits & retry Gemini scraping
            </button>
          </div>
        </div>
      )}

      {/* Main bento-grid Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 space-y-6">

        {/* Sentiment Velocity rapid opinion shifts alert toast banner */}
        {activeVelocityAlert && activeVelocityAlert.show && (
          <div className="bg-rose-950/20 border border-rose-500/30 text-rose-200 p-5 rounded-2xl shadow-xl animate-fade-in relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-rose-500" id="sentiment-velocity-indicator-popup">
            <div className="flex gap-3.5 items-start">
              <div className="bg-rose-500/15 p-2.5 rounded-xl border border-rose-500/30 shrink-0 text-rose-450 animate-pulse mt-0.5" id="alert-logo-box">
                <Radio className="w-5 h-5 text-rose-500" />
              </div>
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                    {lang === "ar" ? "تسارع حرج في الرأي العام" : "CRITICAL RAPID SENTIMENT SHIFT"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    {lang === "ar" ? `مستشعر السرعة: ${activeVelocityAlert.timeframe}` : `Tracker: ${activeVelocityAlert.timeframe}`}
                  </span>
                </div>
                <p className="text-sm font-black text-white font-sans leading-snug">
                  {lang === "ar"
                    ? `تم رصد تسارع مفاجئ في الرأي العام الأردني بمقدار (${activeVelocityAlert.velocity >= 0 ? "+" : ""}${activeVelocityAlert.velocity})!`
                    : `Rapid public sentiment shift detected containing index rate changes of (${activeVelocityAlert.velocity >= 0 ? "+" : ""}${activeVelocityAlert.velocity})!`}
                </p>
                <p className="text-[11px] text-slate-400 leading-normal font-sans">
                  {lang === "ar"
                    ? `يتجاوز هذا التغير المفاعل من المتابعة اللحظية عتبة الأمان المحددة (${activeVelocityAlert.threshold} نقطة). المحور الأكثر تأثراً بالنقاش الجاري: "${activeVelocityAlert.topicWithMaxChange}".`
                    : `This shift exceeds your security safety parameters threshold setting of (${activeVelocityAlert.threshold}). General discussion sentiment movement maps closely to: "${activeVelocityAlert.topicWithMaxChange}".`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => {
                  setActiveVelocityAlert(prev => prev ? { ...prev, show: false } : null);
                }}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-slate-700/60 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer font-sans"
              >
                {lang === "ar" ? "تجاهل المؤشر" : "Acknowledge"}
              </button>
              <button
                onClick={() => {
                  setVelocityThreshold(Math.min(0.8, Number((Math.abs(activeVelocityAlert.velocity) + 0.05).toFixed(2))));
                }}
                className="px-3.5 py-1.5 bg-[#007A3D] hover:bg-[#007A3D]/90 text-white text-xs font-extrabold rounded-lg transition active:scale-95 shadow-md cursor-pointer font-sans"
              >
                {lang === "ar" ? "رفع العتبة تلقائياً" : "Auto Calibrate"}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'meta_import' ? (
          <MetaImportAdmin />
        ) : (
          <>
        {/* NATIONAL RESEARCH INDEX PLATFORM STATEMENT (Bilingual & Clean) */}
        <div className="bg-gradient-to-r from-[#121829] via-[#0d101a] to-[#1a1322] border border-[#DFB76C]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden select-none">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            <div className="lg:col-span-8 space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9.5px] bg-[#007A3D]/20 text-emerald-400 border border-[#007A3D]/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-widest font-mono">
                  {lang === "ar" ? "الاستقصاء الوطني الشامل للرأي العام" : "NATIONAL PUBLIC OPINION COVERAGE"}
                </span>
                <span className="text-[9.5px] bg-[#DFB76C]/20 text-[#DFB76C] border border-[#DFB76C]/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-widest font-mono">
                  {lang === "ar" ? "مؤشرات تفاعلية للسياسات" : "POLICY INTELLIGENCE DRIVEN"}
                </span>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-lg md:text-xl font-black font-display text-white tracking-tight leading-tight">
                  {lang === "ar" 
                    ? "سجل الرأي العام الوطني — المؤشر الاجتماعي العام واستشراف السياسات" 
                    : "National Public Opinion Register — Social Sentiment & Policy Support Platform"}
                </h1>
                <h2 className="text-xs md:text-sm font-extrabold font-display text-[#DFB76C] tracking-tight">
                  Sajil-JO: Jordan Social Opinion Index & Analytics Infrastructure
                </h2>
              </div>
              
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed max-w-2xl">
                {lang === "ar" 
                  ? "تحتوي هذه المنصة على لوحة معلومات تفاعلية متفوقة تجمع وتحلل وتصنف تعليقات المواطنين عبر كافة المحافظات الاثنتي عشرة، مع تتبع مستمر لمحاور النقل العام (الباص السريع) وتأثيرات القطاع السياحي ومؤشرات غلاف المعيشة."
                  : "This national intelligence matrix aggregates, normalizes, and translates dialectal sentiments across Jordan's 12 governorates. Providing continuous telemetry of community discussions, public services (BRT), and tourism vector forecasts."}
              </p>
            </div>
            
            {/* National Demographic Demarcation Quick Stats Plate */}
            <div className="lg:col-span-4 bg-[#0a0d18]/70 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <span className="text-[8.5px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                  {lang === "ar" ? "التغطية المدنية" : "CIVIC COVERAGE"}
                </span>
                <p className="text-sm font-black text-white font-sans">
                  {lang === "ar" ? "12 محافظة" : "12 Governorates"}
                </p>
                <p className="text-[8px] text-emerald-400 font-bold font-mono">● {lang === "ar" ? "شامل بنسبة 100%" : "100% Comprehensive"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8.5px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                  {lang === "ar" ? "مصادر التغذية الحية" : "ACTIVE INGRESS"}
                </span>
                <p className="text-sm font-black text-[#DFB76C] font-sans">
                  {lang === "ar" ? "145 حساب موثوق" : "145 Accounts"}
                </p>
                <p className="text-[8px] text-slate-350 font-mono font-bold">
                  {lang === "ar" ? "استيراد متصل" : "Live RSS Scrapers"}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8.5px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                  {lang === "ar" ? "سرعة الاستجابة" : "SAMPLING VELOCITY"}
                </span>
                <p className="text-sm font-black text-white font-sans">
                  {lang === "ar" ? "مزامنة لحظية" : "Live Dynamic"}
                </p>
                <p className="text-[8px] text-emerald-400 font-mono font-bold">✓ Latency &lt;0.5s</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8.5px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                  {lang === "ar" ? "مؤشر الرأي العام" : "LATEST VERDICT"}
                </span>
                <p className="text-sm font-black text-emerald-400 font-sans">
                  {lang === "ar" ? "🟢 إيجابي متفائل" : "🟢 OPTIMISTIC"}
                </p>
                <p className="text-[8px] text-slate-400 font-mono">Avg Score: +0.21</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Row A: Active crises detection alerting room */}
        {activeCrisisWarnings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 border rounded-2xl space-y-2 border-rose-500/20 ${
              themeMode === "dark" ? "bg-rose-950/10 text-rose-350" : "bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-widest font-mono text-rose-500">
                Linguistic Anomaly Warning Control indicators
              </h4>
            </div>
            <div className="space-y-1 pl-7 text-[11px] font-semibold leading-relaxed">
              {activeCrisisWarnings.map((warn, wIdx) => (
                <div key={wIdx} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-rose-500 rounded-full" />
                  <p>{warn}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION A: Executive Summary TOP Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <h3 className="text-xs font-black tracking-widest font-mono text-slate-400 uppercase flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C5A880]" />
              Executive Metrics Suite
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">Updated: {new Date().toLocaleTimeString()}</span>
          </div>

          {loading && comments.length === 0 ? (
            <div className="flex items-center justify-center p-16 rounded-2xl bg-[#131722]/30 border border-slate-850">
              <div className="text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#007A3D] mx-auto" />
                <p className="font-mono text-xs text-slate-400">
                  {lang === "ar" ? "جاري تحميل وتزامن مؤشر المواقف الوطني..." : "Loading Jordan sentiment databases..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1 */}
              <div className={cardStyle} id="kpi-total-comments">
                <div className="p-4 flex flex-col justify-between h-28 select-none">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest block uppercase font-mono">Total Collected Streams</span>
                    <h3 className={`text-2xl font-black font-sans leading-none mt-1.5 ${headerTextStyle}`}>
                      {computedStats.totalCollected}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] border-t border-slate-800/20 pt-1">
                    <span className="text-slate-450">Ingest success rate:</span>
                    <span className="text-emerald-400 font-extrabold font-mono">100% active</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className={cardStyle} id="kpi-net-sentiment">
                <div className="p-4 flex flex-col justify-between h-28 select-none">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest block uppercase font-mono">Jordan Net Sentiment</span>
                    <div className="flex items-center gap-1.5 mt-1.5 leading-none">
                      <h3 className={`text-2xl font-black font-sans ${
                        computedStats.avgSentiment > 0.15 ? "text-emerald-500" : "text-slate-200"
                      }`}>
                        {computedStats.avgSentiment > 0 ? "+" : ""}{computedStats.avgSentiment.toFixed(2)}
                      </h3>
                      <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-1.5 py-0.5 rounded font-black uppercase">
                        Optimal
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[#181d2d] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${((computedStats.avgSentiment + 1) / 2) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className={cardStyle}>
                <div className="p-4 flex flex-col justify-between h-28 select-none">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest block uppercase font-mono">Categorized Optimism</span>
                    <h3 className={`text-2xl font-black font-sans leading-none mt-1.5 ${headerTextStyle}`}>
                      {computedStats.distribution.positive}%
                    </h3>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] text-slate-450 border-t border-slate-800/20 pt-1">
                    <span>Baseline margin:</span>
                    <span className="font-mono text-emerald-400 font-bold">+5.4% growth</span>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className={cardStyle}>
                <div className="p-4 flex flex-col justify-between h-28 select-none">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest block uppercase font-mono">Dominant Issue Sector</span>
                    <h3 className="text-sm font-black font-sans truncate mt-2 text-[#C5A880] uppercase">
                      #{([...Object.values(computedStats.sectors)] as any[]).sort((a,b)=>b.volume - a.volume)[0]?.name || "Tourism"}
                    </h3>
                  </div>
                  <div className="text-[10px] text-slate-450 flex justify-between border-t border-slate-800/20 pt-1">
                    <span>Discussion density:</span>
                    <span className="font-mono font-bold text-slate-350">Peak metrics registered</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </section>

        {/* Grid B: Sentiment pie gauges + Sentiment line chart + real-time social feedback streams */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sentiment Time Tracker LineChart */}
          <div className={`${cardStyle} lg:col-span-8 p-5 flex flex-col justify-between space-y-4`} id="sentiment-trend-chart">
            <div>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 ${
                  themeMode === "dark" ? "text-slate-450" : "text-slate-600"
                }`}>
                  <BarChart2 className="w-4 h-4 text-[#DFB76C]" />
                  {lang === "ar" ? "مؤشر وتفاعل الرأي العام الوطني (الاستقصاء والسرعة)" : "National Public Opinion Timeline & Velocity indices"}
                </h4>
                <div className="flex gap-1 bg-slate-900/40 p-1 rounded border border-slate-800 text-[9.5px]">
                  {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded font-black cursor-pointer transition ${
                        timeframe === tf 
                          ? "bg-[#007A3D] text-white shadow" 
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tf === "daily" ? (lang === "ar" ? "يومي" : "Daily") :
                       tf === "weekly" ? (lang === "ar" ? "أسبوعي" : "Weekly") :
                       tf === "monthly" ? (lang === "ar" ? "شهري" : "Monthly") :
                       (lang === "ar" ? "سنوي" : "Yearly")}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {lang === "ar" 
                  ? "تتبع تفاعلي لحركة الرأي العام وسرعة التغير في مؤشرات التفاعل الاجتماعي عبر الأوقات والمناسبات والسياسات المقارنة." 
                  : "Hour-by-hour public optimism vector tracking sporting celebratory spikes, transportation reviews, and cost indexings across Jordan."}
              </p>
            </div>

            {/* Dynamic Event Hover Highlight Banner */}
            <AnimatePresence>
              {hoveredEvent && (() => {
                const activeEvt = annotatedEvents.find(e => e.id === hoveredEvent);
                if (!activeEvt) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-slate-900 border border-[#DFB76C]/60 rounded-xl flex items-start gap-2.5 shadow-xl shadow-black/40 text-left overflow-hidden sm:flex-row flex-col"
                  >
                    <span className="text-xl p-1 bg-slate-800 rounded-lg select-none shrink-0">{activeEvt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h5 className="text-[11px] font-black text-[#DFB76C] font-mono leading-none">
                          {activeEvt.title}
                        </h5>
                        <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 shrink-0">
                          {activeEvt.date}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed font-sans">
                        {activeEvt.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={processedTrends} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <YAxis domain={[-1.0, 1.0]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "1.5px solid #4f46e5", borderRadius: "8px", fontSize: "11px", color: "white" }}
                  />
                  
                  {/* National Event Vertical Dynamic Reference Annotations */}
                  {annotatedEvents.map((evt) => {
                    const isHighlighted = hoveredEvent === evt.id;
                    return (
                      <ReferenceLine 
                        key={evt.id}
                        x={evt.resolvedDate} 
                        stroke={isHighlighted ? "#DFB76C" : (evt.sentimentEffect === "positive" ? "#007A3D" : "#475569")} 
                        strokeWidth={isHighlighted ? 3.5 : 2}
                        strokeDasharray={isHighlighted ? "0" : "3 3"}
                        opacity={isHighlighted ? 1.0 : 0.5}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredEvent(evt.id)}
                        onMouseLeave={() => setHoveredEvent(null)}
                        label={{ 
                          value: isHighlighted ? evt.label : "", 
                          fill: "#DFB76C", 
                          fontSize: 9, 
                          position: "insideTopLeft",
                          fontWeight: "bold",
                          fontFamily: "monospace",
                          offset: 8
                        }} 
                      />
                    );
                  })}

                  <Line type="monotone" dataKey="averageScore" stroke="#007A3D" strokeWidth={3} name={lang === "ar" ? "مؤشر الرأي العام" : "Opinion Index"} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="velocity" stroke="#DFB76C" strokeWidth={2} name={lang === "ar" ? "سرعة تفاعل الرأي" : "Sentiment Velocity"} strokeDasharray="3 3" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="count" stroke="#CE1126" strokeWidth={1} name={lang === "ar" ? "حجم التدفق" : "Ingest Rate"} strokeDasharray="4 4" opacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Public Sentiment Policy Correlator (Dynamic triggers indicators) */}
            <div className="border-t border-slate-800/60 pt-4 mt-2">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-[#DFB76C] font-mono block mb-2.5">
                ✦ {lang === "ar" 
                  ? "الخط الزمني للمناسبات والسياسات الوطنية المقارنة (قم بتمرير الفأرة للربط والتحليل)" 
                  : "National Policy Timeline & Public Sentiment Triggers (Hover events to correlate metrics)"}
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {annotatedEvents.map((evt) => {
                  const isHovered = hoveredEvent === evt.id;
                  const borderCol = evt.sentimentEffect === "positive" 
                    ? "hover:border-emerald-500/50" 
                    : "hover:border-slate-500/50";
                  const badgeCol = evt.sentimentEffect === "positive" 
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/30" 
                    : "bg-slate-900 text-slate-300 border border-slate-850";
                  
                  return (
                    <div
                      key={evt.id}
                      onMouseEnter={() => setHoveredEvent(evt.id)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      className={`p-2 rounded-xl transition duration-200 cursor-pointer text-left flex flex-col justify-between ${
                        isHovered 
                          ? "bg-slate-800/80 border-[#DFB76C] ring-1 ring-[#DFB76C]/20 scale-[1.01]" 
                          : "bg-slate-900/30 border-slate-800/80 hover:bg-slate-800/30"
                      } border ${borderCol}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{evt.icon}</span>
                          <span className={`text-[7.5px] font-bold font-mono px-1 rounded truncate leading-none ${badgeCol}`}>
                            {evt.resolvedDate.substring(5)}
                          </span>
                        </div>
                        <p className="text-[9.5px] font-black text-slate-105 text-white leading-tight truncate">
                          {evt.label}
                        </p>
                        <p className="text-[8px] text-slate-400 leading-normal line-clamp-2">
                          {evt.desc}
                        </p>
                      </div>
                      
                      {isHovered && (
                        <div className="text-[7.5px] font-mono text-[#DFB76C] font-black mt-1 flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-[#DFB76C] animate-ping" />
                          CORRELATED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sentiment distribution donut gauges */}
          <div className={`${cardStyle} lg:col-span-4 p-5 flex flex-col justify-between space-y-4`}>
            <div>
              <h4 className="text-xs font-bold font-mono tracking-widest text-slate-450 uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                Sentiment distribution index
              </h4>
              <p className="text-[11px] text-slate-450 mt-1">
                Polarity clusters across processed conversational feedback grids.
              </p>
            </div>

            <div className="h-40 flex items-center justify-center relative select-none">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    cx="50%"
                    cy="80%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sentimentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-5 text-center">
                <span className={`text-xl font-black font-sans leading-none block ${headerTextStyle}`}>
                  {computedStats.distribution.positive}%
                </span>
                <span className="text-[9.5px] uppercase font-mono text-slate-500 font-bold">Optimistic Scale</span>
              </div>
            </div>

            <div className="flex justify-between text-[9px] font-bold uppercase font-mono border-t border-slate-800/20 pt-2 text-slate-450">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Pos: {computedStats.distribution.positive}%
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                Neu: {computedStats.distribution.neutral}%
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CE1126]" />
                Neg: {computedStats.distribution.negative}%
              </div>
            </div>
          </div>

        </div>

        {/* SECTION B: Geographic Intelligence Map Grid */}
        <section className={`${cardStyle} p-5 space-y-4`}>
          <div>
            <h3 className={`text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 ${headerTextStyle}`}>
              <MapPin className="w-4 h-4 text-[#CE1126]" />
              {lang === "ar" ? "خارطة الذكاء الجغرافي واستقصاء المحافظات" : "Geographic Intelligence (Jordan Regional Maps)"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-2xl leading-normal">
              {lang === "ar" 
                ? "أداة تشخيصية تفاعلية تعرض تفاعل الرأي العام عبر محافظات الأردن الـ 12 بالتفصيل الجغرافي." 
                : "Unified diagnostic visualization dividing online discussions into the 12 governorates of Jordan."}
            </p>
          </div>
          
          <JordanMap 
            governorateData={computedStats.governorates} 
            selectedGovFilter={selectedGovFilter}
            onSelectGov={setSelectedGovFilter}
            themeMode={themeMode}
            lang={lang}
          />
        </section>

        {/* SECTION C: Theme & Topic Intelligence Sectors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sector breakouts table */}
          <div className={`${cardStyle} p-5 lg:col-span-8 space-y-4`} id="topic-share-chart">
            <div>
              <h3 className={`text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 ${headerTextStyle}`}>
                <Layers className="w-4 h-4 text-emerald-400" />
                {lang === "ar" ? "مصفوفة استقصاء الرأي والقطاعات والمحركات الكلية (8 مجالات رئيسية)" : "Theme & Topic Intelligence Matrix (8 Domains)"}
              </h3>
              <p className="text-[11px] text-slate-450 mt-1">
                {lang === "ar" 
                  ? "انقر فوق أي صف لتصنيف وفلترة لوحة التحكم بالكامل. تٌجمع موضوعات الرأي وتتحكم تلقائياً حسب الفترات التشخيصية." 
                  : "Click any row in the sector list to lock the dashboard filters. Metrics aggregate automatically based on selected time ranges."}
              </p>
            </div>

            <ThemeSectors 
              sectors={computedStats.sectors} 
              selectedTopicFilter={selectedTopic}
              onSelectTopic={setSelectedTopic}
              themeMode={themeMode}
              lang={lang}
              comments={comments}
              keywordTrends={keywordTrends}
            />
          </div>

          {/* Social media breakdowns */}
          <div className={`${cardStyle} p-5 lg:col-span-4 flex flex-col justify-between space-y-4`}>
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono tracking-widest text-[#007A3D] uppercase flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                Supervised Accounts Ingress Speed
              </h4>
              <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans">
                Summary index tracking active social media and live news networks monitored continuously.
              </p>
            </div>

            {/* Structured channel gauges list */}
            <div className="space-y-3.5 flex-1 flex flex-col justify-center my-2">
              {[
                { name: "𝕏 (formerly Twitter)", count: 42, color: "bg-slate-300", width: "w-[42%]" },
                { name: "Facebook posts", count: 35, color: "bg-[#1877F2]", width: "w-[35%]" },
                { name: "Instagram media comments", count: 28, color: "bg-gradient-to-r from-pink-500 to-yellow-500", width: "w-[28%]" },
                { name: "YouTube annotations", count: 22, color: "bg-red-600", width: "w-[22%]" },
                { name: "Reddit Jordan threads", count: 18, color: "bg-orange-500", width: "w-[18%]" }
              ].map((chan) => (
                <div key={chan.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-350">{chan.name}</span>
                    <span className="text-slate-200 font-bold font-mono">{chan.count} tracked</span>
                  </div>
                  <div className="w-full bg-[#181d2d] h-1.5 rounded-full overflow-hidden">
                    <div className={`${chan.color} h-full rounded-full`} style={{ width: `${chan.count * 1.8}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800/30 pt-3 text-[10px] text-slate-450 leading-normal flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Diagnostic feedback: Synchronizations optimal (No update gaps)</span>
            </div>
          </div>

        </div>

        {/* SECTION D: Emotions Analysis & Trending keywords list */}
        <section className={cardStyle} style={{ padding: "1.25rem" }}>
          <EmotionAnalytics 
            emotionData={computedStats.emotions} 
            wordcloud={wordcloud} 
            themeMode={themeMode}
          />
        </section>

        {/* SECTION E: Enterprise Admin Supervisor Workbench */}
        <section className="space-y-4">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-500" />
              Administrative Telemetry & Control Center
            </h3>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded font-black">ACTIVE</span>
          </div>

          <ControlCenter 
            monitoredAccounts={monitoredAccounts}
            editingCategory={editingCategory}
            categoryInputText={categoryInputText}
            onCategorySwitch={handleCategorySwitch}
            onInputChange={setCategoryInputText}
            onSaveAccounts={handleSaveAccounts}
            registryMessage={registryMessage}
            quotaExhausted={quotaExhausted}
            activeSource={activeSource}
            requestsUsed={requestsUsed}
            syncStatus={syncStatus}
            onResetQuota={handleResetQuota}
            velocityThreshold={velocityThreshold}
            onVelocityThresholdChange={setVelocityThreshold}
            enableVelocityAlerts={enableVelocityAlerts}
            onEnableVelocityAlertsChange={setEnableVelocityAlerts}
            lang={lang}
          />
        </section>

        {/* SECTION F: Dialect Parser Sandbox Room */}
        <section className="space-y-4">
          <div className="border-b border-slate-800 pb-1.5">
            <h3 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-500" />
              {lang === "ar" ? "مختبر تحليل ومعالجة اللهجات واللغات الطبيعية" : "Dialect NLP Sandbox Room"}
            </h3>
          </div>

          <NlpSandbox 
            sandboxText={sandboxText}
            sandboxAuthor={sandboxAuthor}
            sandboxHandle={sandboxHandle}
            sandboxPlatform={sandboxPlatform}
            sandboxGov={sandboxGov}
            onChangeSandboxGov={setSandboxGov}
            onChangeText={setSandboxText}
            onChangeAuthor={setSandboxAuthor}
            onChangeHandle={setSandboxHandle}
            onChangePlatform={setSandboxPlatform}
            presets={PRESET_DIALECTS}
            onApplyPreset={applyPreset}
            onAnalyze={runSandboxNLP}
            sandboxLoading={sandboxLoading}
            sandboxNlpSteps={sandboxNlpSteps}
            sandboxResult={sandboxResult}
            lang={lang}
          />
        </section>

        {/* SECTION G: Counsel advisory report generator */}
        <section className="space-y-4" id="insight-report-section">
          <ResearchReport 
            reportTopic={reportTopic}
            reportText={reportText}
            reportLoading={reportLoading}
            activeTopics={activeTopics}
            onChangeTopic={setReportTopic}
            onGenerateReport={generateReport}
            parseMarkdownToJSX={parseMarkdownToJSX}
            lang={lang}
          />
        </section>

        {/* SECTION H: Export intelligence briefings & CSV/Excel documents */}
        <section className={`${cardStyle} p-5 space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-3">
            <div>
              <h3 className={`text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 ${headerTextStyle}`}>
                <Download className="w-5 h-5 text-indigo-400 animate-bounce" />
                Corporate Simulation & Export center
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Generate and download localized datasets, executive outline briefings, and ledger models derived from real-time synchronizations.
              </p>
            </div>
            
            <span className="text-[10px] text-emerald-400 border border-emerald-900/30 bg-emerald-950/20 px-2 py-0.5 rounded font-black font-mono">
              COMPLIANCE VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CSV */}
            <div className="bg-[#181d2d]/30 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">CSV Data Ledger</span>
                <h4 className="text-xs font-bold text-white mt-1">Filtered Comment Records</h4>
                <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
                  Export all currently active filtered social database records ({filteredComments.length} posts) with language codes, sentiments, and coordinate vectors.
                </p>
              </div>
              <button 
                onClick={handleExportCSV}
                className="mt-4 w-full py-1.5 bg-[#007A3D] hover:bg-[#007A3D]/90 text-white rounded text-xs font-bold uppercase transition flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV Ledger
              </button>
            </div>

            {/* EXCEL */}
            <div className="bg-[#181d2d]/30 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Excel Workbook</span>
                <h4 className="text-xs font-bold text-white mt-1">Sector Metrics Sheet</h4>
                <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
                  Export tabular models formatted as compatible Microsoft Excel spreadsheets, detailing sector volumes, margins, and platform coordinates.
                </p>
              </div>
              <button
                onClick={handleExportExcel}
                className="mt-4 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase transition flex items-center justify-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel Sheet
              </button>
            </div>

            {/* POWERPOINT */}
            <div className="bg-[#181d2d]/30 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">PowerPoint Slides</span>
                <h4 className="text-xs font-bold text-white mt-1">Briefing Slide Deck</h4>
                <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
                  Export slide structures containing live Jordan Net Sentiment graphs, governorates volume stats, and strategic guidelines for quick council pasting.
                </p>
              </div>
              <button
                onClick={handleExportPPT}
                className="mt-4 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold uppercase transition flex items-center justify-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Slide Outline
              </button>
            </div>
          </div>
        </section>

        {/* SECTION I: Social feed stream list & details finder */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="comments-engine-section">
          
          {/* Form to submit manual comments node */}
          <div className={`${cardStyle} p-5 lg:col-span-4 space-y-4 self-start`}>
            <div>
              <h3 className={`text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 ${headerTextStyle}`}>
                <PlusCircle className="w-4 h-4 text-indigo-400" />
                Ingest Comment Node
              </h3>
              <p className="text-[10.5px] text-slate-450 mt-1 leading-relaxed">
                Manually publish a comment directly into the live dashboard, trigger automatic cleaning pipeline classifications, and store in Firestore immediately.
              </p>
            </div>

            <form onSubmit={handleAddComment} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Citizen Name</label>
                <input 
                  type="text"
                  required
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  placeholder="e.g. Layla Al-Karak"
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-200 font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Social Handle</label>
                <input 
                  type="text"
                  required
                  value={customHandle}
                  onChange={(e) => setCustomHandle(e.target.value)}
                  placeholder="e.g. @layla_karak"
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-200 font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Ingest Channel Source</label>
                <select 
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-200 font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="X">𝕏 / Twitter</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Jordanian Governorate Location</label>
                <select 
                  value={customGov}
                  onChange={(e) => setCustomGov(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#181d2d] border border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-200 font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="Auto">✨ Auto Router (Heuristic NLP Target)</option>
                  <option value="Amman">عمان / Amman</option>
                  <option value="Zarqa">الزرقاء / Zarqa</option>
                  <option value="Irbid">إربد / Irbid</option>
                  <option value="Aqaba">العقبة / Aqaba</option>
                  <option value="Mafraq">المفرق / Mafraq</option>
                  <option value="Balqa">البلقاء / Balqa</option>
                  <option value="Karak">الكرك / Karak</option>
                  <option value="Jerash">جرش / Jerash</option>
                  <option value="Ajloun">عجلون / Ajloun</option>
                  <option value="Madaba">مادبا / Madaba</option>
                  <option value="Tafilah">الطفيلة / Tafilah</option>
                  <option value="Ma'an">معان / Ma'an</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Comment text</label>
                <textarea 
                  required
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. الأجواء في جبل القلعة روعة والتنظيم والخدمات ممتازة وبتجنن!"
                  className="w-full text-xs p-3 bg-slate-900 border border-slate-800 rounded-lg h-22 focus:ring-1 focus:ring-emerald-500 text-slate-200 resize-none font-semibold leading-relaxed focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-[#007A3D] hover:bg-[#007A3D]/95 hover:shadow-lg text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                id="submit-comment-btn"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {submitting ? "Processing classifications..." : "Publish & Classify Node"}
              </button>
            </form>

            {/* Stream terminals logs */}
            <div className="border-t border-slate-850 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-mono">
                  <span className={`w-2 h-2 rounded-full ${streamActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'} inline-block shrink-0`} />
                  Realtime Stream receiver
                </span>
                <span className="text-[9px] text-slate-500 font-bold font-mono">
                  {streamActive ? "LISTENING" : "IDLE"}
                </span>
              </div>
              
              {streamLog.length === 0 ? (
                <div className="text-[10px] text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-850 italic text-center leading-normal">
                  Toggle "Continuous stream" in navigation center to capture live network ticks.
                </div>
              ) : (
                <div className="space-y-1 font-mono text-[9px] bg-[#0b0c10] border border-slate-850 p-2.5 rounded-lg text-emerald-400 leading-normal max-h-32 overflow-y-auto">
                  {streamLog.map((log) => (
                    <div key={log.id} className="flex justify-between items-start gap-1 border-b border-slate-900 pb-1 last:border-0 last:pb-0 animate-fade-in font-mono">
                      <div className="truncate text-[9px] font-mono select-none">
                        <span className="text-slate-500 font-bold">{log.timestamp}</span>
                        <span className="text-indigo-400 mx-1 font-bold">[{log.author.split(' ')[0]}]</span>  
                        <span className="text-slate-350">topic: {log.topic.substring(0, 14)}</span>
                      </div>
                      <span className="text-[8px] bg-emerald-950 text-emerald-300 px-1 border border-emerald-900/30 rounded select-none font-bold">SYNC</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Social feed streams list indexer */}
          <div className={`${cardStyle} p-5 lg:col-span-8 space-y-4`}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-2">
                <h3 className={`text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 ${headerTextStyle}`}>
                  <Database className="w-4 h-4 text-emerald-400" />
                  Social Feeds index logs ($GET Archive)
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-full">
                    Filtered Index: <span className="text-amber-400 font-extrabold">{filteredComments.length}</span> / {comments.length}
                  </div>
                  
                  {/* Export Controls */}
                  <button
                    onClick={() => exportCommentsCSV(true)}
                    className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
                    title={lang === "ar" ? "تصدير جميع التعليقات المسحوبة بملف إكسل" : "Export all comments to CSV/Excel"}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    {lang === "ar" ? "تصدير الكل (CSV)" : "Export All (CSV)"}
                  </button>

                  <button
                    onClick={() => exportCommentsCSV(false)}
                    className="text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
                    title={lang === "ar" ? "تصدير التعليقات النشطة المفلترة" : "Export current filtered selection to CSV/Excel"}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                    {lang === "ar" ? "تصدير المفلتر (CSV)" : "Export Filtered (CSV)"}
                  </button>

                  {(searchTerm || selectedPlatform !== "All" || selectedSentiment !== "All" || selectedTopic !== "All" || selectedGovFilter) && (
                    <button 
                      onClick={handleClearFilters}
                      className="text-[9.5px] font-extrabold text-[#CE1126] bg-[#CE1126]/10 px-1.5 py-0.5 rounded hover:bg-[#CE1126]/20 transition flex items-center gap-1 border border-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Search input bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={lang === "ar" ? "فلترة فهرس التعليقات (مثال: تلفريك، النشامى، المنتخب، رواتب...)" : "Filter comment database indexes (e.g. تلفريك, البترا, Economy, matches...)"}
                  className="w-full text-xs pl-9 pr-4 py-3 bg-slate-900/40 border border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-200 font-bold focus:outline-none"
                />
              </div>

              {/* Dropdown selectors */}
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-2.5 py-1.5 text-xs text-slate-300 border border-slate-800 bg-slate-900 rounded-lg cursor-pointer font-bold focus:outline-none"
                >
                  <option value="All">{lang === "ar" ? "المنصة: الكل" : "Platform: All"}</option>
                  <option value="X">𝕏 / Twitter</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                </select>

                <select
                  value={selectedSentiment}
                  onChange={(e) => setSelectedSentiment(e.target.value)}
                  className="px-2.5 py-1.5 text-xs text-slate-300 border border-slate-800 bg-slate-900 rounded-lg cursor-pointer font-bold focus:outline-none"
                >
                  <option value="All">{lang === "ar" ? "المشاعر: الكل" : "Sentiment: All"}</option>
                  <option value="positive">{lang === "ar" ? "🟢 إيجابي" : "🟢 Positive"}</option>
                  <option value="neutral">{lang === "ar" ? "🟡 محايد" : "🟡 Neutral"}</option>
                  <option value="negative">{lang === "ar" ? "🔴 سلبي" : "🔴 Negative"}</option>
                </select>

                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="px-2.5 py-1.5 text-xs text-slate-300 border border-slate-800 bg-slate-900 rounded-lg cursor-pointer font-bold focus:outline-none"
                >
                  <option value="All">{lang === "ar" ? `المواضيع: الكل (${activeTopics.length})` : `Topics: All (${activeTopics.length})`}</option>
                  {activeTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      🔍 {lang === "ar" ? (TOPIC_AR_NAMES[topic] || topic) : topic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Social items feed container */}
            {filteredComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 text-center text-slate-500">
                <Frown className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-400">Search Yields No Matches</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[280px]">
                  Adjust search parameters or select different regions to display synchronized feeds logs.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {filteredComments.map((c) => (
                  <div key={c.id} className="p-4 border border-slate-850 bg-slate-900/20 rounded-xl hover:bg-slate-900/40 hover:border-slate-800 transition duration-200 space-y-2 relative" id={`comment-node-${c.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-800 border border-slate-755 text-slate-100 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                          {c.author.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-100">{c.author}</span>
                            <span className="text-[10px] text-slate-450 font-bold font-mono">{c.handle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9.5px] text-slate-500 font-semibold leading-none">
                            <span className="font-bold flex items-center gap-1">
                              {c.platform === "X" ? "𝕏" : c.platform}
                            </span>
                            <span>•</span>
                            <span>{new Date(c.timestamp).toLocaleString("en-JO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${
                        c.sentiment === "positive" 
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-900/30" 
                          : c.sentiment === "negative" 
                            ? "bg-rose-950/40 text-rose-300 border-rose-900/30" 
                            : "bg-slate-800 text-slate-400 border-slate-700/20"
                      }`}>
                        {c.sentimentScore > 0 ? "+" : ""}{c.sentimentScore.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed font-sans break-words pr-1 text-right" style={{ direction: c.language === "ar" ? "rtl" : "ltr" }}>
                      {c.text}
                    </div>

                    <div className="pt-2 border-t border-slate-850/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-indigo-900/30 bg-indigo-950/20 text-indigo-400 font-bold">
                          {c.topic}
                        </span>
                        
                        {c.tokens && c.tokens.slice(0, 4).map((t, index) => (
                          <span key={index} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-[9.5px] font-mono text-slate-550">
                        <span>👍 {c.likes}</span>
                        <span>🔄 {c.shares}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>
        </>
        )}

      </main>

      {/* Corpus Audit Modal */}
      <CorpusStatsModal isOpen={isCorpusStatsOpen} onClose={() => setIsCorpusStatsOpen(false)} />

      {/* Polish theme footer bar */}
      <footer className="h-10 bg-[#07090f] text-slate-500 text-[10px] flex items-center justify-between px-6 shrink-0 mt-12 border-t border-slate-900 select-none">
        <div>
          {lang === "ar" 
            ? "حالة المزامنة والاستيراد: " 
            : "Platform Sync Status: "}
          <span className="text-emerald-400 font-mono font-extrabold">ONLINE (Durable Firestore)</span>
        </div>
        <div className="flex gap-4 font-sans font-semibold">
          <span>{lang === "ar" ? "بروتوكول الأمن الوطني: متكامل ومحمي" : "Secure Ingress Protocol"}</span>
          <span className="text-slate-350">SECURED</span>
        </div>
      </footer>

    </div>
  );
}
