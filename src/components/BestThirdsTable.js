import React from 'react';

const BestThirdsTable = ({ teams }) => {
  // Wir nehmen an, 'teams' sind bereits die Drittplatzierten aus allen Gruppen
  // Falls nicht bereits sortiert, sortieren wir hier nochmal zur Sicherheit
  const sortedThirds = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });

  return (
    <div style={{ marginTop: "40px", padding: "15px", backgroundColor: "#fff", border: "2px solid #333", borderRadius: "8px" }}>
      <h3 style={{ marginTop: 0 }}>Rangliste der Gruppendritten</h3>
      <p style={{ fontSize: "12px", color: "#666" }}>Die besten 8 kommen weiter</p>
      
      <table border="1" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "#eee" }}>
            <th>Platz</th>
            <th>Gruppe</th>
            <th>Team</th>
            <th>Pkt</th>
            <th>Diff</th>
            <th>Tore</th>
          </tr>
        </thead>
        <tbody>
          {sortedThirds.map((team, index) => {
            const isQualified = index < 8; // Die Top 8 markieren
            return (
              <tr 
                key={team.name} 
                style={{ 
                  backgroundColor: isQualified ? "#e6fffa" : "#fff5f5",
                  fontWeight: isQualified ? "bold" : "normal"
                }}
              >
                <td>{index + 1}.</td>
                <td align="center">{team.groupId}</td>
                <td>{team.name}</td>
                <td align="center">{team.points}</td>
                <td align="center">{team.goalDiff}</td>
                <td align="center">{team.goalsFor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BestThirdsTable;