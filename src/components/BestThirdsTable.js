import React from 'react';
import { FlagIcon } from '../Utils/teamUtils';

/**
 * BestThirdsTable: Komponente zur Darstellung der Rangliste der Gruppendritten.
 * Vergleicht Teams aus verschiedenen Gruppen anhand von Punkten, Tordifferenz und Toren.
 */
function BestThirdsTable({ teams }) {
  
  // FRÜHZEITIGER ABBRUCH
  // Falls keine Daten vorhanden sind, wird nichts gerendert.
  if (!teams || teams.length === 0) return null;

  // --- LOGIK: SORTIERUNG ---
  // Erstellt eine Kopie des Arrays und sortiert nach UEFA/FIFA-Kriterien für Gruppendritte.
  const sortedThirds = [...teams].sort((a, b) => {
    // Normalisierung der Keys (unterstützt verschiedene Datenstrukturen wie goalDiff vs. diff)
    const diffA = a.goalDiff !== undefined ? a.goalDiff : a.diff;
    const diffB = b.goalDiff !== undefined ? b.goalDiff : b.diff;
    const goalsA = a.goalsFor !== undefined ? a.goalsFor : a.goals;
    const goalsB = b.goalsFor !== undefined ? b.goalsFor : b.goals;

    return (
      b.points - a.points ||  // 1. Höhere Punktzahl
      diffB - diffA ||        // 2. Bessere Tordifferenz
      goalsB - goalsA         // 3. Mehr erzielte Tore
    );
  }).slice(0, 12); // Begrenzung auf die Top 12 (für die Anzeige relevant)

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Rangliste der Gruppendritten</h3>
      
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
          {sortedThirds.map((team, index) => {
            // --- LOGIK: ZEILEN-STATUS ---
            // Plätze 1-8 qualifizieren sich für die nächste Runde (z.B. bei 32 Teams)
            const isQualified = index < 8;
            
            // Daten-Normalisierung für die Anzeige
            const displayDiff = team.goalDiff !== undefined ? team.goalDiff : team.diff;
            const displayGoals = team.goalsFor !== undefined ? team.goalsFor : team.goals;
            const displayName = team.name || team.team;
            const displayGroup = team.groupId || team.group;

            // Dynamisches Styling basierend auf Qualifikationsstatus
            const rowFontWeight = isQualified ? "bold" : "normal";
            const rowColor = isQualified ? "#000" : "#718096";

            return (
              <tr key={`${displayName}-${index}`} style={{ ...rowStyle, backgroundColor: isQualified ? "#f0fff4" : "#ffffff" }}>
                
                {/* Platzierung */}
                <td style={{ ...tdStyle, fontWeight: rowFontWeight, color: rowColor, width: "30px" }}>
                  {index + 1}.
                </td>

                {/* Herkunftsgruppe */}
                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: rowColor, width: "40px" }}>
                  {displayGroup}
                </td>

                {/* Team-Info mit Flagge */}
                <td style={{ ...tdStyle, fontWeight: rowFontWeight, color: rowColor }}>
                  <div style={teamCellContentStyle}>
                    <FlagIcon teamName={displayName} />
                    {displayName}
                  </div>
                </td>

                {/* Statistik-Werte */}
                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: rowColor }}>
                  {team.points}
                </td>

                <td style={{ ...tdCenterStyle, fontWeight: rowFontWeight, color: displayDiff < 0 ? "#e53e3e" : rowColor }}>
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
// Ausgelagerte Styles für bessere Lesbarkeit der Hauptkomponente

const containerStyle = { marginTop: "40px", width: "100%", fontFamily: "sans-serif" };
const titleStyle = { marginBottom: "10px", color: "#333", fontSize: "1.2em" };
const tableStyle = { width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const headerRowStyle = { backgroundColor: "#6b94e7", color: "#ffffff", textAlign: "left" };
const rowStyle = { borderBottom: "1px solid #edf2f7" };
const teamCellContentStyle = { display: "flex", alignItems: "center", gap: "10px" };

const thStyle = { padding: "12px 10px", fontWeight: "600", fontSize: "0.9em", textTransform: "uppercase", letterSpacing: "0.05em" };
const thCenterStyle = { ...thStyle, textAlign: "center" };
const tdStyle = { padding: "10px 10px", fontSize: "0.95em" };
const tdCenterStyle = { ...tdStyle, textAlign: "center" };

export default BestThirdsTable;