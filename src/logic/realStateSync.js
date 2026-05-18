import { supabase } from "../supabaseClient";
import { calculateFIFADataTable } from "./tournamentLogic";
import { getBestThirds } from "../Utils/calcTable";
import { resolveSlot } from "./koLogic"; 
import { processPrognosisPoints } from "./pointsEngine";

/**
 * Kernfunktion: Synchronisiert den realen Turnierverlauf in die DB
 */
export async function syncRealTournamentState(matches, groupName = null) {
  // 1. REAL RESULTS MAP ERSTELLEN
  const realTips = {};
  matches.forEach(m => {
    realTips[m.id] = { 
      goals_a: m.goals_a_real, 
      goals_b: m.goals_b_real, 
      winner: m.winner_real 
    };
  });

  // 2. BASIS-DATEN FÜR ALLE GRUPPEN BERECHNEN
  const allGroups = [...new Set(matches.filter(m => m.stage === "group").map(m => m.group_name))];
  const allTables = allGroups.map(name => ({
    id: name,
    teams: calculateFIFADataTable(matches.filter(m => m.group_name === name), realTips)
  }));

  // FILTER FÜR FERTIGE GRUPPEN
  const finishedGroups = allGroups.filter(gName => {
    const groupMatches = matches.filter(m => m.group_name === gName);
    return groupMatches.length > 0 && groupMatches.every(m => m.goals_a_real !== null);
  });

  // 3. BEST THIRDS & 32 QUALIFIER POOL BERECHNUNG
  const allThirdsSorted = getBestThirds(allTables);
  
  const best8ThirdsReal = allThirdsSorted.slice(0, 8).map(t => ({
    team: t.team,
    group: t.group 
  }));

  const worst4ThirdsReal = allThirdsSorted.slice(8, 12).map(t => t.team);

  // KORREKTUR FÜR finalReached16
  const top24Real = allTables
    .filter(t => finishedGroups.includes(t.id)) 
    .flatMap(t => t.teams.slice(0, 2).map(teamObj => teamObj.team));

  // Gruppendritte erst hinzufügen, wenn ALLE Gruppenspiele des Turniers fertig sind
  const allGroupGamesFinished = matches
    .filter(m => m.stage === "group")
    .every(m => m.goals_a_real !== null);

  const finalReached16 = [
    ...top24Real, 
    ...(allGroupGamesFinished ? best8ThirdsReal.map(t => t.team) : [])
  ].filter(name => name && !isPlaceholder(name));

  // 4. GRUPPEN-STATES AKTUALISIEREN
  for (const groupData of allTables) {
    const gName = groupData.id;
    const table = groupData.teams;
    const isFinished = finishedGroups.includes(gName);

    if (isFinished) {
      const groupFourth = table[3]?.team;
      const groupThird = table[2]?.team;
      const finalDroppedOut = [];
      
      if (groupFourth) finalDroppedOut.push(groupFourth);
      
      const isBestThird = best8ThirdsReal.some(bt => bt.team === groupThird);
      const groupBestThirdsForDB = isBestThird ? [groupThird] : [];

      // Wenn das gesamte Gruppen-Turnier vorbei ist, wissen wir sicher, welche 3. ausscheiden
      if (allGroupGamesFinished && groupThird && worst4ThirdsReal.includes(groupThird)) {
        finalDroppedOut.push(groupThird);
      }

      const record = {
        group_name: gName,
        rank_1: table[0]?.team || null,
        rank_2: table[1]?.team || null,
        rank_3: table[2]?.team || null,
        rank_4: table[3]?.team || null,
        reached_ko: table.slice(0, 2).map(t => t.team),
        reached_ko_best_thirds: groupBestThirdsForDB, 
        dropped_out: finalDroppedOut,
        is_finished: true
      };
      await supabase.from("real_group_state").upsert(record);
    } else {
      await supabase.from("real_group_state").upsert({
        group_name: gName,
        rank_1: null,
        rank_2: null,
        rank_3: null,
        rank_4: null,
        reached_ko: [],
        reached_ko_best_thirds: [],
        dropped_out: [],
        is_finished: false
      });
    }
  }

  // ==========================================
  // 5. KO-PHASEN UPDATE
  // ==========================================
  const koMatches = matches.filter(m => m.stage === "ko");
  
  const getTeamsWhoReachedStage = (targetStageOrder) => {
    if (targetStageOrder === 1) return finalReached16; 

    const previousStageOrder = targetStageOrder - 1;
    return koMatches
      .filter(m => m.stage_order === previousStageOrder && m.winner_real !== 0 && m.winner_real !== null)
      .map(m => (m.winner_real === 1 ? m.team_a : m.team_b))
      .filter(name => name && !isPlaceholder(name));
  };

  const getLoserByStage = (stageOrder) => {
    // Da Finale und Platz 3 beide stage_order 5 teilen, filtern wir Platz 3 hier explizit heraus,
    // damit drop_out_2 rein die Halbfinal-Verlierer (bzw. die Teilnehmer des Spiels um Platz 3) abbildet.
    return koMatches
      .filter(m => m.stage_order === stageOrder && m.match_order !== 103)
      .map(m => {
        const win = getWinnerForSync(m); 
        if (!win) return null;
        return win === 1 ? m.team_b : m.team_a;
      })
      .filter(name => name && !isPlaceholder(name));
  };

  function getWinnerForSync(m) {
    if (m.goals_a_real > m.goals_b_real) return 1;
    if (m.goals_a_real < m.goals_b_real) return 2;
    if (m.goals_a_real === m.goals_b_real && m.goals_a_real !== null) {
      return m.winner_real; 
    }
    return null;
  }

  // Eindeutige Selektion der beiden Finalspiele über Match-Order
  const finalMatch = koMatches.find(m => m.match_order === 104);
  const thirdPlaceMatch = koMatches.find(m => m.match_order === 103);

  // Gewinner und Verlierer des echten Finales (Match 104)
  let winnerFinal = null;
  let loserFinal = null;
  if (finalMatch && finalMatch.winner_real) {
    winnerFinal = finalMatch.winner_real === 1 ? finalMatch.team_a : finalMatch.team_b;
    loserFinal = finalMatch.winner_real === 1 ? finalMatch.team_b : finalMatch.team_a;
  }

  // Gewinner (3. Platz) und Verlierer (4. Platz) des kleinen Finales (Match 103)
  let winnerSmallFinal = null;
  let loserSmallFinal = null;
  if (thirdPlaceMatch && thirdPlaceMatch.winner_real) {
    winnerSmallFinal = thirdPlaceMatch.winner_real === 1 ? thirdPlaceMatch.team_a : thirdPlaceMatch.team_b;
    loserSmallFinal = thirdPlaceMatch.winner_real === 1 ? thirdPlaceMatch.team_b : thirdPlaceMatch.team_a;
  }

  const realKOUpdate = {
    id: 1,
    reached_16: finalReached16, 
    reached_8:  getTeamsWhoReachedStage(2),
    reached_4:  getTeamsWhoReachedStage(3),
    reached_2:  getTeamsWhoReachedStage(4), // Die 4 Teams aus den Halbfinals
    winner_final: winnerFinal,
    loser_final: loserFinal,
    winner_small_final: winnerSmallFinal,
    loser_small_final: loserSmallFinal,
    drop_out_16: getLoserByStage(1),
    drop_out_8:  getLoserByStage(2),
    drop_out_4:  getLoserByStage(3),
    drop_out_2:  getLoserByStage(4) // Die beiden Verlierer des Halbfinals
  };

  await supabase.from("real_ko_state").upsert(realKOUpdate);

  // KO-MATCH TEAMS IN DER 'MATCH' TABELLE AKTUALISIEREN
  await updateKOMatchLabels(matches, allTables, best8ThirdsReal, realTips);

  // --- FINALER LOOP FÜR PUNKTE (SPIEL 72 ANKER) ---
  if (allGroupGamesFinished) {
    const anchorMatch = matches.find(m => m.match_order === 72);
    
    if (anchorMatch) {
      // Lösche vor dem Gruppendritten-Loop gezielt nur die Einträge, die direkt an Spiel 72 hängen
      await supabase.from("user_points_detail")
        .delete()
        .eq("match_id", anchorMatch.id)
        .eq("is_prognosis", true);

      // Loop über alle Gruppen, um ausschließlich die Gruppendritten auszuwerten
      for (const groupName of allGroups) {
        // Parameter 'isFinalThirdsLoop' wird auf true gesetzt
        await processPrognosisPoints(matches, anchorMatch, groupName, true);
      }
    }
  }
}

