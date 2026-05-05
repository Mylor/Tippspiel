/**
 * Berechnet die Tabelle einer Gruppe basierend auf Tipps
 */
export function calculateTable(groupMatches, currentTips) {
  const table = {};
  groupMatches.forEach((m) => {
    const t = currentTips[m.id];
    if (!t) return;
    const A = m.team_a; const B = m.team_b;
    if (!table[A]) table[A] = { points: 0, goals: 0, conceded: 0 };
    if (!table[B]) table[B] = { points: 0, goals: 0, conceded: 0 };

    const gA = Number(t.goals_a); const gB = Number(t.goals_b);
    table[A].goals += gA; table[A].conceded += gB;
    table[B].goals += gB; table[B].conceded += gA;

    if (gA > gB) table[A].points += 3;
    else if (gB > gA) table[B].points += 3;
    else { table[A].points += 1; table[B].points += 1; }
  });

  return Object.entries(table)
    .map(([team, d]) => ({ team, ...d, diff: d.goals - d.conceded }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff);
}

export function calculateFIFADataTable(groupMatches, tips, manualRanks = {}) {
  // 1. Grundwerte berechnen (Punkte, Tore, Gegentore)
  let table = calculateTable(groupMatches, tips);

  // 2. Sortieren nach sportlichen Kriterien, dann Stichwahl
  table.sort((a, b) => {
    // A. Punkte (PKT) - Absteigend
    if (b.points !== a.points) return b.points - a.points;

    // B. Tordifferenz (DIFF) - Absteigend
    if (b.diff !== a.diff) return b.diff - a.diff;

    // C. Erzielte Tore (TORE) - Absteigend
    if (b.goals !== a.goals) return b.goals - a.goals;

    // D. Stichwahl (Manueller Rang) - Aufsteigend (1 ist besser als 2)
    // Wir prüfen, ob überhaupt ein Rang existiert, bevor wir vergleichen
    const rankA = manualRanks[a.team] !== undefined && manualRanks[a.team] !== null ? manualRanks[a.team] : 99;
    const rankB = manualRanks[b.team] !== undefined && manualRanks[b.team] !== null ? manualRanks[b.team] : 99;
    
    if (rankA !== rankB) return rankA - rankB;

    // E. Letzter Notnagel: Alphabet (damit die Liste stabil bleibt)
    return a.team.localeCompare(b.team);
  });

  return table;
}