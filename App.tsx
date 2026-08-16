import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, SafeAreaView, StatusBar, Text, TouchableOpacity } from "react-native";
import { Header } from "./src/components/Header";
import { GatePalette } from "./src/components/GatePalette";
import { CircuitCanvas } from "./src/components/CircuitCanvas";
import { StateInspector } from "./src/components/StateInspector";
import { PresetsModal } from "./src/components/PresetsModal";
import { Circuit, CircuitGate, simulateCircuit } from "./src/engine/quantumState";
import { GATE_DEFS } from "./src/engine/quantumGates";
import { toggleGateExpansion, deleteGateFromCircuit } from "./src/engine/decompositions";
import { Sliders, LayoutGrid, Eye } from "lucide-react-native";

type ActiveView = "gates" | "circuit" | "inspector";

export default function App() {
  const [numQubits, setNumQubits] = useState(4);
  const [selectedGateId, setSelectedGateId] = useState<string | null>("H");
  const [selectedStep, setSelectedStep] = useState<number>(-1);
  const [modalMode, setModalMode] = useState<"presets" | "qasm" | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("circuit");
  // Two-click placement state for CX, CZ, SWAP — first click = control/source, second click = target
  const [twoQubitPending, setTwoQubitPending] = useState<{ qubit: number; step: number; gateId: string } | null>(null);

  // Default Circuit: Bell Pair + Hadamard
  const [circuit, setCircuit] = useState<Circuit>({
    numQubits: 4,
    gates: [
      { id: "g0", gateId: "H", qubit: 0, step: 0 },
      { id: "g1", gateId: "CX", qubit: 0, targetQubit: 1, step: 1 },
      { id: "g2", gateId: "CZ", qubit: 2, targetQubit: 3, step: 2 },
    ],
  });

  // Calculate step-by-step quantum state simulation using Nielsen & Chuang linear algebra
  const simulationSteps = useMemo(() => {
    return simulateCircuit(circuit, 16);
  }, [circuit]);

  // Current inspected step state
  const inspectedStepState = useMemo(() => {
    // selectedStep ranges from -1 to 15
    const match = simulationSteps.find((s) => s.step === selectedStep);
    return match || simulationSteps[0];
  }, [simulationSteps, selectedStep]);

  // Handle Qubit count change
  const handleSelectQubits = (n: number) => {
    setNumQubits(n);
    setCircuit((prev) => ({
      numQubits: n,
      gates: prev.gates.filter((g) => g.qubit < n && (g.targetQubit === undefined || g.targetQubit < n)),
    }));
  };

  // Place gate on slot
  const handleSlotClick = useCallback((qubit: number, step: number) => {
    if (!selectedGateId) return;

    const gDef = GATE_DEFS[selectedGateId];
    if (!gDef) return;

    // --- Two-click placement for CX, CZ and SWAP ---
    const isTwoClickGate = selectedGateId === "SWAP" || selectedGateId === "CX" || selectedGateId === "CZ";
    if (isTwoClickGate) {
      if (twoQubitPending === null) {
        // First click: record control/source qubit & step
        setTwoQubitPending({ qubit, step, gateId: selectedGateId });
        return;
      } else {
        // Second click: finalize gate between twoQubitPending and current slot
        const srcQ = twoQubitPending.qubit;
        const tgtQ = qubit;
        const srcStep = twoQubitPending.step;
        // Must be same time step, different qubit
        if (srcQ !== tgtQ && srcStep === step) {
          // SWAP is symmetric — store lower as qubit; CX/CZ preserve click order (ctrl then target)
          const isSWAP = selectedGateId === "SWAP";
          const ctrlQ = isSWAP ? Math.min(srcQ, tgtQ) : srcQ;
          const tgtQFinal = isSWAP ? Math.max(srcQ, tgtQ) : tgtQ;

          const newGate: CircuitGate = {
            id: `gate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            gateId: selectedGateId,
            qubit: ctrlQ,
            targetQubit: tgtQFinal,
            step,
            isExpanded: false,
          };

          // Remove any existing gates occupying either qubit wire at this step
          const filteredGates = circuit.gates.filter(
            (g) => !(g.step === step && (
              g.qubit === ctrlQ || g.qubit === tgtQFinal ||
              g.targetQubit === ctrlQ || g.targetQubit === tgtQFinal
            ))
          );
          setCircuit((prev) => ({ ...prev, gates: [...filteredGates, newGate] }));
          setSelectedStep(step);
        }
        setTwoQubitPending(null);
        return;
      }
    }

    // Cancel any pending two-qubit op when a different gate is placed
    if (twoQubitPending !== null) setTwoQubitPending(null);

    let startQubit = qubit;
    let targetQubit: number | undefined = undefined;

    if (gDef.numQubits > 2) {
      startQubit = 0;
      targetQubit = Math.min(numQubits - 1, gDef.numQubits - 1);
    }

    const newGate: CircuitGate = {
      id: `gate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gateId: selectedGateId,
      qubit: startQubit,
      targetQubit,
      step,
      isExpanded: false,
    };

    // Remove any existing gate at same qubit & step
    const filteredGates = circuit.gates.filter((g) => !(g.qubit === qubit && g.step === step));

    setCircuit((prev) => ({
      ...prev,
      gates: [...filteredGates, newGate],
    }));

    // Auto update selected step for real-time inspection
    setSelectedStep(step);
  }, [selectedGateId, twoQubitPending, circuit, numQubits]);

  // Toggle composed gate expansion
  const handleToggleExpand = (gateId: string) => {
    setCircuit((prev) => toggleGateExpansion(prev, gateId));
  };

  // Delete gate
  const handleDeleteGate = (gateId: string) => {
    setCircuit((prev) => deleteGateFromCircuit(prev, gateId));
  };

  // Clear circuit
  const handleClear = () => {
    setCircuit({
      numQubits,
      gates: [],
    });
    setSelectedStep(-1);
  };

  // Reset initial state
  const handleResetState = () => {
    setSelectedStep(-1);
  };

  // Load Preset or QASM circuit
  const handleLoadCircuit = (newCircuit: Circuit) => {
    setNumQubits(newCircuit.numQubits);
    setCircuit(newCircuit);
    setSelectedStep(newCircuit.gates.length > 0 ? 0 : -1);
  };

  // Selecting a gate jumps straight to the Circuit tab so placing it is a single next tap.
  const handleSelectGate = useCallback((id: string) => {
    setSelectedGateId(id);
    setActiveView("circuit");
  }, []);

  const selectedGateDef = selectedGateId ? GATE_DEFS[selectedGateId] : null;
  const isTwoClickGate = selectedGateId === "CX" || selectedGateId === "CZ" || selectedGateId === "SWAP";

  let statusText = "Pick a gate from the Gates tab to begin building your circuit.";
  if (selectedGateDef) {
    if (isTwoClickGate) {
      statusText = twoQubitPending
        ? `${selectedGateDef.name} — Step 2/2: tap the target qubit in the same column`
        : `${selectedGateDef.name} — Step 1/2: tap the control qubit wire on the Circuit tab`;
    } else {
      statusText = `${selectedGateDef.name} selected — tap a wire slot on the Circuit tab to place it`;
    }
  }

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <Header
        numQubits={numQubits}
        onSelectQubits={handleSelectQubits}
        onClear={handleClear}
        onResetState={handleResetState}
        onOpenQASM={() => setModalMode("qasm")}
        onOpenPresets={() => setModalMode("presets")}
        selectedStep={selectedStep}
      />

      {/* Persistent selection status — always visible so the two-click gate flow stays legible across tabs */}
      <TouchableOpacity
        style={styles.statusBar}
        activeOpacity={selectedGateDef ? 0.7 : 1}
        disabled={!selectedGateDef}
        onPress={() => setActiveView("circuit")}
      >
        {selectedGateDef && (
          <View style={[styles.statusGateBadge, { backgroundColor: selectedGateDef.color }]}>
            <Text style={styles.statusGateBadgeText}>{selectedGateDef.symbol}</Text>
          </View>
        )}
        <Text style={styles.statusText} numberOfLines={1}>{statusText}</Text>
      </TouchableOpacity>

      {/* Active View: exactly one of Gates / Circuit / Inspector is shown at a time */}
      <View style={styles.contentArea}>
        {activeView === "gates" && (
          <GatePalette
            selectedGateId={selectedGateId}
            onSelectGate={handleSelectGate}
          />
        )}

        {activeView === "circuit" && (
          <CircuitCanvas
            circuit={circuit}
            selectedGateId={selectedGateId}
            selectedStep={selectedStep}
            twoQubitPending={twoQubitPending}
            onSelectStep={(s) => setSelectedStep(s)}
            onSlotClick={handleSlotClick}
            onGateClick={(g) => setSelectedStep(g.step)}
            onToggleExpand={handleToggleExpand}
            onDeleteGate={handleDeleteGate}
          />
        )}

        {activeView === "inspector" && (
          <StateInspector
            stepState={inspectedStepState}
            numQubits={numQubits}
          />
        )}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBarBtn, activeView === "gates" && styles.tabBarBtnActive]}
          onPress={() => setActiveView("gates")}
        >
          <Sliders size={20} color={activeView === "gates" ? "#38bdf8" : "#94a3b8"} />
          <Text style={[styles.tabBarLabel, activeView === "gates" && styles.tabBarLabelActive]}>Gates</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarBtn, activeView === "circuit" && styles.tabBarBtnActive]}
          onPress={() => setActiveView("circuit")}
        >
          <LayoutGrid size={20} color={activeView === "circuit" ? "#38bdf8" : "#94a3b8"} />
          <Text style={[styles.tabBarLabel, activeView === "circuit" && styles.tabBarLabelActive]}>Circuit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarBtn, activeView === "inspector" && styles.tabBarBtnActive]}
          onPress={() => setActiveView("inspector")}
        >
          <Eye size={20} color={activeView === "inspector" ? "#38bdf8" : "#94a3b8"} />
          <Text style={[styles.tabBarLabel, activeView === "inspector" && styles.tabBarLabelActive]}>Inspector</Text>
        </TouchableOpacity>
      </View>

      {/* Presets & QASM Modal */}
      <PresetsModal
        visible={modalMode !== null}
        mode={modalMode || "presets"}
        onClose={() => setModalMode(null)}
        onLoadCircuit={handleLoadCircuit}
        currentCircuit={circuit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 189, 248, 0.2)",
  },
  statusGateBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statusGateBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  statusText: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  contentArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(56, 189, 248, 0.2)",
    paddingBottom: 4,
  },
  tabBarBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "transparent",
  },
  tabBarBtnActive: {
    borderTopColor: "#38bdf8",
  },
  tabBarLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  tabBarLabelActive: {
    color: "#38bdf8",
  },
});
