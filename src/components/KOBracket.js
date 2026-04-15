import React from 'react';
import TipInput from './TipInput';

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
  baseSpacing 
}) => {
  return (
    <div style={{ minWidth: "1200px" }}>
      {/* 🔥 HEADER FIX OBEN */}
      <div style={{ display: "flex", marginBottom: "20px" }}>
        {Object.keys(koByRound).map((round) => (
          <div
            key={round}
            style={{ width: "220px", textAlign: "center", fontWeight: "bold" }}
          >
            {roundNames[round]}
            {!phase?.is_submitted && (
              <div>
                <button onClick={() => deleteKORound(Number(round))}>
                  Zurücksetzen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 🔽 BAUM */}
      <div style={{ position: "relative", height: `${treeHeight/2}px` }}>
        {Object.keys(koByRound)
          .sort((a, b) => Number(a) - Number(b))
          .map((round, roundIndex) => (
            <div key={round} style={{ position: "relative" }}>
              {koByRound[round].map((m, matchIndex) => {
                const tip = tips[m.id];
                const currentTop = getTopPosition(roundIndex, matchIndex);
                const nextTop = getTopPosition(roundIndex + 1, Math.floor(matchIndex / 2));

                let teamA, teamB;
                if (roundIndex === 0) {
                  const matchDef = KO_STRUCTURE.round16[matchIndex];
                  teamA = resolveSlot(matchDef[0], context);
                  teamB = resolveSlot(matchDef[1], context);
                } else {
                  teamA = getTeamFromPrevious(roundIndex, matchIndex, "A", koByRound, tips, context);
                  teamB = getTeamFromPrevious(roundIndex, matchIndex, "B", koByRound, tips, context);
                }

                return (
                  <div
                    key={m.id}
                    style={{
                      position: "absolute",
                      top: `${currentTop}px`,
                      left: `${roundIndex * 220}px`
                    }}
                  >
                    {/* MATCH BOX */}
                    <div style={{
                      border: "1px solid black", padding: "10px", width: "170px",
                      height: "100px", background: "#fff", position: "relative",
                      display: "flex", flexDirection: "column", justifyContent: "space-between"
                    }}>
                      <div>{teamA}</div>
                      <div>{teamB}</div>

                      {/* Prüfen, ob die Phase noch offen ist */}
                      {!phase?.is_submitted ? (
                        <div style={{ marginTop: '5px' }}>
                          {/* Wir zeigen das Dropdown immer an, wenn beide Teams bekannt sind */}
                          {(teamA !== "?" && teamB !== "?") ? (
                            <select 
                              value={tip?.winner || ""} 
                              onChange={(e) => saveTip(m.id, null, null, e.target.value)}
                              style={{ padding: '2px', borderRadius: '4px' }}
                            >
                              <option value="">Sieger wählen...</option>
                              <option value="1">{teamA}</option>
                              <option value="2">{teamB}</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.8em', color: '#888' }}>Warten auf Teams...</span>
                          )}

                          {/* Anzeige des aktuellen Tipps, falls vorhanden */}
                          {tip && tip.winner && (
                            <div style={{ fontWeight: 'bold', color: '#2ecc71', fontSize: '0.9em', marginTop: '3px' }}>
                              Gewählt: {Number(tip.winner) === 1 ? teamA : teamB}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Wenn Phase abgeschlossen: Nur Ergebnis anzeigen */
                        <div>
                          {tip?.goals_a !== null && `${tip.goals_a} : ${tip.goals_b}`}
                          {tip?.winner && ` (${Number(tip.winner) === 1 ? teamA : teamB})`}
                        </div>
                      )}
                    </div>

                    {/* LINIEN LOGIK */}
                    {roundIndex < Object.keys(koByRound).length - 1 && (
                      <>
                        <div style={{ position: "absolute", top: "50%", right: "-25px", width: "25px", height: "2px", background: "black" }} />
                        {matchIndex % 2 === 0 && (
                          <>
                            <div style={{ position: "absolute", top: "50%", right: "-25px", width: "2px", height: `${baseSpacing * Math.pow(2, roundIndex)}px`, background: "black" }} />
                            <div style={{ position: "absolute", top: `calc(${nextTop - currentTop}px + 50%)`, right: "-50px", width: "25px", height: "2px", background: "black" }} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
};

export default KOBracket;