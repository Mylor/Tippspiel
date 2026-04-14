import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import TippsPage from "./components/TippsPage";

/**
 * 🟢 APP KOMPONENTE
 * Zuständig für Login, Logout und die Hauptnavigation (Phasen)
 */
function App() {
  // --- STATE ---
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [phase, setPhase] = useState(1);

  // --- SPIELER BEIM START LADEN ---
  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from("player").select("*");
      setPlayers(data || []);
    }
    loadPlayers();
  }, []);

  // --- LOGIN LOGIK ---
  function checkPin() {
    if (selectedPlayer && pin === selectedPlayer.pin) {
      setLoggedIn(true);
      setError("");
    } else {
      setError("Falscher PIN");
    }
  }

  function logout() {
    setSelectedPlayer(null);
    setPin("");
    setLoggedIn(false);
    setError("");
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🏆 WM 2026 Tippspiel</h1>

      {/* 🔐 LOGIN-BEREICH (Wird nur angezeigt, wenn nicht eingeloggt) */}
      {!loggedIn ? (
        <div style={{ maxWidth: "300px", marginTop: "20px" }}>
          <h2>Spieler Login</h2>
          
          {!selectedPlayer ? (
            // Schritt 1: Spielerliste zeigen
            players.map((p) => (
              <button 
                key={p.id} 
                onClick={() => setSelectedPlayer(p)} 
                style={buttonStyle}
              >
                {p.name}
              </button>
            ))
          ) : (
            // Schritt 2: PIN Eingabe zeigen
            <div>
              <h3>Hallo, {selectedPlayer.name}</h3>
              <input 
                type="password" 
                placeholder="PIN eingeben" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                style={inputStyle} 
              />
              <button onClick={checkPin} style={loginButtonStyle}>
                Einloggen
              </button>
              <button 
                onClick={() => { setSelectedPlayer(null); setError(""); setPin(""); }} 
                style={backButtonStyle}
              >
                Zurück zur Liste
              </button>
              {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
            </div>
          )}
        </div>
      ) : (
        /* 🎯 HAUPT-APP-BEREICH (Wird nach Login angezeigt) */
        <div style={{ display: "flex", marginTop: "20px" }}>
          
          {/* 🟣 SIDEBAR (Navigation) */}
          <div style={sidebarStyle}>
            <h3>Tipp-Runden</h3>
            {[1, 2, 3, 4, 5].map((p) => (
              <button 
                key={p} 
                onClick={() => setPhase(p)} 
                style={{
                  ...phaseButtonStyle,
                  background: phase === p ? "#007bff" : "#fff",
                  color: phase === p ? "#fff" : "#000"
                }}
              >
                Phase {p}
              </button>
            ))}
            <hr style={{ margin: "20px 0", border: "0", borderTop: "1px solid #eee" }} />
            <button onClick={logout} style={logoutButtonStyle}>
              Logout
            </button>
          </div>

          {/* 🟢 CONTENT (Die ausgelagerte TippsPage) */}
          <div style={{ flex: 1, overflow: "auto", maxHeight: "90vh" }}>
             <TippsPage player={selectedPlayer} phaseId={phase} />
          </div>

        </div>
      )}
    </div>
  );
}

// --- KLEINE STYLES (In-line für die Übersichtlichkeit) ---

const buttonStyle = {
  display: "block",
  width: "100%",
  margin: "10px 0",
  padding: "12px",
  cursor: "pointer",
  backgroundColor: "#f8f9fa",
  border: "1px solid #ddd",
  borderRadius: "5px"
};

const inputStyle = {
  padding: "12px",
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "5px",
  border: "1px solid #ccc"
};

const loginButtonStyle = {
  marginTop: "10px",
  padding: "12px",
  width: "100%",
  backgroundColor: "#28a745",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

const backButtonStyle = {
  marginTop: "10px",
  background: "none",
  border: "none",
  color: "#666",
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: "0.9em"
};

const sidebarStyle = {
  width: "160px",
  borderRight: "1px solid #eee",
  marginRight: "20px",
  paddingRight: "10px"
};

const phaseButtonStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginBottom: "8px",
  border: "1px solid #ddd",
  borderRadius: "5px",
  cursor: "pointer",
  textAlign: "left"
};

const logoutButtonStyle = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

export default App;