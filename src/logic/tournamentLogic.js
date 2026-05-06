/**
 * tournamentLogic.js / calcTable.js
 * * Diese Datei berechnet aus den einzelnen Spielergebnissen (Tipps) 
 * eine vollständige Gruppentabelle nach FIFA-Standard.
 */

/**
 * BASIS-BERECHNUNG: Erstellt eine Liste mit Punkten und Toren.
 */
export function calculateTable(groupMatches, currentTips) {
  const table = {};

  groupMatches.forEach((m) => {
    const t = currentTips[m.id];
    // Falls für ein Spiel noch kein Tipp existiert, überspringen wir es
    if (!t) return;

    const A = m.team_a; 
    const B = m.team_b;

    // Initialisierung der Teams im Tabellen-Objekt, falls noch nicht geschehen
    if (!table[A]) table[A] = { points: 0, goals: 0, conceded: 0 };
    if (!table[B]) table[B] = { points: 0, goals: 0, conceded: 0 };

    const gA = Number(t.goals_a); 
    const gB = Number(t.goals_b);

    // Tore und Gegentore addieren
    table[A].goals += gA; table[A].conceded += gB;
    table[B].goals += gB; table[B].conceded += gA;

    // Punkteverteilung: Sieg 3 Pkt, Unentschieden 1 Pkt
    if (gA > gB) table[A].points += 3;
    else if (gB > gA) table[B].points += 3;
    else { 
      table[A].points += 1; 
      table[B].points += 1; 
    }
  });

  // Umwandlung des Objekts in ein Array und einfache Sortierung (Punkte -> Differenz)
  return Object.entries(table)
    .map(([team, d]) => ({ team, ...d, diff: d.goals - d.conceded }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff);
}

/**
 * FIFA-LOGIK: Sortiert die Tabelle nach den offiziellen Tie-Break-Regeln.
 * @param {Array} groupMatches - Alle Spiele der Gruppe
 * @param {Object} tips - Alle Tipps des Nutzers
 * @param {Object} manualRanks - Hilfsmittel für den "Losentscheid" (Stichwahl)
 */
export function calculateFIFADataTable(groupMatches, tips, manualRanks = {}) {
  // 1. Grundwerte (Punkte, Tore etc.) mit der obigen Funktion berechnen
  let table = calculateTable(groupMatches, tips);

  // 2. Präzise Sortierung nach sportlichen Kriterien
  table.sort((a, b) => {
    // A. Wer hat mehr Punkte? (PKT) - Absteigend
    if (b.points !== a.points) return b.points - a.points;

    // B. Wer hat die bessere Tordifferenz? (DIFF) - Absteigend
    if (b.diff !== a.diff) return b.diff - a.diff;

    // C. Wer hat insgesamt mehr Tore geschossen? (TORE) - Absteigend
    if (b.goals !== a.goals) return b.goals - a.goals;

    // D. STICHWAHL (Losentscheid/Manueller Rang)
    // Wenn alles gleich ist, entscheidet ein manueller Rang (z.B. durch UI-Eingabe).
    // Ein kleinerer Rang (1) ist besser als ein großer (99).
    const rankA = manualRanks[a.team] !== undefined && manualRanks[a.team] !== null ? manualRanks[a.team] : 99;
    const rankB = manualRanks[b.team] !== undefined && manualRanks[b.team] !== null ? manualRanks[b.team] : 99;
    
    if (rankA !== rankB) return rankA - rankB;

    // E. NOTNAGEL: Alphabetische Sortierung
    // Damit die Tabelle bei Gleichstand nicht "hüpft", sortieren wir nach Name.
    return a.team.localeCompare(b.team);
  });

  return table;
}