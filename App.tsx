import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, SafeAreaView, StatusBar, Text } from "react-native";
import { Header } from "./src/components/Header";
import { GatePalette } from "./src/components/GatePalette";
import { CircuitCanvas } from "./src/components/CircuitCanvas";
import { StateInspector } from "./src/components/StateInspector";
import { PresetsModal } from "./src/components/PresetsModal";
import { Circuit, CircuitGate, simulateCircuit } from "./src/engine/quantumState";
import { GATE_DEFS } from "./src/engine/quantumGates";
import { toggleGateExpansion, deleteGateFromCircuit } from "./src/engine/decompositions";

export default function App() {
  const [numQubits, setNumQubits] = useState(4);
  const [selectedGateId, setSelectedGateId] = useState<string | null>("H");
  const [selectedStep, setSelectedStep] = useState<number>(-1);
  const [modalMode, setModalMode] = useState<"presets" | "qasm" | null>(null);
  // SWAP two-click state: pending means first qubit + step already chosen
  const [swapPending, setSwapPending] = useState<{ qubit: number; step: number } | null>(null);

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

    // --- SWAP: two-click placement for non-adjacent qubits ---
    if (selectedGateId === "SWAP") {
      if (swapPending === null) {
        // First click: record source qubit & step
        setSwapPending({ qubit, step });
        return;
      } else {
        // Second click: finalize SWAP between swapPending and current slot
        const srcQ = swapPending.qubit;
        const tgtQ = qubit;
        const srcStep = swapPending.step;
        if (srcQ !== tgtQ && srcStep === step) {
          const ctrl = Math.min(srcQ, tgtQ);
          const tgt = Math.max(srcQ, tgtQ);
          const newGate: CircuitGate = {
            id: `gate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            gateId: "SWAP",
            qubit: ctrl,
            targetQubit: tgt,
            step,
            isExpanded: false,
          };
          const filteredGates = circuit.gates.filter(
            (g) => !((g.qubit === ctrl || g.qubit === tgt) && g.step === step)
          );
          setCircuit((prev) => ({ ...prev, gates: [...filteredGates, newGate] }));
          setSelectedStep(step);
        }
        setSwapPending(null);
        return;
      }
    }

    // Cancel any pending SWAP when placing a different gate
    if (swapPending !== null) setSwapPending(null);

    let startQubit = qubit;
    let targetQubit: number | undefined = undefined;

    if (gDef.numQubits === 2) {
      if (startQubit + 1 >= numQubits) {
        startQubit = Math.max(0, numQubits - 2);
      }
      targetQubit = startQubit + 1;
    } else if (gDef.numQubits > 2) {
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
  }, [selectedGateId, swapPending, circuit, numQubits]);

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

      {/* Main Workspace Layout */}
      <View style={styles.workspaceBody}>
        {/* Left Gate Palette */}
        <GatePalette
          selectedGateId={selectedGateId}
          onSelectGate={(id) => setSelectedGateId(id)}
        />

        {/* Center Drag & Drop Circuit Timeline Canvas */}
        <View style={styles.canvasWrapper}>
          <CircuitCanvas
            circuit={circuit}
            selectedGateId={selectedGateId}
            selectedStep={selectedStep}
            swapPending={swapPending}
            onSelectStep={(s) => setSelectedStep(s)}
            onSlotClick={handleSlotClick}
            onGateClick={(g) => setSelectedStep(g.step)}
            onToggleExpand={handleToggleExpand}
            onDeleteGate={handleDeleteGate}
          />
        </View>
      </View>

      {/* Bottom Quantum State & Density Matrix Inspector */}
      <StateInspector
        stepState={inspectedStepState}
        numQubits={numQubits}
      />

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
  workspaceBody: {
    flex: 1,
    flexDirection: "row",
  },
  canvasWrapper: {
    flex: 1,
  },
});
