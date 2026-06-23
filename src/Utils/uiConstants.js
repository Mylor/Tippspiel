/**
 * TURNIER-STRUKTUR
 * Definiert, welche Gruppen-Positionen im Achtelfinale aufeinandertreffen.
 * "1E", "1I" etc. sind die Platzhalter für die qualifizierten Gruppendritten.
 */
export const KO_STRUCTURE = {
  round16: [
    ["E1", "1E"], ["I1", "1I"], ["B2", "A2"], ["F1", "C2"],
    ["K2", "L2"], ["H1", "J2"], ["D1", "1D"], ["G1", "1G"],
    ["C1", "F2"], ["E2", "I2"], ["A1", "1A"], ["L1", "1L"],
    ["J1", "H2"], ["D2", "G2"], ["B1", "1B"], ["K1", "1K"]
  ],
};

export const ROUND_NAMES = { 
  1: "Sechzehntelfinale", 2: "Achtelfinale", 3: "Viertelfinale", 4: "Halbfinale", 5: "Finale" 
};

/**
 * UI-METRIKEN
 * Diese Werte steuern das visuelle "Wachstum" des Turnierbaums.
 */
export const PHASE_HEIGHTS = { 
  1: "4000px", 
  2: "3300px", 
  3: "1650px", 
  4: "900px", 
  5: "600px" 
};

export const PHASE_SPACING = { 1: 300, 2: 200, 3: 100, 4: 50, 5: 25 };

// --- UI STYLES FÜR DASHBOARD & ALLGEMEIN ---
export const UI_STYLES = {
  matrixBoxOuter: { 
    width: "240px", minHeight: "115px", background: "#fff", borderRadius: "10px", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", 
    display: "flex", flexDirection: "column", overflow: "hidden" 
  },
  teamRowSimulated: { 
    padding: "10px 12px", display: "flex", alignItems: "center", 
    height: "40px", fontSize: "0.85rem", gap: "10px", position: "relative" 
  },
  flagWrapper: { 
    width: "22px", height: "16px", overflow: "hidden", 
    borderRadius: "2px", border: "1px solid #eee", display: "flex", alignItems: "center" 
  },
  flagImg: { width: "100%", height: "auto" },
  matrixLabel: { 
    fontSize: "0.65rem", fontWeight: "bold", color: "#878b8e", 
    textTransform: "uppercase", marginBottom: "4px" 
  },
  headerColumn: { 
    width: "240px", textAlign: "center", display: "flex", 
    flexDirection: "column", gap: "8px", marginBottom: "32px", marginTop: "20px" 
  },
  roundTitle: { fontWeight: "bold", fontSize: "1rem", color: "#2d3748" },
  resetButton: { 
    padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#fff", 
    border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", color: "#666" 
  },
  tipContainer: { padding: "6px 10px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" },
  savedTipDisplay: { 
    fontSize: "0.9rem", textAlign: "center", fontWeight: "bold", 
    color: "#1a73e8", display: "flex", flexDirection: "column", gap: "2px" 
  },
  winnerSubText: { fontSize: "0.65rem", color: "#666", fontWeight: "normal" },

  // NEU HINZUGEFÜGT: Objekt-Styles für universelle Trend-Pfeile (Grün / Rot / Grau)
  trend: {
    up: { color: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.1)", padding: "4px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" },
    down: { color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "4px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" },
    stable: { color: "#94a3b8", fontWeight: "bold", padding: "0 4px" }
  }
};

