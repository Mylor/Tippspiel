import React from "react";
import { FlagIcon } from "../Utils/teamUtils";

const MatchTendencyCard = ({ match, allCommunityTips, localPlayer, isMyPhase1Submitted }) => {
  const matchTips = allCommunityTips.filter(t => Number(t.match_id) === Number(match.id));
  const totalTips = matchTips.length;
  
  const winA = matchTips.filter(t => Number(t.goals_a) > Number(t.goals_b)).length;
  const draw = matchTips.filter(t => Number(t.goals_a) === Number(t.goals_b)).length;
  const winB = matchTips.filter(t => Number(t.goals_a) < Number(t.goals_b)).length;

  const pctA = totalTips > 0 ? (winA / totalTips) * 100 : 0;
  const pctDraw = totalTips > 0 ? (draw / totalTips) * 100 : 0;
  const pctB = totalTips > 0 ? (winB / totalTips) * 100 : 0;

  let expectedGoalsA = "0,00";
  let expectedGoalsB = "0,00";
  if (totalTips > 0) {
    const totalGoalsA = matchTips.reduce((sum, t) => sum + Number(t.goals_a || 0), 0);
    const totalGoalsB = matchTips.reduce((sum, t) => sum + Number(t.goals_b || 0), 0);
    expectedGoalsA = (totalGoalsA / totalTips).toFixed(2).replace(".", ",");
    expectedGoalsB = (totalGoalsB / totalTips).toFixed(2).replace(".", ",");
  }

  const myTip = matchTips.find(t => Number(t.player_id) === Number(localPlayer.id));
  const hasRealResult = match.goals_a_real !== null && match.goals_b_real !== null && match.goals_a_real !== undefined && match.goals_b_real !== undefined && match.goals_a_real !== '';

  let correctTendency = null;
  if (hasRealResult) {
    const realA = Number(match.goals_a_real);
    const realB = Number(match.goals_b_real);
    if (realA > realB) correctTendency = "A";
    else if (realA < realB) correctTendency = "B";
    else correctTendency = "Draw";
  }

  let tipColor = "#2563eb"; // Standard-Blau
  if (hasRealResult && myTip) {
    const realA = Number(match.goals_a_real);
    const realB = Number(match.goals_b_real);
    const tipA = Number(myTip.goals_a);
    const tipB = Number(myTip.goals_b);

    if (realA === tipA && realB === tipB) {
      tipColor = "#eab308"; // Gold bei Volltreffer
    } else {
      const tipTendency = tipA > tipB ? "A" : tipA < tipB ? "B" : "Draw";
      if (tipTendency === correctTendency) {
        tipColor = "#2563eb"; // Blau bei richtiger Tendenz
      } else {
        tipColor = "#ef4444"; // Rot bei falschem Sieger
      }
    }
  }

  return (
    <div style={{
      backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px",
      padding: "16px", marginBottom: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ 
              backgroundColor: '#e2e8f0', color: '#475569', fontWeight: '700', fontSize: '0.65rem',
              padding: '2px 5px', borderRadius: '4px', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: '1'
            }}>
              {match.match_no || match.match_order}
            </span>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Gruppe {match.group_name}</span>
          </div>

          <span style={{ color: "#cbd5e1" }}>|</span>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.95rem", fontWeight: "700", color: "#0f172a" }}>
            <FlagIcon teamName={match.team_a} />
            <span>{match.team_a}</span>
            <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "0.85rem", margin: "0 2px" }}>vs.</span>
            <FlagIcon teamName={match.team_b} />
            <span>{match.team_b}</span>
          </div>

          {totalTips > 0 && (
            <>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ fontSize: "0.85rem", color: "#475569", backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", fontWeight: "500" }}>
                erwartete Tore: <strong style={{ color: "#0f172a" }}>{expectedGoalsA} : {expectedGoalsB}</strong>
              </span>
            </>
          )}
        </div>

        {hasRealResult && (
          <span style={{ backgroundColor: "#10b981", color: "white", padding: "3px 10px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700" }}>
            Endergebnis: {match.goals_a_real} : {match.goals_b_real}
          </span>
        )}
      </div>

      <div style={{ display: "flex", height: "22px", width: "100%", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f1f5f9", marginBottom: "12px" }}>
        {!isMyPhase1Submitted ? (
          <div style={{ width: "100%", backgroundColor: "#e2e8f0", color: "#64748b", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontStyle: "italic", gap: "4px" }}>
            🔒 Tendenzen der Tipper erst sichtbar nach deiner Abgabe von Phase 1
          </div>
        ) : totalTips === 0 ? (
          <div style={{ width: "100%", backgroundColor: "#cbd5e1", color: "#475569", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Keine Tipps abgegeben
          </div>
        ) : (
          <>
            {winA > 0 && (
              <div style={{ 
                width: `${pctA}%`, backgroundColor: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.75rem", fontWeight: "700",
                opacity: hasRealResult ? (correctTendency === "A" ? 1 : 0.25) : 1,
                boxShadow: hasRealResult && correctTendency === "A" ? "inset 0 0 0 2px #166534" : "none",
                transition: "opacity 0.2s ease"
              }} title={`${match.team_a} gewinnt: ${winA} Tipps`}>
                {winA}
              </div>
            )}
            {draw > 0 && (
              <div style={{ 
                width: `${pctDraw}%`, backgroundColor: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.75rem", fontWeight: "700",
                opacity: hasRealResult ? (correctTendency === "Draw" ? 1 : 0.25) : 1,
                boxShadow: hasRealResult && correctTendency === "Draw" ? "inset 0 0 0 2px #334155" : "none",
                transition: "opacity 0.2s ease"
              }} title={`Unentschieden: ${draw} Tipps`}>
                {draw}
              </div>
            )}
            {winB > 0 && (
              <div style={{ 
                width: `${pctB}%`, 
                backgroundColor: "#8b5cf6",
                display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.75rem", fontWeight: "700",
                opacity: hasRealResult ? (correctTendency === "B" ? 1 : 0.25) : 1,
                boxShadow: hasRealResult && correctTendency === "B" ? "inset 0 0 0 2px #6d28d9" : "none",
                transition: "opacity 0.2s ease"
              }} title={`${match.team_b} gewinnt: ${winB} Tipps`}>
                {winB}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ fontWeight: "600", color: "#334155" }}>
          Dein Tipp: <span style={{ color: tipColor, fontWeight: "800" }}>{myTip ? `${myTip.goals_a} : ${myTip.goals_b}` : "—"}</span>
        </div>
        {isMyPhase1Submitted && (
          <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#22c55e", borderRadius: "50%" }}></span>{match.team_a} gewinnt</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#94a3b8", borderRadius: "50%" }}></span>Unentschieden</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#8b5cf6", borderRadius: "50%" }}></span>{match.team_b} gewinnt</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchTendencyCard;