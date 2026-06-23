/**
 * tournamentLogic.js / calcTable.js
 * Diese Datei berechnet aus den einzelnen Spielergebnissen (Tipps) 
 * eine vollständige Gruppentabelle nach FIFA-Standard und steuert die Turnierstruktur.
 */

/**
 * ERMITTELT DIE PHASE_ID EINES SPIELS
 */
export function getPhaseIdFromMatch(match) {
  if (!match) return 1;
  if (match.stage === "group") return 1;

  if (match.stage === "ko") {
    const stageOrder = Number(match.stage_order);
    switch (stageOrder) {
      case 1: return 2; // Achtelfinale
      case 2: return 3; // Viertelfinale
      case 3: return 4; // Halbfinale
      case 4: return 5; // Finale & Spiel um Platz 3
      case 5: return 5; 
      default: return 2;
    }
  }
  return 1;
}

/**
 * BASIS-BERECHNUNG: Erstellt eine Liste mit Punkten und Toren.
 */
export function calculateTable(groupMatches, currentTips) {
  const table = {};

  // Vorab-Initialisierung aller Teams einer Gruppe
  groupMatches.forEach((m) => {
    if (!table[m.team_a]) table[m.team_a] = { points: 0, goals: 0, conceded: 0 };
    if (!table[m.team_b]) table[m.team_b] = { points: 0, goals: 0, conceded: 0 };
  });

  groupMatches.forEach((m) => {
    const t = currentTips[m.id];
    if (!t) return;

    if (
      t.goals_a === null || t.goals_b === null || 
      t.goals_a === undefined || t.goals_b === undefined ||
      t.goals_a === "" || t.goals_b === ""
    ) {
      return;
    }

    const A = m.team_a; 
    const B = m.team_b;
    const gA = Number(t.goals_a); 
    const gB = Number(t.goals_b);

    table[A].goals += gA; table[A].conceded += gB;
    table[B].goals += gB; table[B].conceded += gA;

    if (gA > gB) table[A].points += 3;
    else if (gB > gA) table[B].points += 3;
    else { 
      table[A].points += 1; 
      table[B].points += 1; 
    }
  });

  return Object.entries(table)
    .map(([team, d]) => ({ team, ...d, diff: d.goals - d.conceded }));
}

/**
 * FIFA-LOGIK: Sortiert die Tabelle nach den offiziellen Tie-Break-Regeln (inkl. Direktem Vergleich).
 */
