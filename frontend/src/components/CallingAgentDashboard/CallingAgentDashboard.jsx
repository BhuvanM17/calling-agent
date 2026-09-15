import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./CallingAgentDashboard.css";
import api from "../../services/api";

/* -------------------------------------------------------------------- */
/*  STATIC CARD CONFIGURATION                                            */
/* -------------------------------------------------------------------- */

const SUMMARY_CARDS_CONFIG = [
  { id: "all", label: "Total Calls", statKey: "total", icon: "phone", filterType: "all", filterValue: "all", color: "blue", trend: "Live DB", trendUp: true },
  { id: "completed", label: "Completed Calls", statKey: "completed", icon: "check_circle", filterType: "status", filterValue: "completed", color: "green", trend: "Live DB", trendUp: true },
  { id: "confirmed", label: "Confirmed Calls", statKey: "confirmed", icon: "bookmark_check", filterType: "status", filterValue: "confirmed", color: "orange", trend: "Live DB", trendUp: true },
  { id: "failed", label: "Failed Calls", statKey: "failed", icon: "phone_missed", filterType: "status", filterValue: "failed", color: "red", trend: "Live DB", trendUp: false },
  { id: "inbound", label: "Inbound Call", statKey: "inbound", icon: "call_received", filterType: "type", filterValue: "inbound", color: "blue", trend: "Live DB", trendUp: true },
  { id: "outbound", label: "Outbound Call", statKey: "outbound", icon: "call_made", filterType: "type", filterValue: "outbound", color: "gray", trend: "Live DB", trendUp: true },
  { id: "instagram", label: "Instagram Lead", statKey: "instagram", icon: "photo_camera", filterType: "source", filterValue: "instagram", color: "red", trend: "Live DB", trendUp: true },
  { id: "website", label: "Website Lead", statKey: "website", icon: "language", filterType: "source", filterValue: "website", color: "blue", trend: "Live DB", trendUp: true },
];

/* -------------------------------------------------------------------- */
/*  STYLE HELPERS                                                        */
/* -------------------------------------------------------------------- */

const STATUS_STYLES = {
  completed: { label: "Completed", className: "badge-green" },
  failed: { label: "Failed", className: "badge-red" },
  busy: { label: "Busy", className: "badge-amber" },
  confirmed: { label: "Confirmed", className: "badge-orange", icon: "bookmark_check" },
  initiated: { label: "Initiated", className: "badge-blue" },
};

const TYPE_STYLES = {
  inbound: { label: "Inbound", className: "badge-blue" },
  outbound: { label: "Outbound", className: "badge-gray" },
};

const SENTIMENT_STYLES = {
  positive: { label: "Positive", className: "badge-sentiment-green", icon: "sentiment_satisfied" },
  negative: { label: "Negative", className: "badge-sentiment-red", icon: "sentiment_dissatisfied" },
  neutral: { label: "Neutral", className: "badge-sentiment-gray", icon: "sentiment_neutral" },
  none: { label: "\u2014", className: "badge-sentiment-gray" },
};

