import { supabase } from "../supabaseClient";

export const POINTS_CONFIG = {
  MATCH_BASE_DYNAMIC: [3, 4, 5], 
  MATCH_DIFF: 2,
  MATCH_GOALS_SINGLE: 1,
  MATCH_GOALS_SUM: 1,
  BONUS_EXACT_LOW: 3,
  BONUS_EXACT_MID: 4,
  BONUS_EXACT_HIGH: 5,

  PROG_REACH_16: 16.1,
  PROG_OUT_16: 16.2,
  PROG_REACH_8: 8.1,
  PROG_OUT_8: 8.2,
  PROG_REACH_4: 4.1,
  PROG_OUT_4: 4.2,
  PROG_REACH_2: 2.1,
  PROG_OUT_2: 2.2,
  PROG_REACH_FINAL: 20.1, 
  PROG_PLACE_4: 4.3,      
  PROG_PLACE_3: 3.3,      
  PROG_VIZE: 2.3,         
  PROG_CHAMPION: 1.3,     

  PROG_OUT_VORRUNDE: 2.2,
  PROG_TABLE_POS: 2.5,

  DIVISORS: {
    1: 1, 2: 1, 3: 2, 4: 4, 5: 8
  }
};

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

export async function processPrognosisPoints(allMatches, currentMatch, forcedGroupName = null, isFinalThirdsLoop = false) {
  if (currentMatch.goals_a_real === null || currentMatch.goals_b_real === null) {
    return;
  }

  const { id: mId, match_order: mOrder, stage, stage_order } = currentMatch;
  const activeGroupName = forcedGroupName || currentMatch.group_name;

  let realGroup = null;
  let realKO = null;

  if (stage === "group" || activeGroupName) {
    const { data: groupData, error: groupErr } = await supabase
      .from("real_group_state")
      .select("*")
      .eq("group_name", activeGroupName || "")
      .maybeSingle();

    if (groupErr)
    realGroup = groupData;
  }

  if (stage === "ko") {
    const { data: koData, error: koErr } = await supabase
      .from("real_ko_state")
      .select("*")
      .eq("id", 1)
      .single();
    if (koErr) 
    realKO = koData;
  }

  if (stage === "group" && !realGroup) {
    return;
  }
  if (stage === "ko" && !realKO) {
    return;
  }

  const pointsEntries = [];

  // --- A. GRUPPEN-PUNKTE ---
  if (stage === "group" && realGroup) {
    const groupMatches = allMatches.filter(m => m.group_name === activeGroupName);
    const allMatchesPlayed = groupMatches.every(m => m.goals_a_real !== null && m.goals_b_real !== null);
    const isGroupReallyFinished = realGroup.is_finished || allMatchesPlayed;

     
    if (!isGroupReallyFinished) {
      return; 
    }

    if (isGroupReallyFinished) {
      const lastMatchOfThisGroup = groupMatches.reduce((max, m) => m.match_order > max.match_order ? m : max, groupMatches[0]);

      if (mId === lastMatchOfThisGroup?.id || isFinalThirdsLoop) {
        const { data: userGroupProgs, error: uProgErr } = await supabase
          .from("user_prognosis_group")
          .select("*")
          .eq("group_name", activeGroupName);
        
        if (uProgErr) console.error("[PROG-DIAG] Fehler beim Laden von user_prognosis_group:", uProgErr.message);

        if (userGroupProgs) {
          // NEUER FILTER: Nur valide/vollständige Prognosen
          const validProgs = userGroupProgs.filter(p => p.rank_1 && p.rank_2 && p.rank_3 && p.rank_4);

          validProgs.forEach(prog => {
            if (!isFinalThirdsLoop) {
              
              ['rank_1', 'rank_2', 'rank_3', 'rank_4'].forEach((rankKey) => {
                if (prog[rankKey] === realGroup[rankKey] && realGroup[rankKey] !== null) {
                  pointsEntries.push(createPointEntry(prog.player_id, 'GROUP_RANK', POINTS_CONFIG.PROG_TABLE_POS, prog[rankKey], 1, activeGroupName, mId, mOrder));
                }
              });

              const userQualifiers = [...(prog.reached_ko || [])];
              const realQualifiers = [...(realGroup.reached_ko || [])];

              userQualifiers.forEach(team => {
                if (team && realQualifiers.includes(team)) {
                  pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_REACH_16, team, 1, activeGroupName, mId, mOrder, { original: POINTS_CONFIG.PROG_REACH_16 }));
                }
              });

              const userDroppedOut = [...(prog.dropped_out || [])];
              if (realGroup.rank_4 && userDroppedOut.includes(realGroup.rank_4)) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_OUT_VORRUNDE, realGroup.rank_4, 1, activeGroupName, mId, mOrder, { original: POINTS_CONFIG.PROG_OUT_VORRUNDE }));
              }
            }

            if (isFinalThirdsLoop) {
              const groupThirdTeam = realGroup.rank_3;

              if (groupThirdTeam) {
                const realThirdsReachedKO = realGroup.reached_ko_best_thirds || [];
                if (realThirdsReachedKO.includes(groupThirdTeam)) {
                  const userExpectedQualifiers = [...(prog.reached_ko || []), ...(prog.reached_ko_best_thirds || [])];
                  if (userExpectedQualifiers.includes(groupThirdTeam)) {
                    pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_REACH_16, groupThirdTeam, 1, activeGroupName, mId, mOrder, { original: POINTS_CONFIG.PROG_REACH_16 }));
                  }
                }

                const realDroppedOut = realGroup.dropped_out || [];
                if (realDroppedOut.includes(groupThirdTeam) && groupThirdTeam !== realGroup.rank_4) {
                  if (prog.dropped_out?.includes(groupThirdTeam)) {
                    pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_OUT_VORRUNDE, groupThirdTeam, 1, activeGroupName, mId, mOrder, { original: POINTS_CONFIG.PROG_OUT_VORRUNDE }));
                  }
                }
              }
            }
          });
        }
      }
    }
  }

  // --- B. KO-PHASEN PUNKTE ---
  if (stage === "ko" && currentMatch.winner_real !== 0 && realKO) {
    
    const { data: userKOProgs, error: koProgErr } = await supabase.from("user_prognosis_ko").select("*");
    if (koProgErr) 

    if (userKOProgs) {
      
      // NEUER FILTER: Nur Prognosen verarbeiten, die nicht völlig leer sind
      const validKOProgs = userKOProgs.filter(p => p.reached_16 || p.reached_8 || p.reached_4 || p.reached_2);
      
      const roundMapping = {
        1: { name: "Achtelfinale", progKey: 'reached_16', pts: POINTS_CONFIG.PROG_REACH_16, dropKey: 'drop_out_16', dropPts: POINTS_CONFIG.PROG_OUT_16 },
        2: { name: "Viertelfinale", progKey: 'reached_8', pts: POINTS_CONFIG.PROG_REACH_8, dropKey: 'drop_out_8', dropPts: POINTS_CONFIG.PROG_OUT_8 },
        3: { name: "Halbfinale", progKey: 'reached_4', pts: POINTS_CONFIG.PROG_REACH_4, dropKey: 'drop_out_4', dropPts: POINTS_CONFIG.PROG_OUT_4 },
        4: { name: "Finale Einzug", progKey: 'reached_2', pts: POINTS_CONFIG.PROG_REACH_FINAL, dropKey: 'drop_out_2', dropPts: POINTS_CONFIG.PROG_OUT_2 },
        5: { name: "Finale / Platz 3", isFinalsRound: true }
      };

      const activeRound = roundMapping[stage_order];
      if (activeRound) {
        const realWinnerOfThisMatch = currentMatch.winner_real === 1 ? currentMatch.team_a : currentMatch.team_b;
        const realLoserOfThisMatch = currentMatch.winner_real === 1 ? currentMatch.team_b : currentMatch.team_a;

        validKOProgs.forEach(prog => {
          const divisor = POINTS_CONFIG.DIVISORS[prog.phase_id] || 1;
          if (!activeRound.isFinalsRound) {
            const progTeams = Array.isArray(prog[activeRound.progKey]) ? prog[activeRound.progKey] : [prog[activeRound.progKey]];
            progTeams.forEach(team => {
              if (team && team === realWinnerOfThisMatch) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', activeRound.pts / divisor, team, prog.phase_id, "KO", mId, mOrder, { original: activeRound.pts, divisor }));
              }
            });
            if (activeRound.dropKey) {
              const progDropped = prog[activeRound.dropKey] || [];
              progDropped.forEach(team => {
                if (team && team === realLoserOfThisMatch) {
                  pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', activeRound.dropPts / divisor, team, prog.phase_id, "KO", mId, mOrder, { original: activeRound.dropPts, divisor }));
                }
              });
            }
          } else {
            const isChampMatch = (mOrder === 79 || currentMatch.ko_order === 0);
            if (isChampMatch) {
              if (prog.winner_final && realKO.winner_final === prog.winner_final && prog.winner_final === realWinnerOfThisMatch) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_CHAMPION / divisor, prog.winner_final, prog.phase_id, "KO", mId, mOrder, { original: POINTS_CONFIG.PROG_CHAMPION, divisor }));
              }
              if (prog.loser_final && realKO.loser_final === prog.loser_final && prog.loser_final === realLoserOfThisMatch) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_VIZE / divisor, prog.loser_final, prog.phase_id, "KO", mId, mOrder, { original: POINTS_CONFIG.PROG_VIZE, divisor }));
              }
            } else {
              if (prog.winner_small_final && realKO.winner_small_final === prog.winner_small_final && prog.winner_small_final === realWinnerOfThisMatch) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_PLACE_3 / divisor, prog.winner_small_final, prog.phase_id, "KO", mId, mOrder, { original: POINTS_CONFIG.PROG_PLACE_3, divisor }));
              }
              if (prog.loser_small_final && realKO.loser_small_final === prog.loser_small_final && prog.loser_small_final === realLoserOfThisMatch) {
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_PLACE_4 / divisor, prog.loser_small_final, prog.phase_id, "KO", mId, mOrder, { original: POINTS_CONFIG.PROG_PLACE_4, divisor }));
              }
            }
          }
        });
      }
    }
  }

  // --- C. SPEICHERN & CLEANUP ---
  
  const uniquePointsMap = {};
  const affectedCleanups = new Set();
  pointsEntries.forEach(entry => {
    const uniqueKey = `${entry.player_id}_${entry.category}_${entry.reference_team}_${entry.phase_id}_${entry.is_prognosis}`;
    uniquePointsMap[uniqueKey] = entry;
    affectedCleanups.add(`${entry.group_name}_${entry.phase_id}`);
  });

  const finalPointsEntries = Object.values(uniquePointsMap);
  
  if (affectedCleanups.size > 0) {
    for (const cleanupKey of affectedCleanups) {
      const [gName, pId] = cleanupKey.split("_");
      await supabase.from("user_points_detail").delete().eq("match_id", mId).eq("group_name", gName).eq("phase_id", Number(pId)).eq("is_prognosis", true);
    }
  } else {
    await supabase.from("user_points_detail").delete().eq("match_id", mId).eq("group_name", activeGroupName || "KO").eq("is_prognosis", true);
  }
  
  if (finalPointsEntries.length > 0) {
    const { error } = await supabase.from("user_points_detail").upsert(finalPointsEntries, { onConflict: "player_id,category,reference_team,phase_id,is_prognosis" });
    if (error) console.error("[PROG-DIAG] ERROR:", error.message);
    else console.log("[PROG-DIAG] ===== Upsert erfolgreich! =====");
  } else {
  }
}