async function updateKOMatchLabels(matches, allTables, best8ThirdsReal, realTips) {
  console.log("=== START SYNC KO LABELS ===");
  
  // --- DIAGNOSE-LOGS ---
  console.log("--> [DIAGNOSE] Gesamtes übergebenes Array 'matches' Länge:", matches?.length);
  const hintereSpiele = matches ? matches.filter(m => m.match_order >= 80) : [];
  console.log("--> [DIAGNOSE] Spiele ab Match-Order 80 im Array:");
  hintereSpiele.forEach(m => {
    console.log(`    ID: ${m.id} | MatchOrder: ${m.match_order} | Stage: "${m.stage}" | StageOrder: ${m.stage_order} | Placeholder_A: "${m.placeholder_a}"`);
  });

  const groupResults = {};
  allTables.forEach(t => {
    const groupMatches = matches.filter(m => m.group_name === t.id);
    const isFinished = groupMatches.length > 0 && groupMatches.every(m => m.goals_a_real !== null);
    groupResults[t.id] = isFinished ? t.teams.map(teamObj => teamObj.team) : null;
  });

  const tournamentContext = {
    groups: groupResults,
    thirdPlaces: best8ThirdsReal,
    tips: realTips,
    phaseId: 1
  };

  const koMatches = matches
    .filter(m => m.stage === "ko")
    .sort((a, b) => a.stage_order - b.stage_order || a.match_order - b.match_order);

  let localMatches = [...matches];

  for (const m of koMatches) {
    // Diese Variablen halten am Ende der Strategien das berechnete Ergebnis
    let newTeamA = m.team_a;
    let newTeamB = m.team_b;

    // --- STRATEGIE 1: Erste KO-Runde (Sechzehntelfinale / Stage Order 1) ---
    if (m.stage_order === 1) {
      if (m.placeholder_a) {
        newTeamA = resolveSlot(m.placeholder_a, { ...tournamentContext, matches: localMatches }) || m.placeholder_a;
      }
      if (m.placeholder_b) {
        newTeamB = resolveSlot(m.placeholder_b, { ...tournamentContext, matches: localMatches }) || m.placeholder_b;
      }
    } 
    // --- STRATEGIE 2: Folgerunden (Achtelfinale, Viertelfinale, Halbfinale, Finale) ---
    else {
      // Funktion zur dynamischen Ermittlung des Siegerteams aus der Vorrunde
      async function getTeamFromPreviousStage(placeholder, currentMatch) {
        if (!placeholder || isPlaceholder(placeholder)) return null;

        const match = placeholder.match(/^([A-Z]+)(\d+)$/i);
        if (!match) return null;

        const prefix = match[1].toUpperCase();
        const orderNum = parseInt(match[2], 10);

        let sourceMatchOrder = 0;

        if (prefix === "SSZF") {
          sourceMatchOrder = orderNum + 72; // SSZF1 bis SSZF16
        } else if (prefix === "SAF") {
          sourceMatchOrder = orderNum + 88; // SAF1 bis SAF8
        } else if (prefix === "SVF") {
          sourceMatchOrder = orderNum + 96; // SVF1 bis SVF4
        } else if (prefix === "VHF" || prefix === "SHF") {
          sourceMatchOrder = orderNum + 100; // VHF1/SHF1 bis VHF2/SHF2
        }

        if (sourceMatchOrder === 0) return null;

        const sourceMatch = localMatches.find(x => x.match_order === sourceMatchOrder);
        if (!sourceMatch) return null;

        let winnerState = null;
        if (sourceMatch.goals_a_real > sourceMatch.goals_b_real) winnerState = 1;
        else if (sourceMatch.goals_a_real < sourceMatch.goals_b_real) winnerState = 2;
        else if (sourceMatch.goals_a_real === sourceMatch.goals_b_real && sourceMatch.goals_a_real !== null) {
          winnerState = sourceMatch.winner_real;
        }

        if (!winnerState) return null;

        // VHF = Verlierer Halbfinale -> Hier geben wir den Verlierer zurück
        if (prefix === "VHF") {
          return winnerState === 1 ? sourceMatch.team_b : sourceMatch.team_a;
        }

        // Standard für SHF (Sieger Halbfinale) sowie alle anderen Vorrunden: Gewinner rückt vor
        return winnerState === 1 ? sourceMatch.team_a : sourceMatch.team_b;
      }

      if (m.placeholder_a) {
        const resolved = await getTeamFromPreviousStage(m.placeholder_a, m);
        if (resolved) newTeamA = resolved;
      }

      if (m.placeholder_b) {
        const resolved = await getTeamFromPreviousStage(m.placeholder_b, m);
        if (resolved) newTeamB = resolved;
      }
    }

    // --- GEMEINSAMER ABGLEICH & EINZIGES UPDATE FÜR ALLE PHASEN ---
    const isReadyA = newTeamA && !isPlaceholder(newTeamA);
    const isReadyB = newTeamB && !isPlaceholder(newTeamB);
    const dynamicGoalsA = !isReadyA ? null : m.goals_a_real;
    const dynamicGoalsB = !isReadyB ? null : m.goals_b_real;
    const dynamicWinner = (!isReadyA || !isReadyB) ? null : m.winner_real;

    if (newTeamA !== m.team_a || newTeamB !== m.team_b) {
      console.log(`[MATCH-SYNC STAGE ${m.stage_order}] ID ${m.id} (Match ${m.match_order}) wird zu: ${newTeamA} vs ${newTeamB}`);
      
      const { error } = await supabase
        .from("match")
        .update({ 
          team_a: newTeamA, 
          team_b: newTeamB,
          goals_a_real: dynamicGoalsA,
          goals_b_real: dynamicGoalsB,
          winner_real: dynamicWinner
        })
        .eq("id", m.id);

      if (error) {
        console.error(`DB Update Error bei Match ID ${m.id}:`, error.message);
      }

      // Lokales Array updaten, damit die darauffolgende Runde im Loop die frisch eingetragenen Teams sieht!
      localMatches = localMatches.map(lm => 
        lm.id === m.id 
          ? { ...lm, team_a: newTeamA, team_b: newTeamB, goals_a_real: dynamicGoalsA, goals_b_real: dynamicGoalsB, winner_real: dynamicWinner } 
          : lm
      );
    }
  }
  console.log("=== END SYNC KO LABELS ===");
}

export function isPlaceholder(str) {
  if (!str) return false;
  if (str.includes("Placeholder")) return true;
  // Regex erweitert um SSZF? (optionales F) für maximale Flexibilität bei Platzhaltern
  const placeholderRegex = /^([A-L][1-4]|[1-4][A-L]|Winner|Loser|1[A-L]|2[A-L]|3[A-L]|SSZF?\d+)/i;
  return placeholderRegex.test(str);
}