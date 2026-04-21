import React from 'react';
import TipInput from './TipInput'; 
import { FlagIcon } from '../Utils/teamUtils';

/**
 * GroupTable: Stellt eine komplette Gruppe dar.
 * Links: Liste der Spiele mit Eingabemöglichkeit (TipInput).
 * Rechts: Die daraus resultierende Live-Tabelle.
 */
const GroupTable = ({ 
  groupName, 
  matches, 
  tips, 
  tableData, 
  isSubmitted, 
  onDeleteTips, 
  onSaveTip,
  isAdmin = false 
}) => {

  return (
    <div style={mainContainerStyle}>
      
      {/* --- 🔵 LINKE SEITE: SPIELLISTE --- */}
      <div style={matchSectionStyle}>
        
        {/* Header der Spiel-Sektion mit Reset-Button */}
        <div style={headerContainerStyle}>
          <h3 style={groupTitleStyle}>Gruppe {groupName}</h3>
          {!isSubmitted && !isAdmin && (
            <button onClick={() => onDeleteTips(groupName)} style={resetButtonStyle}>
              Reset
            </button>
          )}
        </div>

        {/* Darstellung der einzelnen Partien */}
        {[...matches]
          .sort((a, b) => (a.match_order || 0) - (b.match_order || 0))
          .map((m) => {
            const tip = tips[m.id];
            
            return (
              <div key={m.id} style={matchCardStyle}>                  
                <div style={matchFlexStyle}>
                  
                  {/* Team A (Rechtsbündig) */}
                  <div style={teamAContainerStyle}>
                    <span style={teamNameStyle}>{m.team_a}</span>
                    <FlagIcon teamName={m.team_a} />
                  </div>

                  {/* Ergebnis-Anzeige oder Eingabefeld (Bereinigt) */}
                  <div style={scoreDisplayContainerStyle}>
                    {/* 🛠 LOGIK: Wenn Admin, zeige IMMER Input. Sonst nur wenn kein Tipp da. */}
                    {isAdmin ? (
                      <TipInput
                        isKO={false}
                        initialGoalsA={tip?.goals_a}
                        initialGoalsB={tip?.goals_b}
                        onSave={(a, b, w) => onSaveTip(m.id, a, b, w)}
                      />
                    ) : (
                    tip ? (
                      <div style={savedScoreStyle}>
                        {tip.goals_a} : {tip.goals_b}
                      </div>
                    ) : (
                      !isSubmitted && (
                        <TipInput
                          isKO={false}
                          onSave={(a, b, w) => onSaveTip(m.id, a, b, w)}
                        />
                      )
                    )
                  )} 
                  </div>

                  {/* Team B (Linksbündig) */}
                  <div style={teamBContainerStyle}>
                    <FlagIcon teamName={m.team_b} />
                    <span style={teamNameStyle}>{m.team_b}</span>
                  </div>

                </div>
              </div>
            );
          })}
      </div>

      {/* --- 🟢 RECHTE SEITE: LIVE-TABELLE --- */}
      <div style={tableSectionStyle}>
        <table style={tableBaseStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Team</th>
              <th style={thCenterStyle}>Pkt</th>
              <th style={thCenterStyle}>Tore</th>
              <th style={thCenterStyle}>GT</th>
              <th style={thCenterStyle}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              const isQualified = index < 2; // Ersten zwei Plätze markieren
              
              return (
                <tr key={row.team} style={{ 
                  ...tableRowStyle,
                  backgroundColor: isQualified ? "#f0fff4" : "#ffffff"
                }}>
                  <td style={rankTdStyle}>{index + 1}.</td>
                  
                  <td style={{ ...teamTdStyle, fontWeight: isQualified ? "600" : "400" }}>
                    <div style={teamCellContentStyle}>
                      <FlagIcon teamName={row.team} />
                      {row.team}
                    </div>
                  </td>

                  <td style={pointsTdStyle}>{row.points}</td>
                  <td style={tdCenterStyle}>{row.goals}</td>
                  <td style={tdCenterStyle}>{row.conceded}</td>
                  
                  <td style={{ 
                    ...tdCenterStyle, 
                    color: row.diff < 0 ? "#e53e3e" : "#2d3748",
                    fontWeight: row.diff !== 0 ? "600" : "400"
                  }}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- STYLES ---

const mainContainerStyle = { display: "flex", gap: "80px", alignItems: "flex-start", marginBottom: "60px", fontFamily: "sans-serif" };
const matchSectionStyle = { width: "400px" };
const tableSectionStyle = { marginTop: "48px", flex: 1 };
const headerContainerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" };
const groupTitleStyle = { margin: 0, color: "#333" };
const resetButtonStyle = { padding: "4px 8px", fontSize: "0.75em", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", color: "#666" };
const matchCardStyle = { marginBottom: "12px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "8px", fontSize: "0.85em", border: "1px solid #edf2f7", width: "360px", position: "relative" };
const matchFlexStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" };
const teamAContainerStyle = { display: "flex", alignItems: "center", gap: "6px", flex: 1, justifyContent: "flex-end" };
const teamBContainerStyle = { display: "flex", alignItems: "center", gap: "6px", flex: 1 };
const teamNameStyle = { fontWeight: "600" };
const scoreDisplayContainerStyle = { minWidth: "60px", textAlign: "center" };
const savedScoreStyle = { color: "#1a73e8", fontWeight: "bold", fontSize: "1.1em" };
const tableBaseStyle = { width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", backgroundColor: "#fff" };
const tableHeaderRowStyle = { backgroundColor: "#2d80ed", color: "#ffffff", textAlign: "left" };
const tableRowStyle = { borderBottom: "1px solid #edf2f7" };
const teamCellContentStyle = { display: "flex", alignItems: "center", gap: "10px" };
const thStyle = { padding: "12px 10px", fontWeight: "600", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.05em" };
const thCenterStyle = { ...thStyle, textAlign: "center" };
const tdStyle = { padding: "10px 10px", fontSize: "0.9em" };
const tdCenterStyle = { ...tdStyle, textAlign: "center" };
const rankTdStyle = { ...tdStyle, color: "#718096", width: "30px" };
const teamTdStyle = { ...tdStyle, color: "#2d3748" };
const pointsTdStyle = { ...tdCenterStyle, fontWeight: "bold", color: "#000" };

export default GroupTable;