function createPointEntry(playerId, category, points, team, phase, groupName, matchId, matchOrder, extra = {}) {
  let typeLabel = category === "GROUP_RANK" ? "Tabellenplatz" : "Turnier-Pfad";
  let detailDesc = `Erfolgreiche Prognose in Phase ${phase}`;

  if (category === "GROUP_RANK") {
    detailDesc = `Richtige Gruppenplatzierung von ${team} in Phase ${phase}`;
  } else if (category === "PROGNOSIS_PATH") {
    const originalPoints = extra.original || points;
    const decimal = Math.round((originalPoints * 10) % 10); 

    if (decimal === 1) {
      if (originalPoints >= 20) detailDesc = `${team} erreicht das Finale`;
      else if (originalPoints >= 16) detailDesc = `${team} erreicht das Sechzehntelfinale`; 
      else if (originalPoints >= 8) detailDesc = `${team} erreicht das Achtelfinale`;
      else if (originalPoints >= 4) detailDesc = `${team} erreicht das Viertelfinale`;
      else if (originalPoints >= 2) detailDesc = `${team} erreicht das Halbfinale`;
    } else if (decimal === 2) {
      detailDesc = `${team} scheidet korrekterweise aus`;
    } else if (decimal === 3) {
      if (originalPoints === POINTS_CONFIG.PROG_CHAMPION) detailDesc = `${team} ist Turniersieger 🎉`;
      else if (originalPoints === POINTS_CONFIG.PROG_VIZE) detailDesc = `${team} ist Vize-Meister`;
      else if (originalPoints === POINTS_CONFIG.PROG_PLACE_3) detailDesc = `${team} holt Platz 3`;
      else if (originalPoints === POINTS_CONFIG.PROG_PLACE_4) detailDesc = `${team} beendet das Turnier auf Platz 4`;
    }
  }

  return {
    player_id: playerId, 
    category, 
    points_total: points, 
    reference_team: team, 
    phase_id: phase, 
    group_name: groupName || "KO", 
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