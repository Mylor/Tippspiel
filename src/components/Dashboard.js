import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// --- IMPORT CONSTANTS & STYLES ---
import { DASHBOARD_STYLES, getTabButtonStyle, getPhaseButtonStyle } from "../Utils/uiConstants";
import { FlagIcon } from "../Utils/teamUtils";
import { RetroJersey } from "../Utils/RetroJersey";

// --- COMPONENTS ---
import TippsPage from "./TippsPage";
import AdminResultsPage from "./AdminResultsPage"; 
import AdminControlCenter from "./AdminControlCenter";
import PointsAnalysisPage from "./PointsAnalysisPage";
import BonusQuestions from "./BonusQuestions";
import SupportFeedbackPage from "./SupportFeedbackPage"; 
import ProfilePage from "./Profile"; // Importiert als vollwertige Seite

const Dashboard = ({ player, onLogout }) => {
  const [localPlayer, setLocalPlayer] = useState(player);
  const [activePhase, setActivePhase] = useState("ranking");
  const [systemConfig, setSystemConfig] = useState(null);
  const [nextMatches, setNextMatches] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [allPhases, setAllPhases] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isPhase1Locked, setIsPhase1Locked] = useState(false);

  // Initialer Datencheck beim Laden der Komponente
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activePhase === "ranking") {
      fetchDashboardData();
    }
  }, [activePhase]);

  async function fetchDashboardData() {
    if (allPhases.length === 0) setLoading(true);
    try {
      const [configRes, phasesRes, matchesRes, pointsRes, playersRes] = await Promise.all([
        supabase.from("system_config").select("*").single(),
        supabase.from("tip_phase").select("*").order("id", { ascending: true }),
        supabase.from("match").select("*").order("match_order", { ascending: true }).limit(3),
        supabase.from("user_points_detail").select("player_id, points_total"),
        supabase.from("player").select("id, name, display_name, name_color, jersey_number, supported_country")
      ]);

      const phasesData = phasesRes.data || [];
      setAllPhases(phasesData);
      setSystemConfig(configRes.data);
      setNextMatches(matchesRes.data || []);

      const phase1 = phasesData.find(p => Number(p.id) === 1);
      setIsPhase1Locked(phase1 ? (phase1.is_submitted || configRes.data?.tips_locked_global) : false);

      const players = playersRes.data || [];
      const allPoints = pointsRes.data || [];
      const calculatedRanking = players.map(p => {
        const userTotal = allPoints
          .filter(entry => Number(entry.player_id) === Number(p.id))
          .reduce((sum, entry) => sum + Number(entry.points_total), 0) || 0;
        return { ...p, points: userTotal };
      });

      calculatedRanking.sort((a, b) => b.points - a.points);
      setRanking(calculatedRanking);

      // Eigene Daten im lokalen State synchron halten
      const currentMe = players.find(p => Number(p.id) === Number(localPlayer.id));
      if (currentMe) {
        setLocalPlayer(prev => ({ ...prev, ...currentMe }));
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  }

  // Profil-Speicher-Logik (Verbindung mit Supabase-Backend)
  const handleProfileSave = async (updatedData) => {
    try {
      const { error } = await supabase
        .from("player")
        .update({
          display_name: updatedData.display_name,
          pin: updatedData.pin,
          name_color: updatedData.name_color,
          jersey_number: updatedData.jersey_number,
          supported_country: updatedData.supported_country
        })
        .eq("id", updatedData.id);

      if (error) throw error;

      // Lokalen State aktualisieren für Sofort-Effekt im UI
      setLocalPlayer(prev => ({ ...prev, ...updatedData }));
      
      // Rangliste neu laden, damit die Änderungen für alle sichtbar berechnet werden
      fetchDashboardData();
    } catch (err) {
      console.error("Fehler beim Updaten des Profils:", err);
      alert("Profil konnte nicht gespeichert werden.");
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Dashboard wird geladen...</div>;

  const displayName = localPlayer.display_name && localPlayer.display_name !== "EMPTY" ? localPlayer.display_name : localPlayer.name;

  return (
    <div style={DASHBOARD_STYLES.layout}>
      
      {/* 🟣 SIDEBAR */}
      <aside style={DASHBOARD_STYLES.sidebar}>
        
        {/* RESTRUKTURIERTE PROFILE BOX */}
        <div style={{ 
          ...DASHBOARD_STYLES.profileBox, 
          display: "flex", 
          flexDirection: "column",
          gap: "14px", 
          padding: "16px",
          boxSizing: "border-box"
        }}>
          {/* OBERE ZEILE: Trikot-Icon links, Text-Stack rechts */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RetroJersey color={localPlayer.name_color} number={localPlayer.jersey_number} size={48} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flexGrow: 1 }}>
              {/* Zeile 1: Name & Flagge */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <h2 
                  style={{ 
                    fontSize: "1.15rem", 
                    margin: 0, 
                    fontWeight: "800",
                    color: localPlayer.name_color || "#FFFFFF",
                    transition: "color 0.2s ease",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {displayName}
                </h2>
                {localPlayer.supported_country && (
                  <FlagIcon teamName={localPlayer.supported_country} />
                )}
              </div>
              
              {/* Zeile 2: FIX - Admin/Spieler Tag direkt unter dem Namen */}
              <div style={{ marginTop: "4px" }}>
                <span style={{ ...DASHBOARD_STYLES.badge, margin: 0, opacity: 0.9, display: "inline-block" }}>
                  {localPlayer.is_admin ? "Admin" : "Spieler"}
                </span>
              </div>
              
              {/* Zeile 3: Trikotnummer */}
              <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.6)", fontWeight: "600", marginTop: "4px" }}>
                Trikotnummer: #{localPlayer.jersey_number || "—"}
              </div>
            </div>
          </div>
          
          {/* UNTERE ZEILE: Sauberer Einstellungsbutton über die volle Breite */}
          <div style={{ display: "flex", marginTop: "2px", width: "100%" }}>
            <button
              onClick={() => setActivePhase("profile")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                userSelect: "none",
                width: "100%"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
                e.currentTarget.style.borderColor = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Profil & Einstellungen</span>
            </button>
          </div>
        </div>

        <nav style={DASHBOARD_STYLES.nav}>
          <button onClick={() => setActivePhase("ranking")} style={getTabButtonStyle(activePhase === "ranking")}>
            🏠 Startseite
          </button>
          
          <hr style={DASHBOARD_STYLES.divider} />
          <p style={DASHBOARD_STYLES.sectionHeader}>Tipp-Runden</p>
          
          {allPhases.filter(p => p.is_active).map((p) => (
            <button 
              key={p.id} 
              onClick={() => setActivePhase(p.id)} 
              style={getPhaseButtonStyle(activePhase === p.id, systemConfig?.current_phase_id === p.id)}
            >
              Phase {p.id} {p.is_submitted && " 🔒"} 
            </button>
          ))}

          <button 
            onClick={() => setActivePhase("bonus_questions")} 
            style={getPhaseButtonStyle(activePhase === "bonus_questions", systemConfig?.current_phase_id === 1)}
          >
            🏆 Bonusfragen {isPhase1Locked ? " 🔒" : ""}
          </button>

          {localPlayer.is_admin && (
            <>
              <hr style={DASHBOARD_STYLES.divider} />
              <p style={DASHBOARD_STYLES.sectionHeader}>Admin-Bereich</p>
              <button onClick={() => setActivePhase("admin_control")} style={getPhaseButtonStyle(activePhase === "admin_control", false)}>
                🛡️ Schaltzentrale
              </button>
              <button onClick={() => setActivePhase("admin_results")} style={getPhaseButtonStyle(activePhase === "admin_results", false)}>
                ⚽ Ergebnisse eintragen
              </button>
            </>
          )}

          <hr style={DASHBOARD_STYLES.divider} />
          <p style={DASHBOARD_STYLES.sectionHeader}>Statistiken</p>
          <button 
            onClick={() => setActivePhase("points_analysis")} 
            style={getTabButtonStyle(activePhase === "points_analysis")}
          >
            📊 Punkte-Analyse
          </button>
          
          <hr style={DASHBOARD_STYLES.divider} />
          <button 
            onClick={() => setActivePhase("support_feedback")} 
            style={getTabButtonStyle(activePhase === "support_feedback")}
          >
            💬 Support & Feedback
          </button>
        </nav>

        <button onClick={onLogout} style={DASHBOARD_STYLES.logoutButton}>Abmelden</button>
      </aside>

      {/* 🟢 HAUPTBEREICH */}
      <main style={DASHBOARD_STYLES.mainContent}>
        {activePhase === "ranking" ? (
          <>
            <section style={{ marginBottom: "30px" }}>
              <h3 style={DASHBOARD_STYLES.contentTitle}>Anstehende Partien</h3>
              <div style={DASHBOARD_STYLES.matchGrid}>
                {nextMatches.map(m => (
                  <div key={m.id} style={DASHBOARD_STYLES.matchCard}>
                    <div style={DASHBOARD_STYLES.groupBadge}>Gruppe {m.group_name}</div>
                    <div style={DASHBOARD_STYLES.matchTeams}>{m.team_a} vs. {m.team_b}</div>
                    <button onClick={() => setActivePhase(m.phase_id)} style={DASHBOARD_STYLES.quickTippButton}>
                      Tippen
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section style={DASHBOARD_STYLES.whiteCard}>
              <h3 style={DASHBOARD_STYLES.contentTitle}>Aktuelle Rangliste</h3>
              <table style={DASHBOARD_STYLES.table}>
                <thead>
                  <tr style={DASHBOARD_STYLES.tableHeader}>
                    <th style={{ ...DASHBOARD_STYLES.th, width: "60px" }}>Platz</th>
                    <th style={DASHBOARD_STYLES.th}>Name</th>
                    <th style={{ ...DASHBOARD_STYLES.th, textAlign: "right", width: "100px" }}>Punkte</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((entry, index) => {
                    const isMe = entry.id === localPlayer.id;
                    const entryName = entry.display_name && entry.display_name !== "EMPTY" ? entry.display_name : entry.name;
                    
                    return (
                      <tr 
                        key={entry.id} 
                        style={{ 
                          ...(isMe ? DASHBOARD_STYLES.myRow : {}),
                          height: "58px", 
                          borderBottom: "1px solid #e2e8f0"
                        }}
                      >
                        <td style={{ ...DASHBOARD_STYLES.td, fontSize: "16px", fontWeight: "700" }}>
                          {index + 1}.
                        </td>
                        
                        <td style={{ ...DASHBOARD_STYLES.td, padding: "8px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <RetroJersey color={entry.name_color} number={entry.jersey_number} size={36} />
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span 
                                style={{ 
                                  color: entry.name_color || "#0f172a", 
                                  fontWeight: "800",
                                  fontSize: "1.1rem" 
                                }}
                              >
                                {entryName}
                              </span>
                              {entry.supported_country && (
                                <FlagIcon teamName={entry.supported_country} />
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td style={{ ...DASHBOARD_STYLES.td, textAlign: "right", fontSize: "1.1rem" }}>
                          <strong>{entry.points}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <div style={DASHBOARD_STYLES.flexibleCard}>
            {activePhase === "admin_control" ? (
              <AdminControlCenter onUpdate={fetchDashboardData} />
            ) : activePhase === "admin_results" ? (
              <AdminResultsPage 
                phaseId={systemConfig?.current_phase_id} 
                onUpdate={fetchDashboardData} 
              />
            ) : activePhase === "profile" ? (
              <ProfilePage 
                player={localPlayer} 
                onSave={handleProfileSave} 
                onBack={() => setActivePhase("ranking")} 
              />
            ) : activePhase === "points_analysis" ? (
              <PointsAnalysisPage userId={localPlayer.id} />
            ) : activePhase === "bonus_questions" ? (
              <BonusQuestions userId={localPlayer.id} isReadOnly={isPhase1Locked} />
            ) : activePhase === "support_feedback" ? (
              <SupportFeedbackPage 
                playerId={localPlayer.id} 
                playerName={displayName} 
                isAdmin={localPlayer.is_admin} 
              />
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