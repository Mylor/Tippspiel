import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { getBestThirds } from "./Utils/calcTable";
import GroupTable  from './components/GroupTable';
import KOBracket from './components/KOBracket';
import BestThirdsTable from './components/BestThirdsTable';


//////////////////////////////////////////
// 1️⃣ TIPPS PAGE (HAUPTLOGIK)
//////////////////////////////////////////
function TippsPage({ player, phaseId }) {
  const [matches, setMatches] = useState([]);
  const [tips, setTips] = useState({});
  const [phase, setPhase] = useState(null);

  const groupRef = useRef(null);
  const [treeHeight, setTreeHeight] = useState(800);

  const PHASE_ID = phaseId;

  //////////////////////////////////////////
  // 2️⃣ DATEN LADEN
  //////////////////////////////////////////
  useEffect(() => {
    fetchMatches();
    fetchTips();
    fetchPhase();

  }, [PHASE_ID]);

  useEffect(() => {
    if (groupRef.current) {
      setTreeHeight(groupRef.current.offsetHeight);
    }
  }, [matches]);

  async function fetchMatches() {
  const { data } = await supabase
    .from("match")
    .select("*"); // ❌ KEIN phase filter

  setMatches(data || []);
  }

  async function fetchTips() {
    const { data } = await supabase
      .from("tip")
      .select("*")
      .eq("player_id", player.id)
      .eq("phase_id", PHASE_ID);

    const map = {};
    data?.forEach((t) => (map[t.match_id] = t));
    setTips(map);
  }

  async function fetchPhase() {
    const { data } = await supabase
      .from("tip_phase")
      .select("*")
      .eq("id", PHASE_ID)
      .single();

    setPhase(data);
  }

  //////////////////////////////////////////
  // 3️⃣ TIP SPEICHERN
  //////////////////////////////////////////
  async function saveTip(matchId, goalsA, goalsB, winner) {
    if (phase?.is_submitted) return;

    const gA = goalsA !== null ? Number(goalsA) : null;
    const gB = goalsB !== null ? Number(goalsB) : null;

    const match = matches.find((m) => m.id === matchId);
    const isKO = match?.stage === "ko";

    const finalWinner = isKO && gA === gB ? winner : null;

    await supabase.from("tip").insert([
      {
        player_id: player.id,
        match_id: matchId,
        phase_id: PHASE_ID,
        goals_a: gA,
        goals_b: gB,
        winner: finalWinner,
      },
    ]);

    fetchTips();
  }

  //////////////////////////////////////////
  // 4️⃣ RESET FUNKTIONEN
  //////////////////////////////////////////

  // 🔁 Gruppe reset
  async function deleteGroupTips(groupName) {
    const ids = matches
      .filter((m) => m.group_name === groupName)
      .map((m) => m.id);

    await supabase
      .from("tip")
      .delete()
      .in("match_id", ids)
      .eq("player_id", player.id)
      .eq("phase_id", PHASE_ID);

    fetchTips();
  }

  // 🔁 KO Runde reset (NEU 🔥)
  async function deleteKORound(stageOrder) {
    const ids = matches
      .filter((m) => m.stage === "ko" && m.stage_order === stageOrder)
      .map((m) => m.id);

    await supabase
      .from("tip")
      .delete()
      .in("match_id", ids)
      .eq("player_id", player.id)
      .eq("phase_id", PHASE_ID);

    fetchTips();
  }

  //////////////////////////////////////////
  // 5️⃣ GRUPPEN (NUR GROUP STAGE!)
  //////////////////////////////////////////
  const grouped = {};
    matches.forEach((m) => {
      if (m.stage !== "group") return;

      if (!grouped[m.group_name]) grouped[m.group_name] = [];
      grouped[m.group_name].push(m);
    });

    const groupResults = {};

  Object.keys(grouped).forEach((group) => {
    const table = calculateTable(grouped[group], tips);

    groupResults[group] = table.map(t => t.team);
  });

  // Alle Gruppentabellen berechnen
  const allGroupTables = Object.keys(grouped).map((groupName) => {
    const table = calculateTable(grouped[groupName], tips);
    groupResults[groupName] = table.map(t => t.team);
    
    // Wir geben ein Objekt zurück, das getBestThirds versteht
    return {
      id: groupName,
      teams: table // Das sind die sortierten Teams dieser Gruppe
    };
  });

  // 🔥 SCHRITT 3: Nutze die neue Logik für die Top 8 Drittplatzierten
  const topEightThirds = getBestThirds(allGroupTables);

  const context = {
    groups: groupResults,
    thirdPlaces: topEightThirds, // Hier sind jetzt nur noch die besten 8 drin!
  };

  //////////////////////////////////////////
  // 6️⃣ TABELLEN BERECHNUNG
  //////////////////////////////////////////
  function calculateTable(matches, tips) {
    const table = {};

    matches.forEach((m) => {
      const t = tips[m.id];
      if (!t) return;

      const A = m.team_a;
      const B = m.team_b;

      if (!table[A]) table[A] = { points: 0, goals: 0, conceded: 0 };
      if (!table[B]) table[B] = { points: 0, goals: 0, conceded: 0 };

      const gA = Number(t.goals_a);
      const gB = Number(t.goals_b);

      table[A].goals += gA;
      table[A].conceded += gB;

      table[B].goals += gB;
      table[B].conceded += gA;

      if (gA > gB) table[A].points += 3;
      else if (gB > gA) table[B].points += 3;
      else {
        table[A].points += 1;
        table[B].points += 1;
      }
    });

    return Object.entries(table)
      .map(([team, d]) => ({
        team,
        ...d,
        diff: d.goals - d.conceded,
      }))
      .sort((a, b) => b.points - a.points || b.diff - a.diff);
  }

  //////////////////////////////////////////
  // 7️⃣ KO SPIELE LOGIK & STRUKTUR
  //////////////////////////////////////////
  const koMatches = matches
    .filter((m) => m.stage === "ko")
    .sort((a, b) => {
      if (a.stage_order !== b.stage_order) {
        return a.stage_order - b.stage_order;
      }
      return a.ko_order - b.ko_order;
    });

  const koByRound = {};
  koMatches.forEach((m) => {
    if (!koByRound[m.stage_order]) koByRound[m.stage_order] = [];
    koByRound[m.stage_order].push(m);
  });

  // Sortierung und Spezialfall Finale
  Object.keys(koByRound).forEach((round) => {
    koByRound[round].sort((a, b) => a.ko_order - b.ko_order);
    if (Number(round) === 5 && koByRound[round].length > 1) {
      koByRound[round] = [
        koByRound[round][1], // Finale
        koByRound[round][0], // Platz 3
      ];
    }
  });

  const KO_STRUCTURE = {
    round16: [
      ["E1", "3ABCDF"], ["I1", "3CDFGH"], ["F1", "C2"], ["B2", "A2"],
      ["K2", "L2"], ["H1", "J2"], ["D1", "3BEFIJ"], ["G1", "3AEHIJ"],
      ["C1", "F2"], ["E2", "I2"], ["A1", "3CEFHI"], ["L1", "3EHIJK"],
      ["J1", "H2"], ["D2", "G2"], ["B1", "3EFGIJ"], ["K1", "3DEIJL"]
    ],
  };

  const roundNames = {
    1: "Sechzehntelfinale", 2: "Achtelfinale", 3: "Viertelfinale", 4: "Halbfinale", 5: "Finale"
  };

  //////////////////////////////////////////
  // 8️⃣ BERECHNUNGEN (REIHENFOLGE KORRIGIERT)
  //////////////////////////////////////////

  // 1. Tabellen für Rangliste berechnen
  const allGroupsArray = Object.keys(grouped).map((groupName) => ({
    id: groupName,
    teams: calculateTable(grouped[groupName], tips)
  }));

  // 2. Beste Drittplatzierte
  const bestThirds = getBestThirds(allGroupsArray);

  // 3. Layout-Konstanten (totalMatches VOR baseSpacing!)
  const firstRoundKey = Object.keys(koByRound).sort((a, b) => a - b)[0];
  const totalMatchesCount = koByRound[firstRoundKey]?.length || 1;
  const currentBaseSpacing = treeHeight / totalMatchesCount;

  // 4. Positionierungs-Funktion
  const getTopPosition = (roundIndex, matchIndex) => {
    if (roundIndex === 4) {
      return matchIndex === 0 ? (treeHeight / 2 - 30) : (treeHeight / 2 + 300);
    }
    if (roundIndex === 0) return matchIndex * currentBaseSpacing;
    const prevSpacing = currentBaseSpacing * Math.pow(2, roundIndex);
    return matchIndex * prevSpacing + prevSpacing / 2 - currentBaseSpacing / 2;
  };

  // 5. Turnier-Kontext
  const tournamentContext = {
    groups: groupResults,
    thirdPlaces: bestThirds,
    tips: tips
  };

  //////////////////////////////////////////
  // 9️⃣ HELFER-FUNKTIONEN
  //////////////////////////////////////////
  function resolveSlotLocal(slot) {
    const { groups, thirdPlaces } = tournamentContext;
    if (/^[A-Z][12]$/.test(slot)) {
      const group = slot[0];
      const pos = Number(slot[1]) - 1;
      return groups[group]?.[pos] || "?";
    }
    if (slot.startsWith("3")) {
      const allowedGroups = slot.slice(1).split("");
      const candidates = thirdPlaces.filter(t => allowedGroups.includes(t.group));
      return candidates[0]?.team || "?";
    }
    return slot;
  }

  function getWinnerLocal(matchId) {
    const tip = tips[matchId];
    if (!tip) return null;
    if (tip.winner) return Number(tip.winner);
    const gA = Number(tip.goals_a);
    const gB = Number(tip.goals_b);
    if (gA > gB) return 1;
    if (gB > gA) return 2;
    return null;
  }

  function getTeamFromPreviousLocal(roundIndex, matchIndex, side) {
    const rounds = Object.keys(koByRound).map(Number).sort((a, b) => a - b);
    const prevRoundKey = rounds[roundIndex - 1];
    const prevRound = koByRound[prevRoundKey];
    if (!prevRound) return "?";
    const sourceMatchIndex = side === "A" ? matchIndex * 2 : matchIndex * 2 + 1;
    const sourceMatch = prevRound[sourceMatchIndex];
    if (!sourceMatch) return "?";
    const winner = getWinnerLocal(sourceMatch.id);
    if (!winner) return "?";
    return winner === 1 ? sourceMatch.team_a : sourceMatch.team_b;
  } 
    
return (
  <div style={{ padding: "20px" }}>
    <h2>EM 2024 Tippspiel</h2>

    {/* 🌍 DIESER CONTAINER PACKT ALLES NEBENEINANDER */}
    <div style={{ 
      display: "flex", 
      flexDirection: "row", // Nebeneinander
      gap: "50px",          // Abstand zwischen Gruppen und KO-Baum
      alignItems: "flex-start" 
    }}>

      {/* 🟢 LINKE SPALTE: GRUPPEN */}
      <div style={{ flex: "0 0 auto" }}>
        <h3>Tipps Gruppenphase</h3>
        <div ref={groupRef}>
          {Object.keys(grouped)
            .sort()
            .map((groupName) => (
              <GroupTable
                key={groupName}
                groupName={groupName}
                matches={grouped[groupName]}
                tips={tips}
                tableData={calculateTable(grouped[groupName], tips)}
                isSubmitted={phase?.is_submitted}
                onDeleteTips={deleteGroupTips}
                onSaveTip={saveTip}
              />
            ))}
        </div>
        <BestThirdsTable teams={bestThirds} />

      </div>

      {/* 🔴 RECHTE SPALTE: KO-BAUM */}
      <div style={{ flex: "1" }}>
        <h3>KO-Phase</h3>
        <KOBracket 
          koByRound={koByRound}
          tips={tips}
          phase={phase}
          roundNames={roundNames}
          treeHeight={treeHeight}
          getTopPosition={getTopPosition}
          getTeamFromPrevious={getTeamFromPreviousLocal}
          resolveSlot={resolveSlotLocal}
          context={context}
          KO_STRUCTURE={KO_STRUCTURE}
          saveTip={saveTip}
          deleteKORound={deleteKORound}
          baseSpacing={currentBaseSpacing}
        />
      </div>

    </div> {/* Ende des Flex-Containers */}
  </div>
);

//////////////////////////////////////////
// 9️⃣ TIP INPUT
//////////////////////////////////////////
function TipInput({ onSave, isKO, teamA, teamB }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [w, setW] = useState("");

  return (
    <div>
      <input
        type="number"
        min="0"
        value={a}
        onChange={(e) => setA(e.target.value)}
        style={{ width: "50px" }}
      />

      :

      <input
        type="number"
        min="0"
        value={b}
        onChange={(e) => setB(e.target.value)}
        style={{ width: "50px" }}
      />
      
      {isKO && a === b && (
        <select value={w} onChange={(e) => setW(e.target.value)}>
          <option value="">-</option>
          <option value="1">{teamA}</option>
          <option value="2">{teamB}</option>
        </select>
      )}

      <button onClick={() => onSave(a, b, w)}>Speichern</button>
    </div>
    );
  }
}
//////////////////////////////////////////
// 🔟 APP (LOGIN + NAVI)
//////////////////////////////////////////
function App() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    supabase.from("player").select("*").then(({ data }) => setPlayers(data));
  }, []);

  function checkPin() {
    if (pin === selectedPlayer.pin) {
      setLoggedIn(true);
      setError("");
    } else {
      setError("Falscher PIN");
    }
  }

  function logout() {
    setSelectedPlayer(null);
    setPin("");
    setLoggedIn(false);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Tippspiel</h1>

      {/* 🔐 LOGIN */}
      {!loggedIn && (
        <div>
          <h2>Spieler auswählen</h2>

          {!selectedPlayer &&
            players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                style={{ display: "block", margin: "10px 0" }}
              >
                {p.name}
              </button>
            ))}

          {selectedPlayer && (
            <div>
              <h3>{selectedPlayer.name}</h3>

              <input
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />

              <button onClick={checkPin}>Einloggen</button>

              {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
          )}
        </div>
      )}

      {/* 🎯 APP */}
      {loggedIn && (
        <div style={{ display: "flex" }}>

          {/* 🟣 SIDEBAR */}
          <div style={{ width: "150px", marginRight: "20px" }}>
            <h3>Tipps</h3>

            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                style={{
                  display: "block",
                  marginBottom: "10px",
                  background: phase === p ? "#ccc" : "#fff"
                }}
              >
                Tipp {p}
              </button>
            ))}

            <hr />

            <button onClick={logout}>Logout</button>
          </div>

          {/* 🟢 CONTENT */}
            <div style={{ flex: 1 }}>

              {/* 🔼 SCROLLBAR OBEN */}
              <div
                style={{
                  overflowX: "auto",
                  overflowY: "hidden"
                }}
              >
                <div style={{ width: "1800px", height: "1px" }} />
              </div>

              {/* 🔽 HAUPTINHALT */}
              <div
                style={{
                  overflow: "auto",
                  maxHeight: "90vh"
                }}
              >
                <div style={{ minWidth: "1800px", padding: "20px" }}>
                  <TippsPage player={selectedPlayer} phaseId={phase} />
                </div>
              </div>

            </div>

        </div>
      )}
    </div>
  );
}

export default App;