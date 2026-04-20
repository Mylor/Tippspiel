import { getThirdPlaceForSlot } from './thirdPlaceMapping';

/**
 * BERECHNUNG: VERTIKALE POSITION (BAUM-GEOMETRIE)
 * Berechnet, wo eine Match-Box basierend auf Runde und Index stehen muss.
 */
export const getTopPosition = (roundIndex, matchIndex, treeHeight, currentBaseSpacing) => {
  const step = currentBaseSpacing * Math.pow(2, roundIndex);
  
  // Sonderlogik für das Finale & Spiel um Platz 3 (beide in Runde 4)
  if (roundIndex === 4) {
    const finaleTop = (0 * step) + (step / 2) - (currentBaseSpacing / 2);
    // Platz 3 Spiel wird 200px unter das Finale geschoben
    if (matchIndex === 1) {
      return finaleTop + 200; 
    }
    return finaleTop;
  }

  // Standardformel für die symmetrische Baumstruktur
  return matchIndex * step + (step / 2) - (currentBaseSpacing / 2);
};

/**
 * RESOLVER: SLOTS ZU TEAMNAMEN
 * Wandelt Platzhalter wie "A1" oder "1E" in echte Teamnamen um.
 */
export function resolveSlot(slot, context) {
  if (!context || !context.groups) {
    return slot; // Fallback, falls Daten noch laden
  }

  const { groups, thirdPlaces } = context;

  // 1. Gruppensieger und Zweite (z.B. "A1", "B2")
  if (/^[A-Z][12]$/.test(slot)) {
    const groupLetter = slot[0]; 
    const position = Number(slot[1]) - 1; // Index 0 = 1. Platz, 1 = 2. Platz
    return groups[groupLetter]?.[position] || "?";
  }

  // 2. Beste Gruppendritte (z.B. "1A", "1B")
  const thirdPlaceSlots = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];
  if (thirdPlaceSlots.includes(slot)) {
    // Nutzt das Mapping-Modul für die komplexen Abhängigkeiten (495er Kombinationen)
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
 * Die wichtigste Funktion: Findet heraus, wer in ein Feld einzieht,
 * indem sie im Baum zurückschaut (Prognose) oder Datenbankwerte nutzt.
 */
export function getTeamFromPrevious(roundIndex, matchIndex, side, koByRound, tips, context) {
  const currentPhaseId = context?.phaseId || 1;
  const startRoundOfPhase = currentPhaseId === 1 ? 0 : currentPhaseId - 2;

  // 1. BASIS-FALL: Reale Teams aus der Datenbank (ab Phase 2+)
  if (currentPhaseId > 1 && roundIndex === startRoundOfPhase) {
    const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
    const currentRoundKey = rounds[roundIndex];
    const currentMatch = koByRound[currentRoundKey]?.[matchIndex];
    
    if (currentMatch) {
      const team = side === "A" ? currentMatch.team_a : currentMatch.team_b;
      return team || "?";
    }
  }

  // 2. REKURSIONS-SCHRITT: Wer hat das vorherige Spiel gewonnen?
  const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
  const prevRoundKey = rounds[roundIndex - 1];
  const prevRound = koByRound[prevRoundKey];

  if (!prevRound) return "?";

  // Welches Spiel aus der Vorrunde füttert dieses Feld?
  let sourceMatchIndex;
  if (roundIndex === 4) {
    sourceMatchIndex = side === "A" ? 0 : 1; // Finale/Platz 3 Logik
  } else {
    sourceMatchIndex = side === "A" ? matchIndex * 2 : matchIndex * 2 + 1;
  }

  const sourceMatch = prevRound[sourceMatchIndex];
  if (!sourceMatch) return "?";

  const tip = tips[sourceMatch.id];
  
  // Interner Winner-Check (Tore vs. manueller Klick)
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

  // Sonderlogik: Spiel um Platz 3 bekommt die Verlierer
  const isThirdPlaceMatch = (roundIndex === 4 && matchIndex === 1);
  let effectiveWinnerSide = (isThirdPlaceMatch) 
    ? (winner === 1 ? "B" : "A") 
    : (winner === 1 ? "A" : "B");

  // 3. ÜBERGANG ZU GRUPPENPHASE: Wenn wir ganz am Anfang des Baums sind
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
  
  // 4. WEITERER RÜCKSPRUNG (Rekursion)
  return getTeamFromPrevious(
    roundIndex - 1, sourceMatchIndex, effectiveWinnerSide, koByRound, tips, context
  );
}