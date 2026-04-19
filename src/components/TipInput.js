import React, { useState, useEffect } from 'react';

/**
 * TipInput: Das Eingabefeld für Tore und (bei KO-Spielen) den Sieger.
 * Speichert automatisch bei jeder Änderung (Auto-Save).
 */
const TipInput = ({ 
  teamA, teamB, onSave, isKO, 
  initialGoalsA, initialGoalsB, initialWinner, onlyWinner 
}) => {
  
  // --- STATE ---
  const [goalsA, setGoalsA] = useState(initialGoalsA ?? "");
  const [goalsB, setGoalsB] = useState(initialGoalsB ?? "");
  const [winner, setWinner] = useState(initialWinner ?? "");

  // Synchronisation bei externen Änderungen (z.B. durch Reset)
  useEffect(() => {
    setGoalsA(initialGoalsA ?? "");
    setGoalsB(initialGoalsB ?? "");
    setWinner(initialWinner ?? "");
  }, [initialGoalsA, initialGoalsB, initialWinner]);

  // --- LOGIK: VALIDIERUNG & SPEICHERN ---

  /**
   * Prüft, ob die Eingaben vollständig sind und triggert onSave.
   */
  const checkAndSave = (a, b, w) => {
    // FALL A: Nur Sieger-Tipp (z.B. Phase 1 KO-Baum Prognose)
    if (onlyWinner) {
      if (w) onSave(null, null, w);
      return;
    }

    // FALL B: Tore-Eingabe (Reguläres Spiel)
    if (a !== "" && b !== "") {
      const gA = Number(a);
      const gB = Number(b);
      let finalWinner = w;

      // Speziallogik für KO-System (Unentschieden erfordert manuellen Sieger-Pick)
      if (isKO) {
        if (gA > gB) {
          finalWinner = "1"; 
        } else if (gB > gA) {
          finalWinner = "2"; 
        } else {
          // Bei Remis in KO-Runde muss ein Sieger im Dropdown gewählt sein
          if (!w || w === "") return; 
          finalWinner = w;
        }
      }
      
      setWinner(finalWinner);
      onSave(gA, gB, finalWinner);
    }
  };

  /**
   * Behandelt Änderungen an den Tore-Inputs
   */
  const handleInputChange = (val, field) => {
    let newA = goalsA;
    let newB = goalsB;

    if (field === 'A') {
      newA = val;
      setGoalsA(val);
    } else {
      newB = val;
      setGoalsB(val);
    }

    checkAndSave(newA, newB, winner);
  };

  // --- RENDER ---
  return (
    <div style={containerStyle}>
      
      {/* ⚽ TORE-INPUTS (Ausgeblendet bei onlyWinner-Modus) */}
      {!onlyWinner && (
        <div style={inputGroupStyle}>
          <input
            type="number"
            value={goalsA}
            onChange={(e) => handleInputChange(e.target.value, 'A')}
            style={numberInputStyle}
            min="0"
          />
          <span style={dividerStyle}>:</span>
          <input
            type="number"
            value={goalsB}
            onChange={(e) => handleInputChange(e.target.value, 'B')}
            style={numberInputStyle}
            min="0"
          />
        </div>
      )}

      {/* 🏆 SIEGER-DROPDOWN (Erscheint bei onlyWinner ODER Remis in KO-Phase) */}
      {(onlyWinner || (isKO && goalsA !== "" && goalsB !== "" && Number(goalsA) === Number(goalsB))) && (
        <select 
          value={winner} 
          onChange={(e) => {
            const nextWinner = e.target.value;
            setWinner(nextWinner);
            checkAndSave(goalsA, goalsB, nextWinner);
          }}
          style={selectStyle}
        >
          <option value="">Sieger wählen...</option>
          <option value="1">{teamA}</option>
          <option value="2">{teamB}</option>
        </select>
      )}
    </div>
  );
};

// --- STYLES ---

const containerStyle = { display: "flex", flexDirection: "column", gap: "5px" };
const inputGroupStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" };
const dividerStyle = { fontWeight: "bold" };

const numberInputStyle = { 
  width: "35px", 
  textAlign: "center", 
  borderRadius: "4px", 
  border: "1px solid #cbd5e0",
  fontSize: "0.9rem",
  padding: "2px"
};

const selectStyle = { 
  fontSize: "10px", 
  width: "100%",
  padding: "2px",
  borderRadius: "4px",
  border: "1px solid #cbd5e0",
  backgroundColor: "#fff"
};

export default TipInput;