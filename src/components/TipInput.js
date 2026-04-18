import React, { useState } from 'react';

const TipInput = ({ teamA, teamB, onSave, isKO }) => {
  const [goalsA, setGoalsA] = useState("");
  const [goalsB, setGoalsB] = useState("");
  const [winner, setWinner] = useState(""); // 1 für Team A, 2 für Team B

  const handleChange = (a, b, w) => {
    setGoalsA(a);
    setGoalsB(b);
    setWinner(w);
    
    // Wir entfernen das automatische onSave hier, 
    // damit nicht bei jeder Ziffer gespeichert wird.
  };

  // Neue Funktion für das Speichern beim Verlassen des Feldes oder Auswahl des Siegers
  const handleBlurOrSelect = (a, b, w) => {
    if (a !== "" && b !== "") {
      // Bei Unentschieden im KO-System MUSS ein Winner gewählt sein
      if (isKO && a === b) {
        if (!w) return; // Noch nicht speichern, User muss erst den Dropdown bedienen
      }
      onSave(Number(a), Number(b), w);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <input
          type="number"
          value={goalsA}
          onChange={(e) => handleChange(e.target.value, goalsB, winner)}
          onBlur={() => handleBlurOrSelect(goalsA, goalsB, winner)} // Speichern beim Verlassen
          style={{ width: "35px" }}
        />
        <span>:</span>
        <input
          type="number"
          value={goalsB}
          onChange={(e) => handleChange(goalsA, e.target.value, winner)}
          onBlur={() => handleBlurOrSelect(goalsA, goalsB, winner)} // Speichern beim Verlassen
          style={{ width: "35px" }}
        />
      </div>

      {isKO && goalsA !== "" && goalsA === goalsB && (
        <select 
          value={winner} 
          onChange={(e) => {
            const newWinner = e.target.value;
            setWinner(newWinner);
            handleBlurOrSelect(goalsA, goalsB, newWinner); // Sofort speichern bei Auswahl
          }}
          style={{ fontSize: "10px", width: "100%" }}
        >
          <option value="">Wer kommt weiter?</option>
          <option value="1">Team A</option>
          <option value="2">Team B</option>
        </select>
      )}
    </div>
  );
};

export default TipInput;