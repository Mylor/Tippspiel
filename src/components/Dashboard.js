import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";

// --- IMPORT CONSTANTS & STYLES ---
import { DASHBOARD_STYLES, getTabButtonStyle, getPhaseButtonStyle } from "../Utils/uiConstants";
import { FlagIcon } from "../Utils/teamUtils";
import { RetroJersey } from "../Utils/RetroJersey";

// Importiere die globalen Team-Mappings & Symbole aus der App
import { FORMATION_MAPPING, TEAM_SYMBOLS } from "../App";

// --- COMPONENTS ---
import CountdownTimer from "./CountdownTimer"; 
import TippsPage from "./TippsPage";
import TournamentResultsPage from "./TournamentResultsPage";
import AdminControlCenter from "./AdminControlCenter"; 
import PointsAnalysisPage from "./PointsAnalysisPage";
import BonusQuestions from "./BonusQuestions";
import SupportFeedbackPage from "./SupportFeedbackPage"; 
import ProfilePage from "./Profile"; 
import StatisticsPage from "./StatisticsPage";
import MatchTendencyCard from "./MatchTendencyCard";
import PrognoseCenter from "./PrognoseCenter"; 

// --- ZENTRALE DEADLINE KONFIGURATION ---
const PHASE_DEADLINES = {
  bonus: "2026-06-11T12:00:00",
  1: "2026-06-11T12:00:00",
  2: "2026-06-28T20:00:00",
  3: "2026-07-04T18:00:00",
  4: "2026-07-09T20:00:00",
  5: "2026-07-14T20:00:00",
};

