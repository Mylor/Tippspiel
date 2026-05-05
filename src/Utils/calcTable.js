// src/utils/calcTable.js

/**
 * Berechnet die Gruppendritten und sortiert sie korrekt.
 * @param {Array} allGroups - Alle Gruppenobjekte
 * @param {Object} manualRanks - Das Objekt mit den Stichwahl-Rängen { "TeamName": 1 }
 */
export function getBestThirds(allGroups, manualRanks = {}) {
  const thirds = allGroups.map((group) => {
    // Sicherstellen, dass wir das Team auf Platz 3 (Index 2) bekommen
    const thirdPlaceTeam = group.teams && group.teams[2]; 
    if (!thirdPlaceTeam) return null;

    return {
      team: thirdPlaceTeam.team,
      points: thirdPlaceTeam.points || 0,
      goals: thirdPlaceTeam.goals || thirdPlaceTeam.goalsFor || 0,
      diff: thirdPlaceTeam.diff !== undefined ? thirdPlaceTeam.diff : (thirdPlaceTeam.goalDiff || 0),
      group: group.id 
    };
  }).filter(Boolean);

  return thirds.sort((a, b) => {
    // 1. Punkte (höher ist besser)
    if (b.points !== a.points) return b.points - a.points;
    
    // 2. Tordifferenz (höher ist besser)
    if (b.diff !== a.diff) return b.diff - a.diff;
    
    // 3. Erzielte Tore (höher ist besser)
    if (b.goals !== a.goals) return b.goals - a.goals;
    
    // 4. Stichwahl / Manual Ranks (niedrigerer Rang ist besser, z.B. 1 vor 2)
    const rankA = manualRanks[a.team] ? parseInt(manualRanks[a.team]) : 99;
    const rankB = manualRanks[b.team] ? parseInt(manualRanks[b.team]) : 99;
    
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Optionaler Fallback: Alphabetisch, damit die Liste stabil bleibt
    return a.team.localeCompare(b.team);
  });
}