export function calculateFIFADataTable(groupMatches, tips, manualRanks = {}) {
  // 1. Grundwerte (Punkte, Tore etc. aller Teams) holen
  let table = calculateTable(groupMatches, tips);

  /**
   * Rekursive Hilfsfunktion, um eine Gruppe von (punkt)gleichen Teams aufzuspalten
   */
  function sortTiedTeams(teamsSubgroup, applyH2H = true) {
    // Wenn nur 1 Team in der Auswahl ist, gibt es nichts zu sortieren
    if (teamsSubgroup.length <= 1) return teamsSubgroup;

    // --- SCHRITT 1: DIREKTER VERGLEICH (Kriterien a, b, c) ---
    if (applyH2H) {
      const miniTable = {};
      teamsSubgroup.forEach(t => {
        miniTable[t.team] = { points: 0, goals: 0, conceded: 0 };
      });

      const tiedTeamNames = teamsSubgroup.map(t => t.team);

      // Berechne Mini-Tabelle: Nur Spiele *zwischen* den punktgleichen Teams zählen
      groupMatches.forEach(m => {
        if (tiedTeamNames.includes(m.team_a) && tiedTeamNames.includes(m.team_b)) {
          const t = tips[m.id];
          if (!t) return;
          if (
            t.goals_a === null || t.goals_b === null || 
            t.goals_a === undefined || t.goals_b === undefined ||
            t.goals_a === "" || t.goals_b === ""
          ) return;

          const gA = Number(t.goals_a);
          const gB = Number(t.goals_b);

          miniTable[m.team_a].goals += gA; miniTable[m.team_a].conceded += gB;
          miniTable[m.team_b].goals += gB; miniTable[m.team_b].conceded += gA;

          if (gA > gB) miniTable[m.team_a].points += 3;
          else if (gB > gA) miniTable[m.team_b].points += 3;
          else {
            miniTable[m.team_a].points += 1;
            miniTable[m.team_b].points += 1;
          }
        }
      });

      // Sortiere die Subgruppe nach den Mini-Tabellen-Ergebnissen
      teamsSubgroup.sort((a, b) => {
        const mA = miniTable[a.team];
        const mB = miniTable[b.team];

        // a) Punkte im direkten Vergleich
        if (mB.points !== mA.points) return mB.points - mA.points;

        // b) Tordifferenz im direkten Vergleich
        const diffA = mA.goals - mA.conceded;
        const diffB = mB.goals - mB.conceded;
        if (diffB !== diffA) return diffB - diffA;

        // c) Erzielte Tore im direkten Vergleich
        if (mB.goals !== mA.goals) return mB.goals - mA.goals;

        return 0;
      });

      // Prüfen, ob durch den H2H-Vergleich Teams voneinander getrennt werden konnten
      let refinedGroups = [];
      let currentSub = [teamsSubgroup[0]];

      for (let i = 1; i < teamsSubgroup.length; i++) {
        const prev = miniTable[teamsSubgroup[i - 1].team];
        const curr = miniTable[teamsSubgroup[i].team];
        const prevDiff = prev.goals - prev.conceded;
        const currDiff = curr.goals - curr.conceded;

        // Wenn innerhalb der Mini-Tabelle absoluter Gleichstand herrscht, bleiben sie zusammen
        if (curr.points === prev.points && currDiff === prevDiff && curr.goals === prev.goals) {
          currentSub.push(teamsSubgroup[i]);
        } else {
          refinedGroups.push(currentSub);
          currentSub = [teamsSubgroup[i]];
        }
      }
      refinedGroups.push(currentSub);

      // Wenn die Gruppe erfolgreich verkleinert/aufgespalten wurde (z.B. aus 3 Teams wurde 1 Führendes und 2 Gleichstehende)
      if (refinedGroups.length > 1) {
        let resolved = [];
        for (const sub of refinedGroups) {
          // Rekursiver Aufruf für die verbleibenden, immer noch gleichauf liegenden Teams (Schritt 2 Satz 1)
          resolved.push(...sortTiedTeams(sub, true));
        }
        return resolved;
      }
    }

    // --- SCHRITT 2 & 3: GESAMT-KRITERIEN & MANUELLE REIHENFOLGE (Kriterien d, e, f/g) ---
    // Greift, wenn der direkte Vergleich absolut keine Entscheidung herbeiführen konnte
    teamsSubgroup.sort((a, b) => {
      // d) Tordifferenz aus allen Gruppenspielen
      if (b.diff !== a.diff) return b.diff - a.diff;

      // e) Erzielte Tore aus allen Gruppenspielen
      if (b.goals !== a.goals) return b.goals - a.goals;

      // f) Stichwahl / Losentscheid (über dein UI-Feld `manualRanks` gesteuert)
      const rankA = manualRanks[a.team] !== undefined && manualRanks[a.team] !== null ? manualRanks[a.team] : 99;
      const rankB = manualRanks[b.team] !== undefined && manualRanks[b.team] !== null ? manualRanks[b.team] : 99;
      if (rankA !== rankB) return rankA - rankB; // Aufsteigend: 1 ist besser als 2

      // Notnagel gegen hüpfende UIs
      return a.team.localeCompare(b.team);
    });

    return teamsSubgroup;
  }

  // --- HAUPTABLAUF ---
  // 1. Gruppiere alle Teams der Gruppe nach ihren erzielten Gesamt-Punkten
  let pointsGroups = {};
  table.forEach(t => {
    if (!pointsGroups[t.points]) pointsGroups[t.points] = [];
    pointsGroups[t.points].push(t);
  });

  // 2. Sortiere die Punktzahlen absteigend (z.B. [9, 6, 3, 0])
  const sortedPoints = Object.keys(pointsGroups).map(Number).sort((a, b) => b - a);

  // 3. Verarbeite jede Punktegruppe einzeln über das FIFA-Regelwerk und führe sie zusammen
  let finalSortedTable = [];
  for (const pts of sortedPoints) {
    const sortedSubgroup = sortTiedTeams(pointsGroups[pts], true);
    finalSortedTable.push(...sortedSubgroup);
  }

  return finalSortedTable;
}