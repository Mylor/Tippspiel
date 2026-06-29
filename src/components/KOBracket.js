import React from 'react';
import TipInput from './TipInput';
import { FlagIcon } from '../Utils/teamUtils'; 
import { BRACKET_STYLES, PHASE_HEIGHTS } from '../Utils/uiConstants';

const BOX_HEIGHT = 135;

const KOBracket = ({ 
  koByRound, tips, phase, roundNames, treeHeight, getTopPosition, 
  getTeamFromPrevious, resolveSlot, context, KO_STRUCTURE, 
  saveTip, deleteKORound, isAdmin,
  isReadOnly = false // Verhindert Eingaben im gesamten KO-Baum (z.B. auf der Result Page)
}) => {

  if (!phase) return <div style={BRACKET_STYLES.loading}>Lade Turnierdaten...</div>;

  const safeRoundNames = roundNames || { 
    1: "Sechzehntelfinale", 2: "Achtelfinale", 3: "Viertelfinale", 4: "Halbfinale", 5: "Finale" 
  };
  
  const startIdxOfPhase = phase.id <= 2 ? 0 : phase.id - 2;

  const TeamRow = ({ teamName, side, isFirst, winningSide }) => {
    const isWinner = winningSide === side;
    return (
      <div style={BRACKET_STYLES.teamRow(isWinner, isFirst)}>
        <div style={BRACKET_STYLES.teamInfoFlex}>
          <FlagIcon teamName={teamName} />
          <span style={{ 
            ...BRACKET_STYLES.teamNameText, 
            fontWeight: isWinner ? "700" : "400", 
            color: teamName === "?" ? "#cbd5e0" : "#1e293b" 
          }}>
            {teamName}
          </span>
        </div>
        {isWinner && <span style={BRACKET_STYLES.checkMark}>✓</span>}
      </div>
    );
  };

  return (
    <div style={BRACKET_STYLES.viewport(PHASE_HEIGHTS[phase.id])}>
      
      {/* 🛠️ DIREKTE KORREKTUR: CSS-Injektion blendet Pfeile im gesamten KO-Baum/TipInput aus */}
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
      
      {/* HEADER: Spalten-Reset-Buttons ausblenden bei isReadOnly */}
      <div style={BRACKET_STYLES.headerRow}>
        {Object.keys(koByRound)
          .sort((a, b) => Number(a) - Number(b))
          .filter(r => (Number(r)-1) >= startIdxOfPhase)
          .map(round => (
          <div key={round} style={BRACKET_STYLES.headerColumn}>
            <span style={BRACKET_STYLES.roundTitle}>{Number(round) === 5 ? "Finale" : safeRoundNames[round]}</span>
            {!isReadOnly && (!phase?.is_submitted || isAdmin) && (
              <button onClick={() => deleteKORound(Number(round), phase.id)} style={BRACKET_STYLES.resetButton}>Reset</button>
            )}
          </div>
        ))}
      </div>

      {/* DER TURNIERBAUM */}
      <div style={BRACKET_STYLES.treeContainer(treeHeight)}>
        {Object.keys(koByRound)
          .sort((a, b) => Number(a) - Number(b))
          .filter(r => (Number(r)-1) >= startIdxOfPhase)
          .map((round, visibleIdx) => {
            const actualRoundIdx = Number(round) - 1;
            const isActiveTippingRound = actualRoundIdx === startIdxOfPhase;

            return (
              <div key={round}>
                {koByRound[round].map((m, matchIndex) => {
                  const tip = (tips && tips[m.id]) ? tips[m.id] : null;
                  const currentTop = getTopPosition(actualRoundIdx, matchIndex);
                  const nextTop = getTopPosition(actualRoundIdx + 1, Math.floor(matchIndex / 2));

                  let teamA = getTeamFromPrevious(actualRoundIdx, matchIndex, "A") || "?";
                  let teamB = getTeamFromPrevious(actualRoundIdx, matchIndex, "B") || "?";

                  // KORREKTUR: Validiert, dass BEIDE Tore komplett ausgefüllt sind
                  const hasValidScore = tip && 
                    tip.goals_a !== null && tip.goals_a !== undefined && tip.goals_a !== "" &&
                    tip.goals_b !== null && tip.goals_b !== undefined && tip.goals_b !== "";

                  const winningSide = (() => {
                    if (!tip) return null;
                    if (hasValidScore) {
                      const gA = Number(tip.goals_a);
                      const gB = Number(tip.goals_b);
                      if (gA > gB) return "1";
                      if (gB > gA) return "2";
                    }
                    return tip.winner ? String(tip.winner) : null;
                  })();

                  return (
                    <div key={m.id} style={{ position: "absolute", top: `${currentTop}px`, left: `${visibleIdx * 300}px`, height: `${BOX_HEIGHT}px` }}>
                      
                      <div style={{ ...BRACKET_STYLES.matchLabel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          backgroundColor: '#e2e8f0', color: '#475569', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem', lineHeight: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {m.match_no || m.match_order}
                        </span>
                        <span>
                          {actualRoundIdx === 4 ? (matchIndex === 1 ? "Spiel um Platz 3" : "Finale") : `${safeRoundNames[round]} ${matchIndex + 1}`}
                        </span>
                      </div>

                      <div style={BRACKET_STYLES.matchBox}>
                        <TeamRow teamName={teamA} side="1" isFirst winningSide={winningSide} />
                        <TeamRow teamName={teamB} side="2" isFirst={false} winningSide={winningSide} />
                        
                        <div style={BRACKET_STYLES.tipContainer}>
                          {isReadOnly ? (
                            <div style={BRACKET_STYLES.finalResult}>
                              {/* KORREKTUR: Nutzt jetzt den sicheren hasValidScore Check */}
                              {hasValidScore 
                                ? `${tip.goals_a} : ${tip.goals_b}` 
                                : (tip?.winner ? (String(tip.winner) === "1" ? teamA : teamB) : "-")}
                            </div>
                          ) : isAdmin ? (
                            <TipInput 
                              teamA={teamA} teamB={teamB} isKO onSave={(a,b,w) => saveTip(m.id,a,b,w)} 
                              initialGoalsA={tip?.goals_a} initialGoalsB={tip?.goals_b} initialWinner={tip?.winner} 
                              onlyWinner={false} 
                            />
                          ) : (
                            !phase?.is_submitted ? (
                              tip ? (
                                <div style={BRACKET_STYLES.savedTipDisplay}>
                                  {/* KORREKTUR: Auch hier gegen unvollständige Teiltipps abgesichert */}
                                  {hasValidScore 
                                    ? `${tip.goals_a} : ${tip.goals_b}` 
                                    : `${String(tip.winner) === "1" ? teamA : teamB}`}
                                  
                                  {hasValidScore && Number(tip.goals_a) === Number(tip.goals_b) && (
                                    <span style={{ fontSize: "0.65rem", color: "#666", fontWeight: "normal" }}>
                                      {String(tip.winner) === "1" ? teamA : teamB}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                (teamA !== "?" && teamB !== "?") ? (
                                  <TipInput 
                                    teamA={teamA} teamB={teamB} isKO onSave={(a,b,w) => saveTip(m.id,a,b,w)} 
                                    onlyWinner={phase.id === 5 ? false : (phase.id === 1 || !isActiveTippingRound)} 
                                  />
                                ) : (
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", textAlign: "center" }}>Warten...</div>
                                )
                              )
                            ) : (
                              <div style={BRACKET_STYLES.finalResult}>
                                {hasValidScore 
                                  ? `${tip.goals_a} : ${tip.goals_b}` 
                                  : (tip?.winner ? (String(tip.winner) === "1" ? teamA : teamB) : "-")}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* DYNAMISCHE LINIEN */}
                      {actualRoundIdx < 4 && (
                        <>
                          <div style={BRACKET_STYLES.lineHorizontal} />
                          <div style={{ 
                            ...BRACKET_STYLES.lineVertical,
                            top: matchIndex % 2 === 0 ? "82px" : `calc(82px - ${Math.abs(nextTop - currentTop)}px)`, 
                            height: `${Math.abs(nextTop - currentTop)}px`, 
                          }} />
                          {matchIndex % 2 === 0 && (
                            <div style={{ ...BRACKET_STYLES.lineHorizontal, top: `${(nextTop - currentTop) + 82}px`, right: "-60px" }} />
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