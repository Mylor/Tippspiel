import { getThirdPlaceForSlot } from './thirdPlaceMapping';

/**
 * BERECHNUNG: VERTIKALE POSITION (BAUM-GEOMETRIE)
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

  return matchIndex * step + (step / 2) - (currentBaseSpacing / 2);
};

/**
 * RESOLVER: SLOTS ZU TEAMNAMEN
 */
export function resolveSlot(slot, context) {
  if (!context || !context.groups) {
    return slot;
  }

  const { groups, thirdPlaces } = context;

  if (/^[A-Z][12]$/.test(slot)) {
    const groupLetter = slot[0]; 
    const position = Number(slot[1]) - 1; 
    return groups[groupLetter]?.[position] || "?";
  }

  const thirdPlaceSlots = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];
  if (thirdPlaceSlots.includes(slot)) {
    return getThirdPlaceForSlot(slot, thirdPlaces);
  }

  return slot;
}

/**
 * HELFER: GEWINNER-ERMITTLUNG
 */
export function getWinner(matchId, tips) {
  const tip = tips[matchId];
  if (!tip) return null;
  if (tip.winner) return Number(tip.winner);
  
  const gA = Number(tip.goals_a); 
  const gB = Number(tip.goals_b);
  if (gA > gB) return 1; 
  if (gB > gA) return 2;
  return null;
}

/**
 * REKURSION: TEAM-HERKUNFT
 */
export function getTeamFromPrevious(roundIndex, matchIndex, side, koByRound, tips, context) {
  const currentPhaseId = context?.phaseId || 1;

  // --- 1. DER FIX: BASIS-FALL FÜR PHASE 1 (Sechzehntelfinale / Runde 0) ---
  // Wir müssen hier sofort abbrechen, bevor wir versuchen, eine Vorrunde (roundIndex - 1) zu finden.
  if (currentPhaseId === 1 && roundIndex === 0) {
    const KO_STRUCTURE = {
      round16: [
        ["E1", "1E"], ["I1", "1I"], ["F1", "C2"], ["B2", "A2"],
        ["K2", "L2"], ["H1", "J2"], ["D1", "1D"], ["G1", "1G"],
        ["C1", "F2"], ["E2", "I2"], ["A1", "1A"], ["L1", "1L"],
        ["J1", "H2"], ["D2", "G2"], ["B1", "1B"], ["K1", "1K"]
      ]
    };
    const pairing = KO_STRUCTURE.round16[matchIndex];
    if (!pairing) return "?";
    
    const slotCode = side === "A" ? pairing[0] : pairing[1];
    return resolveSlot(slotCode, context);
  }

  // --- 2. BASIS-FALL: Reale Teams aus der Datenbank (ab Phase 2+) ---
  const startRoundOfPhase = currentPhaseId === 1 ? 0 : currentPhaseId - 2;
  if (currentPhaseId > 1 && roundIndex === startRoundOfPhase) {
    const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
    const currentRoundKey = rounds[roundIndex];
    const currentMatch = koByRound[currentRoundKey]?.[matchIndex];
    
    if (currentMatch) {
      const team = side === "A" ? currentMatch.team_a : currentMatch.team_b;
      return team || "?";
    }
  }

  // --- 3. REKURSIONS-SCHRITT: Wer hat das vorherige Spiel gewonnen? ---
  const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
  const prevRoundKey = rounds[roundIndex - 1];
  const prevRound = koByRound[prevRoundKey];

  if (!prevRound) return "?";

  let sourceMatchIndex;
  if (roundIndex === 4) {
    sourceMatchIndex = side === "A" ? 0 : 1; 
  } else {
    sourceMatchIndex = side === "A" ? matchIndex * 2 : matchIndex * 2 + 1;
  }

  const sourceMatch = prevRound[sourceMatchIndex];
  if (!sourceMatch) return "?";

  const tip = tips[sourceMatch.id];
  
  const getWinnerFromTip = (t) => {
    if (!t) return null;
    const gA = (t.goals_a !== null && t.goals_a !== "") ? Number(t.goals_a) : null;
    const gB = (t.goals_b !== null && t.goals_b !== "") ? Number(t.goals_b) : null;
    if (gA !== null && gB !== null) {
      if (gA > gB) return 1;
      if (gB > gA) return 2;
    }
    return t.winner ? Number(t.winner) : null;
  };

  const winner = getWinnerFromTip(tip);
  if (!winner) return "?";

  const isThirdPlaceMatch = (roundIndex === 4 && matchIndex === 1);
  let effectiveWinnerSide = (isThirdPlaceMatch) 
    ? (winner === 1 ? "B" : "A") 
    : (winner === 1 ? "A" : "B");

  // --- 4. WEITERER RÜCKSPRUNG ---
  return getTeamFromPrevious(
    roundIndex - 1, sourceMatchIndex, effectiveWinnerSide, koByRound, tips, context
  );
}