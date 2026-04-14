/**
 * Berechnet die vertikale Position eines Spiels im Baum
 */
export const getTopPosition = (roundIndex, matchIndex, treeHeight, currentBaseSpacing) => {
  if (roundIndex === 4) return matchIndex === 0 ? (treeHeight / 2 - 30) : (treeHeight / 2 + 300);
  if (roundIndex === 0) return matchIndex * currentBaseSpacing;
  const prevSpacing = currentBaseSpacing * Math.pow(2, roundIndex);
  return matchIndex * prevSpacing + prevSpacing / 2 - currentBaseSpacing / 2;
};

/**
 * Ermittelt, welches Team in einem Slot (z.B. "A1") steht
 */
export function resolveSlot(slot, context) {
  const { groups, thirdPlaces } = context;
  if (/^[A-Z][12]$/.test(slot)) {
    const group = slot[0]; const pos = Number(slot[1]) - 1;
    return groups[group]?.[pos] || "?";
  }
  if (slot.startsWith("3")) {
    const allowedGroups = slot.slice(1).split("");
    const candidates = thirdPlaces.filter(t => allowedGroups.includes(t.group));
    return candidates[0]?.team || "?";
  }
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

/**
 * Findet das Team aus der vorherigen Runde
 */
export function getTeamFromPrevious(roundIndex, matchIndex, side, koByRound, tips) {
    const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
    const prevRoundKey = rounds[roundIndex - 1];
    const prevRound = koByRound[prevRoundKey];
    if (!prevRound) return "?";
    const sourceMatchIndex = side === "A" ? matchIndex * 2 : matchIndex * 2 + 1;
    const sourceMatch = prevRound[sourceMatchIndex];
    if (!sourceMatch) return "?";
    const winner = getWinner(sourceMatch.id, tips);
    if (!winner) return "?";
    return winner === 1 ? sourceMatch.team_a : sourceMatch.team_b;
}