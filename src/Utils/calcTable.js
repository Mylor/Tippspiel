// src/utils/calcTable.js

/**
 * getBestThirds: Erstellt eine Rangliste der Drittplatzierten über alle Gruppen hinweg.
 * @param {Array} allGroups - Array aller Gruppen (A-L), jede Gruppe enthält ihr Team-Ranking.
 * @param {Object} manualRanks - Optionales Objekt für Stichwahlen (z.B. Fairplay-Wertung).
 */
export function getBestThirds(allGroups, manualRanks = {}) {
  // 1. SCHRITT: Alle Drittplatzierten einsammeln
  const thirds = allGroups.map((group) => {
    // Wir nehmen das Team an Index 2 (der 3. Platz in einer sortierten Gruppe)
    const thirdPlaceTeam = group.teams && group.teams[2]; 
    
    // Falls die Gruppe noch nicht berechnet wurde oder das Team fehlt, überspringen
    if (!thirdPlaceTeam) return null;

    // Wir extrahieren nur die für den Vergleich relevanten Daten
    return {
      team: thirdPlaceTeam.team,
      points: thirdPlaceTeam.points || 0,
      goals: thirdPlaceTeam.goals || thirdPlaceTeam.goalsFor || 0, // Flexibel bei Property-Namen
      diff: thirdPlaceTeam.diff !== undefined ? thirdPlaceTeam.diff : (thirdPlaceTeam.goalDiff || 0),
      group: group.id // Wichtig für das spätere Mapping (z.B. "A", "B"...)
    };
  }).filter(Boolean); // Entfernt alle null-Werte (falls Gruppen unvollständig waren)

  // 2. SCHRITT: Die Dritten-Tabelle nach FIFA-Kriterien sortieren
  return thirds.sort((a, b) => {
    // Kriterium 1: Punkte (Absteigend)
    if (b.points !== a.points) return b.points - a.points;
    
    // Kriterium 2: Tordifferenz (Absteigend)
    if (b.diff !== a.diff) return b.diff - a.diff;
    
    // Kriterium 3: Erzielte Tore (Absteigend)
    if (b.goals !== a.goals) return b.goals - a.goals;
    
    // Kriterium 4: Stichwahl / Manueller Rang (Aufsteigend, da 1 besser ist als 2)
    // parseInt stellt sicher, dass wir mit Zahlen vergleichen, auch wenn Strings kommen.
    const rankA = manualRanks[a.team] ? parseInt(manualRanks[a.team]) : 99;
    const rankB = manualRanks[b.team] ? parseInt(manualRanks[b.team]) : 99;
    
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Kriterium 5: Alphabetischer Fallback (Sorgt für eine stabile UI ohne Flackern)
    return a.team.localeCompare(b.team);
  });
}