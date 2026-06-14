import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Dashboard from "./components/Dashboard";

// Griechische Symbole für die Teams (Exportiert für Dashboard-Nutzung)
export const TEAM_SYMBOLS = {
  Alpha: "α",
  Phi: "\u03C6",
  Gamma: "γ"
};

// Stabile Konfiguration für alle 3 Teams basierend auf den IDs (Exportiert für Dashboard-Nutzung)
export const FORMATION_MAPPING = {
  // --- TEAM ALPHA (4-4-2 + Coach) ---
  29: { team: "Alpha", left: "50%", top: "88%", role: "TW" },
  8:  { team: "Alpha", left: "15%", top: "68%", role: "RV" },
  2:  { team: "Alpha", left: "38%", top: "68%", role: "IV" },
  4:  { team: "Alpha", left: "62%", top: "68%", role: "IV" },
  7:  { team: "Alpha", left: "85%", top: "68%", role: "LV" },
  1:  { team: "Alpha", left: "15%", top: "44%", role: "RM" },
  16: { team: "Alpha", left: "38%", top: "44%", role: "ZM" },
  11: { team: "Alpha", left: "62%", top: "44%", role: "ZM" },
  21: { team: "Alpha", left: "85%", top: "44%", role: "LM" },
  23: { team: "Alpha", left: "32%", top: "18%", role: "ST" },
  32: { team: "Alpha", left: "68%", top: "18%", role: "ST" },
  30: { team: "Alpha", left: "0%",  top: "0%",  role: "Coach" }, // Per Logik im Header platziert

  // --- TEAM Phi (3-4-1-2) ---
  24: { team: "Phi",  left: "50%", top: "88%", role: "TW" },
  28: { team: "Phi",  left: "22%", top: "68%", role: "IV" },
  5:  { team: "Phi",  left: "50%", top: "68%", role: "IV" },
  14: { team: "Phi",  left: "78%", top: "68%", role: "IV" },
  34: { team: "Phi",  left: "15%", top: "46%", role: "RM" },
  18: { team: "Phi",  left: "38%", top: "46%", role: "ZM" },
  15: { team: "Phi",  left: "62%", top: "46%", role: "ZM" },
  9:  { team: "Phi",  left: "85%", top: "46%", role: "LM" },
  25: { team: "Phi",  left: "50%", top: "30%", role: "ZOM" },
  22: { team: "Phi",  left: "32%", top: "14%", role: "ST" },
  26: { team: "Phi",  left: "68%", top: "14%", role: "ST" },

  // --- TEAM GAMMA (4-2-3-1) ---
  10: { team: "Gamma", left: "50%", top: "88%", role: "TW" },
  27: { team: "Gamma", left: "15%", top: "72%", role: "RV" },
  6:  { team: "Gamma", left: "38%", top: "72%", role: "IV" },
  3:  { team: "Gamma", left: "62%", top: "72%", role: "IV" },
  33: { team: "Gamma", left: "85%", top: "72%", role: "LV" },
  13: { team: "Gamma", left: "35%", top: "54%", role: "DM" },
  17: { team: "Gamma", left: "65%", top: "54%", role: "DM" },
  12: { team: "Gamma", left: "20%", top: "34%", role: "RAM" },
  19: { team: "Gamma", left: "50%", top: "34%", role: "CAM" },
  20: { team: "Gamma", left: "80%", top: "34%", role: "LAM" },
  31: { team: "Gamma", left: "50%", top: "14%", role: "ST" }
};

