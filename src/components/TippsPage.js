import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getBestThirds } from "../Utils/calcTable";

// --- LOGIK & UTILS ---
import { calculateTable } from "../logic/tournamentLogic";
import { getTopPosition, resolveSlot, getTeamFromPrevious } from "../logic/koLogic";

// --- UI-KOMPONENTEN ---
import GroupTable from './GroupTable';
import KOBracket from './KOBracket';
import BestThirdsTable from './BestThirdsTable';

/**
 * KONSTANTEN & STRUKTUREN
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

const PHASE_SPACING = {
  1: 300, 2: 200, 3: 100, 4: 50, 5: 25
};

const PHASE_HEIGHTS = {
  1: 2400, 2: 1200, 3: 800, 4: 600, 5: 400
};

/**
 * TippsPage: Hauptseite für die Tipp-Abgabe der Spieler.
 */
function TippsPage({ player, phaseId, context }) {
  
  // --- STATE ---
  const [matches, setMatches] = useState([]);
  const [tips, setTips] = useState({});
  const [phase, setPhase] = useState(null);
  const [treeHeight, setTreeHeight] = useState(800);
  const groupRef = useRef(null);

  // --- LIFECYCLE ---
  useEffect(() => {
    fetchMatches();
    fetchTips();
    fetchPhase();
  }, [phaseId]);

  useEffect(() => {
    const currentId = Number(phaseId);
    if (PHASE_HEIGHTS[currentId]) {
      setTreeHeight(PHASE_HEIGHTS[currentId]);
    } else if (currentId === 1 && groupRef.current) {
      setTreeHeight(groupRef.current.offsetHeight);
    } else {
      setTreeHeight(2000);
    }
  }, [matches, tips, phaseId]);

  // --- FETCH ---
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

  // --- MUTATIONS ---
  async function saveTip(matchId, goalsA, goalsB, winner) {
    if (phase?.is_submitted) return;

    const gA = goalsA !== null ? Number(goalsA) : null;
    const gB = goalsB !== null ? Number(goalsB) : null;
    
    let calculatedWinner = winner; 
    if (gA !== null && gB !== null) {
      if (gA > gB) calculatedWinner = "1";
      else if (gB > gA) calculatedWinner = "2";
    }

    await supabase.from("tip").upsert([{
      player_id: player.id,
      match_id: matchId,
      phase_id: phaseId,
      goals_a: gA,
      goals_b: gB,
      winner: calculatedWinner,
    }]);
    
    fetchTips();
  }

  async function deleteGroupTips(groupName) {
    const groupMatchIds = matches.filter(m => m.group_name === groupName).map(m => m.id);
    const koMatchIds = matches.filter(m => m.stage === "ko").map(m => m.id);
    const allToDelete = [...groupMatchIds, ...koMatchIds];

    await supabase.from("tip").delete()
      .in("match_id", allToDelete)
      .eq("player_id", player.id);

    fetchTips();
  }
  
  async function deleteKORound(stageOrder, phaseId) {
    const idsToDelete = matches
      .filter(m => m.stage === "ko" && Number(m.stage_order) >= Number(stageOrder))
      .map(m => m.id);

    if (idsToDelete.length === 0) return;

    try {
      const { error } = await supabase.from("tip").delete()
        .eq("player_id", player.id)
        .eq("phase_id", phaseId)
        .in("match_id", idsToDelete);

      if (error) throw error;
      fetchTips();
    } catch (err) {
      console.error("Fehler beim Reset:", err.message);
    }
  }

  // --- LOGIK ---
  if (!phase) return <div style={{ padding: "20px" }}>Lade Turnierdaten...</div>;

  const grouped = {};
  matches.filter(m => m.stage === "group").forEach(m => {
    if (!grouped[m.group_name]) grouped[m.group_name] = [];
    grouped[m.group_name].push(m);
  });

  const allGroupsArray = Object.keys(grouped).map(groupName => ({
    id: groupName,
    teams: calculateTable(grouped[groupName], tips)
  }));

  const bestThirds = getBestThirds(allGroupsArray);
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

  const currentSpacing = PHASE_SPACING[phase?.id] || 70;
  const startIdxOfPhase = phase?.id <= 2 ? 0 : phase?.id - 2;
  const topOffset = getTopPosition(startIdxOfPhase, 0, treeHeight, currentSpacing);

  const tournamentContext = { 
    groups: groupResults, 
    thirdPlaces: top8Thirds, 
    tips: tips,
    phaseId: phase?.id
  };

  // --- RENDER ---
  return (
    <div style={{ display: "flex", gap: Number(phaseId) === 1 ? "50px" : "0px", padding: "20px", width: "max-content" }}>
      
      {/* LINKSE SEITE: Gruppenphase */}
      {Number(phaseId) === 1 && (
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

      {/* RECHTE SEITE: KO-Baum */}
      <div style={{ flex: "1", minWidth: "fit-content" }}>
        <h3 style={{ marginLeft: Number(phaseId) === 1 ? "0" : "20px" }}>KO-Phase</h3>
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
          getTeamFromPrevious={(roundIdx, matchIdx, side) => 
            getTeamFromPrevious(roundIdx, matchIdx, side, koByRound, tips, tournamentContext)
          }
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