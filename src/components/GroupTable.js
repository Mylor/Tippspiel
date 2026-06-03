import React, { useMemo } from 'react';
import TipInput from './TipInput'; 
import { FlagIcon } from '../Utils/teamUtils';
import { GROUP_TABLE_STYLES } from '../Utils/uiConstants';

const GroupTable = ({ 
  groupName, 
  matches = [], 
  tips = {}, 
  dbTips = {}, 
  tableData = [], 
  isSubmitted,     // Globale Phasensperre (Read-Only)
  isGroupSaved,    // NEU: Lokaler Speicherstatus dieser Gruppe
  onDeleteTips, 
  onSaveTip,
  manualRanks = {},
  onSaveManualRank,
  onSaveGroup,
  isAdmin = false 
}) => {

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => (a.match_order || 0) - (b.match_order || 0));
  }, [matches]);

  // Prüfen, ob alle Spiele der Gruppe ausgefüllt sind (für den Aktivierungszustand des Speicherbuttons)
  const isGroupFinished = useMemo(() => {
    return matches.length > 0 && matches.every(m => {
      const tip = tips[m.id];
      return tip && 
             tip.goals_a !== null && tip.goals_a !== undefined && tip.goals_a !== "" &&
             tip.goals_b !== null && tip.goals_b !== undefined && tip.goals_b !== "";
    });
  }, [matches, tips]);

  // Ermittlung von Gleichstand für die Stichwahl
  const tiedTeams = useMemo(() => {
    return tableData.filter((teamA, i) => 
      tableData.some((teamB, j) => 
        i !== j && 
        teamA.points === teamB.points && 
        teamA.diff === teamB.diff && 
        teamA.goals === teamB.goals
      )
    );
  }, [tableData]);

  const hasTie = tiedTeams.length > 0;

  // Prüfen, ob bei Gleichstand alle Stichwahlen ausgefüllt sind
  const isManualRankComplete = useMemo(() => {
    if (!hasTie) return true;
    return tiedTeams.every(team => {
      const rank = manualRanks[team.team];
      return rank !== undefined && rank !== null && rank !== "";
    });
  }, [hasTie, tiedTeams, manualRanks]);

  const canSaveGroup = isGroupFinished && isManualRankComplete;

  return (
    <div style={GROUP_TABLE_STYLES.mainContainer}>
      {/* LINKE SEITE: SPIELLISTE */}
      <div style={GROUP_TABLE_STYLES.matchSection}>
        <div style={GROUP_TABLE_STYLES.headerContainer}>
          <h3 style={GROUP_TABLE_STYLES.groupTitle}>Gruppe {groupName}</h3>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Speichern-Button verschwindet, sobald die Gruppe gesichert ist */}
            {!isGroupSaved && !isSubmitted && !isAdmin && (
              <button 
                disabled={!canSaveGroup}
                onClick={() => onSaveGroup(groupName)}
                style={{
                  ...saveGroupBtnStyle,
                  backgroundColor: canSaveGroup ? "#22c55e" : "#bbf7d0", 
                  cursor: canSaveGroup ? "pointer" : "not-allowed"
                }}
              >
                Gruppe Speichern
              </button>
            )}
            
            {/* KORREKTUR: Reset-Button bleibt sichtbar, solange die Phase nicht final abgegeben wurde */}
            {!isSubmitted && !isAdmin && (
              <button onClick={() => onDeleteTips(groupName)} style={GROUP_TABLE_STYLES.resetButton}>
                Reset
              </button>
            )}
          </div>
        </div>

        {sortedMatches.map((m) => {
          const tip = tips[m.id];
          return (
            <div key={m.id} style={GROUP_TABLE_STYLES.matchCard}>                  
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span style={matchNoStyle}>
                  {m.match_no || m.match_order}
                </span>

                <div style={{ ...GROUP_TABLE_STYLES.matchFlex, flex: 1 }}>
                  <div style={GROUP_TABLE_STYLES.teamAContainer}>
                    <span style={GROUP_TABLE_STYLES.teamName}>{m.team_a}</span>
                    <FlagIcon teamName={m.team_a} />
                  </div>
                  
                  <div style={GROUP_TABLE_STYLES.scoreDisplayContainer}>
                    {/* Boxen frieren ein, wenn die Phase beendet ODER die Gruppe gespeichert wurde */}
                    {(!isSubmitted && !isGroupSaved || isAdmin) ? (
                      <TipInput 
                        isKO={false} 
                        initialGoalsA={tip?.goals_a} 
                        initialGoalsB={tip?.goals_b}
                        onSave={(a, b, w) => onSaveTip(m.id, a, b, w)} 
                      />
                    ) : (
                      <div style={GROUP_TABLE_STYLES.savedScore}>
                        {tip && tip.goals_a !== "" ? `${tip.goals_a} : ${tip.goals_b}` : "- : -"}
                      </div>
                    )}  
                  </div>

                  <div style={GROUP_TABLE_STYLES.teamBContainer}>
                    <FlagIcon teamName={m.team_b} />
                    <span style={GROUP_TABLE_STYLES.teamName}>{m.team_b}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RECHTE SEITE: LIVE-TABELLE */}
      <div style={GROUP_TABLE_STYLES.tableSection}>
        <table style={GROUP_TABLE_STYLES.tableBase}>
          <thead>
            <tr style={GROUP_TABLE_STYLES.tableHeaderRow}>
              <th style={GROUP_TABLE_STYLES.th}>#</th>
              <th style={GROUP_TABLE_STYLES.th}>Team</th>
              <th style={{...GROUP_TABLE_STYLES.th, textAlign: 'center'}}>PKT</th>
              <th style={{...GROUP_TABLE_STYLES.th, textAlign: 'center'}}>DIFF</th>
              <th style={{...GROUP_TABLE_STYLES.th, textAlign: 'center'}}>TORE</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              const isQualified = index < 2;
              return (
                <tr key={row.team} style={{ ...GROUP_TABLE_STYLES.tableRow, backgroundColor: isQualified ? "#f0fff4" : "#ffffff" }}>
                  <td style={GROUP_TABLE_STYLES.rankTd}>{index + 1}.</td>
                  <td style={{ ...GROUP_TABLE_STYLES.td, color: "#2d3748", fontWeight: isQualified ? "600" : "400" }}>
                    <div style={GROUP_TABLE_STYLES.teamCellContent}>
                      <FlagIcon teamName={row.team} />
                      {row.team}
                    </div>
                  </td>
                  <td style={GROUP_TABLE_STYLES.pointsTd}>{row.points}</td>
                  <td style={{ 
                    ...GROUP_TABLE_STYLES.td, 
                    textAlign: 'center', 
                    color: row.diff < 0 ? "#e53e3e" : "#2d3748", 
                    fontWeight: row.diff !== 0 ? "600" : "400" 
                  }}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td style={{...GROUP_TABLE_STYLES.td, textAlign: 'center'}}>{row.goals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Box für die Stichwahl bei absolutem Gleichstand */}
        {isGroupFinished && hasTie && (
          <div style={GROUP_TABLE_STYLES.swContainer}>
            <div style={GROUP_TABLE_STYLES.swHeader}>⚠️ Stichwahl nötig</div>
            <p style={GROUP_TABLE_STYLES.swInfoText}>Niedrigere Zahl für besseren Platz bei Gleichstand.</p>
            <div style={GROUP_TABLE_STYLES.swGrid}>
              {tiedTeams.map(row => (
                <div key={row.team} style={GROUP_TABLE_STYLES.swRow}>
                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <FlagIcon teamName={row.team} size="small" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{row.team}</span>
                  </div>
                  <input 
                    type="number" 
                    min="1" 
                    max="4"
                    value={manualRanks[row.team] || ""}
                    onChange={(e) => {
                      if (typeof onSaveManualRank === 'function') {
                        onSaveManualRank(row.team, e.target.value);
                      }
                    }}
                    disabled={isSubmitted || isGroupSaved}
                    style={GROUP_TABLE_STYLES.manualRankInput}
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

const saveGroupBtnStyle = { color: '#ffffff', fontWeight: '600', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', border: 'none', transition: 'all 0.2s ease-in-out' };
const matchNoStyle = { backgroundColor: '#e2e8f0', color: '#475569', fontWeight: '700', fontSize: '0.65rem', padding: '1px 2px', borderRadius: '4px', minWidth: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '10px', lineHeight: '1' };

export default GroupTable;