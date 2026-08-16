import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { StepState, ReducedState } from "../engine/quantumState";
import { formatComplex, cMagSq } from "../engine/complex";
import { Svg, Circle, Line, Text as SvgText, Path, Rect } from "react-native-svg";
import { Eye, Grid, Globe, BookOpen, Layers } from "lucide-react-native";

interface StateInspectorProps {
  stepState: StepState;
  numQubits: number;
}

export const StateInspector: React.FC<StateInspectorProps> = ({
  stepState,
  numQubits,
}) => {
  const [activeTab, setActiveTab] = useState<"statevector" | "density" | "bloch" | "math">("statevector");
  const [densityMode, setDensityMode] = useState<"real" | "imag">("real");

  const numStates = 1 << numQubits;

  // Convert state index to binary string representation |0000>
  const toBinaryString = (idx: number) => {
    return idx.toString(2).padStart(numQubits, "0");
  };

  return (
    <View style={styles.inspectorContainer}>
      {/* Tab Navigation Header */}
      <View style={styles.tabHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.inspectorTitle}>State Inspector</Text>
          <Text style={styles.stepBadgeText}>
            {stepState.step === -1 ? "Initial State (t=-1)" : `Time Step t=${stepState.step}`}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabButtonsGroup}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "statevector" && styles.tabBtnActive]}
              onPress={() => setActiveTab("statevector")}
            >
              <Eye size={14} color={activeTab === "statevector" ? "#38bdf8" : "#94a3b8"} />
              <Text style={[styles.tabBtnText, activeTab === "statevector" && styles.tabBtnTextActive]}>
                Statevector |ψ⟩
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "density" && styles.tabBtnActive]}
              onPress={() => setActiveTab("density")}
            >
              <Grid size={14} color={activeTab === "density" ? "#38bdf8" : "#94a3b8"} />
              <Text style={[styles.tabBtnText, activeTab === "density" && styles.tabBtnTextActive]}>
                Density Matrix ρ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "bloch" && styles.tabBtnActive]}
              onPress={() => setActiveTab("bloch")}
            >
              <Globe size={14} color={activeTab === "bloch" ? "#38bdf8" : "#94a3b8"} />
              <Text style={[styles.tabBtnText, activeTab === "bloch" && styles.tabBtnTextActive]}>
                Bloch Spheres
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "math" && styles.tabBtnActive]}
              onPress={() => setActiveTab("math")}
            >
              <BookOpen size={14} color={activeTab === "math" ? "#38bdf8" : "#94a3b8"} />
              <Text style={[styles.tabBtnText, activeTab === "math" && styles.tabBtnTextActive]}>
                Nielsen & Chuang Math
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Tab Contents */}
      <View style={styles.tabContentArea}>
        {/* --- TAB 1: STATE VECTOR --- */}
        {activeTab === "statevector" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            <View style={styles.stateVectorGrid}>
              {Array.from({ length: numStates }, (_, i) => {
                const coeff = stepState.stateVector[i];
                const prob = stepState.probabilities[i];
                const phase = stepState.phases[i];
                const basisStr = `|${toBinaryString(i)}⟩`;
                const coeffStr = formatComplex(coeff);

                // Phase clock pointer coordinates
                const radius = 16;
                const cx = 22;
                const cy = 22;
                const px = cx + radius * Math.cos(phase);
                const py = cy - radius * Math.sin(phase);

                return (
                  <View key={i} style={[styles.basisStateCard, prob > 0.001 && styles.basisStateCardActive]}>
                    <Text style={styles.basisText}>{basisStr}</Text>

                    {/* Phase Clock Dial */}
                    <View style={styles.phaseClockBox}>
                      <Svg width={44} height={44}>
                        <Circle cx={cx} cy={cy} r={radius} stroke="rgba(56, 189, 248, 0.4)" strokeWidth={1.5} fill="rgba(15, 23, 42, 0.6)" />
                        <Line x1={cx} y1={cy} x2={px} y2={py} stroke="#38bdf8" strokeWidth={2.5} />
                        <Circle cx={cx} cy={cy} r={2.5} fill="#38bdf8" />
                      </Svg>
                    </View>

                    <Text style={styles.coeffText}>{coeffStr}</Text>

                    {/* Probability Bar */}
                    <View style={styles.probBarTrack}>
                      <View style={[styles.probBarFill, { width: `${Math.min(100, prob * 100)}%` }]} />
                    </View>

                    <Text style={styles.probText}>P = {(prob * 100).toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* --- TAB 2: DENSITY MATRIX HEATMAP --- */}
        {activeTab === "density" && (
          <View style={styles.densityContainer}>
            <View style={styles.densityControlsRow}>
              <Text style={styles.subTitleText}>Full Density Matrix ρ ({numStates}×{numStates})</Text>

              <View style={styles.modeToggleGroup}>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, densityMode === "real" && styles.modeToggleBtnActive]}
                  onPress={() => setDensityMode("real")}
                >
                  <Text style={styles.modeToggleText}>Re(ρ)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, densityMode === "imag" && styles.modeToggleBtnActive]}
                  onPress={() => setDensityMode("imag")}
                >
                  <Text style={styles.modeToggleText}>Im(ρ)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
              <View style={styles.matrixHeatmapTable}>
                {stepState.densityMatrix.slice(0, numStates).map((row, r) => (
                  <View key={r} style={styles.heatmapRow}>
                    {row.slice(0, numStates).map((val, c) => {
                      const numVal = densityMode === "real" ? val.re : val.im;
                      const absVal = Math.abs(numVal);

                      // Heatmap color intensity
                      let bg = "rgba(30, 41, 59, 0.4)";
                      if (numVal > 0.01) bg = `rgba(56, 189, 248, ${Math.min(0.9, 0.15 + absVal * 0.75)})`;
                      else if (numVal < -0.01) bg = `rgba(244, 63, 94, ${Math.min(0.9, 0.15 + absVal * 0.75)})`;

                      return (
                        <View key={c} style={[styles.heatmapCell, { backgroundColor: bg }]}>
                          <Text style={styles.cellValText}>
                            {absVal < 0.001 ? "0" : numVal.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* --- TAB 3: BLOCH SPHERES --- */}
        {activeTab === "bloch" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            <View style={styles.blochRow}>
              {stepState.reducedStates.map((red) => {
                // Render 2D projected Bloch Sphere with vector rx, ry, rz
                const rNorm = Math.hypot(red.rx, red.ry, red.rz);
                const rzNorm = red.rz;
                const rxNorm = red.rx;

                const center = 45;
                const r = 32;

                const tipX = center + r * rxNorm;
                const tipY = center - r * rzNorm;

                return (
                  <View key={red.qubit} style={styles.blochCard}>
                    <Text style={styles.blochQubitTitle}>Qubit q[{red.qubit}]</Text>

                    <Svg width={90} height={90}>
                      {/* Sphere Circle */}
                      <Circle cx={center} cy={center} r={r} stroke="rgba(56, 189, 248, 0.5)" strokeWidth={1.5} fill="rgba(15, 23, 42, 0.7)" />
                      {/* Equator Ellipse */}
                      <Path d={`M ${center - r} ${center} A ${r} ${r / 3} 0 0 0 ${center + r} ${center}`} stroke="rgba(148, 163, 184, 0.3)" strokeDasharray="3,3" fill="none" />
                      {/* Axes */}
                      <Line x1={center} y1={center - r - 4} x2={center} y2={center + r + 4} stroke="rgba(148, 163, 184, 0.4)" strokeWidth={1} />
                      <Line x1={center - r - 4} y1={center} x2={center + r + 4} y2={center} stroke="rgba(148, 163, 184, 0.4)" strokeWidth={1} />
                      {/* Bloch Vector Arrow */}
                      <Line x1={center} y1={center} x2={tipX} y2={tipY} stroke="#38bdf8" strokeWidth={2.5} />
                      <Circle cx={tipX} cy={tipY} r={3} fill="#38bdf8" />
                    </Svg>

                    <View style={styles.vectorMetricsBlock}>
                      <Text style={styles.metricText}>
                        rx: <Text style={styles.metricVal}>{red.rx.toFixed(3)}</Text>
                      </Text>
                      <Text style={styles.metricText}>
                        ry: <Text style={styles.metricVal}>{red.ry.toFixed(3)}</Text>
                      </Text>
                      <Text style={styles.metricText}>
                        rz: <Text style={styles.metricVal}>{red.rz.toFixed(3)}</Text>
                      </Text>
                      <Text style={styles.metricText}>
                        Purity γ: <Text style={styles.metricVal}>{red.purity.toFixed(3)}</Text>
                      </Text>
                      <Text style={styles.metricText}>
                        Entropy S: <Text style={styles.metricVal}>{red.entropy.toFixed(3)}</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* --- TAB 4: NIELSEN & CHUANG MATH FORMULAS --- */}
        {activeTab === "math" && (
          <ScrollView style={styles.mathContainer}>
            <View style={styles.mathCard}>
              <Text style={styles.mathHeading}>State Vector Expansion (Nielsen & Chuang Eq 2.76):</Text>
              <Text style={styles.mathFormulaText}>
                |ψ⟩ ={" "}
                {stepState.stateVector
                  .map((c, i) => {
                    const magSq = cMagSq(c);
                    if (magSq < 1e-4) return null;
                    const cStr = formatComplex(c);
                    return `(${cStr})|${toBinaryString(i)}⟩`;
                  })
                  .filter(Boolean)
                  .join(" + ")}
              </Text>
            </View>

            <View style={styles.mathCard}>
              <Text style={styles.mathHeading}>Density Operator Definition (Eq 2.95):</Text>
              <Text style={styles.mathFormulaText}>
                ρ = |ψ⟩⟨ψ| = ∑_{'{i,j}'} α_i α_j* |i⟩⟨j|
              </Text>
              <Text style={styles.mathSubtext}>
                Tr(ρ) = 1.000 | Purity Tr(ρ²) ={" "}
                {(
                  stepState.densityMatrix.reduce((acc, row, r) => acc + cMagSq(row[r]), 0)
                ).toFixed(3)}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inspectorContainer: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    flexDirection: "column",
  },
  tabHeaderRow: {
    flexDirection: "column",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inspectorTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },
  stepBadgeText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tabButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  tabBtnText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#38bdf8",
  },
  tabContentArea: {
    flex: 1,
    padding: 10,
  },
  hScrollContent: {
    alignItems: "flex-start",
  },
  stateVectorGrid: {
    flexDirection: "row",
    gap: 8,
  },
  basisStateCard: {
    width: 96,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  basisStateCardActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#38bdf8",
  },
  basisText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "800",
  },
  phaseClockBox: {
    marginVertical: 4,
  },
  coeffText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  probBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 4,
  },
  probBarFill: {
    height: "100%",
    backgroundColor: "#38bdf8",
  },
  probText: {
    color: "#cbd5e1",
    fontSize: 9,
    fontWeight: "600",
  },
  densityContainer: {
    flex: 1,
  },
  densityControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subTitleText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  modeToggleGroup: {
    flexDirection: "row",
    gap: 4,
  },
  modeToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  modeToggleBtnActive: {
    backgroundColor: "#38bdf8",
  },
  modeToggleText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "700",
  },
  matrixHeatmapTable: {
    flexDirection: "column",
    gap: 2,
  },
  heatmapRow: {
    flexDirection: "row",
    gap: 2,
  },
  heatmapCell: {
    width: 38,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  cellValText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  blochRow: {
    flexDirection: "row",
    gap: 12,
  },
  blochCard: {
    width: 140,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  blochQubitTitle: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  vectorMetricsBlock: {
    width: "100%",
    marginTop: 6,
    gap: 2,
  },
  metricText: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "500",
  },
  metricVal: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  mathContainer: {
    flex: 1,
  },
  mathCard: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  mathHeading: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  mathFormulaText: {
    color: "#f8fafc",
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  mathSubtext: {
    color: "#cbd5e1",
    fontSize: 10,
    marginTop: 4,
  },
});
