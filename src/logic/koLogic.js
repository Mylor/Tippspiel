import { getThirdPlaceForSlot } from './thirdPlaceMapping'; // Pfad anpassen!


/**
 * Berechnet die vertikale Position eines Spiels im Baum
 */
export const getTopPosition = (roundIndex, matchIndex, treeHeight, currentBaseSpacing) => {
  const step = currentBaseSpacing * Math.pow(2, roundIndex);
  if (roundIndex === 4) {
    const finaleTop = (0 * step) + (step / 2) - (currentBaseSpacing / 2);
    if (matchIndex === 1) {
      return finaleTop + 200; 
    }
    return finaleTop;
  }

  // Standardformel für alle anderen Runden
  return matchIndex * step + (step / 2) - (currentBaseSpacing / 2);
};

/**
 * Ermittelt, welches Team in einem Slot (z.B. "A1") steht
 */

export function resolveSlot(slot, context) {
  
  if (!context || !context.groups) {
    return slot; // Wenn kein Context da ist, gib einfach "1A" zurück statt abzustürzen
  }

  const { groups, thirdPlaces } = context;

  // 1. Logik für Gruppensieger und Zweite (z.B. "A1", "B2")
  if (/^[A-Z][12]$/.test(slot)) {
    const groupLetter = slot[0]; 
    const position = Number(slot[1]) - 1; // 0 für 1. Platz, 1 für 2. Platz
    
    // Holt das Team aus dem groups-Objekt (z.B. groups["A"][0])
    return groups[groupLetter]?.[position] || "?";
  }

  // 2. DIE NEUE LOGIK FÜR DIE DRITTPLATZIERTEN (Slots wie "1A", "1B" etc.)
  // Wir prüfen, ob der Slot einer der definierten Slots für Dritte ist
  const thirdPlaceSlots = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];
  
  if (thirdPlaceSlots.includes(slot)) {
    // Hier rufen wir deine 495er-Mapping-Funktion auf
    // thirdPlaces muss das Array mit den 8 besten Dritten sein
    return getThirdPlaceForSlot(slot, thirdPlaces);
  }

  // Fallback für alte Slots oder Platzhalter
  return slot;
}

/**
 * Ermittelt den Gewinner eines Spiels aus den Tipps
 */
export function getWinner(matchId, tips) {
  const tip = tips[matchId];
  if (!tip) return null;
  if (tip.winner) return Number(tip.winner);
  const gA = Number(tip.goals_a); const gB = Number(tip.goals_b);
  if (gA > gB) return 1; if (gB > gA) return 2;
  return null;
}

export function getTeamFromPrevious(roundIndex, matchIndex, side, koByRound, tips, context) {
  // 1. PHASE-CHECK: Wir holen die phaseId direkt aus dem context
  // WICHTIG: Stelle sicher, dass du in TippsPage.js bei context auch phaseId: phase.id übergibst!
  const currentPhaseId = context?.phaseId || 1;
  const startRoundOfPhase = currentPhaseId === 1 ? 0 : currentPhaseId - 2;

  // 2. BASIS-FALL FÜR REALE SPIELE (Phase 2, 3, 4, 5):
  // Wenn wir uns in der ersten sichtbaren Runde der Phase befinden, 
  // kommen die Teams aus der Datenbank (m.team_a / m.team_b)
  if (currentPhaseId > 1 && roundIndex === startRoundOfPhase) {
    const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
    const currentRoundKey = rounds[roundIndex];
    const currentRoundMatches = koByRound[currentRoundKey];
    const currentMatch = currentRoundMatches?.[matchIndex];
    
    if (currentMatch) {
      const team = side === "A" ? currentMatch.team_a : currentMatch.team_b;
      return team || "?";
    }
  }

  // 3. REKURSIONS-LOGIK FÜR PROGNOSEN ("Fake-Spiele")
  const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
  const prevRoundKey = rounds[roundIndex - 1];
  const prevRound = koByRound[prevRoundKey];

  if (!prevRound) return "?";

  // Wer war das Quell-Spiel? (Logik für Finale/Platz 3 inklusive)
  let sourceMatchIndex;
  if (roundIndex === 4) {
    sourceMatchIndex = side === "A" ? 0 : 1;
  } else {
    sourceMatchIndex = side === "A" ? matchIndex * 2 : matchIndex * 2 + 1;
  }

  const sourceMatch = prevRound[sourceMatchIndex];
  if (!sourceMatch) return "?";

  const tip = tips[sourceMatch.id];
  
  // WICHTIG: Hier berechnen wir den Winner basierend auf Toren ODER manuellem Winner
  const getWinnerFromTip = (t) => {
    if (!t) return null;
    const gA = (t.goals_a !== null && t.goals_a !== "") ? Number(t.goals_a) : null;
    const gB = (t.goals_b !== null && t.goals_b !== "") ? Number(t.goals_b) : null;
    if (gA !== null && gB !== null) {
      if (gA > gB) return 1;
      if (gB > gA) return 2;
      return t.winner ? Number(t.winner) : null;
    }
    return t.winner ? Number(t.winner) : null;
  };

  const winner = getWinnerFromTip(tip);
  if (!winner) return "?";

  // Gewinner/Verlierer Tausch für Spiel um Platz 3
  const isThirdPlaceMatch = (roundIndex === 4 && matchIndex === 1);
  let effectiveWinnerSide = (isThirdPlaceMatch) 
    ? (winner === 1 ? "B" : "A") 
    : (winner === 1 ? "A" : "B");

  // 4. DER ÜBERGANG ZUR GRUPPENPHASE (NUR IN PHASE 1)
  if (roundIndex === 1 && currentPhaseId === 1) {
    const KO_STRUCTURE = {
      round16: [
        ["E1", "1E"], ["I1", "1I"], ["F1", "C2"], ["B2", "A2"],
        ["K2", "L2"], ["H1", "J2"], ["D1", "1D"], ["G1", "1G"],
        ["C1", "F2"], ["E2", "I2"], ["A1", "1A"], ["L1", "1L"],
        ["J1", "H2"], ["D2", "G2"], ["B1", "1B"], ["K1", "1K"]
      ]
    };
    const pairing = KO_STRUCTURE.round16[sourceMatchIndex];
    const slotCode = effectiveWinnerSide === "A" ? pairing[0] : pairing[1];
    return resolveSlot(slotCode, context);
  } 
  
  // 5. REKURSIVE WEITERGABE
  return getTeamFromPrevious(
    roundIndex - 1, 
    sourceMatchIndex, 
    effectiveWinnerSide, 
    koByRound, 
    tips, 
    context
  );
}