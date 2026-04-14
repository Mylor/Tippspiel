import React from 'react';
import TipInput from './TipInput'; // Pfad anpassen, falls nötig

const GroupTable = ({ 
  groupName, 
  matches, 
  tips, 
  tableData, 
  isSubmitted, 
  onDeleteTips, 
  onSaveTip 
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "40px",
        alignItems: "flex-start",
        marginBottom: "40px"
      }}
    >
      {/* 🔵 LINKS → Spiele */}
      <div style={{ width: "250px" }}>
        <h3>{groupName}</h3>

        {!isSubmitted && (
          <button onClick={() => onDeleteTips(groupName)}>
            Zurücksetzen
          </button>
        )}

        {matches.map((m) => {
          const tip = tips[m.id];
          return (
            <div key={m.id} style={{ marginBottom: "10px" }}>
              {m.team_a} vs {m.team_b}
              {tip ? (
                <div>{tip.goals_a} : {tip.goals_b}</div>
              ) : (
                !isSubmitted && (
                  <TipInput
                    isKO={false}
                    onSave={(a, b, w) => onSaveTip(m.id, a, b, w)}
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      {/* 🟢 RECHTS → Tabelle */}
      <div style={{ marginTop: "60px" }}>
        <table border="1" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Platz</th>
              <th>Team</th>
              <th>Pkt</th>
              <th>Tore</th>
              <th>GT</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={row.team}>
                <td>{index + 1}</td>
                <td>{row.team}</td>
                <td>{row.points}</td>
                <td>{row.goals}</td>
                <td>{row.conceded}</td>
                <td>{row.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupTable;