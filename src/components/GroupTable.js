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
  isGroupSaved,    // Lokaler Speicherstatus dieser Gruppe
  onDeleteTips, 
  onSaveTip,
  manualRanks = {},
  onSaveManualRank,
  onSaveGroup,
  isAdmin = false,
  isReadOnly = false // Erzwingt reinen Ansichtsmodus
}) => {

  // AUTOMATISCHER SCHUTZ: Wenn keine Speicherfunktion da ist oder isReadOnly aktiv ist
  const isEffectiveReadOnly = isReadOnly || !onSaveTip;

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => (a.match_order || 0) - (b.match_order || 0));
  }, [matches]);

  // Prüfen, ob alle Spiele der Gruppe ausgefüllt sind
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
  const ties = new Set();

  for (let i = 0; i < tableData.length - 1; i++) {
    const teamA = tableData[i];
    const teamB = tableData[i + 1];

    // Haben zwei aufeinanderfolgende Teams exakt dieselben Gesamtwerte?
    if (
      teamA.points === teamB.points &&
      teamA.diff === teamB.diff &&
      teamA.goals === teamB.goals
    ) {
      // Suchen des direkten Duells dieser beiden Teams in den Matches
      const directMatch = matches.find(m => 
        (m.team_a === teamA.team && m.team_b === teamB.team) ||
        (m.team_a === teamB.team && m.team_b === teamA.team)
      );

      const tip = directMatch ? tips[directMatch.id] : null;

      // Wenn das Spiel noch nicht getippt wurde oder Unentschieden ausging,
      // liegt ein echter, sportlich unauflösbarer Gleichstand vor -> Stichwahl aktivieren!
      if (!tip || Number(tip.goals_a) === Number(tip.goals_b)) {
        ties.add(teamA);
        ties.add(teamB);
      }
    }
  }

  return Array.from(ties);
}, [tableData, matches, tips]);

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
          
          {!isEffectiveReadOnly && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              
              {!isSubmitted && !isAdmin && (
                <button onClick={() => onDeleteTips(groupName)} style={GROUP_TABLE_STYLES.resetButton}>
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {sortedMatches.map((m) => {
          const tip = tips[m.id];
          
          // KORREKTUR: Validiert, dass Tore weder null, undefined noch ein leerer String sind
          const hasValidScore = tip && 
            tip.goals_a !== null && tip.goals_a !== undefined && tip.goals_a !== "" &&
            tip.goals_b !== null && tip.goals_b !== undefined && tip.goals_b !== "";

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
                    {!isEffectiveReadOnly && (!isSubmitted && !isGroupSaved || isAdmin) ? (
                      <TipInput 
                        isKO={false} 
                        initialGoalsA={tip?.goals_a} 
                        initialGoalsB={tip?.goals_b}
                        onSave={(a, b, w) => onSaveTip(m.id, a, b, w)} 
                      />
                    ) : (
                      <div style={GROUP_TABLE_STYLES.savedScore}>
                        {/* KORREKTUR: Nutzt jetzt den sicheren hasValidScore Check */}
                        {hasValidScore ? `${tip.goals_a} : ${tip.goals_b}` : "- : -"}
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
                      if (typeof onSaveManualRank === 'function' && !isEffectiveReadOnly) {
                        onSaveManualRank(row.team, e.target.value);
                      }
                    }}
                    disabled={isEffectiveReadOnly || isSubmitted || isGroupSaved} 
                    style={{
                      ...GROUP_TABLE_STYLES.manualRankInput,
                      backgroundColor: (isEffectiveReadOnly || isSubmitted || isGroupSaved) ? "#edf2f7" : "#fff",
                      cursor: (isEffectiveReadOnly || isSubmitted || isGroupSaved) ? "not-allowed" : "text"
                    }}
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