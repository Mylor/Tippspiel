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

  // BEST THIRDS & POOL VORBEREITUNG
  const allThirdsSorted = getBestThirds(allTables);
  
  const best8ThirdsReal = allThirdsSorted.slice(0, 8).map(t => ({
    team: t.team,
    group: t.group 
  }));

  const worst4ThirdsReal = allThirdsSorted.slice(8, 12).map(t => t.team);

  // ==========================================================================
  // KORREKTUR: KO-MATCH LABELS ZUERST AUFLÖSEN & ALS BASIS NUTZEN
  // ==========================================================================
  // Wir übergeben das gesamte Array. Die Funktion filtert nun selbst intelligent!
  const updatedLocalMatches = await updateKOMatchLabels(matches, allTables, best8ThirdsReal, realTips);

  // KORREKTUR FÜR finalReached16 (Verwendet jetzt die bereinigten Matches)
  const top24Real = allTables
    .filter(t => finishedGroups.includes(t.id)) 
    .flatMap(t => t.teams.slice(0, 2).map(teamObj => teamObj.team));

  // Gruppendritte erst hinzufügen, wenn ALLE Gruppenspiele des Turniers fertig sind
  const allGroupGamesFinished = updatedLocalMatches
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
  // 5. KO-PHASEN UPDATE (Nutzt updatedLocalMatches)
  // ==========================================
  const koMatches = updatedLocalMatches.filter(m => m.stage === "ko");
  
  const getTeamsWhoReachedStage = (targetStageOrder) => {
    if (targetStageOrder === 1) return finalReached16; 

    const previousStageOrder = targetStageOrder - 1;
    return koMatches
      .filter(m => m.stage_order === previousStageOrder && m.winner_real !== 0 && m.winner_real !== null)
      .map(m => (m.winner_real === 1 ? m.team_a : m.team_b))
      .filter(name => name && !isPlaceholder(name));
  };

  const getLoserByStage = (stageOrder) => {
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

  const finalMatch = koMatches.find(m => m.match_order === 104);
  const thirdPlaceMatch = koMatches.find(m => m.match_order === 103);

  let winnerFinal = null;
  let loserFinal = null;
  if (finalMatch && finalMatch.winner_real) {
    winnerFinal = finalMatch.winner_real === 1 ? finalMatch.team_a : finalMatch.team_b;
    loserFinal = finalMatch.winner_real === 1 ? finalMatch.team_b : finalMatch.team_a;
  }

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
    reached_2:  getTeamsWhoReachedStage(4), 
    winner_final: winnerFinal,
    loser_final: loserFinal,
    winner_small_final: winnerSmallFinal,
    loser_small_final: loserSmallFinal,
    drop_out_16: getLoserByStage(1),
    drop_out_8:  getLoserByStage(2),
    drop_out_4:  getLoserByStage(3),
    drop_out_2:  getLoserByStage(4) 
  };

  await supabase.from("real_ko_state").upsert(realKOUpdate);

  // --- FINALER LOOP FÜR PUNKTE (SPIEL 72 ANKER) ---
  if (allGroupGamesFinished) {
    const anchorMatch = matches.find(m => m.match_order === 72);
    
    if (anchorMatch) {
      // SCHRITT 1: Berechne erst ganz normal das Gruppenende für die Gruppe von Spiel 72 (die 7 Instanzen)
      // Das passiert automatisch im regulären Schleifendurchlauf der Matches davor, 
      // aber wir stellen sicher, dass der isFinalThirdsLoop hier danach läuft.

      // SCHRITT 2: Jetzt startet exklusiv der Sonder-Loop für alle Gruppendritten des Turniers
      for (const groupName of allGroups) {
        // 'isFinalThirdsLoop' wird explizit auf TRUE gesetzt
        // Der Code läuft jetzt durch alle Gruppen, nimmt aber als ID immer Spiel 72,
        // damit die Dritten-Punkte fest an Spiel 72 gekoppelt sind.
        await processPrognosisPoints(matches, anchorMatch, groupName, true);
      }
    }
  }
}

