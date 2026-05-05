import React from 'react';
import TipInput from './TipInput'; 
import { FlagIcon } from '../Utils/teamUtils';

const GroupTable = ({ 
  groupName, 
  matches, 
  tips, 
  tableData, 
  isSubmitted, 
  onDeleteTips, 
  onSaveTip,
  manualRanks = {},
  onSaveManualRank,
  isAdmin = false 
}) => {

  // --- LOGIK: PRÜFEN OB ALLE 6 SPIELE GETIPPT WURDEN ---
  const isGroupFinished = matches.every(m => tips[m.id] !== undefined);

  // --- LOGIK: NUR DIE TEAMS FILTERN, DIE TATSÄCHLICH GLEICHSTAND HABEN ---
  const tiedTeams = tableData.filter((teamA, i) => 
    tableData.some((teamB, j) => 
      i !== j && 
      teamA.points === teamB.points && 
      teamA.diff === teamB.diff && 
      teamA.goals === teamB.goals
    )
  );

  const hasTie = tiedTeams.length > 0;

  return (
    <div style={mainContainerStyle}>
      {/* LINKE SEITE: SPIELLISTE */}
      <div style={matchSectionStyle}>
        <div style={headerContainerStyle}>
          <h3 style={groupTitleStyle}>Gruppe {groupName}</h3>
          {!isSubmitted && !isAdmin && (
            <button onClick={() => onDeleteTips(groupName)} style={resetButtonStyle}>
              Reset
            </button>
          )}
        </div>

        {[...matches]
          .sort((a, b) => (a.match_order || 0) - (b.match_order || 0))
          .map((m) => {
            const tip = tips[m.id];
            return (
              <div key={m.id} style={matchCardStyle}>                  
                <div style={matchFlexStyle}>
                  <div style={teamAContainerStyle}>
                    <span style={teamNameStyle}>{m.team_a}</span>
                    <FlagIcon teamName={m.team_a} />
                  </div>
                  <div style={scoreDisplayContainerStyle}>
                    {tip ? (
                      <div style={savedScoreStyle}>{tip.goals_a} : {tip.goals_b}</div>
                    ) : (
                      !isSubmitted && <TipInput isKO={false} onSave={(a, b, w) => onSaveTip(m.id, a, b, w)} />
                    )}
                  </div>
                  <div style={teamBContainerStyle}>
                    <FlagIcon teamName={m.team_b} />
                    <span style={teamNameStyle}>{m.team_b}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* RECHTE SEITE: LIVE-TABELLE */}
      <div style={tableSectionStyle}>
        <table style={tableBaseStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Team</th>
              <th style={thCenterStyle}>PKT</th>
              <th style={thCenterStyle}>DIFF</th>
              <th style={thCenterStyle}>TORE</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              const isQualified = index < 2;
              return (
                <tr key={row.team} style={{ ...tableRowStyle, backgroundColor: isQualified ? "#f0fff4" : "#ffffff" }}>
                  <td style={rankTdStyle}>{index + 1}.</td>
                  <td style={{ ...teamTdStyle, fontWeight: isQualified ? "600" : "400" }}>
                    <div style={teamCellContentStyle}><FlagIcon teamName={row.team} />{row.team}</div>
                  </td>
                  <td style={pointsTdStyle}>{row.points}</td>
                  <td style={{ ...tdCenterStyle, color: row.diff < 0 ? "#e53e3e" : "#2d3748", fontWeight: row.diff !== 0 ? "600" : "400" }}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td style={tdCenterStyle}>{row.goals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* STICHWAHL-SEKTION: NUR BEI GLEICHSTAND DER BETROFFENEN TEAMS */}
        {isGroupFinished && hasTie && (
          <div style={swContainerStyle}>
            <div style={swHeaderStyle}>⚠️ Stichwahl nötig</div>
            <p style={swInfoTextStyle}>
              Niedrigere Zahl für besseren Platz bei Gleichstand.
            </p>
            <div style={swGridStyle}>
              {tiedTeams.map(row => (
                <div key={row.team} style={swRowStyle}>
                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <FlagIcon teamName={row.team} size="small" />
                    <span style={{fontSize: '0.85rem', fontWeight: '500'}}>{row.team}</span>
                  </div>
                  <input 
                    type="number"
                    min="1"
                    max="4"
                    value={manualRanks[row.team] || ""}
                    onChange={(e) => onSaveManualRank(row.team, e.target.value)}
                    disabled={isSubmitted}
                    style={manualRankInputStyle}
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
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

const swContainerStyle = {
  marginTop: "16px",
  padding: "12px",
  backgroundColor: "#fffaf0",
  border: "1px solid #feebc8",
  borderRadius: "8px",
  width: "260px"
};

const swHeaderStyle = {
  fontSize: "0.9rem",
  fontWeight: "bold",
  color: "#c05621",
  marginBottom: "4px"
};

const swInfoTextStyle = {
  fontSize: "0.75rem",
  color: "#718096",
  fontStyle: "italic",
  marginBottom: "10px",
  lineHeight: "1.2"
};

const swGridStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px"
};

const swRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 10px",
  backgroundColor: "#ffffff",
  border: "1px solid #edf2f7",
  borderRadius: "6px"
};

const manualRankInputStyle = {
  width: "40px",
  padding: "4px",
  textAlign: "center",
  border: "1px solid #cbd5e0",
  borderRadius: "4px",
  fontSize: "0.85rem",
  fontWeight: "bold",
  color: "#2d3748"
};

export default GroupTable;