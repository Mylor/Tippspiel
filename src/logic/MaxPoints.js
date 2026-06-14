import { supabase } from "../supabaseClient.js";
import { POINTS_CONFIG, calculateDetailedMatchPoints, getDynamicWinnerPoints } from "./pointsEngine.js";

export async function calculateAllUsersMaxPoints() {
  console.log("[MAX-POINTS] 📈 Starte Berechnung der maximal möglichen Punkte für alle User...");

  // 1. Alle Daten laden (ANGEPASST: "player" statt "profiles" & "display_name")
  const { data: players } = await supabase.from("player").select("id, display_name");
  const { data: allMatches } = await supabase.from("match").select("*");
  const { data: allTips } = await supabase.from("tip").select("*");
  const { data: allBonusTips } = await supabase.from("user_bonus_tips").select("*");
  const { data: teams } = await supabase.from("teams").select("name, fifa_rank");
  const { data: currentDetails } = await supabase.from("user_points_detail").select("*");

  if (!players) return;

  const rankMap = {};
  teams?.forEach(t => { rankMap[t.name] = t.fifa_rank || 50; });

  const statsEntries = [];

  // Schleife läuft jetzt über "players"
  for (const player of players) {
    const pId = player.id;

    // --- A) BEREITS FESTE PUNKTE (Echtzeit) ---
    const achievedPoints = currentDetails
      ? currentDetails.filter(d => d.player_id === pId).reduce((sum, item) => sum + item.points_total, 0)
      : 0;

    let remainingMatchPotential = 0;

    // --- B) OFFENE MATCH-TIPPS SIMULIEREN ---
    const openMatches = allMatches.filter(m => m.goals_a_real === null || m.goals_b_real === null);
    
    openMatches.forEach(match => {
      const userTip = allTips?.find(t => t.player_id === pId && t.match_id === match.id);
      if (!userTip || userTip.goals_a === null || userTip.goals_b === null) return;

      const simActual = { goals_a: userTip.goals_a, goals_b: userTip.goals_b };
      
      const tipWinner = userTip.goals_a > userTip.goals_b ? "1" : userTip.goals_a < userTip.goals_b ? "2" : "0";
      const rankA = rankMap[match.team_a] || 50;
      const rankB = rankMap[match.team_b] || 50;
      
      const simWinnerPoints = match.stage === "group" 
        ? getDynamicWinnerPoints(rankA, rankB, tipWinner)
        : 4;

      const { total } = calculateDetailedMatchPoints(userTip, simActual, simWinnerPoints);
      remainingMatchPotential += total;
    });

    // --- C) OFFENE BONUSFRAGEN POTENZIAL ---
    let remainingBonusPotential = 0;
    const userBonus = allBonusTips?.filter(b => b.player_id === pId || b.user_id === pId) || [];
    
    userBonus.forEach(b => {
      if (!b.real_answer || b.real_answer === "EMPTY") {
        if (b.user_answer && b.user_answer.trim() !== "") {
          remainingBonusPotential += (POINTS_CONFIG.BONUS_QUESTION_BASE || 20);
        }
      }
    });

    // --- D) GESAMTERGEBNIS ZUSAMMENFÜHREN ---
    const maxPossiblePoints = achievedPoints + remainingMatchPotential + remainingBonusPotential;

    statsEntries.push({
      player_id: pId,
      username: player.display_name, // ANGEPASST: Nutzt jetzt display_name (z.B. "A8so")
      current_points: achievedPoints,
      max_points: maxPossiblePoints,
      updated_at: new Date().toISOString()
    });
  }

  // --- E) IN DIE DATABASE SPEICHERN ---
  if (statsEntries.length > 0) {
    const { error } = await supabase
      .from("user_ranking_stats")
      .upsert(statsEntries, { onConflict: "player_id" });

    if (error) {
      console.error("[MAX-POINTS] ❌ Fehler beim Speichern der Max-Points-Statistiken:", error.message);
    } else {
      console.log(`[MAX-POINTS] 🎉 Max-Points für ${statsEntries.length} Spieler erfolgreich aktualisiert!`);
    }
  }

  return statsEntries;
}