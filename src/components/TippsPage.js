import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getBestThirds } from "../Utils/calcTable";

// Import der ausgelagerten Logik
import { calculateTable } from "../logic/tournamentLogic";
import { getTopPosition, resolveSlot, getTeamFromPrevious } from "../logic/koLogic";

// Import der UI-Komponenten
import GroupTable from './GroupTable';
import KOBracket from './KOBracket';
import BestThirdsTable from './BestThirdsTable';

/**
 * KONSTANTEN
 */
const KO_STRUCTURE = {
  round16: [
    ["E1", "1E"], ["I1", "1I"], ["F1", "C2"], ["B2", "A2"],
    ["K2", "L2"], ["H1", "J2"], ["D1", "1D"], ["G1", "1G"],
    ["C1", "F2"], ["E2", "I2"], ["A1", "1A"], ["L1", "1L"],
    ["J1", "H2"], ["D2", "G2"], ["B1", "1B"], ["K1", "1K"]
  ],
};

const ROUND_NAMES = { 
  1: "Sechzehntelfinale", 2: "Achtelfinale", 3: "Viertelfinale", 4: "Halbfinale", 5: "Finale" 
};

function TippsPage({ player, phaseId, context }) {
  // --- STATE ---
  const [matches, setMatches] = useState([]);
  const [tips, setTips] = useState({});
  const [phase, setPhase] = useState(null);
  const [treeHeight, setTreeHeight] = useState(800);
  const groupRef = useRef(null);

  // --- DATEN LADEN ---
  useEffect(() => {
    fetchMatches();
    fetchTips();
    fetchPhase();
  }, [phaseId]);

  useEffect(() => {
    if (groupRef.current) {
      setTreeHeight(groupRef.current.offsetHeight);
    }
  }, [matches, tips]);

  async function fetchMatches() {
    const { data } = await supabase.from("match").select("*");
    setMatches(data || []);
  }

  async function fetchTips() {
    const { data } = await supabase
      .from("tip")
      .select("*")
      .eq("player_id", player.id)
      .eq("phase_id", phaseId);
    const map = {};
    data?.forEach((t) => (map[t.match_id] = t));
    setTips(map);
  }

  async function fetchPhase() {
    const { data } = await supabase
      .from("tip_phase")
      .select("*")
      .eq("id", phaseId)
      .single();
    setPhase(data);
  }

  // --- SCHREIB-AKTIONEN ---
  async function saveTip(matchId, goalsA, goalsB, winner) {
    if (phase?.is_submitted) return;
    const gA = goalsA !== null ? Number(goalsA) : null;
    const gB = goalsB !== null ? Number(goalsB) : null;
    const match = matches.find((m) => m.id === matchId);
    const finalWinner = (match?.stage === "ko" && gA === gB) ? winner : null;

    await supabase.from("tip").upsert([
      {
        player_id: player.id,
        match_id: matchId,
        phase_id: phaseId,
        goals_a: gA,
        goals_b: gB,
        winner: finalWinner,
      },
    ]);
    fetchTips();
  }

  async function deleteGroupTips(groupName) {
    // 1. IDs der Gruppenspiele
    const groupMatchIds = matches
      .filter((m) => m.group_name === groupName)
      .map((m) => m.id);

    // 2. IDs ALLER KO-Phasen (da Phase 1 alles danach beeinflusst)
    // Wir löschen Phase 2, 3, 4, 5 (oder alle stage === "ko")
    const koMatchIds = matches
      .filter((m) => m.stage === "ko")
      .map((m) => m.id);

    const allToDelete = [...groupMatchIds, ...koMatchIds];

    await supabase
      .from("tip")
      .delete()
      .in("match_id", allToDelete)
      .eq("player_id", player.id);

    fetchTips();
  }
  
  async function deleteKORound(stageOrder) {
    // Finde alle Spiele, die die aktuelle stageOrder ODER HÖHER haben
    const ids = matches
      .filter((m) => m.stage === "ko" && m.stage_order >= stageOrder)
      .map((m) => m.id);

    await supabase
      .from("tip")
      .delete()
      .in("match_id", ids)
      .eq("player_id", player.id);

    fetchTips();
  }

  // --- TURNIER-LOGIK VORBEREITUNG ---
  const grouped = {};
  matches.filter(m => m.stage === "group").forEach(m => {
    if (!grouped[m.group_name]) grouped[m.group_name] = [];
    grouped[m.group_name].push(m);
  });

  const allGroupsArray = Object.keys(grouped).map(groupName => ({
    id: groupName,
    teams: calculateTable(grouped[groupName], tips)
  }));

  // 1. Diese Variable behält alle 12 für die Anzeige in der Tabelle
  const bestThirds = getBestThirds(allGroupsArray);

  // 2. Erstelle eine NEUE Variable für die KO-Logik (nur die Top 8)
  const top8Thirds = bestThirds.slice(0, 8);

  const groupResults = {};
  allGroupsArray.forEach(g => { 
    groupResults[g.id] = g.teams.map(t => t.team); 
  });
  
  const koMatches = matches
    .filter(m => m.stage === "ko")
    .sort((a,b) => a.stage_order - b.stage_order || a.ko_order - b.ko_order);

  const koByRound = {};
  koMatches.forEach(m => {
    if (!koByRound[m.stage_order]) koByRound[m.stage_order] = [];
    koByRound[m.stage_order].push(m);
  });

  // Layout Berechnung
  const firstRoundKey = Object.keys(koByRound).sort((a, b) => a - b)[0];
  const totalMatchesCount = koByRound[firstRoundKey]?.length || 1;

  // Hier kannst du für jede Phase (ID 1-5) den Basis-Abstand definieren
  const PHASE_SPACING = {
    1: 300, // Phase 1 (Prognose)
    2: 200, // Phase 2 (16tel-Finale Start)
    3: 100, // Phase 3 (Achtelfinale Start) -> Wert vergrößert, da Spalte 1 jetzt 8tel ist
    4: 50, // Phase 4 (Viertelfinale Start)
    5: 25  // Phase 5 (Halbfinale/Finale)
  };

  // Aktuellen Wert basierend auf der Phase holen (Fallback auf 70)
  const currentSpacing = PHASE_SPACING[phase?.id] || 70;

  const startIdxOfPhase = phase?.id <= 2 ? 0 : phase?.id - 2;

  // Offset berechnen, damit die erste Box immer oben bei 0px steht
  // WICHTIG: Hier nutzen wir den aktuellen Spacing der Phase
  const topOffset = getTopPosition(startIdxOfPhase, 0, treeHeight, currentSpacing);

  const tournamentContext = { groups: groupResults, thirdPlaces: top8Thirds, tips };

  // --- RENDER ---
  return (
  <div style={{ display: "flex", gap: phase?.id === 1 ? "50px" : "0px", padding: "20px" }}>
    
    {/* Linke Seite: Gruppen - NUR anzeigen in Phase 1 */}
    {phase?.id === 1 && (
      <div ref={groupRef} style={{ flex: "0 0 auto" }}>
        <h3>Gruppenphase</h3>
        {Object.keys(grouped).sort().map(name => (
          <GroupTable 
            key={name} 
            groupName={name} 
            matches={grouped[name]} 
            tips={tips} 
            tableData={calculateTable(grouped[name], tips)} 
            onSaveTip={saveTip} 
            onDeleteTips={deleteGroupTips}
            isSubmitted={phase?.is_submitted}
          />
        ))}
        <BestThirdsTable teams={bestThirds} />
      </div>
    )}

    {/* Rechte Seite: KO-Baum - Immer da, nimmt ab Phase 2 den vollen Platz ein */}
    <div style={{ flex: "1" }}>
      <h3 style={{ marginLeft: phase?.id === 1 ? "0" : "20px" }}>KO-Phase</h3>
      <KOBracket 
        koByRound={koByRound} 
        tips={tips} 
        treeHeight={treeHeight}
        roundNames={ROUND_NAMES}
        phase={phase}
        getTopPosition={(roundIdx, matchIdx) => {
          const absoluteTop = getTopPosition(roundIdx, matchIdx, treeHeight, currentSpacing);
          return absoluteTop - topOffset; 
        }}
        getTeamFromPrevious={(roundIdx, matchIdx, side) => getTeamFromPrevious(roundIdx, matchIdx, side, koByRound, tips, tournamentContext)}
        resolveSlot={(slot) => resolveSlot(slot, tournamentContext)}
        baseSpacing={currentSpacing}
        saveTip={saveTip}
        deleteKORound={deleteKORound}
        KO_STRUCTURE={KO_STRUCTURE}
      />
    </div>
  </div>
);
}

export default TippsPage;