import { supabase } from "../supabaseClient.js";
import { POINTS_CONFIG, calculateDetailedMatchPoints, getDynamicWinnerPoints } from "./pointsEngine.js";

export async function updateGlobalMaxStats() {
  console.log("[STATS] 📊 Starte Berechnung der differenzierten globalen Maximalpunkte...");

  // 1. Basis-Daten laden
  const { data: allMatches } = await supabase.from("match").select("*");
  const { data: teams } = await supabase.from("teams").select("name, fifa_rank");
  const { data: allBonusTips } = await supabase.from("user_bonus_tips").select("*");

  if (!allMatches) {
    console.error("[STATS] ❌ Matchdaten konnten nicht geladen werden.");
    return;
  }

  const rankMap = {};
  teams?.forEach(t => { rankMap[t.name] = t.fifa_rank || 50; });

  // Datenstrukturen für die differenzierten Max-Punkte vorbereiten
  let maxSpielTippsTotal = 0;
  const maxPointsPerPhase = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  const maxPointsPerGroup = {}; // Wird dynamisch befüllt (A, B, C...)

  // =========================================================================
  // STEP A: MATCH-PUNKTE DIFFERENZIERT BERECHNEN (Für alle User identisch)
  // =========================================================================
  const closedMatches = allMatches.filter(m => m.goals_a_real !== null && m.goals_b_real !== null);
  
  closedMatches.forEach(match => {
    const rankA = rankMap[match.team_a] || 50;
    const rankB = rankMap[match.team_b] || 50;
    const actualWinner = match.goals_a_real > match.goals_b_real ? "1" : match.goals_a_real < match.goals_b_real ? "2" : "0";
    
    // Dynamische oder fixe Tendenzpunkte ermitteln
    const simWinnerPoints = match.stage === "group" 
      ? getDynamicWinnerPoints(rankA, rankB, actualWinner)
      : 4;

    // Ein perfekter Tipp entspricht exakt dem echten Ergebnis
    const perfectTip = { goals_a: match.goals_a_real, goals_b: match.goals_b_real };
    const realOutcome = { goals_a: match.goals_a_real, goals_b: match.goals_b_real };

    // Punkte berechnen, die dieser perfekte Tipp gebracht hätte
    const { total } = calculateDetailedMatchPoints(perfectTip, realOutcome, simWinnerPoints);
    
    // 1. Zum Gesamttopf für Spieltipps addieren
    maxSpielTippsTotal += total;

    // 2. Zur jeweiligen Phase addieren (match.phase_id)
    const phaseKey = String(match.phase_id || "1");
    if (maxPointsPerPhase[phaseKey] !== undefined) {
      maxPointsPerPhase[phaseKey] += total;
    }

    // 3. Zur jeweiligen Gruppe addieren (z.B. "Gruppe A" -> "A")
    if (match.group_name) {
      const groupKey = match.group_name.replace("Gruppe ", "").trim();
      
      if (!maxPointsPerGroup[groupKey]) {
        maxPointsPerGroup[groupKey] = 0;
      }
      maxPointsPerGroup[groupKey] += total;
    }
  });

  // =========================================================================
  // STEP B: PROGNOSEN / BONUS BERECHNEN
  // =========================================================================
  const resolvedBonusQuestions = new Set(
    allBonusTips
      ?.filter(b => b.real_answer && b.real_answer !== "EMPTY")
      .map(b => b.question)
  );
  
  const maxPrognosenTotal = resolvedBonusQuestions.size * (POINTS_CONFIG.BONUS_QUESTION_BASE || 20);

  // =========================================================================
  // STEP C: ALS EINZIGES JSON-OBJEKT IN SYSTEM_CONFIG SPEICHERN
  // =========================================================================
    const { error } = await supabase
    .from("system_config")
    .update({
      max_points_tips: maxSpielTippsTotal,
      max_points_prognosis: maxPrognosenTotal 
      // Hinweis: Wenn du die Phasen- und Gruppen-Breakdowns ("phases" und "groups") 
      // später auch in der Datenbank sichern willst, müsstest du dafür in Supabase 
      // noch zwei Spalten vom Typ 'jsonb' hinzufügen (z.B. max_points_phases).
    })
    .eq("id", 1); // Aktualisiert genau die Zeile, die wir im Screenshot sehen

  if (error) {
    console.error("[STATS] ❌ Fehler beim Speichern der Max-Werte in system_config:", error.message);
  } else {
    console.log("[STATS] 🎉 Differenzierte globale Max-Werte erfolgreich in system_config aktualisiert!");
  }

  // Wir geben das Objekt trotzdem zurück, falls du es im Frontend direkt weiterverwendest
  return {
    max_spiel_tipps: maxSpielTippsTotal,
    max_prognosen: maxPrognosenTotal,
    phases: maxPointsPerPhase,
    groups: maxPointsPerGroup
  };
}