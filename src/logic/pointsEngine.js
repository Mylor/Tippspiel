
export const POINTS_CONFIG = {
  // Reale Spiele
  MATCH_BASE_DYNAMIC: [3, 4, 5], // Favorit, Normal, Underdog
  MATCH_DIFF: 2,
  MATCH_GOALS_SINGLE: 1,
  MATCH_GOALS_SUM: 1,
  BONUS_EXACT_LOW: 3,  // Summe 0-3
  BONUS_EXACT_MID: 4,  // Summe 4-6
  BONUS_EXACT_HIGH: 5, // Summe 7+

  // Prognosen / Finalrunde
  PROG_REACH_16: 5,
  PROG_OUT_16: 5,
  PROG_REACH_8: 5, // Analog zu 16tel
  PROG_OUT_8: 5,
  PROG_REACH_4: 10,
  PROG_OUT_4: 5,
  PROG_REACH_2: 15,
  PROG_OUT_2: 10,
  PROG_REACH_FINAL: 20,
  PROG_PLACE_4: 5,
  PROG_PLACE_3: 10,
  PROG_VIZE: 15,
  PROG_CHAMPION: 35,

  // Vorrunde
  PROG_OUT_VORRUNDE: 2,
  PROG_TABLE_POS: 2,

  // Korrekturdivisoren (Phase ID -> Divisor)
  DIVISORS: {
    1: 1, // Phase 1: Vor Turnier
    2: 1, // Phase 2: Vor 16tel Finale
    3: 2, // Phase 3: Vor 8tel Finale
    4: 4, // Phase 4: Vor 4tel Finale
    5: 8  // Phase 5: Vor Halbfinale
  }
};

/**
 * Berechnet Punkte für ein reales Spielergebnis
 */
export const calculateMatchPoints = (tip, actual, winnerPoints) => {
  if (!tip || actual.goals_a === null) return 0;

  let points = 0;
  const tA = Number(tip.goals_a);
  const tB = Number(tip.goals_b);
  const aA = Number(actual.goals_a);
  const aB = Number(actual.goals_b);

  // 1. Richtiger Sieger (Dynamisch 3, 4 oder 5)
  const tipWinner = tA > tB ? "1" : tA < tB ? "2" : tip.winner;
  const actualWinner = aA > aB ? "1" : aA < aB ? "2" : actual.winner;
  
  if (tipWinner === actualWinner) points += winnerPoints;

  // 2. Tordifferenz
  if ((tA - tB) === (aA - aB)) points += POINTS_CONFIG.MATCH_DIFF;

  // 3. Einzelne Tore
  if (tA === aA) points += POINTS_CONFIG.MATCH_GOALS_SINGLE;
  if (tB === aB) points += POINTS_CONFIG.MATCH_GOALS_SINGLE;

  // 4. Gesamtsumme Tore
  if ((tA + tB) === (aA + aB)) points += POINTS_CONFIG.MATCH_GOALS_SUM;

  // 5. Bonus für komplett richtiges Ergebnis
  if (tA === aA && tB === aB) {
    const sum = aA + aB;
    if (sum <= 3) points += POINTS_CONFIG.BONUS_EXACT_LOW;
    else if (sum <= 6) points += POINTS_CONFIG.BONUS_EXACT_MID;
    else points += POINTS_CONFIG.BONUS_EXACT_HIGH;
  }

  return points;
};

/**
 * Berechnet Punkte für eine Prognose unter Berücksichtigung des Zeitpunkts (Phase)
 */
export const calculatePrognosisPoints = (basePoints, phaseId) => {
  const divisor = POINTS_CONFIG.DIVISORS[phaseId] || 1;
  return basePoints / divisor;
};

/**
 * Beispiel für die FIFA-Logik (muss mit deinen Weltranglisten-Daten gefüttert werden)
 */
export const getDynamicWinnerPoints = (rankA, rankB) => {
  const diff = rankA - rankB; // Kleinerer Rang = besseres Team
  if (diff < -20) return 3; // Klarer Favorit gewinnt
  if (diff > 20) return 5;  // Underdog gewinnt
  return 4; // Ausgeglichen
};