const Dashboard = ({ player, onLogout }) => {
  const [localPlayer, setLocalPlayer] = useState(player);
  const [activePhase, setActivePhase] = useState("ranking");
  const [systemConfig, setSystemConfig] = useState(null);
  
  const [allMatches, setAllMatches] = useState([]);
  const [allCommunityTips, setAllCommunityTips] = useState([]);
  const [allPredictions, setAllPredictions] = useState([]);
  
  const [ranking, setRanking] = useState([]);
  const [allPhases, setAllPhases] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isPhase1Locked, setIsPhase1Locked] = useState(false);
  const [isMyPhase1Submitted, setIsMyPhase1Submitted] = useState(false); 
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showDisplayName, setShowDisplayName] = useState(true);
  const [showStatsDisplayName, setShowStatsDisplayName] = useState(true);

  useEffect(() => {
    if (activePhase === "ranking") {
      fetchDashboardData();
    }
  }, [activePhase]);

  async function fetchDashboardData() {
    if (allPhases.length === 0) setLoading(true);
    try {
      const [configRes, phasesRes, matchesRes, playersRes, mySubmissionRes] = await Promise.all([
        supabase.from("system_config").select("*").single(),
        supabase.from("tip_phase").select("*").order("id", { ascending: true }),
        supabase.from("match").select("*").order("match_order", { ascending: true }),
        supabase.from("player").select("id, name, display_name, name_color, jersey_number, supported_country, is_admin"),
        supabase.from("player_phase_submission").select("*").eq("player_id", player.id).eq("phase_id", 1).maybeSingle()
      ]);

      const phasesData = phasesRes.data || [];
      const matchesData = matchesRes.data || [];
      const players = playersRes.data || [];

      setAllPhases(phasesData);
      setSystemConfig(configRes.data);
      setAllMatches(matchesData);
      setIsMyPhase1Submitted(mySubmissionRes.data?.is_submitted || false);

      const phase1 = phasesData.find(p => Number(p.id) === 1);
      setIsPhase1Locked(phase1 ? (phase1.is_submitted || configRes.data?.tips_locked_global) : false);

      const finishedMatches = matchesData.filter(m => 
        m.goals_a_real !== null && m.goals_b_real !== null && 
        m.goals_a_real !== undefined && m.goals_b_real !== undefined &&
        m.goals_a_real !== '' && m.goals_b_real !== ''
      );
      
      const lastEvaluatedMatchday = finishedMatches.length > 0 
        ? Math.max(...finishedMatches.map(m => m.matchday || m.spieltag || 1)) 
        : 0;

      const currentLastSpieltag = finishedMatches.length > 0 ? lastEvaluatedMatchday : 0; 
      const currentNextSpieltag = finishedMatches.length > 0 ? currentLastSpieltag + 1 : 1;

      const visibleMatches = matchesData.filter(m => 
        (m.matchday || m.spieltag || 1) === currentLastSpieltag || 
        (m.matchday || m.spieltag || 1) === currentNextSpieltag
      );
      const visibleMatchIds = visibleMatches.map(m => m.id);

      let tipsData = [];
      if (visibleMatchIds.length > 0) {
        const tipsRes = await supabase
          .from("tip")
          .select("*")
          .in("match_id", visibleMatchIds);
        tipsData = tipsRes.data || [];
      }
      setAllCommunityTips(tipsData);

      let allPoints = [];
      let from = 0;
      let to = 999;
      let hasMorePoints = true;

      while (hasMorePoints) {
        const pointsRes = await supabase
          .from("user_points_detail")
          .select("*")
          .range(from, to);
        
        const pData = pointsRes.data || [];
        allPoints = [...allPoints, ...pData];
        
        if (pData.length < 1000) {
          hasMorePoints = false;
        } else {
          from += 1000;
          to += 1000;
        }
      }

      const lastMatchdayMatchIds = finishedMatches
        .filter(m => (m.matchday || m.spieltag || 1) === lastEvaluatedMatchday)
        .map(m => m.id);

      const calculatedRanking = players.map(p => {
        const userTotal = allPoints
          .filter(entry => Number(entry.player_id) === Number(p.id))
          .reduce((sum, entry) => sum + Number(entry.points_total), 0) || 0;
        return { ...p, points: parseFloat(userTotal.toFixed(1)) };
      });
      calculatedRanking.sort((a, b) => b.points - a.points);

      let currentRank = 1;
      const calculatedRankingWithRank = calculatedRanking.map((player, index) => {
        if (index > 0 && player.points < calculatedRanking[index - 1].points) {
          currentRank = index + 1;
        }
        return { ...player, rank: currentRank };
      });

      const previousRanking = players.map(p => {
        const prevTotal = allPoints
          .filter(entry => Number(entry.player_id) === Number(p.id) && !lastMatchdayMatchIds.includes(entry.match_id))
          .reduce((sum, entry) => sum + Number(entry.points_total), 0) || 0;
        return { id: p.id, points: parseFloat(prevTotal.toFixed(1)) };
      });
      previousRanking.sort((a, b) => b.points - a.points);

      let prevRankCount = 1;
      const previousRankingWithRank = previousRanking.map((player, index) => {
        if (index > 0 && player.points < previousRanking[index - 1].points) {
          prevRankCount = index + 1;
        }
        return { ...player, rank: prevRankCount };
      });

      const rankingWithTrends = calculatedRankingWithRank.map((player) => {
        const cRank = player.rank;
        const prevPlayer = previousRankingWithRank.find(r => r.id === player.id);
        const pRank = prevPlayer ? prevPlayer.rank : cRank;

        let trend = "equal";
        if (cRank < pRank) trend = "up";
        if (cRank > pRank) trend = "down";

        const matchdayTrend = pRank - cRank;
        return { ...player, rank: cRank, trend, matchdayTrend };
      });

      setRanking(rankingWithTrends);

      const currentMe = players.find(p => Number(p.id) === Number(localPlayer.id));
      if (currentMe) {
        setLocalPlayer(prev => ({ ...prev, ...currentMe }));
      }
    } catch (error) {
      console.error("Fehler beim Laden der Dashboard-Daten:", error);
    } finally {
      if (loading) setLoading(false);
    }
  }

  const handleProfileSave = async (updatedData) => {
    try {
      const { error } = await supabase.from("player").update({
        display_name: updatedData.display_name,
        pin: updatedData.pin,
        name_color: updatedData.name_color,
        jersey_number: updatedData.jersey_number,
        supported_country: updatedData.supported_country
      }).eq("id", updatedData.id);
      if (error) throw error;
      setLocalPlayer(prev => ({ ...prev, ...updatedData }));
      fetchDashboardData();
    } catch (err) {
      console.error("Fehler beim Updaten des Profils:", err);
      alert("Profil konnte nicht gespeichert werden.");
    }
  };

  // --- MEMOIZED CALCULATIONS FOR PERFORMANCE ---
  const matchdayInfo = useMemo(() => {
    const finished = allMatches.filter(m => 
      m.goals_a_real !== null && m.goals_b_real !== null &&
      m.goals_a_real !== undefined && m.goals_b_real !== undefined &&
      m.goals_a_real !== '' && m.goals_b_real !== ''
    );
    const hasFinished = finished.length > 0;
    const last = hasFinished ? Math.max(...finished.map(m => m.matchday || m.spieltag || 1)) : 0;
    return {
      hasFinishedMatches: hasFinished,
      currentLastSpieltag: last,
      currentNextSpieltag: hasFinished ? last + 1 : 1,
      lastMatches: allMatches.filter(m => (m.matchday || m.spieltag || 1) === last),
      nextMatches: allMatches.filter(m => (m.matchday || m.spieltag || 1) === (hasFinished ? last + 1 : 1))
    };
  }, [allMatches]);

  const sortedTeams = useMemo(() => {
    const teamScores = { Alpha: 0, Phi: 0, Gamma: 0 };
    const excludedIds = ["27", "28", "29", "30"];

    ranking.forEach(entry => {
      if (excludedIds.includes(String(entry.id))) {
        return; 
      }

      const teamName = FORMATION_MAPPING[entry.id]?.team;
      if (teamName && teamScores[teamName] !== undefined) {
        teamScores[teamName] += entry.points;
      }
    });

    return Object.keys(teamScores)
      .map(key => ({
        name: key,
        points: parseFloat(teamScores[key].toFixed(1)),
        symbol: TEAM_SYMBOLS[key] || ""
      }))
      .sort((a, b) => b.points - a.points);
  }, [ranking]);

  if (loading) return <div style={DASHBOARD_STYLES.loadingContainer}>Dashboard wird geladen...</div>;

  const displayName = localPlayer.display_name && localPlayer.display_name !== "EMPTY" ? localPlayer.display_name : localPlayer.name;
  const myTeamName = FORMATION_MAPPING[localPlayer.id]?.team;

  return (
    <div style={DASHBOARD_STYLES.dashboardWrapper}>
      
      {/* SIDEBAR ASIDE */}
      <aside style={{ 
        ...DASHBOARD_STYLES.sidebar, 
        width: isSidebarCollapsed ? "80px" : "280px", 
        minWidth: isSidebarCollapsed ? "80px" : "280px",
        padding: isSidebarCollapsed ? "16px 8px" : "20px 16px"
      }}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{
            ...DASHBOARD_STYLES.collapseButton,
            alignSelf: isSidebarCollapsed ? "center" : "flex-end"
          }}
          title={isSidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        >
          {isSidebarCollapsed ? "➡️" : "⬅️ Minimieren"}
        </button>
        
        <div style={{ 
          ...DASHBOARD_STYLES.profileBox,
          padding: isSidebarCollapsed ? "8px" : "16px",
          alignItems: isSidebarCollapsed ? "center" : "stretch"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: isSidebarCollapsed ? "center" : "flex-start", gap: "14px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RetroJersey color={localPlayer.name_color} number={localPlayer.jersey_number} size={isSidebarCollapsed ? 40 : 48} />
            </div>
            {!isSidebarCollapsed && (
              <div style={DASHBOARD_STYLES.profileMetaWrapper}>
                <div style={DASHBOARD_STYLES.profileNameContainer}>
                  <h2 style={{ 
                    ...DASHBOARD_STYLES.profileName,
                    color: (localPlayer.name_color && localPlayer.name_color.toLowerCase() !== "#ffffff") ? localPlayer.name_color : "#0f172a"
                  }}>
                    {displayName}
                  </h2>
                  {localPlayer.supported_country && <FlagIcon teamName={localPlayer.supported_country} />}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <span style={DASHBOARD_STYLES.badge}>
                    {localPlayer.is_admin ? "Admin" : "Spieler"}
                  </span>
                </div>
                <div style={DASHBOARD_STYLES.jerseyNumberText}>
                  Trikotnummer: #{localPlayer.jersey_number || "—"}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", marginTop: "2px", width: "100%" }}>
            <button
              onClick={() => setActivePhase("profile")}
              style={DASHBOARD_STYLES.settingsButton}
              title="Profil & Einstellungen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {!isSidebarCollapsed && <span>Profil & Einstellungen</span>}
            </button>
          </div>
        </div>

        <nav style={DASHBOARD_STYLES.nav}>
          <button 
            onClick={() => setActivePhase("ranking")} 
            style={{ ...getTabButtonStyle(activePhase === "ranking"), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }}
            title="Startseite"
          >
            {isSidebarCollapsed ? "🏠" : "🏠 Startseite"}
          </button>

          {/* HIER NEU: Echter Turnierbaum als Reiter für ALLE Spieler sichtbar */}
          <button 
            onClick={() => setActivePhase("real_results")} 
            style={{ ...getTabButtonStyle(activePhase === "real_results"), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }}
            title="Reale Ergebnisse"
          >
            {isSidebarCollapsed ? "🏆" : "🏆 Reale Ergebnisse"}
          </button>
          
          <hr style={DASHBOARD_STYLES.divider} />
          {!isSidebarCollapsed && <p style={DASHBOARD_STYLES.sectionHeader}>Tipp-Runden</p>}
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {allPhases.filter(p => p.is_active).map((p) => (
              <button 
                key={p.id} 
                onClick={() => setActivePhase(p.id)} 
                style={{ 
                  ...getPhaseButtonStyle(activePhase === p.id, systemConfig?.current_phase_id === p.id), 
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  display: "flex", alignItems: "center"
                }}
                title={`Phase ${p.id}`}
              >
                {isSidebarCollapsed ? `P${p.id}` : (
                  <div style={DASHBOARD_STYLES.navRowSpace}>
                    <span>Phase {p.id} {p.is_submitted ? " 🔒" : ""}</span>
                    <CountdownTimer targetDate={PHASE_DEADLINES[p.id]} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setActivePhase("bonus_questions")} 
            style={{ 
              ...getPhaseButtonStyle(activePhase === "bonus_questions", systemConfig?.current_phase_id === 1), 
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              display: "flex", alignItems: "center"
            }}
            title="Bonusfragen"
          >
            {isSidebarCollapsed ? "🏆" : (
              <div style={DASHBOARD_STYLES.navRowSpace}>
                <span>🏆 Bonusfragen {isPhase1Locked ? " 🔒" : ""}</span>
                <CountdownTimer targetDate={PHASE_DEADLINES.bonus} />
              </div>
            )}
          </button>

          {localPlayer.is_admin && (
            <>
              <hr style={DASHBOARD_STYLES.divider} />
              {!isSidebarCollapsed && <p style={DASHBOARD_STYLES.sectionHeader}>Admin-Bereich</p>}
              <button onClick={() => setActivePhase("admin_control")} style={{ ...getPhaseButtonStyle(activePhase === "admin_control", false), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }} title="Schaltzentrale">
                {isSidebarCollapsed ? "🛡️" : "🛡️ Schaltzentrale"}
              </button>
              <button onClick={() => setActivePhase("admin_results")} style={{ ...getPhaseButtonStyle(activePhase === "admin_results", false), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }} title="Ergebnisse eintragen">
                {isSidebarCollapsed ? "⚽" : "⚽ Ergebnisse eintragen"}
              </button>
            </>
          )}

          <hr style={DASHBOARD_STYLES.divider} />
          {!isSidebarCollapsed && <p style={DASHBOARD_STYLES.sectionHeader}>Statistiken</p>}
          
          <button 
            onClick={() => setActivePhase("points_analysis")} 
            style={{ ...getTabButtonStyle(activePhase === "points_analysis"), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }}
            title="Punkte-Analyse"
          >
            {isSidebarCollapsed ? "📊" : "📊 Punkte-Analyse"}
          </button>

          <button 
            onClick={() => setActivePhase("global_statistics")} 
            style={{ ...getTabButtonStyle(activePhase === "global_statistics"), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }}
            title="Statistik-Center"
          >
            {isSidebarCollapsed ? "📈" : "📈 Statistik-Center"}
          </button>

          <button 
            onClick={() => setActivePhase("prognosis_center")} 
            style={{ ...getTabButtonStyle(activePhase === "prognosis_center"), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }}
            title="Prognose-Center"
          >
            {isSidebarCollapsed ? "🔮" : "🔮 Prognose-Center"}
          </button>
          
          <hr style={DASHBOARD_STYLES.divider} />
          <button onClick={() => setActivePhase("support_feedback")} style={{ ...getTabButtonStyle(activePhase === "support_feedback"), justifyContent: isSidebarCollapsed ? "center" : "flex-start" }} title="Support & Feedback">
            {isSidebarCollapsed ? "💬" : "💬 Support & Feedback"}
          </button>
        </nav>

        <button onClick={onLogout} style={DASHBOARD_STYLES.logoutButton}>
          {isSidebarCollapsed ? "❌" : "Abmelden"}
        </button>
      </aside>

      {/* HAUPTINHALT */}
      <main style={DASHBOARD_STYLES.mainContent}>
        {activePhase === "ranking" ? (
          <div style={DASHBOARD_STYLES.dashboardGrid}>
            
            <section style={DASHBOARD_STYLES.whiteCard}>
              <div style={DASHBOARD_STYLES.cardHeaderRow}>
                <h3 style={DASHBOARD_STYLES.contentTitle}>Aktuelle Rangliste</h3>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Anzeigemodus:</span>
                  <button 
                    onClick={() => setShowDisplayName(!showDisplayName)}
                    style={DASHBOARD_STYLES.toggleViewButton}
                  >
                    <span>{showDisplayName ? "👤 Anzeigenamen" : "🆔 Realnamen"}</span>
                    <span style={{ color: "#64748b" }}>🔄</span>
                  </button>
                </div>
              </div>

              {/* TEAM-SCOREBOARD */}
              <div style={DASHBOARD_STYLES.teamScoreboardContainer}>
                {sortedTeams.map((t) => {
                  const isMyTeam = t.name === myTeamName;
                  return (
                    <div 
                      key={t.name} 
                      style={{ 
                        ...DASHBOARD_STYLES.teamScoreCard,
                        backgroundColor: isMyTeam ? "#ffffff" : "transparent",
                        border: isMyTeam ? "2px solid #eab308" : "2px solid transparent",
                        boxShadow: isMyTeam ? "0 4px 10px rgba(234, 179, 8, 0.18)" : "none"
                      }}
                    >
                      <span style={{ fontWeight: "700", color: isMyTeam ? "#0f172a" : "#475569", fontSize: "0.85rem" }}>
                        {isMyTeam ? "⭐ " : ""}Team {t.name} ({t.symbol}):
                      </span>
                      <span style={{ color: isMyTeam ? "#eab308" : "#2563eb", fontWeight: "800", fontSize: "1.05rem", marginTop: "2px" }}>
                        {t.points} Punkte
                      </span>
                    </div>
                  );
                })}
              </div>

              <table style={DASHBOARD_STYLES.table}>
                <thead>
                  <tr style={DASHBOARD_STYLES.tableHeader}>
                    <th style={{ ...DASHBOARD_STYLES.th, width: "95px" }}>Platz</th>
                    <th style={DASHBOARD_STYLES.th}>Name</th>
                    <th style={{ ...DASHBOARD_STYLES.th, textAlign: "right", width: "90px" }}>Punkte</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((entry) => {
                    const isMe = entry.id === localPlayer.id;
                    const entryName = showDisplayName 
                      ? (entry.display_name && entry.display_name !== "EMPTY" ? entry.display_name : entry.name)
                      : entry.name;
                    
                    const playerTeam = FORMATION_MAPPING[entry.id]?.team;
                    const teamSymbol = playerTeam ? TEAM_SYMBOLS[playerTeam] : null;
                    
                    return (
                      <tr key={entry.id} style={{ ...(isMe ? DASHBOARD_STYLES.myRow : {}), height: "58px", borderBottom: "1px solid #e2e8f0" }}>
                        <td style={DASHBOARD_STYLES.tdRank}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{entry.rank}.</span>
                            {entry.trend === "up" && (
                              <span style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: "700", marginLeft: "2px" }} title={`Verbessert um ${entry.matchdayTrend} Plätze`}>
                                ▲ +{entry.matchdayTrend}
                              </span>
                            )}
                            {entry.trend === "down" && (
                              <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: "700", marginLeft: "2px" }} title={`Verschlechtert um ${Math.abs(entry.matchdayTrend)} Plätze`}>
                                ▼ {entry.matchdayTrend}
                              </span>
                            )}
                            {entry.trend === "equal" && (
                              <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: "700", marginLeft: "2px" }} title="Gleich geblieben">
                                ▬ 0
                              </span>
                            )} 
                          </div>
                        </td>
                        <td style={{ ...DASHBOARD_STYLES.td, padding: "8px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <RetroJersey color={entry.name_color} number={entry.jersey_number} size={32} />
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ 
                                color: (entry.name_color && entry.name_color.toLowerCase() !== "#ffffff") ? entry.name_color : "#0f172a", 
                                fontWeight: "800", fontSize: "1rem" 
                              }}>
                                {entryName}
                              </span>
                              {entry.supported_country && <FlagIcon teamName={entry.supported_country} />}
                              {teamSymbol && (
                                <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginLeft: "2px" }}>
                                  ({teamSymbol})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={DASHBOARD_STYLES.tdPoints}>
                          <strong>{entry.points}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              {matchdayInfo.hasFinishedMatches && (
                <section>
                  <h3 style={{ ...DASHBOARD_STYLES.contentTitle, marginBottom: "12px" }}>
                    ⚽ Letzter Spieltag (Spieltag {matchdayInfo.currentLastSpieltag})
                  </h3>
                  {matchdayInfo.lastMatches.map(m => (
                    <MatchTendencyCard 
                      key={m.id}
                      match={m}
                      allCommunityTips={allCommunityTips}
                      localPlayer={localPlayer}
                      isMyPhase1Submitted={isMyPhase1Submitted}
                    />
                  ))}
                </section>
              )}

              <section>
                <h3 style={{ ...DASHBOARD_STYLES.contentTitle, marginBottom: "12px" }}>
                  🔮 Nächster Spieltag (Spieltag {matchdayInfo.currentNextSpieltag})
                </h3>
                {matchdayInfo.nextMatches.length === 0 ? (
                  <div style={{ color: "#64748b", fontStyle: "italic" }}>Keine weiteren anstehenden Spieltage gefunden.</div>
                ) : (
                  matchdayInfo.nextMatches.map(m => (
                    <MatchTendencyCard 
                      key={m.id}
                      match={m}
                      allCommunityTips={allCommunityTips}
                      localPlayer={localPlayer}
                      isMyPhase1Submitted={isMyPhase1Submitted}
                    />
                  ))
                )}
              </section>
            </div>

          </div>
        ) : (
          <div style={DASHBOARD_STYLES.flexibleCard}>
            {activePhase === "admin_control" ? (
              <AdminControlCenter onUpdate={fetchDashboardData} />
            
            /* HIER GEÄNDERT: Übergabe von isAdmin={true} an die neue Komponente */
            ) : activePhase === "admin_results" ? (
              <TournamentResultsPage phaseId={systemConfig?.current_phase_id} onUpdate={fetchDashboardData} isAdmin={true} />
            
            /* HIER NEU: Übergabe von isAdmin={false} für die Lese-Ansicht der Spieler */
            ) : activePhase === "real_results" ? (
              <TournamentResultsPage phaseId={systemConfig?.current_phase_id} onUpdate={fetchDashboardData} isAdmin={false} />
            
            ) : activePhase === "profile" ? (
              <ProfilePage player={localPlayer} onSave={handleProfileSave} onBack={() => setActivePhase("ranking")} />
            ) : activePhase === "points_analysis" ? (
              <PointsAnalysisPage userId={localPlayer.id} />
            ) : activePhase === "global_statistics" ? (
              <StatisticsPage currentUserId={localPlayer.id} allPlayers={ranking} matches={allMatches} predictions={allPredictions} showDisplayName={showStatsDisplayName} 
                onToggleDisplayName={() => setShowStatsDisplayName(!showStatsDisplayName)} />    
            ) : activePhase === "prognosis_center" ? ( 
              <PrognoseCenter currentUserId={localPlayer.id} />
            ) : activePhase === "bonus_questions" ? (
              <BonusQuestions userId={localPlayer.id} isReadOnly={isPhase1Locked} isAdmin={localPlayer.is_admin} />
            ) : activePhase === "support_feedback" ? (
              <SupportFeedbackPage playerId={localPlayer.id} playerName={displayName} isAdmin={localPlayer.is_admin} />
            ) : (
              <TippsPage player={localPlayer} phaseId={activePhase} isAdmin={localPlayer.is_admin} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;