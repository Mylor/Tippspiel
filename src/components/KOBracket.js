import React from 'react';
import TipInput from './TipInput';
import { FlagIcon } from '../Utils/teamUtils'; 
import { BRACKET_STYLES, PHASE_HEIGHTS } from '../Utils/uiConstants';

const BOX_HEIGHT = 135;

const KOBracket = ({ 
  koByRound, tips, phase, roundNames, treeHeight, getTopPosition, 
  getTeamFromPrevious, resolveSlot, context, KO_STRUCTURE, 
  saveTip, deleteKORound, isAdmin 
}) => {

  if (!phase) return <div style={BRACKET_STYLES.loading}>Lade Turnierdaten...</div>;

  const safeRoundNames = roundNames || { 
    1: "Sechzehntelfinale", 2: "Achtelfinale", 3: "Viertelfinale", 4: "Halbfinale", 5: "Finale" 
  };
  
  const startIdxOfPhase = phase.id <= 2 ? 0 : phase.id - 2;

  // Interne Helper-Komponente für die Team-Zeilen (nutzt jetzt BRACKET_STYLES)
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
      
      {/* HEADER: Runden-Namen und Reset-Buttons */}
      <div style={BRACKET_STYLES.headerRow}>
        {Object.keys(koByRound)
          .sort((a, b) => Number(a) - Number(b))
          .filter(r => (Number(r)-1) >= startIdxOfPhase)
          .map(round => (
          <div key={round} style={BRACKET_STYLES.headerColumn}>
            <span style={BRACKET_STYLES.roundTitle}>{Number(round) === 5 ? "Finale" : safeRoundNames[round]}</span>
            {(!phase?.is_submitted || isAdmin) && (
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

                  // Team-Herkunft Logik aus deinem Original
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

                  // Gewinner-Ermittlung Logik aus deinem Original
                  const winningSide = (() => {
                    if (!tip) return null;
                    const gA = (tip.goals_a !== null && tip.goals_a !== undefined && tip.goals_a !== "") ? Number(tip.goals_a) : null;
                    const gB = (tip.goals_b !== null && tip.goals_b !== undefined && tip.goals_b !== "") ? Number(tip.goals_b) : null;
                    if (gA !== null && gB !== null) {
                      if (gA > gB) return "1";
                      if (gB > gA) return "2";
                    }
                    return tip.winner ? String(tip.winner) : null;
                  })();

                  return (
                    <div key={m.id} style={{ position: "absolute", top: `${currentTop}px`, left: `${visibleIdx * 300}px`, height: `${BOX_HEIGHT}px` }}>
                      <div style={BRACKET_STYLES.matchLabel}>
                        {actualRoundIdx === 4 ? (matchIndex === 1 ? "Spiel um Platz 3" : "Finale") : `${safeRoundNames[round]} ${matchIndex + 1}`}
                      </div>

                      <div style={BRACKET_STYLES.matchBox}>
                        <TeamRow teamName={teamA} side="1" isFirst winningSide={winningSide} />
                        <TeamRow teamName={teamB} side="2" isFirst={false} winningSide={winningSide} />
                        
                        <div style={BRACKET_STYLES.tipContainer}>
                          {isAdmin ? (
                            <TipInput 
                              teamA={teamA} teamB={teamB} isKO onSave={(a,b,w) => saveTip(m.id,a,b,w)} 
                              initialGoalsA={tip?.goals_a} initialGoalsB={tip?.goals_b} initialWinner={tip?.winner} 
                              onlyWinner={false} 
                            />
                          ) : (
                            !phase?.is_submitted ? (
                              tip ? (
                                <div style={BRACKET_STYLES.savedTipDisplay}>
                                  {(tip.goals_a !== null && tip.goals_a !== undefined && tip.goals_a !== "") 
                                    ? `${tip.goals_a} : ${tip.goals_b}` 
                                    : `${String(tip.winner) === "1" ? teamA : teamB}`}
                                  {tip.goals_a !== null && tip.goals_a !== undefined && tip.goals_a !== "" && Number(tip.goals_a) === Number(tip.goals_b) && (
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
                                {tip?.goals_a !== null && tip?.goals_a !== undefined && tip?.goals_a !== "" 
                                  ? `${tip.goals_a} : ${tip.goals_b}` 
                                  : (tip?.winner ? (Number(tip.winner) === 1 ? teamA : teamB) : "-")}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Dynamische Linien */}
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