import React, { useState, useEffect } from 'react';

/**
 * TipInput: Das Eingabefeld für Tore und (bei KO-Spielen) den Sieger.
 * Speichert automatisch bei jeder lokalen Änderung.
 */
const TipInput = ({ 
  teamA, teamB, onSave, isKO, 
  initialGoalsA, initialGoalsB, initialWinner, onlyWinner 
}) => {
  
  const [goalsA, setGoalsA] = useState(initialGoalsA ?? "");
  const [goalsB, setGoalsB] = useState(initialGoalsB ?? "");
  const [winner, setWinner] = useState(initialWinner ?? "");

  useEffect(() => {
    setGoalsA(initialGoalsA ?? "");
    setGoalsB(initialGoalsB ?? "");
    setWinner(initialWinner ?? "");
  }, [initialGoalsA, initialGoalsB, initialWinner]);

  const checkAndSave = (a, b, w) => {
    if (onlyWinner) {
      if (w) onSave(null, null, w);
      return;
    }

    if (a !== "" && b !== "") {
      const gA = Number(a);
      const gB = Number(b);
      let finalWinner = w;

      if (gA > gB) {
        finalWinner = "1";
      } else if (gB > gA) {
        finalWinner = "2";
      } else {
        if (isKO) {
          if (!w || w === "") {
            setWinner(""); 
            return; 
          }
          finalWinner = w;
        } else {
          finalWinner = null;
        }
      }
      
      setWinner(finalWinner);
      onSave(gA, gB, finalWinner);
    }
  };

  const handleInputChange = (val, field) => {
    let newA = field === 'A' ? val : goalsA;
    let newB = field === 'B' ? val : goalsB;

    if (field === 'A') setGoalsA(val);
    else setGoalsB(val);

    let updatedWinner = winner; 
    const numA = parseInt(newA);
    const numB = parseInt(newB);

    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA > numB) {
        updatedWinner = "1"; // GEÄNDERT: Als String für Konsistenz
      } else if (numB > numA) {
        updatedWinner = "2"; // GEÄNDERT: Als String für Konsistenz
      } else {
        updatedWinner = null; 
      }
    }

    setWinner(updatedWinner);
    checkAndSave(newA, newB, updatedWinner);
  };

  return (
    <div style={containerStyle}>
      
      {/* 🛠️ DIREKTE KORREKTUR: CSS-Injektion macht diese Komponente komplett autark */}
      <style>{`
        /* Chrome, Safari, Edge, Opera */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Firefox */
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

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

const containerStyle = { display: "flex", flexDirection: "column", gap: "5px" };
const inputGroupStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" };
const dividerStyle = { fontWeight: "bold" };
const numberInputStyle = { width: "35px", textAlign: "center", borderRadius: "4px", border: "1px solid #cbd5e0", fontSize: "0.9rem", padding: "2px" };
const selectStyle = { fontSize: "10px", width: "100%", padding: "2px", borderRadius: "4px", border: "1px solid #cbd5e0", backgroundColor: "#fff" };

export default TipInput;