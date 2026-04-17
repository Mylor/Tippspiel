import React from 'react';

const KOBracket = ({ 
  koByRound, 
  tips, 
  phase, 
  roundNames, 
  treeHeight, 
  getTopPosition, 
  getTeamFromPrevious, 
  resolveSlot, 
  context, 
  KO_STRUCTURE, 
  saveTip, 
  deleteKORound,
  baseSpacing, 
}) => {

  if (!phase) {
    return <div style={{ padding: "20px", color: "#666" }}>Lade Turnierdaten...</div>;
  }

  const safeRoundNames = roundNames || {
    1: "Sechzehntelfinale",
    2: "Achtelfinale",
    3: "Viertelfinale",
    4: "Halbfinale",
    5: "Finale"
  };

  const getCountryCode = (teamName) => {
    const mapping = {
      "Mexiko": "mx", "Südafrika": "za", "Südkorea": "kr", "Tschechien": "cz",
      "Kanada": "ca", "Bosnien": "ba", "USA": "us", "Paraguay": "py",
      "Katar": "qa", "Schweiz": "ch", "Brasilien": "br", "Marokko": "ma",
      "Haiti": "ht", "Schottland": "gb-sct", "Australien": "au", "Türkei": "tr",
      "Deutschland": "de", "Curaçao": "cw", "Niederlande": "nl", "Japan": "jp",
      "Elfenbeinküste": "ci", "Ecuador": "ec", "Schweden": "se", "Tunesien": "tn",
      "Spanien": "es", "Kap Verde": "cv", "Belgien": "be", "Ägypten": "eg",
      "Saudi-Arabien": "sa", "Uruguay": "uy", "Iran": "ir", "Neuseeland": "nz",
      "Frankreich": "fr", "Senegal": "sn", "Irak": "iq", "Norwegen": "no",
      "Argentinien": "ar", "Algerien": "dz", "Österreich": "at", "Jordanien": "jo",
      "Portugal": "pt", "Kongo": "cd", "England": "gb-eng", "Kroatien": "hr",
      "Ghana": "gh", "Panama": "pa", "Usbekistan": "uz", "Kolumbien": "co"
    };
    return mapping[teamName] || null;
  };

  const BOX_HEIGHT = 135; 
  const startIdxOfPhase = phase.id <= 2 ? 0 : phase.id - 2;

  return (
    <div style={{ minWidth: "1600px", padding: "20px" }}>
      
      {/* 🔄 RESET-HEADER (Synchron mit der Baum-Anzeige) */}
      <div style={{ display: "flex", marginBottom: "60px" }}>
        {Object.keys(koByRound)
          .sort((a, b) => Number(a) - Number(b))
          .filter((roundKey) => {
            const rIdx = Number(roundKey) - 1;
            return rIdx >= startIdxOfPhase;
          })
          .map((round) => (
            <div 
              key={round} 
              style={{ 
                width: "240px", 
                marginRight: "60px", 
                textAlign: "center", 
                display: "flex", 
                flexDirection: "column", 
                gap: "8px" 
              }}
            >
              <span style={{ fontWeight: "bold", fontSize: "1rem", color: "#2d3748" }}>
                {Number(round) === 5 ? "Finale" : safeRoundNames[round]}
              </span>
              
              {!phase?.is_submitted && (
                <button 
                  onClick={() => deleteKORound(Number(round))} 
                  style={{ 
                    padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#fff", 
                    border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", color: "#666" 
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          ))}
      </div>

      <div style={{ position: "relative", height: `${treeHeight}px` }}>
        {Object.keys(koByRound)
          .sort((a, b) => Number(a) - Number(b))
          .filter((roundKey) => (Number(roundKey) - 1) >= startIdxOfPhase)
          .map((round, visibleRoundIndex) => {
            const actualRoundIdx = Number(round) - 1;
            const isActiveTippingRound = actualRoundIdx === startIdxOfPhase;

            return (
              <div key={round}>
                {koByRound[round].map((m, matchIndex) => {
                  const tip = tips[m.id];
                  const currentTop = getTopPosition(actualRoundIdx, matchIndex);
                  const nextTop = getTopPosition(actualRoundIdx + 1, Math.floor(matchIndex / 2));

                  // TEAM-LOGIK
                  let teamA, teamB;
                  if (phase.id > 1 && isActiveTippingRound) {
                    teamA = m.team_a || "?";
                    teamB = m.team_b || "?";
                  } else if (actualRoundIdx === 0) {
                    const matchDef = KO_STRUCTURE.round16[matchIndex];
                    teamA = resolveSlot(matchDef[0], context);
                    teamB = resolveSlot(matchDef[1], context);
                  } else {
                    teamA = getTeamFromPrevious(actualRoundIdx, matchIndex, "A");
                    teamB = getTeamFromPrevious(actualRoundIdx, matchIndex, "B");
                  }

                  const getWinningSide = () => {
                    if (!tip) return null;
                    const gA = (tip.goals_a !== undefined && tip.goals_a !== null && tip.goals_a !== "") ? Number(tip.goals_a) : null;
                    const gB = (tip.goals_b !== undefined && tip.goals_b !== null && tip.goals_b !== "") ? Number(tip.goals_b) : null;
                    if (gA !== null && gB !== null) {
                      if (gA > gB) return "1";
                      if (gB > gA) return "2";
                      return tip.winner || null;
                    }
                    return tip.winner || null;
                  };

                  const winningSide = getWinningSide();

                  const renderTeamRow = (teamName, side, isFirst) => {
                    const isWinner = winningSide === side;
                    return (
                      <div style={{ 
                        padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: isWinner ? "#f0fff4" : "transparent", borderBottom: isFirst ? "1px solid #f1f5f9" : "none", height: "40px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {teamName !== "?" ? (
                            <div style={{ width: "22px", height: "16px", overflow: "hidden", borderRadius: "2px", border: "1px solid #eee", display: "flex", alignItems: "center" }}>
                              <img src={`https://flagcdn.com/w40/${getCountryCode(teamName)}.png`} alt="" style={{ width: "100%", height: "auto" }} onError={(e) => e.target.style.visibility = 'hidden'} />
                            </div>
                          ) : (
                            <div style={{ width: "22px", height: "16px", backgroundColor: "#f1f5f9", borderRadius: "2px" }} />
                          )}
                          <span style={{ fontSize: "0.85rem", fontWeight: isWinner ? "700" : "400", color: teamName === "?" ? "#cbd5e0" : "#1e293b" }}>
                            {teamName}
                          </span>
                        </div>
                        {isWinner && <span style={{ color: "#48bb78", fontWeight: "bold" }}>✓</span>}
                      </div>
                    );
                  };

                  return (
                    <div key={m.id} style={{ position: "absolute", top: `${currentTop}px`, left: `${visibleRoundIndex * 300}px`, height: `${BOX_HEIGHT}px` }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: "bold", color: "#878b8e", textTransform: "uppercase", marginBottom: "4px" }}>
                        {actualRoundIdx === 4 ? (matchIndex === 1 ? "Spiel um Platz 3" : "Finale") : `${safeRoundNames[round]} ${matchIndex + 1}`}
                      </div>

                      <div style={{ width: "240px", minHeight: "115px", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        {renderTeamRow(teamA, "1", true)}
                        {renderTeamRow(teamB, "2", false)}

                        <div style={{ padding: "6px 10px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                          {!phase?.is_submitted ? (
                            (teamA !== "?" && teamB !== "?") ? (
                              (phase.id > 1 && isActiveTippingRound) ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <input type="number" value={tip?.goals_a ?? ""} onChange={(e) => saveTip(m.id, e.target.value, tip?.goals_b ?? "", null)} style={{ width: "45px", textAlign: "center", border: "1px solid #cbd5e0", borderRadius: "4px" }} placeholder="0" />
                                    <span style={{ fontWeight: "bold" }}>:</span>
                                    <input type="number" value={tip?.goals_b ?? ""} onChange={(e) => saveTip(m.id, tip?.goals_a ?? "", e.target.value, null)} style={{ width: "45px", textAlign: "center", border: "1px solid #cbd5e0", borderRadius: "4px" }} placeholder="0" />
                                  </div>
                                  {tip?.goals_a !== "" && tip?.goals_b !== "" && Number(tip?.goals_a) === Number(tip?.goals_b) && (
                                    <select value={tip?.winner || ""} onChange={(e) => saveTip(m.id, tip.goals_a, tip.goals_b, e.target.value)} style={{ width: "100%", fontSize: "0.65rem", border: "1px solid #cbd5e0", borderRadius: "4px" }}>
                                      <option value="">Wer kommt weiter?</option>
                                      <option value="1">{teamA}</option>
                                      <option value="2">{teamB}</option>
                                    </select>
                                  )}
                                </div>
                              ) : (
                                <select value={tip?.winner || ""} onChange={(e) => saveTip(m.id, null, null, e.target.value)} style={{ width: "100%", fontSize: "0.7rem", border: "1px solid #cbd5e0", borderRadius: "4px" }}>
                                  <option value="">Sieger wählen...</option>
                                  <option value="1">{teamA}</option>
                                  <option value="2">{teamB}</option>
                                </select>
                              )
                            ) : <div style={{ fontSize: "0.65rem", color: "#94a3b8", textAlign: "center" }}>Warten...</div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", textAlign: "center", fontWeight: "bold", color: "#475569" }}>
                              {tip?.goals_a !== null && tip?.goals_a !== "" ? `${tip.goals_a} : ${tip.goals_b}` : (tip?.winner ? (Number(tip.winner) === 1 ? teamA : teamB) : "-")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* LINIEN-LOGIK */}
                      {actualRoundIdx < 4 && (
                        <>
                          {/* 1. Horizontale Linie aus der Box raus */}
                          <div style={{ 
                            position: "absolute", 
                            top: "82px", 
                            right: "-30px", 
                            width: "30px", 
                            height: "2px", 
                            background: "#cbd5e0" 
                          }} />
                          
                          {/* 2. Vertikale Linie zur Mitte (Treffpunkt) */}
                          <div style={{ 
                            position: "absolute", 
                            // Wenn matchIndex gerade ist (0, 2...), geht die Linie nach unten.
                            // Wenn matchIndex ungerade ist (1, 3...), geht sie nach oben.
                            top: matchIndex % 2 === 0 ? "82px" : `calc(82px - ${Math.abs(nextTop - currentTop)}px)`, 
                            right: "-30px", 
                            width: "2px", 
                            height: `${Math.abs(nextTop - currentTop)}px`, 
                            background: "#cbd5e0" 
                          }} />

                          {/* 3. Horizontale Linie in die nächste Runde (nur vom "oberen" Spiel gezeichnet, damit sie nicht doppelt liegt) */}
                          {matchIndex % 2 === 0 && (
                            <div style={{ 
                              position: "absolute", 
                              top: `${(nextTop - currentTop) + 82}px`, 
                              right: "-60px", 
                              width: "30px", 
                              height: "2px", 
                              background: "#cbd5e0" 
                            }} />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default KOBracket;