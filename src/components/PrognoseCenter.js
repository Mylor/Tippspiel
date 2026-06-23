import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import TeamDropdown from "../Utils/TeamDropdown";
import { FlagIcon } from "../Utils/teamUtils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

// Harmonische, moderne Farbpalette
const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#dc2626", "#7e22ce", "#06b6d4", "#eab308", "#ec4899", "#14b8a6", "#6366f1"];

// Benutzerdefinierte Label-Funktion für die Donut-Charts
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, value, name, fill }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 32; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text 
      x={x} 
      y={y} 
      fill={fill} 
      textAnchor={textAnchor} 
      dominantBaseline="central"
      style={{ fontSize: '13px', fontWeight: '600' }}
    >
      {`${name}: ${value}`}
    </text>
  );
};

const PrognoseCenter = ({ currentUserId }) => {
  const [activeTab, setActiveTab] = useState("placement");
  const [loading, setLoading] = useState(true);
  
  // Daten-States
  const [phases, setPhases] = useState([]);
  const [koPrognosen, setKoPrognosen] = useState([]);
  const [groupPrognosen, setGroupPrognosen] = useState([]);
  const [allTeams, setAllTeams] = useState([]);

  // Filter-States für Reiter 2 & 3
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("A");

  useEffect(() => {
    async function fetchPrognosisData() {
      setLoading(true);
      try {
        const [tipPhasesRes, userSubmissionsRes, koRes, groupRes] = await Promise.all([
          supabase.from("tip_phase").select("*"),
          supabase.from("player_phase_submission").select("*").eq("player_id", currentUserId),
          supabase.from("user_prognosis_ko").select("*"),
          supabase.from("user_prognosis_group").select("*")
        ]);

        const enrichedPhases = (tipPhasesRes.data || []).map(phase => {
          const submission = (userSubmissionsRes.data || []).find(s => Number(s.phase_id) === Number(phase.id));
          return {
            ...phase,
            isVisible: phase.is_active && submission?.is_submitted === true
          };
        }).sort((a, b) => {
          const numA = parseInt(a.name?.replace(/\D/g, ""), 10) || Number(a.id);
          const numB = parseInt(b.name?.replace(/\D/g, ""), 10) || Number(b.id);
          return numA - numB;
        });

        setPhases(enrichedPhases);
        setKoPrognosen(koRes.data || []);
        setGroupPrognosen(groupRes.data || []);

        const teamsSet = new Set();
        (groupRes.data || []).forEach(g => {
          if (g.rank_1) teamsSet.add(g.rank_1);
          if (g.rank_2) teamsSet.add(g.rank_2);
          if (g.rank_3) teamsSet.add(g.rank_3);
          if (g.rank_4) teamsSet.add(g.rank_4);
        });
        setAllTeams(Array.from(teamsSet).sort());

      } catch (err) {
        console.error("Fehler beim Laden des Prognose-Centers:", err);
      } finally {
        setLoading(false);
      }
    }
    if (currentUserId) fetchPrognosisData();
  }, [currentUserId]);

  const teamColors = useMemo(() => {
    const map = {};
    allTeams.forEach((team, idx) => {
      map[team] = COLORS[idx % COLORS.length];
    });
    return map;
  }, [allTeams]);

  // ================= BERECHNUNGEN: REITER 1 (DONUT-CHARTS) =================
  const donutChartsData = useMemo(() => {
    const categories = ["winner_final", "loser_final", "winner_small_final", "loser_small_final"];
    const matrix = {};

    categories.forEach(cat => {
      matrix[cat] = {};
      phases.forEach(p => {
        matrix[cat][p.id] = {};
      });
    });

    koPrognosen.forEach(row => {
      const pId = row.phase_id;
      categories.forEach(cat => {
        const team = row[cat];
        if (team && matrix[cat][pId]) {
          matrix[cat][pId][team] = (matrix[cat][pId][team] || 0) + 1;
        }
      });
    });

    const formattedMatrix = {};
    categories.forEach(cat => {
      formattedMatrix[cat] = {};
      phases.forEach(p => {
        formattedMatrix[cat][p.id] = Object.entries(matrix[cat][p.id] || {})
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      });
    });

    return formattedMatrix;
  }, [koPrognosen, phases]);

  // ================= BERECHNUNGEN: REITER 2 (TEAM-VERLAUF) =================
  const teamBarsData = useMemo(() => {
    const phaseMatrix = {};

    // Schleife mit phaseIdx erweitern, um die Position der Phase zu kennen
    phases.forEach((p, phaseIdx) => {
      let categoriesList = [
        { key: "wm", label: "Weltmeister" },
        { key: "vwm", label: "Vizeweltmeister" },
        { key: "p3", label: "3. Platz" },
        { key: "p4", label: "4. Platz" },
        { key: "hf", label: "Halbfinale" },
        { key: "vf", label: "Viertelfinale" },
        { key: "af", label: "Achtelfinale" },
        { key: "sf", label: "Sechzehntelfinale" },
        { key: "gp", label: "Ausscheiden Gruppenphase" }
      ];

      // --- AKTIVE FILTERLOGIK FÜR SPÄTERE PHASEN ---
      if (phaseIdx >= 1) { 
        // Ab Phase 2 verschwinden Gruppenaus (gp) und Sechzehntelfinale (sf)
        categoriesList = categoriesList.filter(c => c.key !== "gp" && c.key !== "sf");
      }
      if (phaseIdx >= 2) { 
        // Ab Phase 3 verschwindet zusätzlich das Achtelfinale (af)
        categoriesList = categoriesList.filter(c => c.key !== "af");
      }
      if (phaseIdx >= 3) { 
        // Ab Phase 4 verschwindet das Viertelfinale (vf)
        categoriesList = categoriesList.filter(c => c.key !== "vf");
      }
      if (phaseIdx >= 4) { 
        // Ab Phase 5 verschwindet das Halbfinale (hf)
        categoriesList = categoriesList.filter(c => c.key !== "hf");
      }

      phaseMatrix[p.id] = categoriesList.map(c => ({ category: c.label, key: c.key }));
    });

    koPrognosen.forEach(row => {
      const pId = row.phase_id;
      if (!phaseMatrix[pId]) return;

      allTeams.forEach(team => {
        const inArray = (arr) => Array.isArray(arr) && arr.includes(team);

        let isWM = row.winner_final === team;
        let isVWM = row.loser_final === team;
        let isP3 = row.winner_small_final === team;
        let isP4 = row.loser_small_final === team;

        let reached2 = inArray(row.reached_2) || isWM || isVWM;
        let reached4 = inArray(row.reached_4) || reached2 || isP3 || isP4;
        let reached8 = inArray(row.reached_8) || reached4;
        let reached16 = inArray(row.reached_16) || reached8;

        const groupRow = groupPrognosen.find(g => g.player_id === row.player_id && Array.isArray(g.dropped_out) && g.dropped_out.includes(team));
        let droppedGroup = !!groupRow;

        phaseMatrix[pId].forEach(item => {
          if (!item[team]) item[team] = 0;
          if (item.key === "wm" && isWM) item[team]++;
          if (item.key === "vwm" && isVWM) item[team]++;
          if (item.key === "p3" && isP3) item[team]++;
          if (item.key === "p4" && isP4) item[team]++;
          if (item.key === "hf" && reached2) {
            if (item.key !== "wm" && item.key !== "vwm") item[team]++;
          }
          if (item.key === "vf" && reached4) item[team]++;
          if (item.key === "af" && reached8) item[team]++;
          if (item.key === "sf" && reached16) item[team]++;
          if (item.key === "gp" && droppedGroup) item[team]++;
        });
      });
    });

    const filteredPhaseMatrix = {};
    phases.forEach(p => {
      if (!phaseMatrix[p.id]) return;
      
      // Behalte Kriterien nur, wenn mindestens ein Team in dieser Phase einen Wert > 0 aufweist
      filteredPhaseMatrix[p.id] = phaseMatrix[p.id].filter(item => 
        allTeams.some(team => item[team] > 0)
      );
    });

    return filteredPhaseMatrix;
  }, [koPrognosen, groupPrognosen, phases, allTeams]);

  // ================= BERECHNUNGEN: REITER 3 (GRUPPEN-TENDENZ) =================
  const groupChartsData = useMemo(() => {
    const groupRows = groupPrognosen.filter(g => g.group_name === selectedGroup);
    const teamsInGroup = new Set();
    groupRows.forEach(g => {
      if (g.rank_1) teamsInGroup.add(g.rank_1);
      if (g.rank_2) teamsInGroup.add(g.rank_2);
      if (g.rank_3) teamsInGroup.add(g.rank_3);
      if (g.rank_4) teamsInGroup.add(g.rank_4);
    });

    return Array.from(teamsInGroup).map(team => {
      const counts = { "Platz 1": 0, "Platz 2": 0, "Platz 3": 0, "Platz 4": 0 };
      groupRows.forEach(g => {
        if (g.rank_1 === team) counts["Platz 1"]++;
        if (g.rank_2 === team) counts["Platz 2"]++;
        if (g.rank_3 === team) counts["Platz 3"]++;
        if (g.rank_4 === team) counts["Platz 4"]++;
      });

      const totalTipps = counts["Platz 1"] + counts["Platz 2"] + counts["Platz 3"] + counts["Platz 4"];
      const weightedSum = (1 * counts["Platz 1"]) + (2 * counts["Platz 2"]) + (3 * counts["Platz 3"]) + (4 * counts["Platz 4"]);
      const avgRank = totalTipps > 0 ? (weightedSum / totalTipps).toFixed(2) : "-";

      const chartData = Object.entries(counts).map(([pos, count]) => ({
        position: pos,
        Anzahl: count
      }));

      return { team, chartData, avgRank };
    });
  }, [groupPrognosen, selectedGroup]);

  if (loading) {
    return <div style={{ padding: "24px", color: "#64748b", textAlign: "center" }}>Prognosen werden aggregiert...</div>;
  }

  const renderLockedOverlay = (height = "380px") => (
    <div style={{
      height: height, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center",
      backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#64748b", fontWeight: "600"
    }}>
      🔒 Diese Daten sind noch geschützt oder nicht freigegeben.
    </div>
  );

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif", backgroundColor: "#ffffff", minHeight: "100vh" }}>
      <h2 style={{ color: "#1f2937", marginBottom: "20px" }}>🔮 Globales Prognose-Center</h2>

      {/* REITER-NAVIGATION */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px" }}>
        {[
          { id: "placement", label: "🏆 Top-4 Platzierungen" },
          { id: "team", label: "📊 Team-Verlauf im Vergleich" },
          { id: "group", label: "⚽ Gruppen-Tendenzen" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: "600", borderRadius: "8px 8px 0 0",
              background: activeTab === tab.id ? "#2563eb" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "#64748b"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "32px", alignItems: "start" }}>
        
        {/* ================= LINKES BEDIENFELD ================= */}
        <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          {activeTab === "placement" && (
            <div>
              <h4 style={{ margin: "0 0 8px 0", color: "#334155" }}>Info</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: "1.4" }}>
                Die Diagramme sind nun größer und absteigend nach Tipp-Häufigkeit sortiert. Jedes Land besitzt überall dieselbe Farbe.
              </p>
            </div>
          )}

          {activeTab === "team" && (
            <div>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155" }}>Teams vergleichen</h4>
              <TeamDropdown
                options={allTeams.filter(t => !selectedTeams.includes(t))}
                onChange={(team) => team && setSelectedTeams([...selectedTeams, team])}
                value=""
                placeholder="Team hinzufügen..."
              />
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedTeams.map(team => (
                  <div key={team} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", backgroundColor: "#ffffff", borderRadius: "6px", border: "1px solid #cbd5e1"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FlagIcon teamName={team} />
                      <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#1e293b" }}>{team}</span>
                    </div>
                    <button
                      onClick={() => setSelectedTeams(selectedTeams.filter(t => t !== team))}
                      style={{ background: "none", border: "none", color: "#dc2626", fontWeight: "bold", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {selectedTeams.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>Noch keine Teams ausgewählt.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "group" && (
            <div>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155" }}>Gruppe wählen</h4>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: "600", color: "#334155" }}
              >
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(g => (
                  <option key={g} value={g}>Gruppe {g}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ================= RECHTES DIAGRAMMFELD ================= */}
        <div style={{ minWidth: 0 }}>
          
          {/* REITER 1: DONUT DIAGRAMME MIT ENRICHED LABELS */}
          {activeTab === "placement" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              {[
                { key: "winner_final", title: "🥇 Weltmeister-Prognosen" },
                { key: "loser_final", title: "🥈 Vizeweltmeister-Prognosen" },
                { key: "winner_small_final", title: "🥉 3. Platz Prognosen" },
                { key: "loser_small_final", title: "🏅 4. Platz Prognosen" }
              ].map(cat => (
                <div key={cat.key} style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "32px" }}>
                  <h3 style={{ color: "#1e293b", marginBottom: "16px", fontSize: "1.3rem", fontWeight: "700" }}>{cat.title}</h3>
                  
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "row", 
                    gap: "20px", 
                    overflowX: "auto", 
                    paddingBottom: "16px",
                    scrollBehavior: "smooth"
                  }}>
                    {phases.map(p => {
                      if (!p.isVisible) {
                        return (
                          <div key={p.id} style={{ flexShrink: 0, width: "580px" }}>
                            <h5 style={{ margin: "0 0 8px 0", color: "#334155", fontWeight: "600", textAlign: "center" }}>{p.name}</h5>
                            {renderLockedOverlay("360px")}
                          </div>
                        );
                      }

                      const data = donutChartsData[cat.key]?.[p.id] || [];

                      return (
                        <div key={p.id} style={{ 
                          flexShrink: 0, 
                          width: "580px", 
                          backgroundColor: "#f8fafc", 
                          padding: "20px", 
                          borderRadius: "12px", 
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                        }}>
                          <h5 style={{ margin: "0 0 8px 0", color: "#1e293b", fontWeight: "700", textAlign: "center", fontSize: "1.05rem" }}>{p.name}</h5>
                          {data.length === 0 ? (
                            <p style={{ fontSize: "0.9rem", color: "#94a3b8", textAlign: "center", height: "360px", paddingTop: "160px" }}>Keine Daten</p>
                          ) : (
                            <div style={{ width: "100%", height: "360px" }}> 
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}       
                                    outerRadius={95} 
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                    label={renderCustomizedLabel}
                                    labelLine={{
                                      stroke: "#94a3b8",
                                      strokeWidth: 1.5,
                                      length: 18,          
                                      length2: 8          
                                    }}
                                  >
                                    {data.map((entry, idx) => (
                                      <Cell 
                                        key={`cell-${idx}`} 
                                        fill={teamColors[entry.name] || COLORS[idx % COLORS.length]} 
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    formatter={(value, name) => [`${value} Stimmen`, name]}
                                    separator=" : "
                                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                                    itemStyle={{ color: "#0f172a", fontWeight: "600" }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REITER 2: SÄULENDIAGRAMME (Kompaktierte X-Achse pro Phase) */}
          {activeTab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              {phases.map(p => (
                <div key={p.id} style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "#1e2937", fontWeight: "700" }}>📈 Verlaufskurve - {p.name}</h3>
                  {!p.isVisible ? (
                    renderLockedOverlay("380px")
                  ) : selectedTeams.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>Bitte wähle links mindestens ein Land aus, um Daten zu vergleichen.</p>
                  ) : (
                    <div style={{ width: "100%", height: "380px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamBarsData[p.id]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="category" stroke="#1e293b" tick={{ fontSize: 12, fontWeight: "600" }} />
                          <YAxis allowDecimals={false} stroke="#1e293b" tick={{ fontWeight: "600" }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "8px" }}
                            itemStyle={{ color: "#0f172a", fontWeight: "700" }}
                            labelStyle={{ color: "#334155", fontWeight: "bold", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}
                          />
                          {selectedTeams.map((team, idx) => (
                            <Bar key={team} dataKey={team} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* REITER 3: GRUPPEN-TENDENZEN */}
          {activeTab === "group" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#1e293b", fontWeight: "700" }}>🏆 Platzierungs-Tendenzen: Gruppe {selectedGroup}</h3>
              {groupChartsData.map(({ team, chartData, avgRank }) => (
                <div key={team} style={{ 
                  backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", 
                  display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center", gap: "20px" 
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center", flexDirection: "column" }}>
                    <FlagIcon teamName={team} style={{ width: "55px", height: "auto", borderRadius: "4px", boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }} />
                    <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "1.1rem", textAlign: "center", marginTop: "6px" }}>{team}</span>
                    
                    <div style={{ 
                      fontSize: "0.85rem", color: "#1e293b", marginTop: "6px", backgroundColor: "#e2e8f0", 
                      padding: "4px 10px", borderRadius: "20px", fontWeight: "700", border: "1px solid #cbd5e1"
                    }}>
                      💡 Ø-Platz: {avgRank}
                    </div>
                  </div>

                  <div style={{ width: "100%", height: "160px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="position" stroke="#1e293b" tick={{ fontSize: 12, fontWeight: "600" }} />
                        <YAxis allowDecimals={false} stroke="#1e293b" tick={{ fontWeight: "600" }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "8px" }}
                          itemStyle={{ color: "#0f172a", fontWeight: "700" }}
                        />
                        <Bar dataKey="Anzahl" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PrognoseCenter;