function Badge({ className, icon, children }) {
  return (
    <span className={`cad-badge ${className}`}>
      {icon && <span className="material-symbols-outlined cad-badge-icon">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Format raw backend record to uniform dashboard call item
 */
function formatCallRecord(c) {
  const callId = c.callId || c.call_id || c.id || "N/A";
  const startTime = c.timestamp || c.created_at || c.createdAt;
  const endTime = c.endedAt || c.ended_at;

  let duration = c.duration;
  if (!duration && startTime && endTime) {
    const diffSec = Math.max(0, Math.floor((new Date(endTime) - new Date(startTime)) / 1000));
    const m = String(Math.floor(diffSec / 60)).padStart(2, "0");
    const s = String(diffSec % 60).padStart(2, "0");
    duration = `${m}:${s}`;
  } else if (!duration) {
    duration = "00:00";
  }

  let initiatedAt = c.initiatedAt;
  if (!initiatedAt && startTime) {
    try {
      const d = new Date(startTime);
      initiatedAt = d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      initiatedAt = String(startTime);
    }
  } else if (!initiatedAt) {
    initiatedAt = "\u2014";
  }

  const rawStatus = (c.status || "completed").toLowerCase();
  const rawSentiment = (c.sentiment || "none").toLowerCase();
  const rawType = (c.callType || c.call_type || "outbound").toLowerCase();

  return {
    id: callId,
    leadId: c.leadId || c.lead_id || null,
    leadName: c.leadName || c.lead_name || "Lead",
    userNumber: c.phone || c.userNumber || "\u2014",
    type: rawType.includes("inbound") ? "inbound" : "outbound",
    duration,
    initiatedAt,
    status: ["completed", "failed", "busy", "confirmed", "initiated"].includes(rawStatus) ? rawStatus : "completed",
    source: (c.source || "website").toLowerCase(),
    hasRecording: Boolean(c.recordingUrl || c.recording_url),
    recordingUrl: c.recordingUrl || c.recording_url || null,
    sentiment: ["positive", "negative", "neutral"].includes(rawSentiment) ? rawSentiment : "none",
    rawSentiment: c.sentiment || "Neutral",
    assignedToId: c.assignedToId || c.assigned_to_id || null,
    assignedToName: c.assignedToName || c.assigned_to_name || null,
    assignedToEmail: c.assignedToEmail || c.assigned_to_email || null,
    transcript: c.transcript || "",
    callSummary: c.callSummary || c.call_summary || "",
    outcome: c.outcome || "",
    location: c.location || "",
    seats: c.seats || "",
    spaceType: c.spaceType || c.space_type || "",
    recommendedCentre: c.recommendedCentre || c.recommended_centre || "",
  };
}

/* -------------------------------------------------------------------- */
/*  MAIN COMPONENT                                                       */
/* -------------------------------------------------------------------- */

export default function CallingAgentDashboard({ currentUser, onLogout }) {
  const userRole = (currentUser?.role_name || "").toLowerCase().trim();
  const canAssign = userRole === "admin" || userRole === "super-admin";

  /* ----- Data & Loading States ----- */
  const [calls, setCalls] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  /* ----- top toolbar state ----- */
  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  /* ----- filter state ----- */
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");

  /* ----- pagination state ----- */
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ----- Direct Inline Table Assignment Popover State ----- */
  const [activePopoverCallId, setActivePopoverCallId] = useState(null);
  const [popoverSearchQuery, setPopoverSearchQuery] = useState("");
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  /* ----- drawer state ----- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCall, setDrawerCall] = useState(null);
  const [drawerMode, setDrawerMode] = useState("conversation"); // "conversation" | "edit"
  const [openAccordion, setOpenAccordion] = useState({ general: true, callSummary: true });
  const [leadActivities, setLeadActivities] = useState([]);

  /* ----- audio player state ----- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [audioDuration, setAudioDuration] = useState("00:00");
  const [audioCurrentTime, setAudioCurrentTime] = useState("00:00");

  /* ----- edit form state ----- */
  const [editFormData, setEditFormData] = useState({
    leadName: "",
    phone: "",
    status: "completed",
    sentiment: "Neutral",
    outcome: "",
    location: "",
    seats: "",
    spaceType: "",
    callSummary: "",
  });

  const dateBtnRef = useRef(null);
  const filterBtnRef = useRef(null);
  const dateDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const popoverRef = useRef(null);
  const audioRef = useRef(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ---------------- Fetch Sales Reps (if authorized) ---------------- */
  const loadSalesReps = useCallback(async () => {
    if (!canAssign) return;
    try {
      const repsData = await api.getSalesReps().catch((e) => {
        console.warn("Sales Reps API error:", e);
        return [];
      });
      setSalesReps(repsData || []);
    } catch (err) {
      console.error("Failed to load sales reps:", err);
    }
  }, [canAssign]);

  const loadCalls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCalls({
        page: currentPage,
        limit: 10,
        search: searchQuery,
        status: statusFilter,
        sentiment: sentimentFilter,
      });

      const list = res.calls || (Array.isArray(res) ? res : []);
      setCalls(list.map(formatCallRecord));
      if (res.totalPages) setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Failed to load calls:", err);
      showToast("Error loading call records from server", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, sentimentFilter]);

  useEffect(() => {
    loadSalesReps();
  }, [loadSalesReps]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  /* Close dropdowns and popover when clicking outside or scrolling */
  useEffect(() => {
    function handleOutsideClick(e) {
      if (
        dateOpen &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(e.target) &&
        e.target !== dateBtnRef.current
      ) {
        setDateOpen(false);
      }
      if (
        filterOpen &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target) &&
        e.target !== filterBtnRef.current
      ) {
        setFilterOpen(false);
      }
      if (
        activePopoverCallId &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        !e.target.closest(".cad-assign-pill")
      ) {
        setActivePopoverCallId(null);
      }
    }

    function handleScrollOrResize(e) {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (activePopoverCallId) {
        setActivePopoverCallId(null);
      }
    }

    document.addEventListener("click", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [dateOpen, filterOpen, activePopoverCallId]);

  /* ---------------- Filtering Logic (Client + Quick Filter) ---------------- */
  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return calls.filter((row) => {
      let matches = true;

      if (activeCardFilter && activeCardFilter.type !== "all") {
        if (activeCardFilter.type === "status" && row.status !== activeCardFilter.value) matches = false;
        else if (activeCardFilter.type === "type" && row.type !== activeCardFilter.value) matches = false;
        else if (activeCardFilter.type === "source" && row.source !== activeCardFilter.value) matches = false;
      }

      if (matches && statusFilter && row.status !== statusFilter) matches = false;
      if (matches && sentimentFilter && row.sentiment !== sentimentFilter) matches = false;

      if (matches && query) {
        const haystack = `${row.id} ${row.userNumber} ${row.leadName} ${row.assignedToName || ""} ${row.type} ${row.duration} ${row.initiatedAt} ${row.status} ${row.source} ${row.sentiment}`.toLowerCase();
        if (!haystack.includes(query)) matches = false;
      }

      return matches;
    });
  }, [calls, activeCardFilter, statusFilter, sentimentFilter, searchQuery]);

  /* ---------------- Dynamic Summary Cards based on Visible Records ---------------- */
  const summaryCards = useMemo(() => {
    const total = filteredRecords.length;
    let completed = 0;
    let confirmed = 0;
    let failed = 0;
    let inbound = 0;
    let outbound = 0;
    let instagram = 0;
    let website = 0;

    for (const r of filteredRecords) {
      const s = (r.status || "").toLowerCase();
      const outcome = (r.outcome || "").toLowerCase();
      const t = (r.type || "").toLowerCase();
      const src = (r.source || "").toLowerCase();

      if (s === "completed") completed++;
      if (s === "confirmed" || outcome.includes("confirm")) confirmed++;
      if (s === "failed") failed++;
      if (t === "inbound") inbound++;
      if (t.includes("outbound") || t === "confirm_agent" || t === "just_call") outbound++;
      if (src === "instagram") instagram++;
      if (src === "website") website++;
    }

    const counts = {
      total,
      completed,
      confirmed,
      failed,
      inbound,
      outbound,
      instagram,
      website,
    };

    return SUMMARY_CARDS_CONFIG.map((cfg) => ({
      ...cfg,
      value: counts[cfg.statKey] ?? 0,
      trend: "Visible",
    }));
  }, [filteredRecords]);

  /* Filtered sales reps for direct inline popover search */
  const filteredPopoverReps = useMemo(() => {
    const q = popoverSearchQuery.toLowerCase().trim();
    if (!q) return salesReps;
    return salesReps.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.designation && r.designation.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q))
    );
  }, [salesReps, popoverSearchQuery]);

  /* ---------------- Handlers ---------------- */
  const handleCardClick = (card) => {
    const isAlreadyActive =
      activeCardFilter &&
      activeCardFilter.type === card.filterType &&
      activeCardFilter.value === card.filterValue;

    if (isAlreadyActive || card.filterType === "all") {
      if (card.filterType === "all" && !isAlreadyActive) {
        setActiveCardFilter({ type: "all", value: "all" });
      } else {
        setActiveCardFilter(null);
        setStatusFilter("");
      }
    } else {
      setActiveCardFilter({ type: card.filterType, value: card.filterValue });
      if (card.filterType === "status") {
        setStatusFilter(card.filterValue);
      } else {
        setStatusFilter("");
      }
    }
  };

  const isCardActive = (card) => {
    if (!activeCardFilter) return false;
    if (card.filterType === "all") return activeCardFilter.type === "all";
    return activeCardFilter.type === card.filterType && activeCardFilter.value === card.filterValue;
  };

  const handleFilterApply = () => {
    if (statusFilter && activeCardFilter && activeCardFilter.type === "status" && activeCardFilter.value !== statusFilter) {
      setActiveCardFilter(null);
    }
    setFilterOpen(false);
  };

  const handleFilterReset = () => {
    setStatusFilter("");
    setSentimentFilter("");
    setSearchQuery("");
    setActiveCardFilter(null);
    setFilterOpen(false);
  };

  /* Direct Inline Assignment: Toggle Popover with smart positioning */
  const toggleAssignPopover = (callId, e) => {
    if (!canAssign) return;
    if (activePopoverCallId === callId) {
      setActivePopoverCallId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverHeight = 250;
    const popoverWidth = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < popoverHeight && rect.top > popoverHeight;

    setPopoverPos({
      top: openUpward ? rect.top - popoverHeight - 6 : rect.bottom + 6,
      left: Math.max(10, Math.min(rect.left, window.innerWidth - popoverWidth - 16)),
    });

    setActivePopoverCallId(callId);
    setPopoverSearchQuery("");
  };

  /* Direct Inline Assignment: Select Rep */
  const handleDirectAssign = async (callId, rep) => {
    try {
      await api.assignCall(callId, {
        assigned_to_id: rep.id || rep.userId,
        assigned_to_name: rep.name,
        assigned_to_email: rep.email,
      });

      setCalls((prev) =>
        prev.map((c) =>
          c.id === callId
            ? {
                ...c,
                assignedToId: rep.id || rep.userId,
                assignedToName: rep.name,
                assignedToEmail: rep.email,
              }
            : c
        )
      );

      showToast(`Call assigned to ${rep.name}!`);
      setActivePopoverCallId(null);
      setPopoverSearchQuery("");
    } catch (err) {
      console.error("Direct assignment error:", err);
      showToast(`Assignment failed: ${err.message}`, "error");
    }
  };

  /* Direct Inline Assignment: Clear / Unassign */
  const handleDirectUnassign = async (callId) => {
    try {
      await api.assignCall(callId, {
        assigned_to_id: null,
        assigned_to_name: null,
        assigned_to_email: null,
      });

      setCalls((prev) =>
        prev.map((c) =>
          c.id === callId
            ? {
                ...c,
                assignedToId: null,
                assignedToName: null,
                assignedToEmail: null,
              }
            : c
        )
      );

      showToast("Assignment cleared.");
      setActivePopoverCallId(null);
      setPopoverSearchQuery("");
    } catch (err) {
      console.error("Unassign error:", err);
      showToast(`Failed to clear assignment: ${err.message}`, "error");
    }
  };

  /* Open Conversation Drawer */
  const openRecordingDrawer = async (call) => {
    setDrawerCall(call);
    setDrawerMode("conversation");
    setDrawerOpen(true);
    setIsPlaying(false);

    if (call.leadId) {
      try {
        const acts = await api.getLeadActivities(call.leadId);
        setLeadActivities(acts);
      } catch {
        setLeadActivities([]);
      }
    } else {
      setLeadActivities([]);
    }
  };

  /* Open Edit Drawer (Pencil Action) */
  const openEditDrawer = (call) => {
    setDrawerCall(call);
    setDrawerMode("edit");
    setEditFormData({
      leadName: call.leadName || "",
      phone: call.userNumber === "\u2014" ? "" : call.userNumber,
      status: call.status || "completed",
      sentiment: call.rawSentiment || "Neutral",
      outcome: call.outcome || "",
      location: call.location || "",
      seats: call.seats || "",
      spaceType: call.spaceType || "",
      callSummary: call.callSummary || "",
    });
    setDrawerOpen(true);
  };

  /* Save Edit Form */
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!drawerCall) return;

    try {
      setSaving(true);
      await api.updateCall(drawerCall.id, {
        lead_name: editFormData.leadName,
        phone: editFormData.phone,
        status: editFormData.status,
        sentiment: editFormData.sentiment,
        outcome: editFormData.outcome,
        location: editFormData.location,
        seats: editFormData.seats,
        space_type: editFormData.spaceType,
        call_summary: editFormData.callSummary,
      });

      const updatedRow = {
        ...drawerCall,
        leadName: editFormData.leadName || drawerCall.leadName,
        userNumber: editFormData.phone || drawerCall.userNumber,
        status: editFormData.status,
        sentiment: editFormData.sentiment.toLowerCase(),
        rawSentiment: editFormData.sentiment,
        outcome: editFormData.outcome,
        location: editFormData.location,
        seats: editFormData.seats,
        spaceType: editFormData.spaceType,
        callSummary: editFormData.callSummary,
      };

      setCalls((prev) => prev.map((c) => (c.id === drawerCall.id ? updatedRow : c)));
      setDrawerCall(updatedRow);

      showToast("Call details updated successfully!");
      setDrawerOpen(false);
    } catch (err) {
      console.error("Update error:", err);
      showToast(`Failed to update call: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const closeDrawer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setDrawerOpen(false);
    setIsPlaying(false);
  };

  const toggleAccordion = (key) =>
    setOpenAccordion((prev) => ({ ...prev, [key]: !prev[key] }));

  const showAllCalls = () => {
    setActiveCardFilter(null);
    setStatusFilter("");
    setSentimentFilter("");
    setSearchQuery("");
  };

  /* Audio player controls */
  const handlePlayToggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      const num = parseFloat(speed.replace("x", ""));
      audioRef.current.playbackRate = num;
    }
  };

  /* Parse transcript into conversation bubbles */
  const parsedTranscript = useMemo(() => {
    if (!drawerCall?.transcript) return [];
    const lines = drawerCall.transcript
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      const isAgent = /^(agent|assistant|ai|bot):/i.test(line);
      const isUser = /^(user|lead|customer|caller):/i.test(line);
      const cleanText = line.replace(/^(agent|assistant|ai|bot|user|lead|customer|caller):\s*/i, "");

      return {
        id: idx,
        sender: isAgent ? "Assistant" : isUser ? "User" : idx % 2 === 0 ? "Assistant" : "User",
        isAssistant: isAgent || (!isUser && idx % 2 === 0),
        text: cleanText || line,
      };
    });
  }, [drawerCall]);

  return (
    <main className="cad-main">
      <div className="cad-container">
        {/* ---------------- Header & date picker ---------------- */}
        <div className="cad-page-header">
          <div>
            <h3 className="cad-page-title">Overview</h3>
            <p className="cad-page-subtitle">Monitor calling agent performance, live metrics, and lead assignments.</p>
          </div>

          <div className="cad-header-right-actions">
            {currentUser && (
              <div className="cad-user-pill">
                <div className="cad-user-avatar">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                </div>
                <div className="cad-user-meta">
                  <span className="cad-user-name">{currentUser.name || currentUser.user_email}</span>
                  <span className="cad-user-role-badge">{currentUser.role_name || "User"}</span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    className="cad-logout-btn"
                    onClick={onLogout}
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                )}
              </div>
            )}

            <div className="cad-date-picker-wrap">
              <button
                ref={dateBtnRef}
                className="cad-date-btn"
                onClick={() => setDateOpen((v) => !v)}
                type="button"
              >
                <span className="cad-date-btn-label">
                  <span className="material-symbols-outlined cad-icon-sm">schedule</span>
                  Last 30 days
                </span>
                <span className="cad-date-btn-icon">
                  <span className="material-symbols-outlined cad-icon-sm">calendar_month</span>
                </span>
              </button>

              {dateOpen && (
                <div ref={dateDropdownRef} className="cad-dropdown cad-date-dropdown">
                  <div className="cad-calendar">
                    <div className="cad-calendar-header">
                      <button type="button" className="cad-calendar-nav">
                        <span className="material-symbols-outlined cad-icon-sm">chevron_left</span>
                      </button>
                      <span className="cad-calendar-month">Current Period</span>
                      <button type="button" className="cad-calendar-nav">
                        <span className="material-symbols-outlined cad-icon-sm">chevron_right</span>
                      </button>
                    </div>
                    <div className="cad-calendar-weekdays">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>
                    <div className="cad-calendar-days">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <div
                          key={day}
                          className={
                            "cad-calendar-day" +
                            (day <= 22 ? " in-range" : day <= 24 ? " selected" : "")
                          }
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- Summary cards ---------------- */}
        <div className="cad-summary-grid">
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className={`cad-summary-card${isCardActive(card) ? " active-card" : ""}`}
              onClick={() => handleCardClick(card)}
            >
              <div className={`cad-summary-glow glow-${card.color}`} />
              <div className="cad-summary-top">
                <div className={`cad-summary-icon icon-${card.color}`}>
                  <span className="material-symbols-outlined cad-icon-md">{card.icon}</span>
                </div>
                <span className={`cad-trend ${card.trendUp ? "trend-up" : "trend-down"}`}>
                  <span className="material-symbols-outlined cad-icon-xs">
                    {card.trendUp ? "trending_up" : "trending_down"}
                  </span>
                  {card.trend}
                </span>
              </div>
              <div>
                <p className="cad-summary-label">{card.label}</p>
                <h4 className="cad-summary-value">{card.value}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* ---------------- Call records section ---------------- */}
        <div className="cad-records-section">
          {/* Toolbar */}
          <div className="cad-toolbar">
            <div className="cad-search-wrap">
              <span className="material-symbols-outlined cad-icon-sm cad-search-icon">search</span>
              <input
                type="text"
                className="cad-search-input"
                placeholder="Search by phone, lead name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cad-toolbar-actions">
              <button
                ref={filterBtnRef}
                type="button"
                className="cad-btn-orange"
                onClick={() => setFilterOpen((v) => !v)}
              >
                <span className="material-symbols-outlined cad-icon-sm">filter_list</span>
                Filter
              </button>

              {filterOpen && (
                <div ref={filterDropdownRef} className="cad-dropdown cad-filter-dropdown">
                  <h4 className="cad-filter-title">Filters</h4>
                  <div className="cad-filter-fields">
                    <div>
                      <label className="cad-filter-label">Call Status</label>
                      <select
                        className="cad-select cad-select-full"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="failed">Failed</option>
                        <option value="busy">Busy</option>
                      </select>
                    </div>
                    <div>
                      <label className="cad-filter-label">Sentiment</label>
                      <select
                        className="cad-select cad-select-full"
                        value={sentimentFilter}
                        onChange={(e) => setSentimentFilter(e.target.value)}
                      >
                        <option value="">All Sentiments</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                    <div className="cad-filter-actions">
                      <button type="button" className="cad-btn-text" onClick={handleFilterReset}>
                        Reset
                      </button>
                      <button type="button" className="cad-btn-primary" onClick={handleFilterApply}>
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="cad-table-container">
            <table className="cad-table">
              <thead>
                <tr>
                  <th className="cad-th">CALL ID</th>
                  <th className="cad-th">LEAD / NUMBER</th>
                  <th className="cad-th">CALL TYPE</th>
                  <th className="cad-th">DURATION</th>
                  <th className="cad-th">INITIATED AT</th>
                  <th className="cad-th">CALL STATUS</th>
                  <th className="cad-th">ASSIGNED TO</th>
                  <th className="cad-th">SOURCE</th>
                  <th className="cad-th">CONVERSATION DATA</th>
                  <th className="cad-th">SENTIMENT</th>
                  <th className="cad-th cad-th-actions">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="cad-empty-cell">
                      <div className="cad-empty-state">
                        <span className="material-symbols-outlined cad-empty-icon">sync</span>
                        <p className="cad-empty-title">Loading live records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="cad-empty-cell">
                      <div className="cad-empty-state">
                        <span className="material-symbols-outlined cad-empty-icon">filter_alt_off</span>
                        <p className="cad-empty-title">No calls match this filter.</p>
                        <p className="cad-empty-subtitle">
                          Try resetting filters or picking another summary card shortcut.
                        </p>
                        <button type="button" className="cad-empty-btn" onClick={showAllCalls}>
                          Show all calls
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => {
                    const statusStyle = STATUS_STYLES[row.status] || STATUS_STYLES.completed;
                    const typeStyle = TYPE_STYLES[row.type] || TYPE_STYLES.outbound;
                    const sentimentStyle = SENTIMENT_STYLES[row.sentiment] || SENTIMENT_STYLES.none;

                    return (
                      <tr key={row.id} className="cad-row">
                        <td className="cad-td cad-td-id">
                          #{row.id.length > 12 ? `${row.id.slice(0, 10)}...` : row.id}
                        </td>
                        <td className="cad-td">
                          <div style={{ fontWeight: 600 }}>{row.leadName}</div>
                          <div style={{ fontSize: "12px", color: "var(--on-surface-variant)" }}>
                            {row.userNumber}
                          </div>
                        </td>
                        <td className="cad-td">
                          <Badge className={typeStyle.className}>{typeStyle.label}</Badge>
                        </td>
                        <td className="cad-td">{row.duration}</td>
                        <td className="cad-td cad-td-muted">{row.initiatedAt}</td>
                        <td className="cad-td">
                          <Badge className={statusStyle.className} icon={statusStyle.icon}>
                            {statusStyle.label}
                          </Badge>
                        </td>
                        {/* Direct Inline Click Assignment */}
                        <td className="cad-td">
                          <div className="cad-assign-cell-wrap">
                            {canAssign ? (
                              <button
                                type="button"
                                className={`cad-assign-pill ${
                                  row.assignedToName ? "cad-assigned" : "cad-unassigned"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAssignPopover(row.id, e);
                                }}
                                title={
                                  row.assignedToName
                                    ? `Assigned to ${row.assignedToName} (click to change)`
                                    : "Click to assign sales rep"
                                }
                              >
                                <span className="material-symbols-outlined cad-badge-icon">
                                  {row.assignedToName ? "person" : "person_add"}
                                </span>
                                <span className="cad-assign-name">
                                  {row.assignedToName || "Assign Rep"}
                                </span>
                                <span className="material-symbols-outlined cad-icon-xs cad-chevron-down">
                                  expand_more
                                </span>
                              </button>
                            ) : (
                              <div
                                className={`cad-assign-pill cad-assign-readonly ${
                                  row.assignedToName ? "cad-assigned" : "cad-unassigned"
                                }`}
                                title={
                                  row.assignedToName
                                    ? `Assigned to ${row.assignedToName}`
                                    : "Unassigned"
                                }
                              >
                                <span className="material-symbols-outlined cad-badge-icon">
                                  {row.assignedToName ? "person" : "person_off"}
                                </span>
                                <span className="cad-assign-name">
                                  {row.assignedToName || "\u2014"}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="cad-td cad-td-source">
                          {row.source[0].toUpperCase() + row.source.slice(1)}
                        </td>
                        <td className="cad-td">
                          {row.hasRecording ? (
                            <button
                              type="button"
                              className="cad-view-recording"
                              onClick={() => openRecordingDrawer(row)}
                            >
                              <span className="material-symbols-outlined cad-icon-sm">play_circle</span>
                              View Recordings
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="cad-btn-text"
                              style={{ padding: 0 }}
                              onClick={() => openRecordingDrawer(row)}
                            >
                              View Details
                            </button>
                          )}
                        </td>
                        <td className="cad-td">
                          <Badge className={sentimentStyle.className} icon={sentimentStyle.icon}>
                            {sentimentStyle.label}
                          </Badge>
                        </td>
                        <td className="cad-td cad-td-actions">
                          <div className="cad-row-actions">
                            <button
                              type="button"
                              className="cad-icon-btn"
                              title="View Conversation"
                              onClick={() => openRecordingDrawer(row)}
                            >
                              <span className="material-symbols-outlined cad-icon-sm">visibility</span>
                            </button>
                            <button
                              type="button"
                              className="cad-icon-btn cad-icon-btn-edit"
                              title="Edit Details"
                              onClick={() => openEditDrawer(row)}
                            >
                              <span className="material-symbols-outlined cad-icon-sm">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="cad-pagination">
            <div className="cad-pagination-controls">
              <button
                type="button"
                className="cad-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined cad-icon-sm">chevron_left</span>
              </button>
              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cad-page-btn${currentPage === p ? " active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="cad-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span className="material-symbols-outlined cad-icon-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Conversation / Edit Drawer ---------------- */}
      {drawerOpen && (
        <>
          <div className="cad-backdrop" onClick={closeDrawer} />
          <div className={`cad-drawer${drawerOpen ? " open" : ""}`}>
            <div className="cad-drawer-header">
              <div className="cad-drawer-header-top">
                <div>
                  <h3 className="cad-drawer-title">
                    {drawerMode === "edit" ? "Edit Call Record" : "Conversation Data"}
                  </h3>
                  <p className="cad-drawer-subtitle">
                    {drawerMode === "edit"
                      ? "Update lead information, outcome, call summary, and status directly in the database."
                      : "Review the recording, transcript, summary, and extracted call data for this execution."}
                  </p>
                </div>
                <button type="button" className="cad-drawer-close" onClick={closeDrawer}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="cad-drawer-id-chip">
                <span>#{drawerCall?.id}</span>
                <span
                  className="material-symbols-outlined cad-icon-xs cad-copy-icon"
                  onClick={() => {
                    navigator.clipboard.writeText(drawerCall?.id);
                    showToast("Call ID copied to clipboard!");
                  }}
                  title="Copy ID"
                >
                  content_copy
                </span>
              </div>
            </div>

            <div className="cad-drawer-body">
              {/* EDIT MODE: Form */}
              {drawerMode === "edit" ? (
                <form className="cad-edit-form" onSubmit={handleSaveEdit}>
                  <div className="cad-form-row">
                    <div className="cad-form-group">
                      <label className="cad-form-label">Lead Name</label>
                      <input
                        type="text"
                        className="cad-form-input"
                        value={editFormData.leadName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, leadName: e.target.value })
                        }
                        placeholder="Lead full name"
                      />
                    </div>
                    <div className="cad-form-group">
                      <label className="cad-form-label">Phone Number</label>
                      <input
                        type="text"
                        className="cad-form-input"
                        value={editFormData.phone}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, phone: e.target.value })
                        }
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="cad-form-row">
                    <div className="cad-form-group">
                      <label className="cad-form-label">Call Status</label>
                      <select
                        className="cad-form-select"
                        value={editFormData.status}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, status: e.target.value })
                        }
                      >
                        <option value="completed">Completed</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="failed">Failed</option>
                        <option value="busy">Busy</option>
                        <option value="initiated">Initiated</option>
                      </select>
                    </div>
                    <div className="cad-form-group">
                      <label className="cad-form-label">Sentiment</label>
                      <select
                        className="cad-form-select"
                        value={editFormData.sentiment}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, sentiment: e.target.value })
                        }
                      >
                        <option value="Positive">Positive</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Negative">Negative</option>
                      </select>
                    </div>
                  </div>

                  <div className="cad-form-row">
                    <div className="cad-form-group">
                      <label className="cad-form-label">Seats Required</label>
                      <input
                        type="text"
                        className="cad-form-input"
                        value={editFormData.seats}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, seats: e.target.value })
                        }
                        placeholder="e.g. 15"
                      />
                    </div>
                    <div className="cad-form-group">
                      <label className="cad-form-label">Location</label>
                      <input
                        type="text"
                        className="cad-form-input"
                        value={editFormData.location}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, location: e.target.value })
                        }
                        placeholder="e.g. Koramangala"
                      />
                    </div>
                  </div>

                  <div className="cad-form-group">
                    <label className="cad-form-label">Space Type</label>
                    <input
                      type="text"
                      className="cad-form-input"
                      value={editFormData.spaceType}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, spaceType: e.target.value })
                      }
                      placeholder="e.g. Managed Office, Dedicated Desk"
                    />
                  </div>

                  <div className="cad-form-group">
                    <label className="cad-form-label">Call Outcome</label>
                    <input
                      type="text"
                      className="cad-form-input"
                      value={editFormData.outcome}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, outcome: e.target.value })
                      }
                      placeholder="e.g. Site Visit Confirmed"
                    />
                  </div>

                  <div className="cad-form-group">
                    <label className="cad-form-label">Call Summary / Notes</label>
                    <textarea
                      className="cad-form-textarea"
                      value={editFormData.callSummary}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, callSummary: e.target.value })
                      }
                      placeholder="Notes from the call execution..."
                    />
                  </div>

                  <div className="cad-edit-actions">
                    <button type="button" className="cad-btn-text" onClick={closeDrawer}>
                      Cancel
                    </button>
                    <button type="submit" className="cad-btn-orange" disabled={saving}>
                      {saving ? (
                        <>
                          <span className="cad-spinner" /> Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* CONVERSATION VIEW MODE */
                <>
                  {/* Recording */}
                  <section>
                    <h4 className="cad-drawer-section-title">Recording</h4>
                    <div className="cad-recording-card">
                      {drawerCall?.recordingUrl ? (
                        <>
                          <div className="cad-recording-top">
                            <button
                              type="button"
                              className="cad-play-btn"
                              onClick={handlePlayToggle}
                            >
                              <span className="material-symbols-outlined">
                                {isPlaying ? "pause" : "play_arrow"}
                              </span>
                            </button>
                            <div className="cad-waveform">
                              {[3, 5, 8, 6, 4, 7, 5, 3, 6, 4, 8, 5, 3, 6, 4, 7, 5, 3].map((h, i) => (
                                <div
                                  key={i}
                                  className={`cad-wave-bar${isPlaying && i < 10 ? " played" : ""}`}
                                  style={{ height: `${h * 4}px` }}
                                />
                              ))}
                            </div>
                          </div>
                          <audio
                            ref={audioRef}
                            src={drawerCall.recordingUrl}
                            className="cad-audio-player"
                            controls
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            onTimeUpdate={(e) => {
                              const cur = Math.floor(e.target.currentTime);
                              const m = String(Math.floor(cur / 60)).padStart(2, "0");
                              const s = String(cur % 60).padStart(2, "0");
                              setAudioCurrentTime(`${m}:${s}`);
                            }}
                            onLoadedMetadata={(e) => {
                              const dur = Math.floor(e.target.duration);
                              const m = String(Math.floor(dur / 60)).padStart(2, "0");
                              const s = String(dur % 60).padStart(2, "0");
                              setAudioDuration(`${m}:${s}`);
                            }}
                          />
                          <div className="cad-recording-bottom" style={{ marginTop: "8px" }}>
                            <span className="cad-recording-time">
                              {audioCurrentTime} / {audioDuration || drawerCall?.duration}
                            </span>
                            <div className="cad-speed-controls">
                              {["0.5x", "1x", "1.5x", "2x"].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className={`cad-speed-btn${playbackSpeed === s ? " active" : ""}`}
                                  onClick={() => handleSpeedChange(s)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="cad-empty-subtitle" style={{ padding: "12px 0" }}>
                          No audio recording available for this call execution.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Transcript */}
                  <section>
                    <h4 className="cad-drawer-section-title">Transcript</h4>
                    <div className="cad-transcript">
                      {parsedTranscript.length > 0 ? (
                        parsedTranscript.map((msg) => (
                          <div
                            key={msg.id}
                            className={`cad-transcript-msg ${msg.isAssistant ? "assistant" : "user"}`}
                          >
                            <span className="cad-transcript-sender">{msg.sender}</span>
                            <p
                              className={`cad-bubble ${
                                msg.isAssistant ? "assistant-bubble" : "user-bubble"
                              }`}
                            >
                              {msg.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="cad-empty-subtitle" style={{ padding: "8px 0" }}>
                          No transcript text logged for this call record.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Extracted data */}
                  <section>
                    <h4 className="cad-drawer-section-title">Extracted Data</h4>
                    <div className="cad-accordion-card">
                      <div className="cad-accordion-block">
                        <div
                          className="cad-accordion-header"
                          onClick={() => toggleAccordion("general")}
                        >
                          <span
                            className={`material-symbols-outlined cad-icon-sm cad-chevron${
                              openAccordion.general ? " open" : ""
                            }`}
                          >
                            expand_more
                          </span>
                          <span className="cad-accordion-title">General</span>
                        </div>
                        {openAccordion.general && (
                          <div className="cad-accordion-body">
                            <div
                              className="cad-accordion-header cad-accordion-sub"
                              onClick={() => toggleAccordion("callSummary")}
                            >
                              <span
                                className={`material-symbols-outlined cad-icon-sm cad-chevron${
                                  openAccordion.callSummary ? " open" : ""
                                }`}
                              >
                                expand_more
                              </span>
                              <span className="cad-accordion-subtitle">Call Summary</span>
                            </div>
                            {openAccordion.callSummary && (
                              <div className="cad-accordion-fields">
                                <div>
                                  <span className="cad-field-label">Objective / Summary</span>
                                  <p className="cad-field-value">
                                    {drawerCall?.callSummary || "No summary provided."}
                                  </p>
                                </div>
                                {drawerCall?.outcome && (
                                  <div>
                                    <span className="cad-field-label">Outcome</span>
                                    <p className="cad-field-value">{drawerCall.outcome}</p>
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                                  {drawerCall?.seats && (
                                    <div>
                                      <span className="cad-field-label">Seats</span>
                                      <code className="cad-code-chip">{drawerCall.seats} seats</code>
                                    </div>
                                  )}
                                  {drawerCall?.location && (
                                    <div>
                                      <span className="cad-field-label">Location</span>
                                      <code className="cad-code-chip">{drawerCall.location}</code>
                                    </div>
                                  )}
                                  {drawerCall?.spaceType && (
                                    <div>
                                      <span className="cad-field-label">Space Type</span>
                                      <code className="cad-code-chip">{drawerCall.spaceType}</code>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* History */}
                  <section>
                    <h4 className="cad-drawer-section-title cad-mb-1">Lead History</h4>
                    <p className="cad-drawer-section-subtitle">Chronological events & updates...</p>
                    <div className="cad-history-card">
                      <div className="cad-timeline">
                        {leadActivities.length > 0 ? (
                          leadActivities.map((entry, idx) => (
                            <div
                              key={entry.id || idx}
                              className={`cad-timeline-item${idx === 0 ? " current" : ""}`}
                            >
                              <div className="cad-timeline-dot" />
                              <div className="cad-timeline-heading">
                                <span className="cad-timeline-date">
                                  {entry.createdAt
                                    ? new Date(entry.createdAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Recent"}
                                </span>
                                {idx === 0 && <span className="cad-timeline-badge">Latest</span>}
                              </div>
                              <div className="cad-timeline-content">
                                <p style={{ fontWeight: 600 }}>{entry.title || entry.type}</p>
                                <p style={{ marginTop: "4px" }}>{entry.detail}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="cad-timeline-item current">
                            <div className="cad-timeline-dot" />
                            <div className="cad-timeline-heading">
                              <span className="cad-timeline-date">{drawerCall?.initiatedAt}</span>
                              <span className="cad-timeline-badge">This call</span>
                            </div>
                            <div className="cad-timeline-content">
                              <p>
                                Call initiated via {drawerCall?.source || "website"} with status:{" "}
                                <span className="cad-timeline-new">{drawerCall?.status}</span>
                              </p>
                              {drawerCall?.assignedToName && (
                                <p style={{ marginTop: "4px" }}>
                                  Assigned to:{" "}
                                  <span className="cad-timeline-new">{drawerCall.assignedToName}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`cad-toast ${toast.type === "error" ? "cad-toast-error" : "cad-toast-success"}`}>
          <span className="material-symbols-outlined cad-icon-sm">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Floating Direct Assignment Popover (Rendered outside table via Portal) */}
      {canAssign && activePopoverCallId &&
        (() => {
          const activePopoverCall = calls.find((c) => c.id === activePopoverCallId);
          if (!activePopoverCall) return null;

          return createPortal(
            <div
              ref={popoverRef}
              className="cad-rep-popover"
              style={{
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cad-rep-search-wrap">
                <span className="material-symbols-outlined cad-icon-sm cad-rep-search-icon">
                  search
                </span>
                <input
                  type="text"
                  className="cad-rep-search-input"
                  placeholder="Search sales rep..."
                  value={popoverSearchQuery}
                  onChange={(e) => setPopoverSearchQuery(e.target.value)}
                  autoFocus
                />
                {popoverSearchQuery && (
                  <button
                    type="button"
                    className="cad-rep-search-clear"
                    onClick={() => setPopoverSearchQuery("")}
                  >
                    <span className="material-symbols-outlined cad-icon-xs">close</span>
                  </button>
                )}
              </div>

              <div className="cad-rep-list">
                {filteredPopoverReps.length === 0 ? (
                  <div className="cad-rep-empty">
                    No reps match "{popoverSearchQuery}"
                  </div>
                ) : (
                  filteredPopoverReps.map((r) => {
                    const repId = r.id || r.userId;
                    const isSelected = String(activePopoverCall.assignedToId) === String(repId);
                    return (
                      <div
                        key={repId}
                        className={`cad-rep-item ${isSelected ? "selected" : ""}`}
                        onClick={() => handleDirectAssign(activePopoverCall.id, r)}
                      >
                        <div className="cad-rep-avatar">
                          {r.name ? r.name[0].toUpperCase() : "U"}
                        </div>
                        <div className="cad-rep-info">
                          <div className="cad-rep-name">
                            {r.name}
                            {r.designation && (
                              <span className="cad-rep-designation">
                                {r.designation}
                              </span>
                            )}
                          </div>
                          {r.email && (
                            <div className="cad-rep-email">{r.email}</div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined cad-rep-check">
                            check
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                {activePopoverCall.assignedToName && (
                  <div
                    className="cad-rep-item cad-rep-unassign"
                    onClick={() => handleDirectUnassign(activePopoverCall.id)}
                  >
                    <span className="material-symbols-outlined cad-icon-sm">
                      person_remove
                    </span>
                    <span>Clear Assignment</span>
                  </div>
                )}
              </div>
            </div>,
            document.body
          );
        })()}
    </main>
  );
}