function App() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase
        .from("player")
        .select("*")
        .order("id", { ascending: true });
      
      setPlayers(data || []);
    }
    loadPlayers();
  }, []);

  const checkPin = () => {
    if (selectedPlayer && pin === selectedPlayer.pin) {
      setLoggedIn(true);
      setError("");
    } else {
      setError("Falscher PIN");
    }
  };

  const handleLogout = () => {
    setSelectedPlayer(null);
    setPin("");
    setLoggedIn(false);
    setError("");
  };

  // Gruppierung der Spieler in die 3 Teams
  const teamAlpha = players.filter(p => FORMATION_MAPPING[p.id]?.team === "Alpha");
  const teamPhi  = players.filter(p => FORMATION_MAPPING[p.id]?.team === "Phi");
  const teamGamma = players.filter(p => FORMATION_MAPPING[p.id]?.team === "Gamma");

  const unassignedPlayers = players.filter(p => !FORMATION_MAPPING[p.id]);

  // Das angereicherte Spielerobjekt für das Dashboard
  const enrichedSelectedPlayer = selectedPlayer ? {
    ...selectedPlayer,
    team: FORMATION_MAPPING[selectedPlayer.id]?.team || null,
    teamSymbol: TEAM_SYMBOLS[FORMATION_MAPPING[selectedPlayer.id]?.team] || ""
  } : null;

  const renderHalfField = (teamPlayers, teamTitle, formationLabel) => {
    // Coach aus der Feld-Anzeige filtern
    const pitchPlayers = teamPlayers.filter(p => FORMATION_MAPPING[p.id]?.role !== "Coach");
    const coachPlayer = teamPlayers.find(p => FORMATION_MAPPING[p.id]?.role === "Coach");

    return (
      <div style={teamColumnStyle}>
        <div style={teamHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 style={teamNameStyle}>{teamTitle}</h2>
            {teamTitle === "Team Alpha" && coachPlayer && (
              <div style={headerCoachContainerStyle}>
                <span style={coachLabelStyle}>Coach:</span>
                <button 
                  onClick={() => setSelectedPlayer(coachPlayer)}
                  style={headerCoachButtonStyle}
                >
                  👔 {coachPlayer.name}
                </button>
              </div>
            )}
          </div>
          <span style={formationBadgeStyle}>{formationLabel}</span>
        </div>

        <div style={halfFieldPitchStyle}>
          <div style={halfWayLineStyle} />
          <div style={halfCenterCircleStyle} />
          <div style={penaltyBoxStyle} />
          <div style={goalBoxStyle} />

          {/* Feldspieler rendern */}
          {pitchPlayers.map((p) => {
            const config = FORMATION_MAPPING[p.id];

            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                style={{
                  ...playerTacticalGlassStyle,
                  left: config?.left || "50%",
                  top: config?.top || "50%"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.5)";
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                }}
              >
                <div style={playerNameStyle}>
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={appContainerStyle}>
      {loggedIn ? (
        <Dashboard player={enrichedSelectedPlayer} onLogout={handleLogout} />
      ) : (
        <div style={loginWrapperStyle}>
          <h1 style={titleStyle}>🏆 WM 2026 Tippspiel</h1>
          
          {!selectedPlayer ? (
            <div style={mainLayoutContainerStyle}>
              <div style={flexPitchContainerStyle}>
                {renderHalfField(teamAlpha, "Team Alpha", "4-4-2")}
                {renderHalfField(teamPhi, "Team Phi", "3-4-1-2")}
                {renderHalfField(teamGamma, "Team Gamma", "4-2-3-1")}
              </div>

              {unassignedPlayers.length > 0 && (
                <div style={fallbackBenchContainerStyle}>
                  <h3 style={fallbackTitleStyle}>Weitere Turnierteilnehmer ({unassignedPlayers.length})</h3>
                  <div style={fallbackGridStyle}>
                    {unassignedPlayers.map((p) => (
                      <button key={p.id} onClick={() => setSelectedPlayer(p)} style={fallbackPlayerButtonStyle}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <section style={glassPinCardStyle}>
              <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: "1.3rem" }}>
                Hallo, {selectedPlayer.name}
              </h3>
              <input 
                type="password" 
                placeholder="PIN" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                style={inputStyle} 
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && checkPin()}
              />
              <button onClick={checkPin} style={loginConfirmButtonStyle}>
                Einloggen
              </button>
              <button 
                onClick={() => { setSelectedPlayer(null); setError(""); setPin(""); }} 
                style={backLinkStyle}
              >
                ← Zurück zur Aufstellung
              </button>
              {error && <p style={errorStyle}>{error}</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// --- 🟢 STYLES ---
const appContainerStyle = { 
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
  minHeight: "100vh",
  color: "#f8fafc",
  backgroundColor: "#051410",
  backgroundImage: `
    linear-gradient(to right, transparent calc(50% - 1px), rgba(255, 255, 255, 0.01) calc(50% - 1px), rgba(255, 255, 255, 0.01) calc(50% + 1px), transparent calc(50% + 1px)),
    radial-gradient(circle at 50% 45%, #113d2d 0%, #04120e 100%)
  `,
  backgroundAttachment: "fixed"
};

const loginWrapperStyle = { 
  display: "flex", 
  flexDirection: "column", 
  alignItems: "center", 
  padding: "40px 20px",
  boxSizing: "border-box",
  width: "100%"
};

const titleStyle = {
  margin: "0 0 35px 0", 
  fontSize: "2.8rem", 
  fontWeight: "800",
  color: "#ffffff",
  textShadow: "0 2px 15px rgba(0,0,0,0.5)",
  letterSpacing: "0.5px"
};

const mainLayoutContainerStyle = {
  width: "100%",
  maxWidth: "1800px", 
  display: "flex",
  flexDirection: "column",
  gap: "30px"
};

const flexPitchContainerStyle = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "25px",
  width: "100%"
};

const teamColumnStyle = {
  flex: "1 1 500px",    
  maxWidth: "580px",    
  minWidth: "370px",
  backgroundColor: "rgba(4, 18, 14, 0.25)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "24px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  padding: "20px",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
  boxSizing: "border-box"
};

// 🌟 FIX: Feste Höhe hinzugefügt, damit alle Teams exakt dieselbe Header-Höhe besitzen
const teamHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "48px",
  marginBottom: "15px",
  padding: "0 5px",
  boxSizing: "border-box"
};

const teamNameStyle = {
  margin: 0,
  fontSize: "1.4rem",
  fontWeight: "700",
  color: "#ffffff"
};

const headerCoachContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  padding: "4px 8px",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.08)"
};

const coachLabelStyle = {
  fontSize: "0.8rem",
  color: "#94a3b8",
  fontWeight: "600"
};

const headerCoachButtonStyle = {
  background: "rgba(16, 185, 129, 0.15)",
  border: "1px solid rgba(16, 185, 129, 0.4)",
  borderRadius: "6px",
  color: "#ffffff",
  padding: "4px 10px",
  fontSize: "0.85rem",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)"
};

const formationBadgeStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "0.85rem",
  fontWeight: "600",
  color: "#38bdf8",
  border: "1px solid rgba(56, 189, 248, 0.2)"
};

const halfFieldPitchStyle = {
  position: "relative",
  width: "100%",
  height: "720px",
  backgroundColor: "rgba(10, 35, 26, 0.4)",
  borderRadius: "16px",
  border: "2px solid rgba(255, 255, 255, 0.15)",
  overflow: "hidden"
};

const lineColor = "rgba(255, 255, 255, 0.18)";

const halfWayLineStyle = {
  position: "absolute", top: 0, left: 0, right: 0, height: "2px", backgroundColor: lineColor
};

const halfCenterCircleStyle = {
  position: "absolute", top: 0, left: "50%", width: "140px", height: "140px", border: `2px solid ${lineColor}`, borderRadius: "50%", transform: "translate(-50%, -50%)"
};

const penaltyBoxStyle = {
  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "62%", height: "22%", border: `2px solid ${lineColor}`, borderBottom: "none"
};

const goalBoxStyle = {
  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "26%", height: "7%", border: `2px solid ${lineColor}`, borderBottom: "none"
};

const playerTacticalGlassStyle = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  padding: "8px 12px", 
  cursor: "pointer",
  backgroundColor: "rgba(255, 255, 255, 0.08)",
  color: "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "10px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minWidth: "105px", 
  zIndex: 10,
  boxSizing: "border-box"
};

const playerNameStyle = {
  fontSize: "0.82rem", 
  fontWeight: "600",
  whiteSpace: "nowrap",
  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const fallbackBenchContainerStyle = {
  padding: "20px",
  borderRadius: "16px",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "1px dashed rgba(255, 255, 255, 0.15)"
};

const fallbackTitleStyle = {
  margin: "0 0 12px 0",
  fontSize: "1rem",
  color: "rgba(255, 255, 255, 0.5)",
  textTransform: "uppercase"
};

const fallbackGridStyle = {
  display: "flex", flexWrap: "wrap", gap: "10px"
};

const fallbackPlayerButtonStyle = {
  padding: "8px 14px", backgroundColor: "rgba(255, 255, 255, 0.05)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", cursor: "pointer"
};

const glassPinCardStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
  textAlign: "center",
  width: "330px",
  boxSizing: "border-box",
  marginTop: "40px"
};

const inputStyle = {
  padding: "14px", width: "100%", boxSizing: "border-box", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.2)", backgroundColor: "rgba(255, 255, 255, 0.95)", color: "#0f172a", marginBottom: "14px", fontSize: "20px", textAlign: "center", fontWeight: "700", letterSpacing: "6px"
};

const loginConfirmButtonStyle = {
  width: "100%", padding: "14px", backgroundColor: "#10b981", color: "#ffffff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "1rem", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
};

const backLinkStyle = {
  marginTop: "16px", background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "14px", fontWeight: "600"
};

const errorStyle = {
  color: "#f87171", fontSize: "14px", marginTop: "12px", fontWeight: "600"
};

export default App;