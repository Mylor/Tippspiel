import React from 'react';
import { FlagIcon } from '../Utils/teamUtils';

/**
 * BestThirdsTable: Komponente zur Darstellung der Rangliste der Gruppendritten.
 * Inklusive Warn-Logik bei absolutem Gleichstand und manueller Stichwahl.
 */
function BestThirdsTable({ teams, manualRanks = {}, onSaveManualRank, isSubmitted }) {
  
  if (!teams || teams.length === 0) return null;

  // --- 1. LOGIK: GLEICHSTAND IDENTIFIZIEREN ---
  // Wir suchen Teams, die in Punkten, Differenz und Toren identisch sind
  const tiedTeams = teams.filter((team, index) => {
    const next = teams[index + 1];
    const prev = teams[index - 1];
    
    const isTiedWithNext = next && 
      team.points === next.points && 
      (team.goalDiff ?? team.diff) === (next.goalDiff ?? next.diff) && 
      (team.goalsFor ?? team.goals) === (next.goalsFor ?? next.goals);
      
    const isTiedWithPrev = prev && 
      team.points === prev.points && 
      (team.goalDiff ?? team.diff) === (prev.goalDiff ?? prev.diff) && 
      (team.goalsFor ?? team.goals) === (prev.goalsFor ?? prev.goals);

    return isTiedWithNext || isTiedWithPrev;
  });

  const hasTies = tiedTeams.length > 0;

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Rangliste der Gruppendritten</h3>

      {/* --- FEHLERMELDUNG & MANUELLE STICHWAHL --- */}
      {hasTies && (
        <div style={errorBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <strong style={{ color: "#c53030" }}>Gleichstand bei den Gruppendritten!</strong>
          </div>
          <p style={{ fontSize: "0.85rem", marginBottom: "15px", color: "#4a5568" }}>
            Punkte, Tordifferenz und Tore sind identisch. Bitte lege die Reihenfolge manuell fest (kleinere Zahl = besserer Rang):
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tiedTeams.map((team) => {
              const displayName = team.team || team.name;
              return (
                <div key={`tie-${displayName}`} style={tieRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                    <FlagIcon teamName={displayName} />
                    <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                      {displayName} <span style={{ fontWeight: "400", color: "#718096" }}>(Gruppe {team.group || team.groupId})</span>
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Rang"
                    value={manualRanks[displayName] || ""}
                    onChange={(e) => onSaveManualRank(displayName, e.target.value)}
                    disabled={isSubmitted}
                    style={tieInputStyle}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- HAUPTTABELLE --- */}
      <table style={tableStyle}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={thStyle}>#</th>
            <th style={thCenterStyle}>Grp</th>
            <th style={thStyle}>Team</th>
            <th style={thCenterStyle}>Pkt</th>
            <th style={thCenterStyle}>Diff</th>
            <th style={thCenterStyle}>Tore</th>
          </tr>
        </thead>
        
        <tbody>
          {teams.slice(0, 12).map((team, index) => {
            const isQualified = index < 8;
            
            const displayDiff = team.goalDiff !== undefined ? team.goalDiff : team.diff;
            const displayGoals = team.goalsFor !== undefined ? team.goalsFor : team.goals;
            const displayName = team.name || team.team;
            const displayGroup = team.groupId || team.group;

            const rowFontWeight = isQualified ? "bold" : "normal";
            const rowColor = isQualified ? "#000" : "#718096";

            return (
              <tr key={`${displayName}-${index}`} style={{ ...rowStyle, backgroundColor: isQualified ? "#f0fff4" : "#ffffff" }}>
                <td style={{ ...tdStyle, fontWeight: rowFontWeight, color: rowColor, width: "30px" }}>
                  {index + 1}.
                </td>

                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: rowColor, width: "40px" }}>
                  {displayGroup}
                </td>

                <td style={{ ...tdStyle, fontWeight: rowFontWeight, color: rowColor }}>
                  <div style={teamCellContentStyle}>
                    <FlagIcon teamName={displayName} />
                    {displayName}
                  </div>
                </td>

                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: rowColor }}>
                  {team.points}
                </td>

                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: displayDiff < 0 ? "#e53e3e" : (displayDiff > 0 ? "#38a169" : rowColor) }}>
                  {displayDiff > 0 ? `+${displayDiff}` : displayDiff}
                </td>

                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: rowColor }}>
                  {displayGoals}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- STYLES ---
const containerStyle = { marginTop: "40px", width: "100%", fontFamily: "sans-serif" };
const titleStyle = { marginBottom: "15px", color: "#333", fontSize: "1.2em", fontWeight: "bold" };
const tableStyle = { width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderRadius: "8px", overflow: "hidden" };
const headerRowStyle = { backgroundColor: "#6b94e7", color: "#ffffff", textAlign: "left" };
const rowStyle = { borderBottom: "1px solid #edf2f7", transition: "background-color 0.2s" };
const teamCellContentStyle = { display: "flex", alignItems: "center", gap: "10px" };

const thStyle = { padding: "12px 10px", fontWeight: "600", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.05em" };
const thCenterStyle = { ...thStyle, textAlign: "center" };
const tdStyle = { padding: "10px 10px", fontSize: "0.95em" };
const tdCenterStyle = { ...tdStyle, textAlign: "center" };

// Styles für die Warnbox (analog zu GroupTable)
const errorBoxStyle = {
  backgroundColor: "#fff5f5",
  border: "1px solid #fffaf0",
  borderRadius: "8px",
  padding: "15px",
  marginBottom: "25px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
};

const tieRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "#ffffff",
  padding: "10px 15px",
  borderRadius: "6px",
  border: "1px solid #edf2f7",
  marginBottom: "5px"
};

const tieInputStyle = {
  width: "60px",
  padding: "6px",
  borderRadius: "4px",
  border: "1px solid #cbd5e0",
  textAlign: "center",
  fontWeight: "bold",
  outline: "none"
};

export default BestThirdsTable;