// --- KO-BRACKET SPEZIFISCHE STYLES ---
export const BRACKET_STYLES = {
  loading: { padding: "20px", color: "#666" },
  
  viewport: (minHeight) => ({ 
    minHeight, 
    padding: "20px", 
    backgroundColor: "#fff", 
    display: "inline-block", 
    verticalAlign: "top" 
  }),

  treeContainer: (height) => ({ 
    position: "relative", 
    height: `${height}px`, 
    backgroundColor: "#fff", 
    width: "fit-content", 
    minWidth: "100%"
  }),

  headerRow: { display: "flex", marginBottom: "60px" },

  headerColumn: { 
    width: "240px", 
    marginRight: "60px", 
    textAlign: "center", 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px" 
  },

  roundTitle: { fontWeight: "bold", fontSize: "1rem", color: "#2d3748" },

  resetButton: { 
    padding: "4px 8px", 
    fontSize: "0.75rem", 
    backgroundColor: "#fff", 
    border: "1px solid #ccc", 
    borderRadius: "4px", 
    cursor: "pointer", 
    color: "#666", 
    zIndex: 10 
  },

  matchLabel: { 
    fontSize: "0.65rem", 
    fontWeight: "bold", 
    color: "#878b8e", 
    textTransform: "uppercase", 
    marginBottom: "4px" 
  },

  matchBox: { 
    width: "240px", 
    minHeight: "115px", 
    background: "#fff", 
    borderRadius: "10px", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)", 
    border: "1px solid #e2e8f0", 
    display: "flex", 
    flexDirection: "column", 
    overflow: "hidden" 
  },

  teamRow: (isWinner, isFirst) => ({
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "40px",
    background: isWinner ? "#f0fff4" : "transparent",
    borderBottom: isFirst ? "1px solid #f1f5f9" : "none",
    position: "relative"
  }),

  teamInfoFlex: { display: "flex", alignItems: "center", gap: "10px" },
  teamNameText: { fontSize: "0.85rem" },
  checkMark: { color: "#48bb78", fontWeight: "bold" },
  tipContainer: { padding: "6px 10px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" },
  savedTipDisplay: { fontSize: "0.9rem", textAlign: "center", fontWeight: "bold", color: "#1a73e8", display: "flex", flexDirection: "column", gap: "2px" },
  finalResult: { fontSize: "0.75rem", textAlign: "center", fontWeight: "bold", color: "#475569" },

  lineHorizontal: { 
    position: "absolute", top: "82px", right: "-30px", 
    width: "30px", 
    height: "2px", 
    background: "#cbd5e0" 
  },

  lineVertical: { 
    position: "absolute", 
    right: "-30px", 
    width: "2px", 
    background: "#cbd5e0" 
  }
};

// --- EINHEITLICHE DASHBOARD STYLES (HELL) ---
export const DASHBOARD_STYLES = {
  dashboardWrapper: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    backgroundColor: "#f8fcfb"
  },
  sidebar: {
    height: "100%",
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    margin: 0,
    boxSizing: "border-box",
    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease",
    borderRight: "1px solid #e2e8f0",
    backgroundColor: "#ffffff" // Passend zum restlichen UI Design
  },
  collapseButton: {
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  profileBox: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxSizing: "border-box",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff"
  },
  profileMetaWrapper: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flexGrow: 1
  },
  profileNameContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap"
  },
  profileName: {
    fontSize: "1.15rem",
    margin: 0,
    fontWeight: "800",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  badge: {
    margin: 0,
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontWeight: "600",
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.75rem"
  },
  jerseyNumberText: {
    fontSize: "0.8rem",
    color: "#475569",
    fontWeight: "600",
    marginTop: "4px"
  },
  settingsButton: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "white",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%"
  },
  nav: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "24px"
  },
  navRowSpace: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%"
  },
  divider: {
    margin: "10px 0",
    border: "none",
    borderTop: "1px solid #e2e8f0"
  },
  sectionHeader: {
    color: "#475569",
    fontWeight: "700",
    fontSize: "0.85rem",
    margin: "10px 0 4px 4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  logoutButton: {
    marginTop: "auto",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #ef4444",
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    cursor: "pointer",
    fontWeight: "700",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  mainContent: {
    flex: 1,
    height: "100%",
    overflow: "auto",
    padding: "24px 30px",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
    transition: "filter 0.4s ease-in-out, transform 0.4s ease-in-out"
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(350px, 4.5fr) minmax(450px, 5.5fr)",
    gap: "30px",
    alignItems: "flex-start"
  },
  whiteCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  contentTitle: {
    color: "#0f172a",
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "800"
  },
  toggleViewButton: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    transition: "all 0.15s ease"
  },
  teamScoreboardContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid #e2e8f0"
  },
  teamScoreCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "8px 6px",
    borderRadius: "8px",
    transition: "all 0.3s ease"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeader: {
    borderBottom: "2px solid #e2e8f0"
  },
  th: {
    color: "#334155",
    textAlign: "left",
    padding: "10px 12px",
    fontWeight: "700",
    fontSize: "0.85rem"
  },
  td: {
    padding: "10px 12px",
    verticalAlign: "middle"
  },
  tdRank: {
    padding: "10px 12px",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "700",
    verticalAlign: "middle"
  },
  tdPoints: {
    padding: "10px 12px",
    color: "#0f172a",
    textAlign: "right",
    fontSize: "1.05rem",
    verticalAlign: "middle"
  },
  myRow: {
    backgroundColor: "#f0fdf4", // Zartes Grün für das eigene Zeilen-Highlighting
    borderRadius: "6px"
  },
  flexibleCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e2e8f0"
  },
  loadingContainer: {
    padding: "20px",
    color: "#0f172a",
    fontWeight: "600",
    fontFamily: "sans-serif"
  }
};

