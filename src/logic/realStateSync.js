import { supabase } from "../supabaseClient";
import { calculateFIFADataTable } from "./tournamentLogic";
import { getBestThirds } from "../Utils/calcTable";

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

  // 3. BEST THIRDS & 32 QUALIFIER POOL BERECHNUNG
  // Alle 12 Dritten nach FIFA-Kriterien sortieren
  const allThirdsSorted = getBestThirds(allTables);
  
  // Die 8 besten Dritten (kommen weiter)
  const best8ThirdsReal = allThirdsSorted.slice(0, 8).map(t => t.team);
  
  // Die 4 schlechtesten Dritten (scheiden aus)
  const worst4ThirdsReal = allThirdsSorted.slice(8, 12).map(t => t.team);

  // Echte Top 2 jeder Gruppe (24 Teams)
  const top24Real = allTables.flatMap(t => t.teams.slice(0, 2).map(teamObj => teamObj.team));

  // Der vollständige Pool der 32 Teams für reached_16
  const finalReached16 = [...top24Real, ...best8ThirdsReal].filter(name => name && !name.includes("Placeholder"));

  // 4. GRUPPEN-STATES AKTUALISIEREN (inkl. der neuen Dropped-Out Logik)
  for (const groupData of allTables) {
    const gName = groupData.id;
    const table = groupData.teams;
    const groupMatches = matches.filter(m => m.group_name === gName);
    
    const finishedMatchesCount = groupMatches.filter(m => m.goals_a_real !== null).length;
    const isFinished = finishedMatchesCount > 0 && finishedMatchesCount === groupMatches.length;

    if (isFinished) {
      const groupFourth = table[3]?.team;
      const groupThird = table[2]?.team;

      // Sammelbecken für alle, die in dieser Gruppe ausscheiden
      const finalDroppedOut = [];
      if (groupFourth) finalDroppedOut.push(groupFourth);
      
      // Falls der Gruppendritte zu den 4 schlechtesten Dritten des Turniers gehört:
      if (groupThird && worst4ThirdsReal.includes(groupThird)) {
        finalDroppedOut.push(groupThird);
      }

      const record = {
        group_name: gName,
        rank_1: table[0]?.team || null,
        rank_2: table[1]?.team || null,
        rank_3: table[2]?.team || null,
        rank_4: table[3]?.team || null,
        reached_ko: table.slice(0, 2).map(t => t.team), 
        dropped_out: finalDroppedOut, // Hier sind jetzt ggf. 2 Teams drin
        is_finished: true
      };

      await supabase.from("real_group_state").upsert(record);
    }
  }

  // 5. KO-PHASEN UPDATE
  const koMatches = matches.filter(m => m.stage === "ko");
  
  const getTeamsByStage = (stageOrder) => {
    const stageMatches = koMatches.filter(m => m.stage_order === stageOrder);
    const teams = [];
    stageMatches.forEach(m => {
      if (m.team_a && !m.team_a.includes("Placeholder")) teams.push(m.team_a);
      if (m.team_b && !m.team_b.includes("Placeholder")) teams.push(m.team_b);
    });
    return [...new Set(teams)];
  };

  const getLoserByStage = (stageOrder) => {
    return koMatches
      .filter(m => m.stage_order === stageOrder && m.winner_real !== 0 && m.winner_real !== null)
      .map(m => m.winner_real === 1 ? m.team_b : m.team_a);
  };

  const finalMatch = koMatches.find(m => m.stage_order === 5);
  let winnerFinal = null;
  if (finalMatch && finalMatch.winner_real) {
    winnerFinal = finalMatch.winner_real === 1 ? finalMatch.team_a : finalMatch.team_b;
  }

  const realKOUpdate = {
    id: 1,
    reached_16: finalReached16, 
    reached_8:  getTeamsByStage(2),
    reached_4:  getTeamsByStage(3),
    reached_2:  getTeamsByStage(4),
    winner_final: winnerFinal,
    drop_out_16: getLoserByStage(1),
    drop_out_8:  getLoserByStage(2),
    drop_out_4:  getLoserByStage(3),
    drop_out_2:  getLoserByStage(4)
  };

  await supabase.from("real_ko_state").upsert(realKOUpdate);
}