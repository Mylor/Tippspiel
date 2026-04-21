// src/utils/calcTable.js

/**
 * Berechnet die 8 besten Gruppendritten
 * @param {Array} allGroups - Array aller 12 Gruppentabellen
 * @param {Object} adminOverrides - Deine manuellen Korrekturen (Fairplay)
 */
/**
 * Berechnet die Gruppendritten und sortiert sie korrekt.
 */
export function getBestThirds(allGroups, adminOverrides = {}) {
  const thirds = allGroups.map((group) => {
    const thirdPlaceTeam = group.teams[2]; 
    if (!thirdPlaceTeam) return null;

    return {
      team: thirdPlaceTeam.team,
      points: thirdPlaceTeam.points || 0,
      goals: thirdPlaceTeam.goals || 0,
      conceded: thirdPlaceTeam.conceded || 0,
      diff: thirdPlaceTeam.diff || 0,
      group: group.id 
    };
  }).filter(Boolean);

  return thirds.sort((a, b) => {
    // 1. Punkte
    if (b.points !== a.points) return b.points - a.points;
    // 2. Tordifferenz (Wichtig: 'diff', nicht 'goalDiff')
    if (b.diff !== a.diff) return b.diff - a.diff;
    // 3. Erzielte Tore (Wichtig: 'goals', nicht 'goalsFor')
    if (b.goals !== a.goals) return b.goals - a.goals;
    
    // 4. Admin-Joker
    const rankA = adminOverrides[a.team] || 99;
    const rankB = adminOverrides[b.team] || 99;
    return rankA - rankB;
  });
};