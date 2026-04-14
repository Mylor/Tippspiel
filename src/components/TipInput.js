import React, { useState } from 'react';

const TipInput = ({ teamA, teamB, onSave, isKO }) => {
  const [goalsA, setGoalsA] = useState("");
  const [goalsB, setGoalsB] = useState("");
  const [winner, setWinner] = useState(""); // 1 für Team A, 2 für Team B

  const handleChange = (a, b, w) => {
    setGoalsA(a);
    setGoalsB(b);
    setWinner(w);

    // Nur speichern, wenn beide Tore Zahlen sind
    if (a !== "" && b !== "") {
      // Wenn KO-Phase und Unentschieden, muss ein Winner feststehen
      if (isKO && a === b && !w) {
        return; // Warte auf Winner-Auswahl
      }
      onSave(Number(a), Number(b), w);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <input
          type="number"
          min="0"
          value={goalsA}
          placeholder="0"
          style={{ width: "35px" }}
          onChange={(e) => handleChange(e.target.value, goalsB, winner)}
        />
        <span>:</span>
        <input
          type="number"
          min="0"
          value={goalsB}
          placeholder="0"
          style={{ width: "35px" }}
          onChange={(e) => handleChange(goalsA, e.target.value, winner)}
        />
      </div>

      {/* Sonderlogik für KO-Phase bei Unentschieden */}
      {isKO && goalsA !== "" && goalsA === goalsB && (
        <select 
          value={winner} 
          onChange={(e) => handleChange(goalsA, goalsB, e.target.value)}
          style={{ fontSize: "10px", width: "100%" }}
        >
          <option value="">Wer kommt weiter?</option>
          <option value="1">{teamA}</option>
          <option value="2">{teamB}</option>
        </select>
      )}
    </div>
  );
};

export default TipInput;