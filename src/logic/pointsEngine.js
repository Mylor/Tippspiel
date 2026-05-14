import { supabase } from "../supabaseClient";

export const POINTS_CONFIG = {
  // Reale Spiele
  MATCH_BASE_DYNAMIC: [3, 4, 5], 
  MATCH_DIFF: 2,
  MATCH_GOALS_SINGLE: 1,
  MATCH_GOALS_SUM: 1,
  BONUS_EXACT_LOW: 3,
  BONUS_EXACT_MID: 4,
  BONUS_EXACT_HIGH: 5,

  // Prognosen / Finalrunde
  PROG_REACH_16: 16.1,
  PROG_OUT_16: 16.2,
  PROG_REACH_8: 8.1,
  PROG_OUT_8: 8.2,
  PROG_REACH_4: 4.1,
  PROG_OUT_4: 4.2,
  PROG_REACH_2: 2.1,
  PROG_OUT_2: 2.2,
  PROG_REACH_FINAL: 20.1,
  PROG_PLACE_4: 4.1,
  PROG_PLACE_3: 3.1,
  PROG_VIZE: 2.1,
  PROG_CHAMPION: 1.1,

  // Vorrunde
  PROG_OUT_VORRUNDE: 2.2,
  PROG_TABLE_POS: 2.5,

  // Korrekturdivisoren
  DIVISORS: {
    1: 1, 2: 1, 3: 2, 4: 4, 5: 8
  }
};

/**
 * BERECHNET DETAILLIERTE PUNKTE FÜR EIN EINZELNES SPIEL
 */
export const calculateDetailedMatchPoints = (tip, actual, winnerPoints) => {
  const points = { winner: 0, diff: 0, goals_a: 0, goals_b: 0, sum: 0, exact_bonus: 0 };
  if (!tip || actual.goals_a === null || actual.goals_a === undefined) return { total: 0, breakdown: {} };

  const tA = Number(tip.goals_a);
  const tB = Number(tip.goals_b);
  const aA = Number(actual.goals_a);
  const aB = Number(actual.goals_b);

  const tipWinner = tA > tB ? "1" : tA < tB ? "2" : "0";
  const actualWinner = aA > aB ? "1" : aA < aB ? "2" : "0";

  if (tipWinner === actualWinner) points.winner = winnerPoints;
  if ((tA - tB) === (aA - aB)) points.diff = POINTS_CONFIG.MATCH_DIFF;
  if (tA === aA) points.goals_a = POINTS_CONFIG.MATCH_GOALS_SINGLE;
  if (tB === aB) points.goals_b = POINTS_CONFIG.MATCH_GOALS_SINGLE;
  if ((tA + tB) === (aA + aB)) points.sum = POINTS_CONFIG.MATCH_GOALS_SUM;

  if (tA === aA && tB === aB) {
    const totalGoals = aA + aB;
    if (totalGoals <= 3) points.exact_bonus = POINTS_CONFIG.BONUS_EXACT_LOW;
    else if (totalGoals <= 6) points.exact_bonus = POINTS_CONFIG.BONUS_EXACT_MID;
    else points.exact_bonus = POINTS_CONFIG.BONUS_EXACT_HIGH;
  }

  const total = Object.values(points).reduce((acc, val) => acc + val, 0);
  
  return { 
    total, 
    breakdown: {
      descr: `Tendenz: ${points.winner}, Diff: ${points.diff}, Tore: ${points.goals_a + points.goals_b}, Summe: ${points.sum}, Bonus: ${points.exact_bonus}`,
      tip: `${tA}:${tB}`, real: `${aA}:${aB}`, tip_a: tA, tip_b: tB, real_a: aA, real_b: aB,
      points_winner: points.winner, points_exact: points.exact_bonus, sum_points: total
    } 
  };
};

export const getDynamicWinnerPoints = (rankA, rankB) => {
  const diff = rankA - rankB; 
  if (diff < -20) return 3; 
  if (diff > 20) return 5;   
  return 4; 
};

/**
 * HAUPTFUNKTION: Vergleicht User-Prognosen mit dem realen Turnierstand
 */
