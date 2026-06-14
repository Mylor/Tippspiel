import { supabase } from "../supabaseClient";
import { POINTS_CONFIG } from "./pointsEngine.js";
import { createPointEntry } from "./pointsEngine.js";

export async function processPrognosisPoints(allMatches, currentMatch, forcedGroupName = null) {
  if (currentMatch.goals_a_real === null || currentMatch.goals_b_real === null) {
    console.log(`[DEBUG-PROG] Abbruch: Match #${currentMatch.id} hat noch kein reales Ergebnis.`);
    return;
  }

  const { id: mId, match_order: mOrder, stage } = currentMatch;
  const activeGroupName = forcedGroupName || currentMatch.group_name;

  let realGroup = null;
  let realKO = null;

  if (stage === "group" || activeGroupName) {
    const { data: groupData, error: groupErr } = await supabase
      .from("real_group_state")
      .select("*")
      .eq("group_name", activeGroupName || "")
      .maybeSingle();

    if (groupErr) console.error("[POINTS] Fehler bei real_group_state:", groupErr.message);
    else realGroup = groupData;
  }

  if (stage === "ko") {
    const { data: koData, error: koErr } = await supabase .from("real_ko_state") .select("*") .eq("id", 1) .single();
    if (koErr) console.error("[POINTS] Fehler bei real_ko_state:", koErr.message);
    else realKO = koData;
  }

  if (stage === "group" && !realGroup) {
    console.log(`[DEBUG-PROG] Abbruch: Gruppenphase aktiv, aber kein Eintrag in 'real_group_state' für '${activeGroupName}' gefunden.`);
    return;
  }
  if (stage === "ko" && !realKO) {
    console.log(`[DEBUG-PROG] Abbruch: KO-Phase aktiv, aber kein Eintrag in 'real_ko_state' mit ID 1 gefunden.`);
    return;
  }

  const pointsEntries = [];

  // --- A. GRUPPEN-PUNKTE ---
  if (stage === "group" && realGroup) {
    const groupMatches = allMatches.filter(m => m.group_name === activeGroupName);
    const lastMatchOfThisGroup = groupMatches.reduce((max, m) => m.match_order > max.match_order ? m : max, groupMatches[0]);

    if (currentMatch.id !== lastMatchOfThisGroup?.id) {
      console.log(`[DEBUG-PROG] ℹ️ Match #${mId} ist nicht das LETZTE Spiel der Gruppe ${activeGroupName} (Letztes ist #${lastMatchOfThisGroup?.id}). Berechnung für Gruppenplatzierung übersprungen.`);
      return;
    }

    const allMatchesPlayed = groupMatches.every(m => m.goals_a_real !== null && m.goals_b_real !== null);
    const isGroupReallyFinished = realGroup.is_finished || allMatchesPlayed;
          
    if (isGroupReallyFinished) {
      const targetMatchId = lastMatchOfThisGroup?.id || mId;
      const targetMatchOrder = lastMatchOfThisGroup?.match_order || mOrder;

      console.log(`\n==================================================`);
      console.log(`[GROUP-PROG-DIAG] 📦 Starte Stufe 1 für Gruppe ${activeGroupName}`);
      console.log(`[GROUP-PROG-DIAG] Realität aus DB:`);
      console.log(`  - Rank 1-4: 1:${realGroup.rank_1}, 2:${realGroup.rank_2}, 3:${realGroup.rank_3}, 4:${realGroup.rank_4}`);
      console.log(`  - realGroup.reached_ko (Sichere Weiterkommer):`, JSON.stringify(realGroup.reached_ko));
      console.log(`==================================================`);
      
      const { data: userGroupProgs, error: uProgErr } = await supabase
        .from("user_prognosis_group")
        .select("*")
        .eq("group_name", activeGroupName);
      
      if (uProgErr) console.error("[PROG-DIAG] Fehler beim Laden von user_prognosis_group:", uProgErr.message);

      if (userGroupProgs) {
        const validProgs = userGroupProgs.filter(p => p.rank_1 && p.rank_2 && p.rank_3 && p.rank_4);
        console.log(`[GROUP-PROG-DIAG] Gefundene User-Prognosen für diese Gruppe: ${validProgs.length}`);

        let totalPathMatches = 0;
        let sampleLogged = false;

        validProgs.forEach(prog => {
          ['rank_1', 'rank_2', 'rank_3', 'rank_4'].forEach((rankKey) => {
            if (prog[rankKey] === realGroup[rankKey] && realGroup[rankKey] !== null) {
              console.log(`[DEBUG-PROG-MATCH] 🔥 Rang-Treffer! User #${prog.player_id} hat ${rankKey} richtig: ${prog[rankKey]}`);
              pointsEntries.push(createPointEntry(prog.player_id, 'GROUP_RANK', POINTS_CONFIG.PROG_TABLE_POS, prog[rankKey], 1, activeGroupName, targetMatchId, targetMatchOrder, currentMatch.matchday));
            }
          });

          const userQualifiers = [...(prog.reached_ko || []), ...(prog.reached_ko_best_thirds || [])];
          const realQualifiers = [...(realGroup.reached_ko || [])];

          if (!sampleLogged) {
            console.log(`[GROUP-PROG-DIAG] 👀 Sample-Check für Spieler ${prog.player_id}:`);
            console.log(`  - Vom User getippte Weiterkommer (userQualifiers):`, JSON.stringify(userQualifiers));
            console.log(`  - Reale Weiterkommer aus DB (realQualifiers):`, JSON.stringify(realQualifiers));
            sampleLogged = true;
          }

          userQualifiers.forEach(team => {
            if (team && realQualifiers.includes(team)) {
              totalPathMatches++;
              
              if (prog.rank_3 === team && realGroup.rank_2 === team) {
                console.log(`[GROUP-PROG-DIAG] 🔥 TREFFER: Spieler ${prog.player_id} hat "${team}" auf P3 getippt, ist aber als P2 weiter!`);
              }

              pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_REACH_16, team, 1, activeGroupName, targetMatchId, targetMatchOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_REACH_16 }));
            }
          });

          const userDroppedOut = [...(prog.dropped_out || [])];
          if (realGroup.rank_4 && userDroppedOut.includes(realGroup.rank_4)) {
            console.log(`[DEBUG-PROG-MATCH] 🔥 Ausscheider-Treffer! User #${prog.player_id} hat P4-Ausscheiden richtig für: ${realGroup.rank_4}`);
            pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_OUT_VORRUNDE, realGroup.rank_4, 1, activeGroupName, targetMatchId, targetMatchOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_OUT_VORRUNDE }));
          }
        });

        console.log(`[GROUP-PROG-DIAG] 🏁 Stufe 1 fertig. "Turnier-Pfad"-Treffer in dieser Gruppe gesamt: ${totalPathMatches}`);
      }
    } else {
      console.log(`[DEBUG-PROG] Gruppe ${activeGroupName} ist laut DB oder Match-Ständen noch nicht vollständig beendet.`);
    }

    if (mOrder === 72) {
      console.log("[ENGINE] 🏁 Spiel 72 erreicht! Werte jetzt das Schicksal aller Gruppendritten aus...");
      
      const { data: allRealGroups, error: allGroupsErr } = await supabase.from("real_group_state").select("*");
      const { data: allUserProgs, error: allUserProgsErr } = await supabase.from("user_prognosis_group").select("*");

      if (!allGroupsErr && !allUserProgsErr && allRealGroups && allUserProgs) {
        allRealGroups.forEach(rg => {
          const groupThirdTeam = rg.rank_3;
          if (!groupThirdTeam) return;

          const realThirdsReachedKO = rg.reached_ko_best_thirds || [];
          const realDroppedOut = rg.dropped_out || [];
          const relevantProgs = allUserProgs.filter(p => p.group_name === rg.group_name);

          relevantProgs.forEach(prog => {
            if (realThirdsReachedKO.includes(groupThirdTeam)) {
              const userExpectedQualifiers = [...(prog.reached_ko || []), ...(prog.reached_ko_best_thirds || [])];
              if (userExpectedQualifiers.includes(groupThirdTeam)) {
                console.log(`[DEBUG-PROG-DRITTE] User #${prog.player_id} bekommt Punkte: Bester Gruppendritter ${groupThirdTeam} kam weiter.`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_REACH_16, groupThirdTeam, 1, rg.group_name, mId, mOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_REACH_16 }));
              }
            }
            if (realDroppedOut.includes(groupThirdTeam) && groupThirdTeam !== rg.rank_4) {
              if (prog.dropped_out?.includes(groupThirdTeam)) {
                console.log(`[DEBUG-PROG-DRITTE] User #${prog.player_id} bekommt Punkte: Schlechterer Gruppendritter ${groupThirdTeam} ist ausgeschieden.`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_OUT_VORRUNDE, groupThirdTeam, 1, rg.group_name, mId, mOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_OUT_VORRUNDE }));
              }
            }
          });
        });
      } else {
        console.error(`[DEBUG-PROG-DRITTE] Fehler beim Laden der Gesamtdaten für Spiel 72. GroupsErr: ${allGroupsErr?.message}, ProgsErr: ${allUserProgsErr?.message}`);
      }
    }
  }

  // --- B. KO-PHASEN PUNKTE ---
  if (stage === "ko" && currentMatch.winner_real !== 0 && realKO) {
    const { data: userKOProgs, error: koProgErr } = await supabase.from("user_prognosis_ko").select("*");
    if (koProgErr) {
      console.error(`[DEBUG-PROG-KO] ❌ Fehler beim Laden von user_prognosis_ko:`, koProgErr.message);
      return;
    }

    if (userKOProgs) {
      const validKOProgs = userKOProgs.filter(p => p.reached_16 || p.reached_8 || p.reached_4 || p.reached_2 || p.winner_final);
      console.log(`[DEBUG-PROG-KO] Verarbeite KO-Prognosen für Match #${mId}. Gefundene Zeilen: ${validKOProgs.length}`);
      
      const roundMapping = {
        1: { name: "Sechzehntelfinale", progKey: 'reached_8', pts: POINTS_CONFIG.PROG_REACH_8, dropKey: 'drop_out_16', dropPts: POINTS_CONFIG.PROG_OUT_16 },
        2: { name: "Achtelfinale", progKey: 'reached_4', pts: POINTS_CONFIG.PROG_REACH_4, dropKey: 'drop_out_8', dropPts: POINTS_CONFIG.PROG_OUT_8 },
        3: { name: "Viertelfinale", progKey: 'reached_2', pts: POINTS_CONFIG.PROG_REACH_2, dropKey: 'drop_out_4', dropPts: POINTS_CONFIG.PROG_OUT_4 },
        4: { name: "Halbfinale", isSemifinal: true, pts: POINTS_CONFIG.PROG_REACH_FINAL, dropKey: 'drop_out_2', dropPts: POINTS_CONFIG.PROG_OUT_2 }, 
        5: { name: "Finale / Platz 3", isFinalsRound: true }
      };

      const activeRound = roundMapping[currentMatch.stage_order];
      if (activeRound) {
        const realWinnerOfThisMatch = currentMatch.winner_real === 1 ? currentMatch.team_a : currentMatch.team_b;
        const realLoserOfThisMatch = currentMatch.winner_real === 1 ? currentMatch.team_b : currentMatch.team_a;
        console.log(`[DEBUG-PROG-KO] Runde ermittelt: ${activeRound.name}. Realer Sieger: ${realWinnerOfThisMatch}, Realer Verlierer: ${realLoserOfThisMatch}`);

        validKOProgs.forEach(prog => {
          const divisor = POINTS_CONFIG.DIVISORS[prog.phase_id] || 1;
          
          if (!activeRound.isFinalsRound) {
            let isWinnerPredicted = false;
            if (activeRound.isSemifinal) {
              isWinnerPredicted = (prog.winner_final === realWinnerOfThisMatch || prog.loser_final === realWinnerOfThisMatch);
            } else {
              const progTeams = Array.isArray(prog[activeRound.progKey]) ? prog[activeRound.progKey] : [prog[activeRound.progKey]];
              isWinnerPredicted = progTeams.includes(realWinnerOfThisMatch);
            }

            if (isWinnerPredicted) {
              console.log(`[DEBUG-PROG-KO] 🔥 Treffer! User #${prog.player_id} hat das Weiterkommen von ${realWinnerOfThisMatch} prognostiziert.`);
              pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', activeRound.pts / divisor, realWinnerOfThisMatch, prog.phase_id, "KO", mId, mOrder, currentMatch.matchday, { original: activeRound.pts, divisor, roundName: activeRound.name, isWinner: true }));
            }
            
            if (activeRound.dropKey) {
              const progDropped = Array.isArray(prog[activeRound.dropKey]) ? prog[activeRound.dropKey] : [prog[activeRound.dropKey]];
              if (progDropped.includes(realLoserOfThisMatch)) {
                console.log(`[DEBUG-PROG-KO] 🔥 Treffer! User #${prog.player_id} hat das Ausscheiden von ${realLoserOfThisMatch} prognostiziert.`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', activeRound.dropPts / divisor, realLoserOfThisMatch, prog.phase_id, "KO", mId, mOrder, currentMatch.matchday, { original: activeRound.dropPts, divisor, roundName: activeRound.name, isWinner: false }));
              }
            }
          } else {
            const isChampMatch = (mOrder === 79 || currentMatch.ko_order === 0);
            if (isChampMatch) {
              if (prog.winner_final && realKO.winner_final === prog.winner_final && prog.winner_final === realWinnerOfThisMatch) {
                console.log(`[DEBUG-PROG-KO] 🔥 Champ-Treffer für User #${prog.player_id}: ${prog.winner_final}`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_CHAMPION / divisor, prog.winner_final, prog.phase_id, "KO", mId, mOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_CHAMPION, divisor }));
              }
              if (prog.loser_final && realKO.loser_final === prog.loser_final && prog.loser_final === realLoserOfThisMatch) {
                console.log(`[DEBUG-PROG-KO] 🔥 Vize-Treffer für User #${prog.player_id}: ${prog.loser_final}`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_VIZE / divisor, prog.loser_final, prog.phase_id, "KO", mId, mOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_VIZE, divisor }));
              }
            } else {
              if (prog.winner_small_final && realKO.winner_small_final === prog.winner_small_final && prog.winner_small_final === realWinnerOfThisMatch) {
                console.log(`[DEBUG-PROG-KO] 🔥 Platz 3 Treffer für User #${prog.player_id}: ${prog.winner_small_final}`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_PLACE_3 / divisor, prog.winner_small_final, prog.phase_id, "KO", mId, mOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_PLACE_3, divisor }));
              }
              if (prog.loser_small_final && realKO.loser_small_final === prog.loser_small_final && prog.loser_small_final === realLoserOfThisMatch) {
                console.log(`[DEBUG-PROG-KO] 🔥 Platz 4 Treffer für User #${prog.player_id}: ${prog.loser_small_final}`);
                pointsEntries.push(createPointEntry(prog.player_id, 'PROGNOSIS_PATH', POINTS_CONFIG.PROG_PLACE_4 / divisor, prog.loser_small_final, prog.phase_id, "KO", mId, mOrder, currentMatch.matchday, { original: POINTS_CONFIG.PROG_PLACE_4, divisor }));
              }
            }
          }
        });
      } else {
        console.log(`[DEBUG-PROG-KO] Keine gemappte KO-Runde für stage_order: ${currentMatch.stage_order}`);
      }
    }
  }

  // --- DUPLIKATSFILTER & SPEICHERUNG ---
  const uniquePointsMap = {};
  pointsEntries.forEach(entry => {
    const uniqueKey = `${entry.player_id}_${entry.category}_${entry.reference_team}_${entry.phase_id}`;
    uniquePointsMap[uniqueKey] = entry;
  });

  const finalPointsEntries = Object.values(uniquePointsMap);
  
  const matchIdsToDelete = [mId];
  if (stage === "group") {
    const groupMatches = allMatches.filter(m => m.group_name === activeGroupName);
    const lastMatchOfThisGroup = groupMatches.reduce((max, m) => m.match_order > max.match_order ? m : max, groupMatches[0]);
    if (lastMatchOfThisGroup && !matchIdsToDelete.includes(lastMatchOfThisGroup.id)) {
      matchIdsToDelete.push(lastMatchOfThisGroup.id);
    }
  }
  
  console.log(`[DEBUG-PROG] Bereinige alte Prognose-Punkte aus user_points_detail für MatchIDs: [${matchIdsToDelete.join(", ")}]...`);
  const { error: delErr } = await supabase
    .from("user_points_detail")
    .delete()
    .in("match_id", matchIdsToDelete)
    .eq("is_prognosis", true);
  
  if (delErr) console.error(`[DEBUG-PROG] ❌ Fehler beim Löschen alter Prognose-Punkte:`, delErr.message);
  
  if (finalPointsEntries.length > 0) {
    console.log(`[DEBUG-PROG] Upserte ${finalPointsEntries.length} Zeilen in user_points_detail...`);
    const { error } = await supabase
      .from("user_points_detail")
      .upsert(finalPointsEntries, { 
        onConflict: "player_id,match_id,category,reference_team,phase_id" 
      });

    if (error) console.error("[PROG-DIAG] Upsert-Fehler:", error.message);
    else console.log(`[PROG-DIAG] ===== ${finalPointsEntries.length} Prognosen erfolgreich aktualisiert! =====`);
  } else {
    console.log(`[DEBUG-PROG] Keine Prognose-Punkte zu speichern für Match #${mId}.`);
  }
}