async function updateKOMatchLabels(matches, allTables, best8ThirdsReal, realTips) {

  console.log("[DEBUG-CHECK] Anzahl Matches mit winner_real:", 
  matches.filter(m => m.stage === "ko" && m.winner_real !== null).length);

  // 1. DIAGNOSE & VORAUSSETZUNGEN (Dein originaler Code beibehalten)
  const allGroupMatches = matches.filter(m => m.stage === "group");
  const finishedGroupMatchesCount = allGroupMatches.filter(m => m.goals_a_real !== null).length;
  const allGroupGamesFinished = allGroupMatches.every(m => m.goals_a_real !== null);

  console.log(`[SYNC-DEBUG] Starte Kaskade. Fertige Gruppen-Spiele: ${finishedGroupMatchesCount}`);

  if (finishedGroupMatchesCount > 0 && !allGroupGamesFinished) {
    const hasActiveKOChanges = matches.some(m => m.stage === "ko" && m.goals_a_real !== null);
    if (!hasActiveKOChanges) return matches;
  }
  if (finishedGroupMatchesCount === 0) return matches;

  console.log("=== START SYNC KO LABELS ===");

  const groupResults = {};
  allTables.forEach(t => {
    const groupMatches = matches.filter(m => m.group_name === t.id);
    const isFinished = groupMatches.length > 0 && groupMatches.every(m => m.goals_a_real !== null);
    groupResults[t.id] = isFinished ? t.teams.map(teamObj => teamObj.team) : null;
  });

  const tournamentContext = { groups: groupResults, thirdPlaces: best8ThirdsReal, tips: realTips, phaseId: 1 };
  const koMatches = matches
    .filter(m => m.stage === "ko")
    .sort((a, b) => a.stage_order - b.stage_order || a.match_order - b.match_order);

  let localMatches = [...matches];

  // 2. KASKADIERUNGS-LOOP
  for (const m of koMatches) {
    let newTeamA = m.team_a;
    let newTeamB = m.team_b;

    console.log(`[LOOP-DEBUG] Prüfe Match ${m.match_order} (ID: ${m.id}). Aktuelle Teams: ${m.team_a} vs ${m.team_b}`);

    if (m.stage_order === 1) {
      // 16tel-Finale auflösen (benötigt Gruppen-Daten)
      if (isPlaceholder(m.team_a)) newTeamA = resolveSlot(m.placeholder_a, { ...tournamentContext, matches: localMatches }) || m.placeholder_a;
      if (isPlaceholder(m.team_b)) newTeamB = resolveSlot(m.placeholder_b, { ...tournamentContext, matches: localMatches }) || m.placeholder_b;
    } else {
      // Folgerunden: Gewinner aus lokalem Array ziehen
      async function getTeamFromPreviousStage(placeholder) {
        if (!placeholder) return null;
        const matchInfo = placeholder.match(/^([A-Z]+)(\d+)$/i);
        if (!matchInfo) return null;
        
        // Offset-Berechnung: Ist diese korrekt?
        const offset = (matchInfo[1] === "SSZF" ? 72 : matchInfo[1] === "SAF" ? 88 : matchInfo[1] === "SVF" ? 96 : 100);
        const targetOrder = parseInt(matchInfo[2], 10) + offset;
        
        // HIER LOGGEN WIR DIE SUCHE
        console.log(`[DEBUG] Suche Quell-Match für ${placeholder} -> Match-Order gesucht: ${targetOrder}`);
        
        console.log(`[DEBUG-KASKADE] Suche Quelle für ${placeholder}.`);

        const sourceMatch = localMatches.find(x => x.match_order === targetOrder);
        console.log(`[DEBUG-KONTROLLE] Suche Order ${targetOrder}. Gefundenes Match:`, sourceMatch ? `ID: ${sourceMatch.id}, Winner: ${sourceMatch.winner_real}` : "NIX");

        console.log(`[DEBUG-VIERTEL] Suche ${placeholder}. Ziel-Order: ${targetOrder}. Gefunden?`, 
        sourceMatch ? `JA! Winner: ${sourceMatch.winner_real}` : "NEIN!");
        
        if (sourceMatch) {
          console.log(`[DEBUG-MATCH-STATUS] ID ${sourceMatch.id} | Tore: ${sourceMatch.goals_a_real}:${sourceMatch.goals_b_real} | Winner_Real: ${sourceMatch.winner_real}`);
        } else {
          console.log(`[DEBUG-MATCH-STATUS] Match mit Order ${targetOrder} NICHT gefunden.`);
        }

        if (!sourceMatch?.winner_real) return null;
        return (sourceMatch.winner_real === 1) ? sourceMatch.team_a : sourceMatch.team_b;
      }
      if (isPlaceholder(m.team_a)) newTeamA = await getTeamFromPreviousStage(m.placeholder_a) || m.placeholder_a;
      if (isPlaceholder(m.team_b)) newTeamB = await getTeamFromPreviousStage(m.placeholder_b) || m.placeholder_b;
    }

    // 3. DATENSCHONENDES UPDATE
    const isCurrentlyPlaceholder = isPlaceholder(m.team_a) || isPlaceholder(m.team_b);
    
    if (newTeamA !== m.team_a || newTeamB !== m.team_b || isCurrentlyPlaceholder) {
      console.log(`[PUSH] Update ID ${m.id}: Ersetze Platzhalter/Aktualisiere -> ${newTeamA} vs ${newTeamB}`);
      
      const { error } = await supabase
        .from("match")
        .update({ team_a: newTeamA, team_b: newTeamB })
        .eq("id", m.id);

      if (error) console.error(`[DB-ERROR]`, error);
      else console.log(`[DB-SUCCESS] Update für ID ${m.id} bestätigt.`);

      // Lokal updaten für die nächste Stufe der Kaskade
      localMatches = localMatches.map(lm => lm.id === m.id ? { ...lm, team_a: newTeamA, team_b: newTeamB } : lm);
    }
  }
  console.log("=== END SYNC KO LABELS ===");
  return localMatches; 
}

export function isPlaceholder(str) {
  if (!str) return false;
  if (str.includes("Placeholder")) return true;
  const placeholderRegex = /^([A-L][1-4]|[1-4][A-L]|Winner|Loser|1[A-L]|2[A-L]|3[A-L]|SSZF?\d+)/i;
  return placeholderRegex.test(str);
}