export async function processPrognosisPoints(allMatches, currentMatch, forcedGroupName = null) {
  if (currentMatch.goals_a_real === null || currentMatch.goals_b_real === null) return;

  const { id: mId, match_order: mOrder, stage, stage_order } = currentMatch;
  const activeGroupName = forcedGroupName || currentMatch.group_name;

  const { data: realGroup } = await supabase
    .from("real_group_state")
    .select("*")
    .eq("group_name", activeGroupName || "")
    .single();

  const { data: realKO } = await supabase.from("real_ko_state").select("*").eq("id", 1).single();

  if (!realKO || !realGroup) return;

  const pointsEntries = [];

  // --- A. GRUPPEN-PUNKTE ---
  if (stage === "group" && realGroup.is_finished) {
    const { data: userGroupProgs } = await supabase.from("user_prognosis_group").select("*").eq("group_name", activeGroupName);

    if (userGroupProgs) {
      userGroupProgs.forEach(prog => {
        // 1. Tabellenplätze (Striktes Matching)
        ['rank_1', 'rank_2', 'rank_3', 'rank_4'].forEach((rankKey) => {
          if (prog[rankKey] === realGroup[rankKey] && realGroup[rankKey] !== null) {
            pointsEntries.push(createPointEntry(prog.player_id, 'GROUP_RANK', POINTS_CONFIG.PROG_TABLE_POS, prog[rankKey], 1, activeGroupName, mId, mOrder));
          }
        });

        // 2. KO-Einzug: Nur Punkte, wenn das Team beim User als "Qualifiziert" steht UND real qualifiziert ist
        const userQualifiers = [...(prog.reached_ko || []), ...(prog.reached_ko_best_thirds || [])];
        const realQualifiers = [...(realGroup.reached_ko || []), ...(realGroup.reached_ko_best_thirds || [])];

        userQualifiers.forEach(team => {
          if (team && realQualifiers.includes(team)) {
            pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_REACH_16, team, 1, activeGroupName, mId, mOrder, { original: POINTS_CONFIG.PROG_REACH_16 }));
          }
        });

        // 3. Ausscheiden: Nur Punkte, wenn das Team beim User als "Raus" markiert ist UND real in dropped_out steht
        prog.dropped_out?.forEach(team => {
          if (team && realGroup.dropped_out?.includes(team)) {
            pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_OUT_VORRUNDE, team, 1, activeGroupName, mId, mOrder, { original: POINTS_CONFIG.PROG_OUT_VORRUNDE }));
          }
        });
      });
    }
  }

  // --- B. KO-PHASEN PUNKTE ---
  if (stage === "ko" && currentMatch.winner_real !== 0) {
    const { data: userKOProgs } = await supabase.from("user_prognosis_ko").select("*");
    if (userKOProgs) {
      const roundMapping = {
        1: { realKey: 'reached_16', progKey: 'reached_16', pts: POINTS_CONFIG.PROG_REACH_16, dropKey: 'drop_out_16', dropPts: POINTS_CONFIG.PROG_OUT_16 },
        2: { realKey: 'reached_8',  progKey: 'reached_8',  pts: POINTS_CONFIG.PROG_REACH_8,  dropKey: 'drop_out_8',  dropPts: POINTS_CONFIG.PROG_OUT_8 },
        3: { realKey: 'reached_4',  progKey: 'reached_4',  pts: POINTS_CONFIG.PROG_REACH_4,  dropKey: 'drop_out_4',  dropPts: POINTS_CONFIG.PROG_OUT_4 },
        4: { realKey: 'reached_2',  progKey: 'reached_2',  pts: POINTS_CONFIG.PROG_REACH_2,  dropKey: 'drop_out_2',  dropPts: POINTS_CONFIG.PROG_OUT_2 },
        5: { realKey: 'winner_final', progKey: 'winner_final', pts: POINTS_CONFIG.PROG_CHAMPION }
      };
      const activeRound = roundMapping[stage_order];
      if (activeRound) {
        userKOProgs.forEach(prog => {
          const divisor = POINTS_CONFIG.DIVISORS[prog.phase_id] || 1;
          
          const progTeams = Array.isArray(prog[activeRound.progKey]) ? prog[activeRound.progKey] : [prog[activeRound.progKey]];
          progTeams.forEach(team => {
            if (team && (realKO[activeRound.realKey]?.includes?.(team) || realKO[activeRound.realKey] === team)) {
              pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', activeRound.pts / divisor, team, prog.phase_id, "KO", mId, mOrder, { original: activeRound.pts, divisor }));
            }
          });

          if (activeRound.dropKey) {
            prog[activeRound.dropKey]?.forEach(team => {
              if (realKO[activeRound.dropKey]?.includes(team)) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', activeRound.dropPts / divisor, team, prog.phase_id, "KO", mId, mOrder, { original: activeRound.dropPts, divisor }));
              }
            });
          }
        });
      }
    }
  }

  // --- C. SPEICHERN & CLEANUP ---
  if (stage === "group" && realGroup?.is_finished) {
    await supabase.from("user_points_detail")
      .delete()
      .eq("match_id", mId)
      .eq("group_name", activeGroupName)
      .eq("is_prognosis", true);
  }
  
  if (stage === "ko") {
    await supabase.from("user_points_detail").delete().eq("match_id", mId).eq("is_prognosis", true);
  }
  
  if (pointsEntries.length > 0) {
    const { error } = await supabase.from("user_points_detail").insert(pointsEntries);
    if (error) console.error("Fehler beim Speichern der Prognose-Punkte:", error.message);
  }
}

function createPointEntry(playerId, category, points, team, phase, groupName, matchId, matchOrder, extra = {}) {
  let typeLabel = category === "GROUP_RANK" ? "Tabellenplatz" : "Turnier-Pfad";
  let detailDesc = `Erfolgreiche Prognose in Phase ${phase}`;

  if (category === "GROUP_RANK") {
    detailDesc = `Richtige Gruppenplatzierung von ${team} in Phase ${phase}`;
  } else if (category === "PROGNOSIS_PATH") {
    const originalPoints = extra.original || points;
    const decimal = Math.round((originalPoints % 1) * 10) / 10; 

    if (decimal === 0.1) {
      if (originalPoints >= 20) detailDesc = `${team} erreicht das Finale`;
      else if (originalPoints >= 16) detailDesc = `${team} erreicht das Sechzehntelfinale`; 
      else if (originalPoints >= 8) detailDesc = `${team} erreicht das Achtelfinale`;
      else if (originalPoints >= 4) detailDesc = `${team} erreicht das Viertelfinale`;
      else if (originalPoints >= 2) detailDesc = `${team} erreicht das Halbfinale`;
      else if (originalPoints >= 1) detailDesc = `${team} ist Turniersieger`;
    } else if (decimal === 0.2) {
      detailDesc = `${team} scheidet korrekterweise aus`;
    }
  }

  return {
    player_id: playerId, 
    category, 
    points_total: points, 
    reference_team: team, 
    phase_id: phase, 
    group_name: groupName, 
    is_prognosis: true,
    match_id: matchId, 
    match_order: matchOrder, 
    breakdown: { 
      info: `${typeLabel}: ${team}`, 
      descr: detailDesc, 
      team, 
      originalPoints: extra.original || points, 
      divisor: extra.divisor || 1 
    }
  };
}