// --- NAVIGATION LOGIC STYLES ---
export function getTabButtonStyle(isActive) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    textAlign: "left",
    transition: "all 0.2s ease",
    backgroundColor: isActive ? "#2563eb" : "transparent",
    color: isActive ? "#ffffff" : "#475569"
  };
}

export function getPhaseButtonStyle(isActive, isCurrentSystemPhase) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    textAlign: "left",
    transition: "all 0.2s ease",
    border: "1px solid transparent",
    // Hintergrund ist jetzt nur noch blau, wenn die Phase aktiv ausgewählt ist, sonst transparent:
    backgroundColor: isActive ? "#2563eb" : "transparent",
    // Text wird blau, wenn es die aktuelle Systemphase ist – falls das auch stört, einfach durch '#475569' ersetzen:
    color: isActive ? "#ffffff" : isCurrentSystemPhase ? "#1d4ed8" : "#475569"
  };
}

export const GROUP_TABLE_STYLES = {
  mainContainer: { display: "flex", gap: "80px", alignItems: "flex-start", marginBottom: "60px", fontFamily: "sans-serif" },
  matchSection: { width: "400px" },
  tableSection: { marginTop: "48px", flex: 1 },
  headerContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  groupTitle: { margin: 0, color: "#333" },
  resetButton: { padding: "4px 8px", fontSize: "0.75em", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", color: "#666" },
  matchCard: { marginBottom: "12px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "8px", fontSize: "0.85em", border: "1px solid #edf2f7", width: "390px", position: "relative" },
  
  // 1. ZENTRIERTE AUSRICHTUNG DER REIHE
  matchFlex: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  
  // 2. LINKES TEAM (Rechtsbündig orientiert, bricht bei Platzmangel nicht das Layout)
  teamAContainer: { display: "flex", alignItems: "center", gap: "6px", flex: 1, justifyContent: "flex-end", minWidth: 0 },
  
  // 3. RECHTES TEAM (Linksbündig orientiert, verhält sich spiegelverkehrt zu Team A)
  teamBContainer: { display: "flex", alignItems: "center", gap: "6px", flex: 1, justifyContent: "flex-start", minWidth: 0 },
  
  // 4. TEXTSCHUTZ (Verhindert, dass lange Namen wie "Elfenbeinküste" umbrechen oder Boxen wegdrücken)
  teamName: { fontWeight: "600", color: "#181c22", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  
  // 5. ABSOLUT FESTE MITTE (Inputs stehen dadurch gruppenübergreifend exakt auf einer vertikalen Achse)
  scoreDisplayContainer: { width: "90px", flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" },
  
  savedScore: { color: "#1a73e8", fontWeight: "bold", fontSize: "1.1em" },
  tableBase: { width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", backgroundColor: "#fff" },
  tableHeaderRow: { backgroundColor: "#2d80ed", color: "#ffffff", textAlign: "left" },
  tableRow: { borderBottom: "1px solid #edf2f7" },
  teamCellContent: { display: "flex", alignItems: "center", gap: "10px" },
  th: { padding: "12px 10px", fontWeight: "600", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "10px 10px", fontSize: "0.9em", color: "#181c22" },
  rankTd: { padding: "10px 10px", fontSize: "0.9em", color: "#718096", width: "30px" },
  pointsTd: { padding: "10px 10px", fontSize: "0.9em", textAlign: "center", fontWeight: "bold", color: "#000" },
  swContainer: { marginTop: "16px", padding: "12px", backgroundColor: "#fffaf0", border: "1px solid #feebc8", borderRadius: "8px", width: "260px" },
  swHeader: { fontSize: "0.9rem", fontWeight: "bold", color: "#c05621", marginBottom: "4px" },
  swInfoText: { fontSize: "0.75rem", color: "#718096", fontStyle: "italic", marginBottom: "10px", lineHeight: "1.2" },
  swGrid: { display: "flex", flexDirection: "column", gap: "4px" },
  swRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", backgroundColor: "#ffffff", border: "1px solid #edf2f7", borderRadius: "6px" },
  manualRankInput: { width: "40px", padding: "4px", textAlign: "center", border: "1px solid #cbd5e0", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold", color: "#2d3748" }
};

// --- BestThirdsTable ---
export const BEST_THIRDS_STYLES = {
  container: { marginTop: "40px", width: "100%", fontFamily: "sans-serif" },
  title: { marginBottom: "15px", color: "#333", fontSize: "1.2em", fontWeight: "bold" },
  tableBase: { width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderRadius: "8px", overflow: "hidden" },
  headerRow: { backgroundColor: "#6b94e7", color: "#ffffff", textAlign: "left" },
  row: (isQualified) => ({ 
    borderBottom: "1px solid #edf2f7", 
    transition: "background-color 0.2s",
    backgroundColor: isQualified ? "#f0fff4" : "#ffffff" 
  }),
  teamCell: { display: "flex", alignItems: "center", gap: "10px" },
  th: { padding: "12px 10px", fontWeight: "600", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.05em" },
  thCenter: { padding: "12px 10px", fontWeight: "600", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" },
  td: (isQualified) => ({ 
    padding: "10px 10px", 
    fontSize: "0.95em", 
    fontWeight: isQualified ? "bold" : "normal", 
    color: isQualified ? "#000" : "#718096" 
  }),
  tdCenter: (isQualified) => ({ 
    padding: "10px 10px", 
    fontSize: "0.95em", 
    textAlign: "center",
    fontWeight: isQualified ? "bold" : "normal", 
    color: isQualified ? "#000" : "#718096" 
  }),
  errorBox: { backgroundColor: "#fff5f5", border: "1px solid #fffaf0", borderRadius: "8px", padding: "15px", marginBottom: "25px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  tieRow: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: "10px 15px", borderRadius: "6px", border: "1px solid #edf2f7", marginBottom: "5px" },
  tieInput: { width: "60px", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e0", textAlign: "center", fontWeight: "bold", outline: "none" }
};

// ==========================================
// --- ADMIN CONTROL CENTER STYLES & TOOLS ---
// ==========================================

// Kontrast-Hilfsfunktion für die Rückennummer auf dem Trikot
export const getContrastColor = (hexColor) => {
  if (!hexColor || hexColor.length < 6) return "#000000";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
};

// Dynamische Trikot-Komponente mit Schutz-Kontur für schwarze Trikots
export const JerseyIcon = ({ color = "#000000", number = "", size = 32 }) => {
  const isBlack = color === "#000000";
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ fill: color, stroke: isBlack ? "#4b5563" : "#000000", strokeWidth: 6, strokeLinejoin: "round" }}>
        <path d="M 30,15 L 40,23 L 60,23 L 70,15 L 90,25 L 80,45 L 73,42 L 73,90 L 27,90 L 27,42 L 20,45 L 10,25 Z" />
      </svg>
      <span style={{
        position: "absolute",
        top: "54%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: `${size * 0.35}px`,
        fontWeight: "800",
        color: getContrastColor(color),
        lineHeight: 1
      }}>
        {number}
      </span>
    </div>
  );
};

// Statische Style-Objekte für das Admin-Center
export const ADMIN_STYLES = {
  loadingContainer: { padding: "60px", textAlign: "center", fontFamily: "sans-serif", color: "#64748b" },
  loadingText: { marginTop: "16px", fontWeight: "600", fontSize: "15px" },
  container: { padding: "40px 32px", width: "100%", fontFamily: "system-ui, sans-serif", backgroundColor: "#f8fafc", minHeight: "100vh", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px", gap: "24px", flexWrap: "wrap" },
  headerTitle: { margin: 0, fontSize: "30px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" },
  headerSub: { margin: "8px 0 0 0", fontSize: "15px", color: "#64748b" },
  
  globalLockCard: (isGlobalLocked) => ({ 
    padding: "20px 28px", 
    borderRadius: "16px", 
    background: isGlobalLocked ? "#fff5f5" : "#f0fdf4",
    border: `1px solid ${isGlobalLocked ? "#fecaca" : "#bbf7d0"}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  }),
  globalLockLabel: { fontWeight: "700", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" },
  globalLockTextFlex: { display: "flex", flexDirection: "column" },
  globalLockStatusText: (isGlobalLocked) => ({ fontSize: "14px", color: isGlobalLocked ? "#991b1b" : "#166534", letterSpacing: "0.5px", fontWeight: "800" }),
  globalLockDescText: (isGlobalLocked) => ({ fontSize: "12px", fontWeight: "500", color: isGlobalLocked ? "#dc2626" : "#15803d", opacity: 0.8, marginTop: "4px" }),
  
  tableCard: { background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", overflow: "hidden" },
  tableResponsive: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  theadRow: { backgroundColor: "#f1f5f9" },
  headerCell: { padding: "20px 24px", textAlign: "left", verticalAlign: "top", borderBottom: "2px solid #cbd5e1" },
  playerOverviewSpan: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#475569", fontWeight: "700" },
  phaseTitle: { fontSize: "16px", color: "#0f172a", fontWeight: "800" },
  phaseControlFlex: { marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" },
  
  label: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "all 0.2s ease" },
  activeLabel: (isActive) => ({ color: isActive ? "#2563eb" : "#64748b" }),
  submittedLabel: (isSubmitted) => ({
    color: isSubmitted ? "#e11d48" : "#64748b",
    backgroundColor: isSubmitted ? "#fff1f2" : "transparent",
    padding: isSubmitted ? "4px 8px" : "4px 0",
    borderRadius: "6px"
  }),
  
  checkboxGlobal: { width: "22px", height: "22px", cursor: "pointer", accentColor: "#dc2626" },
  checkboxRow: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" },
  
  playerRow: (index) => ({ backgroundColor: index % 2 === 0 ? "white" : "#f8fafc", transition: "background-color 0.15s ease" }),
  playerCell: { padding: "20px 24px", borderBottom: "1px solid #e2e8f0" },
  playerFlex: { display: "flex", alignItems: "center", gap: "16px" },
  playerNameFlex: { display: "flex", alignItems: "center", gap: "8px" },
  playerNameText: (color) => ({ fontWeight: "800", color: color === "#000000" ? "#0f172a" : color, fontSize: "15px" }),
  
  statusCell: { padding: "18px 20px", textAlign: "center", borderLeft: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  badgeTextMatches: { fontSize: "13px", fontWeight: "700", color: "#334155" },
  badgeTextSub: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  badgeStatusLabel: (textColor) => ({ fontSize: "11px", fontWeight: "800", marginTop: "2px", letterSpacing: "0.5px", color: textColor }),
  
  spinner: { width: "44px", height: "44px", border: "4px solid #f3f3f3", borderTop: "4px solid #3b82f6", borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite" }
};

// Berechnet dynamisch die Badge-Konfigurationen im Admin-Center
export const getAdminBadgeConfig = (isSubmitted, isDone) => {
  const baseStyle = { display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px 16px", borderRadius: "12px", minWidth: "115px", transition: "all 0.2s ease" };
  
  if (isSubmitted) {
    return {
      style: { ...baseStyle, background: "#f5f3ff", border: "1px solid #d8b4fe", boxShadow: "0 2px 6px rgba(107,33,168,0.06)" },
      textColor: "#6b21a8",
      label: "🚀 ABGEGEBEN"
    };
  }
  if (isDone) {
    return {
      style: { ...baseStyle, background: "#f0fdf4", border: "1px solid #bbf7d0", boxShadow: "0 2px 6px rgba(34,197,94,0.04)" },
      textColor: "#166534",
      label: "✅ FERTIG"
    };
  }
  return {
    style: { ...baseStyle, background: "#fafafa", border: "1px solid #e2e8f0", boxShadow: "none" },
    textColor: "#64748b",
    label: "⏳ OFFEN"
  };
};

// CSS Keyframes Injektion absichern
if (typeof document !== "undefined") {
  const animId = "spin-animation-global";
  if (!document.getElementById(animId)) {
    const style = document.createElement("style");
    style.id = animId;
    style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

export const TIPPS_PAGE_STYLES = {
  container: { padding: "20px", width: "max-content", minWidth: "100%", position: "relative" },
  headerBar: { display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: "20px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" },
  headerTitle: { margin: 0, color: "#0f172a", marginRight: "30px" },
  statusWrapper: { display: "flex", alignItems: "center", gap: "32px" },
  
  // Status Banner & Buttons
  bannerSuccess: { padding: "8px 16px", borderRadius: "8px", backgroundColor: "#dcfce7", color: "#15803d", fontWeight: "700", fontSize: "14px", border: "1px solid #bbf7d0" },
  bannerLocked: { padding: "8px 16px", borderRadius: "8px", backgroundColor: "#fee2e2", color: "#b91c1c", fontWeight: "700", fontSize: "14px", border: "1px solid #fca5a5" },
  bannerError: { color: "#dc2626", fontWeight: "600", fontSize: "13px", padding: "8px 12px", border: "1px dashed #fca5a5", borderRadius: "8px", backgroundColor: "#fff5f5" },
  submitButton: { padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#22c55e", color: "white", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  
  // Layout Grid
  contentGrid: { display: "flex", flexDirection: "row", gap: "40px", alignItems: "flex-start", width: "max-content", minWidth: "100%", paddingRight: "40px" },
  columnWidth: { flexShrink: 0, width: "fit-content" },
  
  // Sektionen
  groupPadding: { padding: "10px", marginBottom: "20px" },
  sectionTitle: { color: "#0f172a", fontSize: "1.3rem", fontWeight: "700", margin: "0 0 16px 0" },
  sectionTitleKO: { marginLeft: "20px", color: "#0f172a", fontSize: "1.3rem", fontWeight: "700" },
  groupGrid: { display: "flex", flexWrap: "wrap", gap: "30px", marginBottom: "40px", maxWidth: "1100px" },
  groupFrame: { position: 'relative' },
  thirdsPadding: { padding: "10px" },
  
  // KO Sektion
  koPadding: { padding: "10px" },
  koWarning: { marginLeft: "20px", marginBottom: "15px", color: "#eab308", fontWeight: "600", fontSize: "14px", backgroundColor: "#fef08a", padding: "8px 12px", borderRadius: "8px", border: "1px solid #fde047", maxWidth: "500px" },
  koFlex: { display: "flex", flexDirection: "row", alignItems: "flex-start" },
  lockedGlobal: { padding: "100px", textAlign: "center", color: "#94a3b8" },
  
  // Modal
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, backdropFilter: "blur(4px)" },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "16px", width: "420px", textAlign: "center" },
  modalEmoji: { fontSize: "40px", marginBottom: "12px" },
  modalTitle: { margin: "0 0 10px 0", color: "#0f172a", fontSize: "18px", fontWeight: "700" },
  modalText: { margin: "0 0 24px 0", color: "#475569", fontSize: "14px", lineHeight: "1.5" },
  modalActions: { display: "flex", gap: "12px", justifyContent: "center" },
  modalBtnCancel: { padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  modalBtnConfirm: { padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: "#22c55e", color: "white", cursor: "pointer", fontWeight: "600", fontSize: "13px" }
};