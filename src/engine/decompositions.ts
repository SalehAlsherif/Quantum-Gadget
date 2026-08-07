import { Circuit, CircuitGate, expandCircuitGate } from "./quantumState";
import { GATE_DEFS } from "./quantumGates";

/**
 * Toggle Expand / Collapse state of a composed gate (e.g. CZ, SWAP, Bell, GHZ)
 */
export function toggleGateExpansion(circuit: Circuit, gateIdToToggle: string): Circuit {
  const targetGate = circuit.gates.find((g) => g.id === gateIdToToggle);
  if (!targetGate) return circuit;

  const gDef = GATE_DEFS[targetGate.gateId];
  if (!gDef || !gDef.isComposed) return circuit;

  const subGates = expandCircuitGate(targetGate);
  const shiftAmount = Math.max(0, subGates.length - 1);

  const isExpanding = !targetGate.isExpanded;
  const pivotStep = targetGate.step;

  const updatedGates = circuit.gates.map((g) => {
    if (g.id === gateIdToToggle) {
      return { ...g, isExpanded: isExpanding };
    }

    if (shiftAmount > 0 && g.step > pivotStep) {
      const newStep = isExpanding
        ? g.step + shiftAmount
        : Math.max(pivotStep + 1, g.step - shiftAmount);
      return { ...g, step: newStep };
    }

    return g;
  });

  return { ...circuit, gates: updatedGates };
}

/**
 * Delete a gate from the circuit, collapsing expanded gates first to maintain timeline alignment
 */
export function deleteGateFromCircuit(circuit: Circuit, gateIdToDelete: string): Circuit {
  const targetGate = circuit.gates.find((g) => g.id === gateIdToDelete);
  if (!targetGate) return circuit;

  let currentCircuit = circuit;
  if (targetGate.isExpanded) {
    currentCircuit = toggleGateExpansion(circuit, gateIdToDelete);
  }

  return {
    ...currentCircuit,
    gates: currentCircuit.gates.filter((g) => g.id !== gateIdToDelete),
  };
}

/**
 * Collapse a selection of gates into a custom composed macro gate
 */
export function collapseGateSelection(
  circuit: Circuit,
  selectedGateIds: string[],
  customLabel: string
): Circuit {
  if (selectedGateIds.length === 0) return circuit;

  const gatesToCollapse = circuit.gates.filter((g) => selectedGateIds.includes(g.id));
  if (gatesToCollapse.length === 0) return circuit;

  // Find min step, min qubit wire
  const minStep = Math.min(...gatesToCollapse.map((g) => g.step));
  const minQubit = Math.min(...gatesToCollapse.map((g) => g.qubit));
  const maxQubit = Math.max(
    ...gatesToCollapse.map((g) => (g.targetQubit !== undefined ? Math.max(g.qubit, g.targetQubit) : g.qubit))
  );

  const numQubits = Math.max(1, maxQubit - minQubit + 1);

  const collapsedGate: CircuitGate = {
    id: `custom_macro_${Date.now()}`,
    gateId: numQubits > 1 ? "SWAP" : "H", // visual template
    qubit: minQubit,
    targetQubit: numQubits > 1 ? minQubit + 1 : undefined,
    step: minStep,
    collapsedLabel: customLabel || "Custom Macro",
    isExpanded: false,
  };

  const remainingGates = circuit.gates.filter((g) => !selectedGateIds.includes(g.id));
  return {
    ...circuit,
    gates: [...remainingGates, collapsedGate],
  };
}
