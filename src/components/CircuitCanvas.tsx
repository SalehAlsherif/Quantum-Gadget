import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Circuit, CircuitGate, expandCircuitGate } from "../engine/quantumState";
import { GATE_DEFS } from "../engine/quantumGates";
import { Maximize2, Minimize2, Trash2 } from "lucide-react-native";
import { Svg, Line } from "react-native-svg";

interface CircuitCanvasProps {
  circuit: Circuit;
  selectedGateId: string | null;
  selectedStep: number;
  twoQubitPending?: { qubit: number; step: number; gateId: string } | null;
  onSelectStep: (step: number) => void;
  onSlotClick: (qubit: number, step: number) => void;
  onGateClick: (gate: CircuitGate) => void;
  onToggleExpand: (gateId: string) => void;
  onDeleteGate: (gateId: string) => void;
  MAX_STEPS?: number;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  circuit,
  selectedGateId,
  selectedStep,
  twoQubitPending,
  onSelectStep,
  onSlotClick,
  onGateClick,
  onToggleExpand,
  onDeleteGate,
  MAX_STEPS = 16,
}) => {
  const steps = Array.from({ length: MAX_STEPS }, (_, i) => i);
  const qubits = Array.from({ length: circuit.numQubits }, (_, i) => i);

  const rowHeight = 72; // Vertical wire row spacing
  const stepWidth = 54;  // Step column width
  const leftOffset = 76; // Left margin for qubit labels
  const topOffset = 0;   // Qubit rows start flush at the top of the grid — no extra offset

  // Track expanded gate boxes & collapsed macro boxes
  const expandedGateBoxes: {
    parentGate: CircuitGate;
    subGates: CircuitGate[];
    startStep: number;
    endStep: number;
    minQubit: number;
    maxQubit: number;
  }[] = [];

  const collapsedMacroBoxes: {
    gate: CircuitGate;
    minQubit: number;
    maxQubit: number;
    step: number;
  }[] = [];

  const gridMap: Record<string, { gate: CircuitGate; isSubGate?: boolean; parentId?: string }> = {};
  const twoQubitConnections: {
    gate: CircuitGate;
    step: number;
    ctrlQubit: number;
    tgtQubit: number;
    color: string;
  }[] = [];

  circuit.gates.forEach((g) => {
    const gDef = GATE_DEFS[g.gateId];
    if (g.isExpanded && gDef?.isComposed) {
      const subGates = expandCircuitGate(g);
      if (subGates.length > 0) {
        const startStep = g.step;
        const endStep = g.step + subGates.length - 1;
        let minQ = g.qubit;
        let maxQ = g.targetQubit !== undefined ? g.targetQubit : g.qubit;

        subGates.forEach((sg) => {
          if (sg.qubit < minQ) minQ = sg.qubit;
          if (sg.qubit > maxQ) maxQ = sg.qubit;
          if (sg.targetQubit !== undefined) {
            if (sg.targetQubit < minQ) minQ = sg.targetQubit;
            if (sg.targetQubit > maxQ) maxQ = sg.targetQubit;

            twoQubitConnections.push({
              gate: sg,
              step: sg.step,
              ctrlQubit: sg.qubit,
              tgtQubit: sg.targetQubit,
              color: GATE_DEFS[sg.gateId]?.color ?? "#06b6d4",
            });
          }

          gridMap[`${sg.qubit}_${sg.step}`] = { gate: sg, isSubGate: true, parentId: g.id };
          if (sg.targetQubit !== undefined) {
            gridMap[`${sg.targetQubit}_${sg.step}`] = { gate: sg, isSubGate: true, parentId: g.id };
          }
        });

        expandedGateBoxes.push({
          parentGate: g,
          subGates,
          startStep,
          endStep,
          minQubit: minQ,
          maxQubit: maxQ,
        });
      }
    } else if (!g.isExpanded && gDef?.isComposed) {
      // CZ and SWAP render as direct symbolic 2-qubit gates (●/Z and ✕/✕)
      // so they use the same twoQubitConnections + gridMap path as CX.
      // All other composed macros (GHZ, BELL, etc.) use the coloured block overlay.
      const isSymbolicTwoQubit = g.gateId === "CZ" || g.gateId === "SWAP";

      if (isSymbolicTwoQubit && g.targetQubit !== undefined) {
        gridMap[`${g.qubit}_${g.step}`] = { gate: g, isSubGate: false };
        gridMap[`${g.targetQubit}_${g.step}`] = { gate: g, isSubGate: false };
        twoQubitConnections.push({
          gate: g,
          step: g.step,
          ctrlQubit: g.qubit,
          tgtQubit: g.targetQubit,
          color: gDef?.color ?? "#06b6d4",
        });
      } else {
        // Collapsed multi-qubit macro block (e.g. GHZ, BELL)
        let minQ = g.qubit;
        let maxQ = g.targetQubit !== undefined ? g.targetQubit : g.qubit;

        collapsedMacroBoxes.push({
          gate: g,
          minQubit: minQ,
          maxQubit: maxQ,
          step: g.step,
        });

        for (let q = minQ; q <= maxQ; q++) {
          gridMap[`${q}_${g.step}`] = { gate: g, isSubGate: false };
        }
      }
    } else {
      // Direct elementary single- or two-qubit gate
      gridMap[`${g.qubit}_${g.step}`] = { gate: g, isSubGate: false };
      if (g.targetQubit !== undefined) {
        gridMap[`${g.targetQubit}_${g.step}`] = { gate: g, isSubGate: false };
        twoQubitConnections.push({
          gate: g,
          step: g.step,
          ctrlQubit: g.qubit,
          tgtQubit: g.targetQubit,
          color: gDef?.color ?? "#06b6d4",
        });
      }
    }
  });

  // Full circuit width (qubit label column + initial-state slot + every time step),
  // used to size the horizontal scroll content so every step stays reachable on narrow screens.
  const contentWidth = leftOffset + (steps.length + 1) * stepWidth;

  return (
    <View style={styles.canvasContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.horizontalScroll}>
    <View style={{ width: contentWidth }}>
      {/* Time Step Header / Scrubber */}
      <View style={styles.timelineHeaderRow}>
        <View style={styles.qubitLabelCorner}>
          <Text style={styles.wireText}>Wire / Time</Text>
        </View>

        {/* Step -1 (Initial State |0...0>) */}
        <TouchableOpacity
          style={[styles.stepHeaderCell, selectedStep === -1 && styles.stepHeaderCellActive]}
          onPress={() => onSelectStep(-1)}
        >
          <Text style={[styles.stepHeaderText, selectedStep === -1 && styles.stepHeaderTextActive]}>
            Start
          </Text>
          <Text style={styles.stepSubText}>|0000⟩</Text>
        </TouchableOpacity>

        {steps.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.stepHeaderCell, selectedStep === s && styles.stepHeaderCellActive]}
            onPress={() => onSelectStep(s)}
          >
            <Text style={[styles.stepHeaderText, selectedStep === s && styles.stepHeaderTextActive]}>
              t={s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Circuit Wires Grid */}
      <View style={styles.gridScrollView}>
        <View style={{ position: "relative", minHeight: qubits.length * rowHeight + 20 }}>
          {/* SVG Connector Lines Layer for 2-Qubit Direct Gates */}
          <Svg
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}
            pointerEvents="none"
          >
            {twoQubitConnections.map((conn, idx) => {
              const dir = conn.ctrlQubit < conn.tgtQubit ? 1 : -1;
              // Shorten line so it doesn't overlap control dot (~9px radius) or target symbol (~18px radius for circles, ~15px for SWAP ✕)
              const ctrlStop = 9;
              const tgtStop = conn.gate.gateId === "SWAP" ? 15 : 18;
              const x = leftOffset + (conn.step + 1) * stepWidth + stepWidth / 2;
              const y1 = topOffset + conn.ctrlQubit * rowHeight + rowHeight / 2 + dir * ctrlStop;
              const y2 = topOffset + conn.tgtQubit * rowHeight + rowHeight / 2 - dir * tgtStop;

              return (
                <Line
                  key={`conn_${idx}`}
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke={conn.color}
                  strokeWidth={3}
                />
              );
            })}
          </Svg>

          {/* Expanded Composed Gate Collapsible Box Overlays */}
          {expandedGateBoxes.map((box) => {
            const boxLeft = leftOffset + (box.startStep + 1) * stepWidth + 2;
            const boxWidth = (box.endStep - box.startStep + 1) * stepWidth - 4;
            const boxTop = topOffset + box.minQubit * rowHeight + 4;
            const boxHeight = (box.maxQubit - box.minQubit + 1) * rowHeight - 8;

            const parentDef = GATE_DEFS[box.parentGate.gateId];

            return (
              <View
                key={box.parentGate.id}
                pointerEvents="box-none"
                style={[
                  styles.collapsibleBoxOverlay,
                  {
                    left: boxLeft,
                    top: boxTop,
                    width: boxWidth,
                    height: boxHeight,
                    borderColor: parentDef?.color ?? "#14b8a6",
                  },
                ]}
              >
                {/* Header Badge with Collapse & Delete Buttons */}
                <View style={[styles.collapsibleBoxBadge, { backgroundColor: parentDef?.color ?? "#14b8a6" }]}>
                  <Text style={styles.collapsibleBadgeText}>
                    {box.parentGate.collapsedLabel || parentDef?.name || box.parentGate.gateId} (Decomposed)
                  </Text>
                  <TouchableOpacity
                    style={styles.collapseBtnInBadge}
                    onPress={() => onToggleExpand(box.parentGate.id)}
                  >
                    <Minimize2 size={12} color="#ffffff" />
                    <Text style={styles.collapseBtnText}>Collapse</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtnInBadge}
                    onPress={() => onDeleteGate(box.parentGate.id)}
                  >
                    <Trash2 size={12} color="#ffffff" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Collapsed Composed Gate Multi-Qubit Block Overlays (e.g. GHZ, BELL) */}
          {collapsedMacroBoxes.map((box) => {
            const g = box.gate;
            const gDef = GATE_DEFS[g.gateId];
            const boxLeft = leftOffset + (g.step + 1) * stepWidth + 4;
            const boxWidth = stepWidth - 8;
            const boxTop = topOffset + box.minQubit * rowHeight + (rowHeight - 44) / 2;
            const boxHeight = (box.maxQubit - box.minQubit) * rowHeight + 44;

            const symbolText = g.collapsedLabel || gDef?.symbol || g.gateId;
            const fontSize = symbolText.length <= 2 ? 14 : symbolText.length <= 4 ? 11 : 9;

            return (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.collapsedMacroBoxOverlay,
                  {
                    left: boxLeft,
                    top: boxTop,
                    width: boxWidth,
                    height: boxHeight,
                    backgroundColor: gDef?.color ?? "#c026d3",
                  },
                ]}
                onPress={() => onToggleExpand(g.id)}
              >
                <Text style={[styles.macroGateSymbolText, { fontSize }]}>
                  {symbolText}
                </Text>

                {/* Expand (+) Badge at Top-Right */}
                <View style={styles.expandBadgeOnMacro}>
                  <Maximize2 size={9} color="#ffffff" />
                </View>

                {/* Delete (Trash) Badge at Bottom-Right */}
                <TouchableOpacity
                  style={styles.deleteGateBtnOnMacro}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDeleteGate(g.id);
                  }}
                >
                  <Trash2 size={9} color="#ffffff" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Qubit Wires */}
          {qubits.map((q) => (
            <View key={q} style={[styles.wireRow, { height: rowHeight }]}>
              {/* Qubit Wire Header */}
              <View style={styles.qubitWireLabel}>
                <Text style={styles.qubitNameText}>q[{q}]</Text>
                <Text style={styles.qubitInitText}>|0⟩</Text>
              </View>

              {/* Wire Line & Slots */}
              <View style={styles.wireLineTrack}>
                {/* Background horizontal quantum wire line */}
                <View style={styles.horizontalWireLine} />

                {/* Slot -1 (Initial state scrubber) */}
                <TouchableOpacity
                  style={[styles.slotCell, selectedStep === -1 && styles.slotCellStepActive]}
                  onPress={() => onSelectStep(-1)}
                />

                {steps.map((s) => {
                  const entry = gridMap[`${q}_${s}`];
                  const isSelectedStep = selectedStep === s;
                  const gate = entry?.gate;
                  const gateDef = gate ? GATE_DEFS[gate.gateId] : null;

                  // If cell is covered by a collapsed macro box, render transparent slot
                  // CZ and SWAP are excluded — they render as symbolic gates (●/Z and ✕/✕) even when isComposed
                  const isSymbolicComposedGate = gate?.gateId === "CZ" || gate?.gateId === "SWAP";
                  const isCollapsedMacroCell = gate && !gate.isExpanded && gateDef?.isComposed && !isSymbolicComposedGate;

                  const numQubitsForGate = gateDef?.numQubits ?? (gate?.targetQubit !== undefined ? 2 : 1);
                  const isControlWire = gate && numQubitsForGate === 2 && gate.qubit === q;
                  const isTargetWire = gate && numQubitsForGate === 2 && gate.targetQubit === q;
                  const isSingleQubit = gate && numQubitsForGate === 1;

                  // Two-click pending highlights for CX, CZ, SWAP
                  const isTwoClickGate = selectedGateId === "SWAP" || selectedGateId === "CX" || selectedGateId === "CZ";
                  const pendingColor = selectedGateId ? (GATE_DEFS[selectedGateId]?.color ?? "#a855f7") : "#a855f7";
                  const isControlPendingSource = twoQubitPending != null && twoQubitPending.qubit === q && twoQubitPending.step === s;
                  const isValidTwoQubitTarget =
                    isTwoClickGate &&
                    twoQubitPending != null &&
                    twoQubitPending.step === s &&
                    twoQubitPending.qubit !== q &&
                    !gate;

                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.slotCell,
                        isSelectedStep && styles.slotCellStepActive,
                        isControlPendingSource && { backgroundColor: `${pendingColor}55`, borderWidth: 2, borderColor: pendingColor, borderRadius: 8 },
                        isValidTwoQubitTarget && { backgroundColor: `${pendingColor}25`, borderWidth: 1.5, borderColor: `${pendingColor}B0`, borderStyle: "dashed", borderRadius: 8 },
                      ]}
                      onPress={() => {
                        if (gate) {
                          // CZ and SWAP: tap on the symbolic representation opens gate info
                          // (expansion is triggered via the Expand badge, not the whole slot)
                          const isSymbolicComposed = (gate.gateId === "CZ" || gate.gateId === "SWAP") && !entry?.isSubGate;
                          if (gateDef?.isComposed && !entry?.isSubGate && !isSymbolicComposed) {
                            onToggleExpand(gate.id);
                          } else {
                            onGateClick(gate);
                          }
                        } else {
                          onSlotClick(q, s);
                        }
                      }}
                    >
                      {gate && !isCollapsedMacroCell ? (
                        <View pointerEvents="box-none" style={{ position: "relative", width: 46, height: 46, alignItems: "center", justifyContent: "center" }}>
                          {/* 1. Single Qubit Gate (Solid Box with symbol text: H, X, Y, Z, T, etc.) */}
                          {isSingleQubit && (() => {
                            const symbolText = gate.collapsedLabel || gateDef?.symbol || gate.gateId;
                            const symbolFontSize = symbolText.length <= 1 ? 16 : symbolText.length === 2 ? 13 : symbolText.length <= 4 ? 10 : 8;
                            return (
                              <View
                                style={[
                                  styles.gateBox,
                                  { backgroundColor: gateDef?.color ?? "#3b82f6" },
                                ]}
                              >
                                <Text style={[styles.gateSymbolText, { fontSize: symbolFontSize }]}>
                                  {symbolText}
                                </Text>

                                {!entry?.isSubGate && (
                                  <TouchableOpacity
                                    style={styles.deleteGateBtn}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      onDeleteGate(gate.id);
                                    }}
                                  >
                                    <Trash2 size={9} color="#ffffff" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })()}

                          {/* 2. Control Dot ● (source qubit for CX, CZ) or ✕ (SWAP source) */}
                          {isControlWire && (() => {
                            const isSWAP = gate.gateId === "SWAP";
                            const isComposedSymbolic = (gate.gateId === "CZ" || gate.gateId === "SWAP") && !entry?.isSubGate;
                            return (
                              <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
                                {isSWAP ? (
                                  // SWAP source: ✕ symbol in circle
                                  <View style={[styles.swapCrossNode, { borderColor: gateDef?.color ?? "#a855f7" }]}>
                                    <Text style={[styles.swapCrossText, { color: gateDef?.color ?? "#a855f7" }]}>✕</Text>
                                  </View>
                                ) : (
                                  // CX / CZ source: solid filled dot ●
                                  <View style={[styles.controlMereDot, { backgroundColor: gateDef?.color ?? "#06b6d4" }]} />
                                )}
                                {/* Expand badge for CZ / SWAP (tap to decompose) */}
                                {isComposedSymbolic && (
                                  <TouchableOpacity
                                    style={styles.expandBadgeOnSymbolicGate}
                                    onPress={(e) => { e.stopPropagation(); onToggleExpand(gate.id); }}
                                  >
                                    <Maximize2 size={8} color="#ffffff" />
                                  </TouchableOpacity>
                                )}
                                {!entry?.isSubGate && (
                                  <TouchableOpacity
                                    style={styles.deleteGateBtnOnControl}
                                    onPress={(e) => { e.stopPropagation(); onDeleteGate(gate.id); }}
                                  >
                                    <Trash2 size={7} color="#ffffff" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })()}

                          {/* 3. Target symbol (⊕ for CX, Z-circle for CZ, ✕ for SWAP) */}
                          {isTargetWire && (() => {
                            const isCX   = gate.gateId === "CX";
                            const isCZ   = gate.gateId === "CZ";
                            const isSWAP = gate.gateId === "SWAP";
                            return (
                              <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
                                {isCX && (
                                  // CNOT target: ⊕ parity symbol
                                  <View style={styles.cnotTargetCircle}>
                                    <Text style={styles.cnotTargetText}>⊕</Text>
                                  </View>
                                )}
                                {isCZ && (
                                  // CZ target: Z inside filled circle
                                  <View style={[styles.czTargetCircle, { backgroundColor: gateDef?.color ?? "#06b6d4" }]}>
                                    <Text style={styles.czTargetText}>Z</Text>
                                  </View>
                                )}
                                {isSWAP && (
                                  // SWAP target: ✕ symbol in circle
                                  <View style={[styles.swapCrossNode, { borderColor: gateDef?.color ?? "#a855f7" }]}>
                                    <Text style={[styles.swapCrossText, { color: gateDef?.color ?? "#a855f7" }]}>✕</Text>
                                  </View>
                                )}
                                {!isCX && !isCZ && !isSWAP && (
                                  // Fallback badge for other 2-qubit gates
                                  <View style={[styles.targetNodeBadge, { backgroundColor: gateDef?.color ?? "#06b6d4" }]}>
                                    <Text style={styles.targetNodeBadgeText}>{gate.gateId}</Text>
                                  </View>
                                )}
                                {!entry?.isSubGate && (
                                  <TouchableOpacity
                                    style={styles.deleteGateBtnOnTarget}
                                    onPress={(e) => { e.stopPropagation(); onDeleteGate(gate.id); }}
                                  >
                                    <Trash2 size={7} color="#ffffff" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })()}
                        </View>
                      ) : isCollapsedMacroCell ? null : (
                        <View style={styles.emptySlotDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    backgroundColor: "#0b1329",
    flexDirection: "column",
  },
  horizontalScroll: {
    flex: 1,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 189, 248, 0.2)",
    paddingVertical: 6,
  },
  qubitLabelCorner: {
    width: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  wireText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  stepHeaderCell: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  stepHeaderCellActive: {
    backgroundColor: "rgba(56, 189, 248, 0.25)",
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  stepHeaderText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  stepHeaderTextActive: {
    color: "#38bdf8",
  },
  stepSubText: {
    color: "#64748b",
    fontSize: 8,
  },
  gridScrollView: {
    paddingVertical: 10,
  },
  wireRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 72,
  },
  qubitWireLabel: {
    width: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  qubitNameText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "800",
  },
  qubitInitText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  wireLineTrack: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    flex: 1,
  },
  horizontalWireLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(56, 189, 248, 0.35)",
    zIndex: 1,
  },
  slotCell: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    marginHorizontal: 1,
    borderRadius: 8,
  },
  slotCellStepActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  emptySlotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(56, 189, 248, 0.3)",
  },
  gateBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  controlMereDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
    position: "relative",
  },
  deleteGateBtnOnControl: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  deleteGateBtnOnTarget: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    borderRadius: 7,
    width: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  targetNodeBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    position: "relative",
  },
  targetNodeBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  gateSymbolText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  deleteGateBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
    elevation: 5,
    zIndex: 20,
  },
  collapsibleBoxOverlay: {
    position: "absolute",
    zIndex: 4,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  collapsibleBoxBadge: {
    position: "absolute",
    top: -12,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  collapsibleBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  collapseBtnInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  collapseBtnText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  deleteBtnInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(225, 29, 72, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteBtnText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  collapsedMacroBoxOverlay: {
    position: "absolute",
    zIndex: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  macroGateSymbolText: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
  },
  expandBadgeOnMacro: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 6,
    padding: 3,
  },
  deleteGateBtnOnMacro: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 6,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  // CNOT target: ⊕ open circle with plus inside
  cnotTargetCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "#06b6d4",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  cnotTargetText: {
    color: "#06b6d4",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  // CZ target: Z inside a solid filled circle
  czTargetCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  czTargetText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  // SWAP nodes: ✕ in a transparent circle outline
  swapCrossNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  swapCrossText: {
    fontSize: 16,
    fontWeight: "900",
  },
  // Expand badge on the control node of symbolic composed gates (CZ, SWAP)
  expandBadgeOnSymbolicGate: {
    position: "absolute",
    top: -10,
    left: -10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 5,
    padding: 2,
    zIndex: 20,
  },
  // SWAP two-click pending highlight: source slot (first click)
  slotCellSwapPending: {
    backgroundColor: "rgba(168, 85, 247, 0.35)",
    borderWidth: 2,
    borderColor: "#a855f7",
    borderRadius: 8,
  },
  // SWAP two-click pending highlight: valid target slot (awaiting second click)
  slotCellSwapTarget: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(168, 85, 247, 0.7)",
    borderStyle: "dashed",
    borderRadius: 8,
  },
});

