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
      // Parallel laden für bessere Performance
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
    // 1. OPTIMISTISCHES UPDATE: Sofort lokal im State ändern
    // Das sorgt dafür, dass der Haken in der Tabelle sofort gesetzt wird
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

    try {
      const { error } = await supabase
        .from("tip_phase")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      
      // 2. Dashboard informieren (triggert fetchDashboardData im Dashboard)
      // Das sorgt dafür, dass die Sidebar sofort aktualisiert wird
      if (onUpdate) onUpdate(); 
      
    } catch (err) {
      console.error("Fehler beim Phasen-Update:", err);
      // BEI FEHLER: Alten Stand wiederherstellen
      fetchAdminData();
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  // --- Handler für globale Sperre ---
  const updateGlobalLock = async (isLockedNow) => {
    // 1. OPTIMISTISCHES UPDATE
    setConfig(prev => ({ ...prev, tips_locked_global: isLockedNow }));
    
    // Logik für die Phasen-States im Admin-Panel
    if (isLockedNow) {
      // Wenn gesperrt wird: Alles unsichtbar machen & sperren
      setPhases(prev => prev.map(p => ({ ...p, is_active: false, is_submitted: true })));
    } else {
      // Wenn entsperrt wird: Sperren lösen, aber alles UNSICHTBAR lassen
      setPhases(prev => prev.map(p => ({ ...p, is_active: false, is_submitted: false })));
    }

    try {
      // 2. Datenbank: Global Config
      const { error: configError } = await supabase
        .from("system_config")
        .update({ tips_locked_global: isLockedNow }) 
        .eq("id", config.id);

      if (configError) throw configError;

      // 3. Datenbank: Alle Phasen gleichzeitig updaten
      const updateData = isLockedNow 
        ? { is_active: false, is_submitted: true }   // Lock AN
        : { is_active: false, is_submitted: false }; // Lock AUS (Alles versteckt & offen)

      const { error: phaseError } = await supabase
        .from("tip_phase")
        .update(updateData)
        .neq("id", 0);

      if (phaseError) throw phaseError;

      // 4. UI/Sidebar informieren
      if (onUpdate) onUpdate(); 
      
      // KEIN fetchAdminData() -> Wir vertrauen unserem optimistischen State!

    } catch (error) {
      console.error("Fehler bei globaler Sperre:", error);
      fetchAdminData(); // Nur bei Fehler zurückrollen
      alert("Fehler beim Speichern.");
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Lade Schaltzentrale...</div>;

  const players = [...new Set(progress.map(item => item.display_name))];

  return (
    <div style={{ padding: "20px", width: "100%", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2 style={{ margin: 0 }}>🕹️ Admin Schaltzentrale</h2>
        
        <div style={{ 
          padding: "15px", 
          borderRadius: "12px", 
          background: config?.tips_locked_global ? "#fee2e2" : "#dcfce7",
          border: `1px solid ${config?.tips_locked_global ? "#ef4444" : "#22c55e"}`,
          transition: "all 0.3s ease"
        }}>
          <label style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={config?.tips_locked_global || false} 
              onChange={(e) => updateGlobalLock(e.target.checked)} 
              style={{ width: "22px", height: "22px" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span>{config?.tips_locked_global ? "🚨 TURNIER GESPERRT" : "✅ TIPPS ERLAUBT"}</span>
                <span style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.7 }}>
                    {config?.tips_locked_global ? "User können nichts mehr ändern" : "User können tippen (falls Phase offen)"}
                </span>
            </div>
          </label>
        </div>
      </header>

      <div style={{ overflowX: "auto", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={headerCellStyle}>Spieler</th>
              {phases.map(p => (
                <th key={p.id} style={{ ...headerCellStyle, borderLeft: "1px solid #e2e8f0", minWidth: "140px" }}>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "bold" }}>Phase {p.id}</div>
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={labelStyle}>
                      <input 
                        type="checkbox" 
                        checked={p.is_active} 
                        onChange={(e) => updatePhase(p.id, 'is_active', e.target.checked)} 
                      /> 
                      <span style={{ fontSize: "12px" }}>Sichtbar</span>
                    </label>
                    <label style={labelStyle}>
                      <input 
                        type="checkbox" 
                        checked={p.is_submitted} 
                        onChange={(e) => updatePhase(p.id, 'is_submitted', e.target.checked)} 
                      /> 
                      <span style={{ fontSize: "12px", color: p.is_submitted ? "#ef4444" : "inherit" }}>Gesperrt 🔒</span>
                    </label>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map(playerName => (
              <tr key={playerName} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "15px", fontWeight: "600", color: "#475569", backgroundColor: "#fcfcfc" }}>{playerName}</td>
                {phases.map(p => {
                  const stats = progress.find(item => item.display_name === playerName && item.phase_id === p.id);
                  const isDone = stats?.tipped_count === stats?.total_matches && stats?.prognosis_count === stats?.total_prognosis;
                  
                  return (
                    <td key={p.id} style={{ padding: "12px", textAlign: "center", borderLeft: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          ⚽ {stats?.tipped_count}/{stats?.total_matches}
                        </span>
                        {stats?.total_prognosis > 0 && (
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                            🌳 {stats?.prognosis_count}/{stats?.total_prognosis}
                          </span>
                        )}
                        <span style={{ marginTop: "4px", filter: isDone ? "none" : "grayscale(1)" }}>
                          {isDone ? "✅" : "⏳"}
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
  );
};

const headerCellStyle = { padding: "15px", textAlign: "left", verticalAlign: "top" };
const labelStyle = { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "500" };

export default AdminControlCenter;