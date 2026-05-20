import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AdminControlCenter = ({ onUpdate }) => {
  const [progress, setProgress] = useState([]);
  const [phases, setPhases] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [progRes, phaseRes, configRes] = await Promise.all([
        supabase.from("admin_tip_progress").select("*").order("player_id"),
        supabase.from("tip_phase").select("*").order("id"),
        supabase.from("system_config").select("*").single()
      ]);

      setProgress(progRes.data || []);
      setPhases(phaseRes.data || []);
      setConfig(configRes.data);
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
    
    if (isLockedNow) {
      setPhases(prev => prev.map(p => ({ ...p, is_active: false, is_submitted: true })));
    } else {
      setPhases(prev => prev.map(p => ({ ...p, is_active: false, is_submitted: false })));
    }

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
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", color: "#64748b" }}>
        <div style={spinnerStyle}></div>
        <p style={{ marginTop: "12px", fontWeight: "500" }}>Lade Schaltzentrale...</p>
      </div>
    );
  }

  const players = [...new Set(progress.map(item => item.display_name))];
  const isGlobalLocked = config?.tips_locked_global || false;

  return (
    <div style={{ padding: "24px", width: "100%", fontFamily: "system-ui, sans-serif", backgroundColor: "#f8fafc", minHeight: "100vh", boxSizing: "border-box" }}>
      
      {/* HEADER SECTION */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>🕹️ Admin Schaltzentrale</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Steuere die Sichtbarkeiten, Abgabefristen und überwache den Live-Tippstatus aller Spieler.</p>
        </div>
        
        {/* GLOBAL LOCK TOGGLE CARD */}
        <div style={{ 
          padding: "16px 24px", 
          borderRadius: "16px", 
          background: isGlobalLocked ? "#fff5f5" : "#f0fdf4",
          border: `1px solid ${isGlobalLocked ? "#fecaca" : "#bbf7d0"}`,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <label style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={isGlobalLocked} 
              onChange={(e) => updateGlobalLock(e.target.checked)} 
              style={checkboxGlobalStyle}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "14px", color: isGlobalLocked ? "#991b1b" : "#166534", letterSpacing: "0.5px" }}>
                {isGlobalLocked ? "🚨 TURNIER KOMPLETT GESPERRT" : "✅ TIPPMODUS AKTIV"}
              </span>
              <span style={{ fontSize: "11px", fontWeight: "500", color: isGlobalLocked ? "#dc2626" : "#15803d", opacity: 0.8, marginTop: "2px" }}>
                {isGlobalLocked ? "Sämtliche Eingaben aller User sind eingefroren" : "User können tippen (sofern Phase geöffnet ist)"}
              </span>
            </div>
          </label>
        </div>
      </header>

      {/* MONITORING & CONTROL TABLE */}
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9" }}>
                <th style={{ ...headerCellStyle, width: "220px" }}>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#475569", fontWeight: "700" }}>Spieler-Übersicht</span>
                </th>
                {phases.map(p => (
                  <th key={p.id} style={{ ...headerCellStyle, borderLeft: "1px solid #e2e8f0", minWidth: "160px" }}>
                    <div style={{ fontSize: "15px", color: "#0f172a", fontWeight: "700" }}>🏆 Phase {p.id}</div>
                    
                    {/* Phase Controls Wrapper */}
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ ...labelStyle, color: p.is_active ? "#2563eb" : "#64748b" }}>
                        <input 
                          type="checkbox" 
                          checked={p.is_active} 
                          onChange={(e) => updatePhase(p.id, 'is_active', e.target.checked)} 
                          style={checkboxRowStyle}
                        /> 
                        <span>Sichtbar</span>
                      </label>
                      <label style={{ 
                        ...labelStyle, 
                        color: p.is_submitted ? "#e11d48" : "#64748b",
                        backgroundColor: p.is_submitted ? "#fff1f2" : "transparent",
                        padding: p.is_submitted ? "2px 6px" : "2px 0",
                        borderRadius: "4px"
                      }}>
                        <input 
                          type="checkbox" 
                          checked={p.is_submitted} 
                          onChange={(e) => updatePhase(p.id, 'is_submitted', e.target.checked)} 
                          style={checkboxRowStyle}
                        /> 
                        <span>Gesperrt 🔒</span>
                      </label>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((playerName, index) => (
                <tr key={playerName} style={{ 
                  backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                  transition: "background-color 0.15s ease",
                }}>
                  {/* Player Name Cell */}
                  <td style={{ 
                    padding: "16px 20px", 
                    fontWeight: "600", 
                    color: "#1e293b", 
                    fontSize: "14px",
                    borderBottom: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={avatarDummyStyle}>{playerName.charAt(0).toUpperCase()}</div>
                      {playerName}
                    </div>
                  </td>
                  
                  {/* Phase Status Cells */}
                  {phases.map(p => {
                    const stats = progress.find(item => item.display_name === playerName && item.phase_id === p.id);
                    const isDone = stats?.tipped_count === stats?.total_matches && stats?.prognosis_count === stats?.total_prognosis;
                    
                    return (
                      <td key={p.id} style={{ 
                        padding: "14px 16px", 
                        textAlign: "center", 
                        borderLeft: "1px solid #e2e8f0",
                        borderBottom: "1px solid #e2e8f0",
                        verticalAlign: "middle"
                      }}>
                        <div style={{ 
                          display: "inline-flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          gap: "4px",
                          background: isDone ? "#f0fdf4" : "#fafafa",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: `1px solid ${isDone ? "#bbf7d0" : "#e2e8f0"}`,
                          minWidth: "90px",
                          boxShadow: isDone ? "0 2px 4px rgba(34,197,94,0.05)" : "none"
                        }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                            ⚽ {stats?.tipped_count || 0}/{stats?.total_matches || 0}
                          </span>
                          
                          {stats?.total_prognosis > 0 && (
                            <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>
                              🌳 {stats?.prognosis_count || 0}/{stats?.total_prognosis || 0}
                            </span>
                          )}
                          
                          <span style={{ 
                            fontSize: "12px",
                            marginTop: "2px",
                            display: "inline-block",
                            transform: isDone ? "scale(1.1)" : "scale(1)",
                            filter: isDone ? "none" : "saturate(0.5) opacity(0.6)",
                            transition: "all 0.2s ease"
                          }}>
                            {isDone ? "✅ FERTIG" : "⏳ OFFEN"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- REFRESHED UI STYLE OBJECTS ---
const headerCellStyle = { 
  padding: "16px 20px", 
  textAlign: "left", 
  verticalAlign: "top",
  borderBottom: "2px solid #cbd5e1"
};

const labelStyle = { 
  display: "flex", 
  alignItems: "center", 
  gap: "8px", 
  cursor: "pointer", 
  fontWeight: "600",
  fontSize: "13px",
  transition: "all 0.2s ease"
};

const checkboxGlobalStyle = {
  width: "20px", 
  height: "20px", 
  cursor: "pointer",
  accentColor: "#dc2626"
};

const checkboxRowStyle = {
  width: "15px",
  height: "15px",
  cursor: "pointer",
  accentColor: "#2563eb"
};

const avatarDummyStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  backgroundColor: "#e2e8f0",
  color: "#475569",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "bold",
  border: "1px solid #cbd5e1"
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid #f3f3f3",
  borderTop: "4px solid #3b82f6",
  borderRadius: "50%",
  margin: "0 auto",
  animation: "spin 1s linear infinite"
};

// Fügt Keyframe-Animation für den Lade-Spinner direkt hinzu falls benötigt
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

export default AdminControlCenter;