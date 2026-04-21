import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { calculateTable } from "../logic/tournamentLogic";
import { getTopPosition, resolveSlot, getTeamFromPrevious } from "../logic/koLogic";
import { getBestThirds } from "../Utils/calcTable";

// Komponenten
import GroupTable from './GroupTable';
import KOBracket from './KOBracket';
import BestThirdsTable from './BestThirdsTable';

const KO_STRUCTURE = {
  round16: [
    ["E1", "1E"], ["I1", "1I"], ["F1", "C2"], ["B2", "A2"],
    ["K2", "L2"], ["H1", "J2"], ["D1", "1D"], ["G1", "1G"],
    ["C1", "F2"], ["E2", "I2"], ["A1", "1A"], ["L1", "1L"],
    ["J1", "H2"], ["D2", "G2"], ["B1", "1B"], ["K1", "1K"]
  ],
};

const ROUND_NAMES = { 1: "Sechzehntelfinale", 2: "Achtelfinale", 3: "Viertelfinale", 4: "Halbfinale", 5: "Finale" };
const TREE_HEIGHT = 2000;

function AdminResultsPage({ phaseId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const groupRef = useRef(null);

  useEffect(() => {
    fetchMatches();
  }, [phaseId]);

  async function fetchMatches() {
    setLoading(true);
    const { data } = await supabase.from("match").select("*").order("match_order", { ascending: true });
    setMatches(data || []);
    setLoading(false);
  }

  async function saveRealResult(matchId, goalsA, goalsB, winner) {
  // Falls die Inputs im Admin-Feld komplett leer sind (z.B. nach dem Löschen), 
  // brechen wir ab, um keine Fehlermeldung zu provozieren.
  if (goalsA === "" || goalsB === "") return;

  const gA = Number(goalsA);
  const gB = Number(goalsB);
  
  // Hier setzen wir die Logik für den Winner fest:
  let finalWinner = 0; // Standardmäßig Unentschieden (0)
  if (gA > gB) finalWinner = 1;
  else if (gB > gA) finalWinner = 2;

  // WICHTIG für KO-Spiele: 
  // Wenn es unentschieden steht (z.B. 1:1), nutzen wir den manuell 
  // gewählten Sieger aus dem Dropdown (falls vorhanden).
  if (gA === gB && winner) {
    finalWinner = Number(winner);
  }

  const { error } = await supabase
    .from("match")
    .update({
      goals_a_real: gA,
      goals_b_real: gB,
      winner_real: finalWinner // Wir senden jetzt garantiert eine Zahl (0, 1 oder 2)
    })
    .eq("id", matchId);
    
  if (!error) {
    console.log("Erfolgreich gespeichert!");
    fetchMatches();
  } else {
    console.error("Datenbank-Fehler:", error.message);
  }
}

  if (loading) return <div style={{ padding: "20px" }}>Lade Admin-Daten...</div>;

  // 🛠 NAMENS-CHECK FIX: Wir benennen die Keys hier so um, 
  // wie GroupTable und TipInput sie intern erwarten (goals_a, goals_b).
  const realResultsAsTips = {};
  matches.forEach(m => {
    realResultsAsTips[m.id] = {
      match_id: m.id,
      goals_a: m.goals_a_real,
      goals_b: m.goals_b_real,
      winner: m.winner_real
    };
  });

  // Gruppen-Logik
  const grouped = {};
  matches.filter(m => m.stage === "group").forEach(m => {
    if (!grouped[m.group_name]) grouped[m.group_name] = [];
    grouped[m.group_name].push(m);
  });

  // 🛠 NaN FIX: Wir geben der Berechnung 0 statt null, falls noch kein Ergebnis da ist
  const allGroupsArray = Object.keys(grouped).map(groupName => {
    const groupMatches = grouped[groupName];
    const tipsForCalc = {};
    groupMatches.forEach(m => {
        const r = realResultsAsTips[m.id];
        tipsForCalc[m.id] = {
            ...r,
            goals_a: r.goals_a ?? 0, 
            goals_b: r.goals_b ?? 0
        };
    });

    return {
      id: groupName,
      teams: calculateTable(groupMatches, tipsForCalc)
    };
  });

  const bestThirds = getBestThirds(allGroupsArray);
  const groupResults = {};
  allGroupsArray.forEach(g => { groupResults[g.id] = g.teams.map(t => t.team); });

  // KO-Logik
  const koMatches = matches
    .filter(m => m.stage === "ko")
    .sort((a,b) => a.stage_order - b.stage_order || a.ko_order - b.ko_order);

  const koByRound = {};
  koMatches.forEach(m => {
    if (!koByRound[m.stage_order]) koByRound[m.stage_order] = [];
    koByRound[m.stage_order].push(m);
  });

  const tournamentContext = { 
    groups: groupResults, 
    thirdPlaces: bestThirds.slice(0, 8), 
    tips: realResultsAsTips,
    phaseId: 1 
  };

  return (
    <div style={{ display: "flex", gap: "50px", padding: "20px", width: "max-content" }}>
      
      {/* GRUPPENPHASE */}
      <div ref={groupRef} style={{ flex: "0 0 auto" }}>
        <h2 style={{ color: "#dc2626" }}>Admin: Gruppen</h2>
        {Object.keys(grouped).sort().map(name => (
          <GroupTable 
            key={name} 
            groupName={name} 
            matches={grouped[name]} 
            tips={realResultsAsTips} 
            tableData={allGroupsArray.find(g => g.id === name)?.teams || []} 
            onSaveTip={saveRealResult} 
            isSubmitted={false}
            isAdmin={true} // Sorgt dafür, dass GroupTable die TipInputs rendert
          />
        ))}
        <BestThirdsTable teams={bestThirds} />
      </div>

      {/* KO-BAUM */}
      <div style={{ flex: "1", minWidth: "fit-content" }}>
        <h2 style={{ color: "#dc2626", marginLeft: "20px" }}>Admin: KO-Baum</h2>
        <KOBracket 
          koByRound={koByRound} 
          tips={realResultsAsTips} 
          treeHeight={TREE_HEIGHT}
          roundNames={ROUND_NAMES}
          phase={{ id: 1 }} 
          getTopPosition={(r, m) => getTopPosition(r, m, TREE_HEIGHT, 300)}
          getTeamFromPrevious={(r, m, s) => 
            getTeamFromPrevious(r, m, s, koByRound, realResultsAsTips, tournamentContext)
          }
          resolveSlot={(slot) => resolveSlot(slot, tournamentContext)}
          baseSpacing={300}
          saveTip={saveRealResult}
          deleteKORound={() => {}} 
          isAdmin={true}
          KO_STRUCTURE={KO_STRUCTURE}
        />
      </div>
    </div>
  );
}

export default AdminResultsPage;