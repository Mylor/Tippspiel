import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Dashboard from "./components/Dashboard"; // Das neue Dashboard

/**
 * 🟢 APP KOMPONENTE
 * Die Schaltzentrale: Regelt den Login-Status und zeigt entweder 
 * die Login-Maske oder das Haupt-Dashboard an.
 */
function App() {
  // --- 1. STATE ---
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // --- 2. INITIALES LADEN ---
  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from("player").select("*");
      setPlayers(data || []);
    }
    loadPlayers();
  }, []);

  // --- 3. HANDLER (LOGIK) ---
  const checkPin = () => {
    // Validierung gegen die PIN aus der Datenbank
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

  // --- 4. RENDERING ---
  return (
    <div style={appContainerStyle}>
      {/* Zeige Dashboard wenn eingeloggt, sonst Login-Maske */}
      {loggedIn ? (
        <Dashboard 
          player={selectedPlayer} 
          onLogout={handleLogout} 
        />
      ) : (
        <div style={loginWrapperStyle}>
          <h1>🏆 WM 2026 Tippspiel</h1>
          
          {!selectedPlayer ? (
            // SCHRITT 1: Auswahl der Spieler-Buttons
            <section>
              <h2>Spieler Login</h2>
              <div style={buttonGridStyle}>
                {players.map((p) => (
                  <button 
                    key={p.id} 
                    onClick={() => setSelectedPlayer(p)} 
                    style={playerButtonStyle}
                  >
                    {p.name || p.display_name}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            // SCHRITT 2: PIN-Eingabe für gewählten Spieler
            <section style={pinAreaStyle}>
              <h3>Hallo, {selectedPlayer.display_name || selectedPlayer.name}</h3>
              <input 
                type="password" 
                placeholder="PIN eingeben" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                style={inputStyle} 
                autoFocus
              />
              <button onClick={checkPin} style={loginConfirmButtonStyle}>
                Einloggen
              </button>
              <button 
                onClick={() => { setSelectedPlayer(null); setError(""); setPin(""); }} 
                style={backLinkStyle}
              >
                ← Zurück zur Liste
              </button>
              {error && <p style={errorStyle}>{error}</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const appContainerStyle = { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: "#f0f2f5", minHeight: "100vh" };
const loginWrapperStyle = { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "50px" };
const buttonGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "320px" };
const playerButtonStyle = { padding: "15px", cursor: "pointer", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "8px", fontWeight: "600", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
const pinAreaStyle = { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", textAlign: "center", width: "300px" };
const inputStyle = { padding: "12px", width: "100%", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "10px", fontSize: "16px", textAlign: "center" };
const loginConfirmButtonStyle = { width: "100%", padding: "12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const backLinkStyle = { marginTop: "15px", background: "none", border: "none", color: "#007bff", cursor: "pointer", fontSize: "14px" };
const errorStyle = { color: "#dc3545", fontSize: "14px", marginTop: "10px", fontWeight: "500" };

export default App;