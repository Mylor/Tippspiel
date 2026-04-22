import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getBestThirds } from "../Utils/calcTable";

// --- LOGIK & UTILS ---
import { calculateTable } from "../logic/tournamentLogic";
import { getTopPosition, resolveSlot, getTeamFromPrevious, getWinner } from "../logic/koLogic";

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

const PHASE_SPACING = { 1: 300, 2: 200, 3: 100, 4: 50, 5: 25 };
const PHASE_HEIGHTS = { 1: 2400, 2: 1200, 3: 800, 4: 600, 5: 400 };

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

    const { error } = await supabase.from("tip").upsert([{
      player_id: player.id,
      match_id: matchId,
      phase_id: phaseId,
      goals_a: gA,
      goals_b: gB,
      winner: calculatedWinner,
    }]);

    if (error) return console.error("Fehler beim Speichern des Tipps:", error);
    
    const newTips = { ...tips, [matchId]: { goals_a: gA, goals_b: gB, winner: calculatedWinner } };
    setTips(newTips);

    if (Number(phaseId) === 1) {
      console.log("Trigger Prognose-Update...");
      const updatedGroups = Object.keys(grouped).map(name => ({
        id: name,
        teams: calculateTable(grouped[name], newTips)
      }));

      // ÄNDERUNG: Wir behalten die Objekte (inkl. .group), damit das Mapping funktioniert
      const currentBestThirdsObjects = getBestThirds(updatedGroups).slice(0, 8);

      const currentKoMatches = matches
        .filter(m => m.stage === "ko")
        .sort((a,b) => a.stage_order - b.stage_order || a.ko_order - b.ko_order);

      const currentKoByRound = {};
      currentKoMatches.forEach(m => {
        if (!currentKoByRound[m.stage_order]) currentKoByRound[m.stage_order] = [];
        currentKoByRound[m.stage_order].push(m);
      });

      const tempContext = { 
        groups: updatedGroups.reduce((acc, g) => ({ ...acc, [g.id]: g.teams.map(t => t.team) }), {}),
        thirdPlaces: currentBestThirdsObjects, // Fix: Jetzt mit Group-Eigenschaft
        tips: newTips,
        phaseId: 1
      };
      
      await updateKOPrognosisDB(player.id, phaseId, currentKoByRound, newTips, tempContext);
      
      // Update Gruppentabellen DB
      await updateGroupPrognosisDB(player.id, updatedGroups, currentBestThirdsObjects.map(t => t.team));
    }
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

  return (
    <div style={{ display: "flex", gap: Number(phaseId) === 1 ? "50px" : "0px", padding: "20px", width: "max-content" }}>
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

// --- DB HILFSFUNKTIONEN ---

async function updateGroupPrognosisDB(playerId, allGroupsArray, bestThirdsTeams) {
  const records = allGroupsArray.map(g => ({
    player_id: playerId,
    group_name: g.id,
    rank_1: g.teams[0]?.team || null,
    rank_2: g.teams[1]?.team || null,
    rank_3: g.teams[2]?.team || null,
    rank_4: g.teams[3]?.team || null,
    reached_ko: [g.teams[0]?.team, g.teams[1]?.team].filter(Boolean),
    reached_ko_best_thirds: bestThirdsTeams,
    dropped_out: [g.teams[3]?.team].filter(Boolean)
  }));

  const { error } = await supabase.from("user_prognosis_group").upsert(records, { onConflict: 'player_id, group_name' });
  if (error) console.error("Fehler user_prognosis_group:", error.message);
}

async function updateKOPrognosisDB(playerId, phaseId, koByRound, tips, context) {
  console.log("Starte finale KO-Daten Aufbereitung (Prognose-Modus)...");

  // 1. Helfer: Holt den Namen aus dem virtuellen Baum
  const getPrognosisTeam = (roundIdx, matchIdx, side) => {
    const name = getTeamFromPrevious(roundIdx, matchIdx, side, koByRound, tips, context);
    return (name && name !== "?") ? name : null;
  };

  // 2. Helfer: Gewinner/Verlierer basierend auf deinen Tipps
  const getProgWinner = (roundIdx, matchIdx) => {
    const stageOrder = roundIdx + 1;
    const m = koByRound[stageOrder]?.[matchIdx];
    if (!m) return null;
    const winnerSide = getWinner(m.id, tips);
    if (!winnerSide) return null;
    return getPrognosisTeam(roundIdx, matchIdx, winnerSide === 1 ? "A" : "B");
  };

  const getProgLoser = (roundIdx, matchIdx) => {
    const stageOrder = roundIdx + 1;
    const m = koByRound[stageOrder]?.[matchIdx];
    if (!m) return null;
    const winnerSide = getWinner(m.id, tips);
    if (!winnerSide) return null;
    return getPrognosisTeam(roundIdx, matchIdx, winnerSide === 1 ? "B" : "A");
  };

  // 3. Sortierung
  const getSortedMatches = (stage) => (koByRound[stage] || []).sort((a,b) => a.ko_order - b.ko_order);

  const r16 = getSortedMatches(1); // 16tel-Finale (Runde 0)
  const r8  = getSortedMatches(2); // 8tel-Finale (Runde 1)
  const r4  = getSortedMatches(3); // Viertelfinale (Runde 2)
  const r2  = getSortedMatches(4); // Halbfinale (Runde 3)
  const r3placeMatch = koByRound[5]?.[1];

  const finalRecord = {
    player_id: playerId,
    phase_id: phaseId,

    // --- REACHED (Unverändert übernommen) ---
    reached_16: r16.flatMap((_, i) => [getPrognosisTeam(0, i, "A"), getPrognosisTeam(0, i, "B")]).filter(Boolean),
    reached_8:  r8.flatMap((_, i) => [getPrognosisTeam(1, i, "A"), getPrognosisTeam(1, i, "B")]).filter(Boolean),
    reached_4:  r4.flatMap((_, i) => [getPrognosisTeam(2, i, "A"), getPrognosisTeam(2, i, "B")]).filter(Boolean),
    reached_2:  r2.flatMap((_, i) => [getPrognosisTeam(3, i, "A"), getPrognosisTeam(3, i, "B")]).filter(Boolean),

    // --- DROP OUTS (Neu strukturiert & korrigiert) ---
    // Wer im 16tel-Finale verliert (Runde 0)
    drop_out_16: r16.map((_, i) => getProgLoser(0, i)).filter(Boolean),

    // Wer im 8tel-Finale verliert (Runde 1)
    drop_out_8:  r8.map((_, i) => getProgLoser(1, i)).filter(Boolean),

    // Wer im Viertelfinale verliert (Runde 2)
    drop_out_4:  r4.map((_, i) => getProgLoser(2, i)).filter(Boolean),

    // Wer im Halbfinale verliert (Runde 3) -> landet im Spiel um Platz 3
    drop_out_2:  r2.map((_, i) => getProgLoser(3, i)).filter(Boolean),

    // --- FINALS ---
    winner_final: koByRound[5]?.[0] ? getProgWinner(4, 0) : null,
    loser_final:  koByRound[5]?.[0] ? getProgLoser(4, 0) : null,

    winner_small_final: r3placeMatch ? getProgWinner(4, 1) : null,
    loser_small_final:  r3placeMatch ? getProgLoser(4, 1) : null
  };

  console.log("Speichere Prognose-Record:", finalRecord);

  const { error } = await supabase
    .from("user_prognosis_ko")
    .upsert([finalRecord], { onConflict: 'player_id, phase_id' });

  if (error) console.error("Datenbank-Fehler:", error.message);
}

export default TippsPage;