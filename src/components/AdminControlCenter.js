import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { FlagIcon } from "../Utils/teamUtils";

// --- IMPORT AUS DEINER CENTRAL STYLE DATEI ---
import { ADMIN_STYLES, JerseyIcon, getAdminBadgeConfig } from "../Utils/uiConstants"; 

const AdminControlCenter = ({ onUpdate }) => {
  const [progress, setProgress] = useState([]);
  const [phases, setPhases] = useState([]);
  const [config, setConfig] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]); 
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [submissions, setSubmissions] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [progRes, phaseRes, configRes, playerRes, submissionRes] = await Promise.all([
        supabase.from("admin_tip_progress").select("*").order("player_id"),
        supabase.from("tip_phase").select("*").order("id"),
        supabase.from("system_config").select("*").single(),
        supabase.from("player").select("id, display_name, name_color, jersey_number, supported_country").order("display_name"), 
        supabase.from("player_phase_submission").select("*")
      ]);

      setProgress(progRes.data || []);
      setPhases(phaseRes.data || []);
      setConfig(configRes.data);
      setSubmissions(submissionRes.data || []);
      setAllPlayers(playerRes.data || []); 

      const profileMap = {};
      if (playerRes.data) {
        playerRes.data.forEach(p => {
          profileMap[p.display_name] = {
            id: p.id, 
            color: p.name_color || "#000000",
            jerseyNumber: p.jersey_number || "",
            supportedCountry: p.supported_country 
          };
        });
      }
      setPlayerProfiles(profileMap);
    } catch (err) {
      console.error("Fehler beim Laden der Admin-Daten:", err);
    } finally {
      setLoading(false);
    }
  };

  const updatePhase = async (id, field, value) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    try {
      const { error } = await supabase
        .from("tip_phase")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      if (onUpdate) onUpdate(); 
    } catch (err) {
      console.error("Fehler beim Phasen-Update:", err);
      fetchAdminData();
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  const updateGlobalLock = async (isLockedNow) => {
    setConfig(prev => ({ ...prev, tips_locked_global: isLockedNow }));
    setPhases(prev => prev.map(p => ({ ...p, is_active: false, is_submitted: isLockedNow })));

    try {
      const { error: configError } = await supabase
        .from("system_config")
        .update({ tips_locked_global: isLockedNow }) 
        .eq("id", config.id);

      if (configError) throw configError;

      const updateData = isLockedNow 
        ? { is_active: false, is_submitted: true }   
        : { is_active: false, is_submitted: false }; 

      const { error: phaseError } = await supabase
        .from("tip_phase")
        .update(updateData)
        .neq("id", 0);

      if (phaseError) throw phaseError;
      if (onUpdate) onUpdate(); 
    } catch (error) {
      console.error("Fehler bei globaler Sperre:", error);
      fetchAdminData(); 
      alert("Fehler beim Speichern.");
    }
  };

  if (loading) {
    return (
      <div style={ADMIN_STYLES.loadingContainer}>
        <div style={ADMIN_STYLES.spinner}></div>
        <p style={ADMIN_STYLES.loadingText}>Lade Schaltzentrale...</p>
      </div>
    );
  }

  const isGlobalLocked = config?.tips_locked_global || false;

  return (
    <div style={ADMIN_STYLES.container}>
      
      {/* HEADER SECTION */}
      <header style={ADMIN_STYLES.header}>
        <div>
          <h2 style={ADMIN_STYLES.headerTitle}>🕹️ Admin Schaltzentrale</h2>
          <p style={ADMIN_STYLES.headerSub}>Steuere die Sichtbarkeiten, Abgabefristen und überwache den Live-Tippstatus aller Spieler.</p>
        </div>
        
        {/* GLOBAL LOCK TOGGLE CARD */}
        <div style={ADMIN_STYLES.globalLockCard(isGlobalLocked)}>
          <label style={ADMIN_STYLES.globalLockLabel}>
            <input 
              type="checkbox" 
              checked={isGlobalLocked} 
              onChange={(e) => updateGlobalLock(e.target.checked)} 
              style={ADMIN_STYLES.checkboxGlobal}
            />
            <div style={ADMIN_STYLES.globalLockTextFlex}>
              <span style={ADMIN_STYLES.globalLockStatusText(isGlobalLocked)}>
                {isGlobalLocked ? "🚨 TURNIER KOMPLETT GESPERRT" : "✅ TIPPMODUS AKTIV"}
              </span>
              <span style={ADMIN_STYLES.globalLockDescText(isGlobalLocked)}>
                {isGlobalLocked ? "Sämtliche Eingaben aller User sind eingefroren" : "User können tippen (sofern Phase geöffnet ist)"}
              </span>
            </div>
          </label>
        </div>
      </header>

      {/* MONITORING & CONTROL TABLE */}
      <div style={ADMIN_STYLES.tableCard}>
        <div style={ADMIN_STYLES.tableResponsive}>
          <table style={ADMIN_STYLES.table}>
            <thead>
              <tr style={ADMIN_STYLES.theadRow}>
                <th style={{ ...ADMIN_STYLES.headerCell, width: "280px" }}>
                  <span style={ADMIN_STYLES.playerOverviewSpan}>Spieler-Übersicht</span>
                </th>
                {phases.map(p => (
                  <th key={p.id} style={{ ...ADMIN_STYLES.headerCell, borderLeft: "1px solid #e2e8f0", minWidth: "180px" }}>
                    <div style={ADMIN_STYLES.phaseTitle}>🏆 Phase {p.id}</div>
                    
                    <div style={ADMIN_STYLES.phaseControlFlex}>
                      <label style={{ ...ADMIN_STYLES.label, ...ADMIN_STYLES.activeLabel(p.is_active) }}>
                        <input 
                          type="checkbox" 
                          checked={p.is_active} 
                          onChange={(e) => updatePhase(p.id, 'is_active', e.target.checked)} 
                          style={ADMIN_STYLES.checkboxRow}
                        /> 
                        <span>Sichtbar</span>
                      </label>
                      <label style={{ ...ADMIN_STYLES.label, ...ADMIN_STYLES.submittedLabel(p.is_submitted) }}>
                        <input 
                          type="checkbox" 
                          checked={p.is_submitted} 
                          onChange={(e) => updatePhase(p.id, 'is_submitted', e.target.checked)} 
                          style={ADMIN_STYLES.checkboxRow}
                        /> 
                        <span>Gesperrt 🔒</span>
                      </label>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPlayers.map((player, index) => {
                const playerName = player.display_name;
                const profile = playerProfiles[playerName] || { 
                  id: player.id, 
                  color: player.name_color || "#000000", 
                  jerseyNumber: player.jersey_number || "", 
                  supportedCountry: player.supported_country 
                };

                return (
                  <tr key={player.id} style={ADMIN_STYLES.playerRow(index)}>
                    {/* Spieler-Zelle */}
                    <td style={ADMIN_STYLES.playerCell}>
                      <div style={ADMIN_STYLES.playerFlex}>
                        <JerseyIcon color={profile.color} number={profile.jerseyNumber} size={38} />
                        <div style={ADMIN_STYLES.playerNameFlex}>
                          <span style={ADMIN_STYLES.playerNameText(profile.color)}>
                            {playerName}
                          </span>
                          {profile.supportedCountry && (
                            <FlagIcon teamName={profile.supportedCountry} />
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Status-Zellen */}
                    {phases.map(p => {
                      const stats = progress.find(item => item.display_name === playerName && item.phase_id === p.id);
                      
                      const isDone = stats && stats.total_matches > 0 && 
                                     stats.tipped_count === stats.total_matches && 
                                     (stats.total_prognosis === 0 || stats.prognosis_count === stats.total_prognosis) &&
                                     (stats.total_bonus === 0 || stats.bonus_count === stats.total_bonus);
                      
                      const currentPlayerId = profile.id;
                      const isSubmitted = submissions.some(sub => sub.player_id === currentPlayerId && sub.phase_id === p.id && sub.is_submitted === true);
                      
                      // Dynamische Badge-Kofiguration abrufen
                      const badge = getAdminBadgeConfig(isSubmitted, isDone);

                      return (
                        <td key={p.id} style={ADMIN_STYLES.statusCell}>
                          <div style={badge.style}>
                            {/* Zeile 1: Ligaspiele */}
                            <span style={ADMIN_STYLES.badgeTextMatches}>
                              ⚽ {stats?.tipped_count || 0}/{stats?.total_matches || 0}
                            </span>
                            
                            {/* Zeile 2: K.o.-Prognosen */}
                            {stats?.total_prognosis > 0 && (
                              <span style={ADMIN_STYLES.badgeTextSub}>
                                🌳 {stats?.prognosis_count || 0}/{stats?.total_prognosis || 0}
                              </span>
                            )}

                            {/* Zeile 3: Bonusfragen */}
                            {stats?.total_bonus > 0 && (
                              <span style={ADMIN_STYLES.badgeTextSub}>
                                🔮 {stats?.bonus_count || 0}/{stats?.total_bonus || 0}
                              </span>
                            )}
                            
                            <span style={ADMIN_STYLES.badgeStatusLabel(badge.textColor)}>
                              {badge.label}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminControlCenter;