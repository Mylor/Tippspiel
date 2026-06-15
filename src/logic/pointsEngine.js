import { supabase } from "../supabaseClient";
import { processPrognosisPoints } from "./PrognosisPoints.js";
import { processStandardMatchTips } from "./StandardPoints.js";
import { updateGlobalMaxStats } from "./MaxPoints.js";

export { processPrognosisPoints, processStandardMatchTips };

export const POINTS_CONFIG = {
  MATCH_BASE_DYNAMIC: [3, 4, 5], 
  MATCH_DIFF: 2,
  MATCH_GOALS_SINGLE: 1,
  MATCH_GOALS_SUM: 1,
  BONUS_EXACT_LOW: 0,         // Reduziert auf 0
  BONUS_EXACT_MID: 1,         // Reduziert auf 1
  BONUS_EXACT_HIGH: 2,        // Reduziert auf 2
  BONUS_ONE_GOAL_OFF: 1,      // NEU: Trostpunkt für exakt 1 Tor daneben bei richtiger Tendenz

  // KO-Runde der letzten 32
  PROG_REACH_16: 4,        // Leichtes Weiterkommen aus der Gruppe
  PROG_OUT_16: 8,          // Ausscheiden in der Runde der 32
  
  // Achtelfinale (Dein 1,5x Verhältnis: 12 zu 8)
  PROG_REACH_8: 12,        // Einzug ins Achtelfinale
  PROG_OUT_8: 16,          // Ausscheiden im Achtelfinale
  
  // Viertelfinale (Nächster Schritt)
  PROG_REACH_4: 24,        // Einzug ins Viertelfinale
  PROG_OUT_4: 28,          // Ausscheiden im Viertelfinale
  
  // Halbfinale & Die Final-Four-Plätze
  PROG_REACH_2: 36,        // Einzug ins Halbfinale
  PROG_PLACE_4: 40,        // NEU: Exakt 4. Platz geworden
  PROG_PLACE_3: 46,        // NEU: Exakt 3. Platz geworden
  
  // Das große Finale
  PROG_REACH_FINAL: 50,    // Einzug ins Finale
  PROG_VIZE: 60,           // Vize-Weltmeister
  PROG_CHAMPION: 72,       // Weltmeister (6x ein perfekter Volltreffer!)

  // Gruppenphase & Tabellen
  PROG_OUT_VORRUNDE: 6,   
  PROG_TABLE_POS: 6,       // Fester Wert für exakten Tabellenplatz

  BONUS_QUESTION_BASE: 20, 

  // Die mathematische Bremse für späte Phasen
  DIVISORS: {
    1: 1.0, 
    2: 1.5, 
    3: 2.0, 
    4: 3.0, 
    5: 4.0
  }
};

// ==========================================
// CENTRAL ORCHESTRATION FUNCTION
// ==========================================
export async function processAllPointsForMatch(currentMatch, phaseId, allMatches = []) {
  if (!currentMatch || currentMatch.goals_a_real === null || currentMatch.goals_b_real === null) {
    console.log(`[ENGINE] Match ${currentMatch?.id || '?'} hat noch kein Ergebnis. Abbruch.`);
    return;
  }

  console.log(`[ENGINE] 🚀 Starte komplette Punkteberechnung für Match #${currentMatch.id} (${currentMatch.team_a} vs. ${currentMatch.team_b})`);

  try {
    await processStandardMatchTips(currentMatch, phaseId);
    await processPrognosisPoints(allMatches, currentMatch);
    await processBonusQuestionsPoints();

    // Ruft die neue differenzierte Max-Punkte-Berechnung für system_config auf
    await updateGlobalMaxStats();
    
    console.log(`[ENGINE] 🎉 Alle Punkte für Match #${currentMatch.id} erfolgreich verarbeitet!`);
  } catch (error) {
    console.error(`[ENGINE] ❌ Fehler während der Gesamtberechnung für Match #${currentMatch.id}:`, error);
  }
}

// --- HELPER: BERECHNET DIE PUNKTE FÜR DIE BONUSFRAGEN ---
export const calculateBonusPoints = (qId, userAnswer, realAnswer, basePoints = 20) => {
  if (!realAnswer || realAnswer === "EMPTY" || userAnswer === undefined || userAnswer === null || userAnswer === "") {
    console.log(`[DEBUG-BONUS-CALC] Überspringe Frage ${qId}. UserAnswer: ${userAnswer}, RealAnswer: ${realAnswer}`);
    return 0;
  }

  const userStr = String(userAnswer).trim().toLowerCase();
  const realStr = String(realAnswer).trim().toLowerCase();

  if (userStr === realStr) return basePoints;

  const partialPointsQuestions = ["total_goals", "extra_times", "own_goals"];
  if (partialPointsQuestions.includes(qId)) {
    const userNum = parseInt(userStr, 10);
    const realNum = parseInt(realStr, 10);

    if (!isNaN(userNum) && !isNaN(realNum)) {
      if (Math.abs(userNum - realNum) === 1) {
        return Math.ceil(basePoints / 2);
      }
    }
  }
  return 0;
};

// --- HELPER: BERECHNET DIE PUNKTE FÜR EINEN EINZELNEN TIPP ---
export const calculateDetailedMatchPoints = (tip, actual, winnerPoints) => {
  const points = { winner: 0, diff: 0, goals_a: 0, goals_b: 0, sum: 0, exact_bonus: 0, one_goal_off: 0 };
  if (!tip || actual.goals_a === null || actual.goals_a === undefined) return { total: 0, breakdown: {} };

  const tA = Number(tip.goals_a);
  const tB = Number(tip.goals_b);
  const aA = Number(actual.goals_a);
  const aB = Number(actual.goals_b);

  const tipWinner = tA > tB ? "1" : tA < tB ? "2" : "0";
  const actualWinner = aA > aB ? "1" : aA < aB ? "2" : "0";

  const isWinnerCorrect = tipWinner === actualWinner;

  if (isWinnerCorrect) points.winner = winnerPoints;
  if ((tA - tB) === (aA - aB)) points.diff = POINTS_CONFIG.MATCH_DIFF;
  if (tA === aA) points.goals_a = POINTS_CONFIG.MATCH_GOALS_SINGLE;
  if (tB === aB) points.goals_b = POINTS_CONFIG.MATCH_GOALS_SINGLE;
  if ((tA + tB) === (aA + aB)) points.sum = POINTS_CONFIG.MATCH_GOALS_SUM;

  // 1. Fall: Absoluter Volltreffer (Zusatz-Bonus für hohe Toranzahlen)
  if (tA === aA && tB === aB) {
    const totalGoals = aA + aB;
    if (totalGoals <= 3) points.exact_bonus = POINTS_CONFIG.BONUS_EXACT_LOW;
    else if (totalGoals <= 6) points.exact_bonus = POINTS_CONFIG.BONUS_EXACT_MID;
    else points.exact_bonus = POINTS_CONFIG.BONUS_EXACT_HIGH;
  } 
  
  // 2. Fall: "Knapp daneben"-Punkt (Greift jetzt auch bei Volltreffern, da Abweichung = 0)
  if (isWinnerCorrect) {
    const totalGoalDeviation = Math.abs(tA - aA) + Math.abs(tB - aB);
    if (totalGoalDeviation === 0 || totalGoalDeviation === 1) {
      points.one_goal_off = POINTS_CONFIG.BONUS_ONE_GOAL_OFF;
    }
  }

  const total = Object.values(points).reduce((acc, val) => acc + val, 0);
  
  // Der "Knapp daneben"-Punkt zählt laut Wunsch als Bonus-Kategorie
  const totalBonusDisplay = points.exact_bonus + points.one_goal_off;
  
  return { 
    total, 
    breakdown: {
      descr: `Tendenz: ${points.winner}, Diff: ${points.diff}, Tore: ${points.goals_a + points.goals_b}, Summe: ${points.sum}, Bonus: ${totalBonusDisplay}`,
      tip: `${tA}:${tB}`, real: `${aA}:${aB}`, tip_a: tA, tip_b: tB, real_a: aA, real_b: aB,
      points_winner: points.winner, points_exact: totalBonusDisplay, sum_points: total
    } 
  };
};

// --- HELPER: DYNAMISCHE TENDENZ-PUNKTE ---
export const getDynamicWinnerPoints = (rankA, rankB, actualWinner) => {
  // Wenn Unentschieden, Standard-Punkte (4)
  if (actualWinner === "0") return 4;

  const diff = rankA - rankB; 

  if (actualWinner === "1") {
    // Team A hat gewonnen. War Team A der Außenseiter? (z.B. Rang 80 vs Rang 5 -> diff = 75)
    if (diff > 20) return 5;  // Außenseiter-Sieg bringt mehr Punkte
    if (diff < -20) return 3; // Favoriten-Sieg bringt weniger Punkte
  } else if (actualWinner === "2") {
    // Team B hat gewonnen. War Team B der Außenseiter? (z.B. Rang 5 vs Rang 80 -> diff = -75)
    if (diff < -20) return 5; 
    if (diff > 20) return 3;
  }

  return 4; 
};


// ==========================================
// FUNKTION FÜR DIE BONUS-FRAGEN
// ==========================================
export async function processBonusQuestionsPoints() {
  const { data: bonusTips, error: fetchErr } = await supabase.from("user_bonus_tips").select("*");

  if (fetchErr) {
    console.error(`[DEBUG-BONUS] ❌ Fehler beim Holen der user_bonus_tips:`, fetchErr.message);
    return;
  }
  if (!bonusTips || bonusTips.length === 0) {
    console.log(`[DEBUG-BONUS] ⚠️ Keine Einträge in user_bonus_tips gefunden.`);
    return;
  }

  const pointsEntries = [];
  const basePoints = POINTS_CONFIG.BONUS_QUESTION_BASE || 10;

  bonusTips.forEach(tip => {
    const realAnswer = tip.real_answer;
    if (!realAnswer || realAnswer === "EMPTY") {
      return;
    }

    const pointsTotal = calculateBonusPoints(tip.question, tip.user_answer, realAnswer, basePoints);

    let questionLabel = tip.question;
    if (tip.question === "total_goals") questionLabel = "Meisten Gesamttore Spiel";
    if (tip.question === "extra_times") questionLabel = "Anzahl Verlängerungen";
    if (tip.question === "own_goals") questionLabel = "Anzahl Eigentore";
    if (tip.question === "most_cards") questionLabel = "Meisten Karten pro Spiel (Team)";
    if (tip.question === "most_team_goals") questionLabel = "Team meisten Tore pro Spiel";
    if (tip.question === "most_conceded_goals") questionLabel = "Meiste Gegentore Gruppenphase";
    if (tip.question === "pot4_furthest") questionLabel = "Topf 4 Team am weitesten";

    console.log(`[DEBUG-BONUS] User #${tip.user_id}, Q: ${tip.question}. User-Tipp: '${tip.user_answer}' | Real: '${realAnswer}' => Punkte: ${pointsTotal}`);

    pointsEntries.push({
      player_id: tip.user_id, match_id: null, match_order: 999, category: "BONUS", matchday: 99, 
      points_total: pointsTotal, phase_id: 1, group_name: "BONUS", is_prognosis: true,
      reference_team: ["pot4_furthest", "most_team_goals", "most_conceded_goals", "most_cards"].includes(tip.question) ? tip.user_answer : "",
      breakdown: {
        info: `Bonus: ${questionLabel}`,
        descr: pointsTotal > 0 
          ? `Erfolgreich! Tipp: ${tip.user_answer}, Ergebnis: ${realAnswer} (+${pointsTotal} Pkt.)`
          : `Nicht korrekt. Tipp: ${tip.user_answer}, Ergebnis: ${realAnswer}`,
        question_id: tip.question, user_answer: tip.user_answer, real_answer: realAnswer
      }
    });
  });

  console.log(`[DEBUG-BONUS] Lösche alte Bonus-Einträge...`);
  const { error: delErr } = await supabase.from("user_points_detail").delete().eq("category", "BONUS");
  if (delErr) console.error(`[DEBUG-BONUS] ❌ Fehler beim Löschen alter Bonus-Zeilen:`, delErr.message);

  if (pointsEntries.length > 0) {
    const { error: insertErr } = await supabase.from("user_points_detail").insert(pointsEntries);
    if (insertErr) console.error("[BONUS-ENGINE] Fehler beim Speichern:", insertErr.message);
    else console.log(`[BONUS-ENGINE] ===== ${pointsEntries.length} Bonus-Punkte erfolgreich berechnet! =====`);
  }
}


export function createPointEntry(playerId, category, points, team, phase, groupName, matchId, matchOrder, matchday, extra = {}) {
  let typeLabel = category === "GROUP_RANK" ? "Tabellenplatz" : "Turnier-Pfad";
  let detailDesc = `Erfolgreiche Prognose in Phase ${phase}`;

  if (category === "GROUP_RANK") {
    detailDesc = `Richtige Gruppenplatzierung von ${team} in Phase ${phase}`;
  } else if (category === "PROGNOSIS_PATH") {
    const originalPoints = extra.original || points;

    switch (originalPoints) {
      case POINTS_CONFIG.PROG_REACH_16:
        detailDesc = `${team} erreicht das Sechzehntelfinale`;
        break;
      case POINTS_CONFIG.PROG_OUT_VORRUNDE:
        detailDesc = `${team} scheidet in der Vorrunde aus`;
        break;
      case POINTS_CONFIG.PROG_OUT_16:
        detailDesc = `${team} scheidet in der Runde der 32 aus`;
        break;
      case POINTS_CONFIG.PROG_REACH_8:
        detailDesc = `${team} erreicht das Achtelfinale`;
        break;
      case POINTS_CONFIG.PROG_OUT_8:
        detailDesc = `${team} scheidet im Achtelfinale aus`;
        break;
      case POINTS_CONFIG.PROG_REACH_4:
        detailDesc = `${team} erreicht das Viertelfinale`;
        break;
      case POINTS_CONFIG.PROG_OUT_4:
        detailDesc = `${team} scheidet im Viertelfinale aus`;
        break;
      case POINTS_CONFIG.PROG_REACH_2:
        detailDesc = `${team} erreicht das Halbfinale`;
        break;
      case POINTS_CONFIG.PROG_PLACE_4:
        detailDesc = `${team} beendet das Turnier auf Platz 4`;
        break;
      case POINTS_CONFIG.PROG_PLACE_3:
        detailDesc = `${team} holt Platz 3`;
        break;
      case POINTS_CONFIG.PROG_REACH_FINAL:
        detailDesc = `${team} erreicht das Finale`;
        break;
      case POINTS_CONFIG.PROG_VIZE:
        detailDesc = `${team} ist Vize-Meister`;
        break;
      case POINTS_CONFIG.PROG_CHAMPION:
        detailDesc = `${team} ist Turniersieger 🎉`;
        break;
      default:
        if (extra.roundName) {
          detailDesc = extra.isWinner 
            ? `${team} zieht weiter ein (${extra.roundName})` 
            : `${team} scheidet aus (${extra.roundName})`;
        }
        break;
    }
  }

  return {
    player_id: playerId, 
    category, 
    points_total: points, 
    reference_team: team, 
    phase_id: phase, 
    group_name: groupName || "KO", 
    is_prognosis: true, 
    match_id: matchId, 
    match_order: matchOrder, 
    matchday: matchday, 
    breakdown: { 
      info: `${typeLabel}: ${team}`, 
      descr: detailDesc, 
      team, 
      originalPoints: extra.original || points, 
      divisor: extra.divisor || 1 
    }
  };
}