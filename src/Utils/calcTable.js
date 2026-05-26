// src/utils/calcTable.js

/**
 * getBestThirds: Erstellt eine Rangliste der Drittplatzierten über alle Gruppen hinweg.
 * @param {Array} allGroups - Array aller Gruppen (A-L), jede Gruppe enthält ihr Team-Ranking.
 * @param {Object} manualRanks - Optionales Objekt für Stichwahlen (z.B. Fairplay-Wertung).
 */
export function getBestThirds(allGroups, manualRanks = {}) {
  const thirds = allGroups.map((group) => {
    const thirdPlaceTeam = group.teams && group.teams[2]; 
    if (!thirdPlaceTeam) return null;

    return {
      // Normierung auf einheitliche Keys
      team: thirdPlaceTeam.team ?? thirdPlaceTeam.name,
      points: thirdPlaceTeam.points ?? 0,
      goals: thirdPlaceTeam.goals ?? thirdPlaceTeam.goalsFor ?? 0, 
      diff: thirdPlaceTeam.diff ?? thirdPlaceTeam.goalDiff ?? 0,
      group: group.id
    };
  }).filter(Boolean);

  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.goals !== a.goals) return b.goals - a.goals;
    
    const rankA = manualRanks[a.team] ? parseInt(manualRanks[a.team], 10) : 99;
    const rankB = manualRanks[b.team] ? parseInt(manualRanks[b.team], 10) : 99;
    
    if (rankA !== rankB) return rankA - rankB;
    return a.team.localeCompare(b.team);
  });
}