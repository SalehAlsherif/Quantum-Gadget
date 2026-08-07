import { complex, cMagSq, cEquals, INV_SQRT2 } from "../complex";
import { GATE_DEFS, M_H, M_CX, M_CZ, M_SWAP } from "../quantumGates";
import {
  createInitialStateVector,
  applySingleQubitGate,
  applyTwoQubitGate,
  computeDensityMatrix,
  computeReducedDensityMatrix,
  simulateCircuit,
} from "../quantumState";
import { exportToQASM, importFromQASM } from "../qasm";

describe("Quantum Engine Core (Nielsen & Chuang)", () => {
  test("Initial 4-qubit state should be |0000>", () => {
    const state = createInitialStateVector(4);
    expect(state.length).toBe(16);
    expect(state[0]).toEqual({ re: 1, im: 0 });
    expect(cMagSq(state[0])).toBe(1);
    for (let i = 1; i < 16; i++) {
      expect(state[i]).toEqual({ re: 0, im: 0 });
    }
  });

  test("Hadamard gate on q0 creates (|0000> + |1000>)/sqrt(2)", () => {
    let state = createInitialStateVector(4);
    state = applySingleQubitGate(state, 4, 0, M_H);

    // q0 is highest bit (mask 8): i0 = 0 (|0000>), i1 = 8 (|1000>)
    expect(state[0].re).toBeCloseTo(INV_SQRT2);
    expect(state[8].re).toBeCloseTo(INV_SQRT2);
    expect(cMagSq(state[0])).toBeCloseTo(0.5);
    expect(cMagSq(state[8])).toBeCloseTo(0.5);
  });

  test("Bell state preparation creates (|00> + |11>)/sqrt(2)", () => {
    let state = createInitialStateVector(2);
    state = applySingleQubitGate(state, 2, 0, M_H);
    state = applyTwoQubitGate(state, 2, 0, 1, M_CX);

    // Basis: 00 (0), 01 (1), 10 (2), 11 (3)
    expect(state[0].re).toBeCloseTo(INV_SQRT2);
    expect(state[3].re).toBeCloseTo(INV_SQRT2);
    expect(state[1].re).toBe(0);
    expect(state[2].re).toBe(0);

    // Reduced density matrix of q0 in Bell state should be maximally mixed (rho = I/2)
    const red = computeReducedDensityMatrix(state, 2, 0);
    expect(red.rho[0][0].re).toBeCloseTo(0.5);
    expect(red.rho[1][1].re).toBeCloseTo(0.5);
    expect(red.purity).toBeCloseTo(0.5); // maximally mixed
    expect(red.entropy).toBeCloseTo(1.0); // 1 bit of entropy
  });

  test("CZ Gate decomposition (H -> CNOT -> H) equivalence", () => {
    // Apply direct CZ gate
    let state1 = createInitialStateVector(2);
    state1 = applySingleQubitGate(state1, 2, 0, M_H); // (|00> + |10>)/sqrt(2)
    state1 = applySingleQubitGate(state1, 2, 1, M_H); // superposition
    state1 = applyTwoQubitGate(state1, 2, 0, 1, M_CZ);

    // Apply expanded CZ (H on tgt -> CNOT -> H on tgt)
    let state2 = createInitialStateVector(2);
    state2 = applySingleQubitGate(state2, 2, 0, M_H);
    state2 = applySingleQubitGate(state2, 2, 1, M_H);

    state2 = applySingleQubitGate(state2, 2, 1, M_H); // H on target
    state2 = applyTwoQubitGate(state2, 2, 0, 1, M_CX); // CNOT
    state2 = applySingleQubitGate(state2, 2, 1, M_H); // H on target

    // Verify both states match perfectly
    for (let i = 0; i < 4; i++) {
      expect(cEquals(state1[i], state2[i])).toBe(true);
    }
  });

  test("QASM export and import roundtrip", () => {
    const circuit = {
      numQubits: 2,
      gates: [
        { id: "g1", gateId: "H", qubit: 0, step: 0 },
        { id: "g2", gateId: "CX", qubit: 0, targetQubit: 1, step: 1 },
      ],
    };

    const qasmStr = exportToQASM(circuit);
    expect(qasmStr).toContain('OPENQASM 2.0;');
    expect(qasmStr).toContain('h q[0];');
    expect(qasmStr).toContain('cx q[0], q[1];');

    const imported = importFromQASM(qasmStr);
    expect(imported.gates.length).toBe(2);
    expect(imported.gates[0].gateId).toBe("H");
    expect(imported.gates[1].gateId).toBe("CX");
  });

  test("Composed Bell pair gate produces Bell state", () => {
    const circuit = {
      numQubits: 2,
      gates: [
        { id: "b1", gateId: "BELL", qubit: 0, targetQubit: 1, step: 0 },
      ],
    };
    const steps = simulateCircuit(circuit, 4);
    const finalState = steps[steps.length - 1].stateVector;
    expect(finalState[0].re).toBeCloseTo(INV_SQRT2);
    expect(finalState[3].re).toBeCloseTo(INV_SQRT2);
    expect(finalState[1].re).toBe(0);
    expect(finalState[2].re).toBe(0);
  });

  test("Composed GHZ state gate produces 4-qubit GHZ state", () => {
    const circuit = {
      numQubits: 4,
      gates: [
        { id: "g1", gateId: "GHZ", qubit: 0, step: 0 },
      ],
    };
    const steps = simulateCircuit(circuit, 5);
    const finalState = steps[steps.length - 1].stateVector;
    expect(finalState[0].re).toBeCloseTo(INV_SQRT2);  // |0000>
    expect(finalState[15].re).toBeCloseTo(INV_SQRT2); // |1111>
    expect(cMagSq(finalState[0])).toBeCloseTo(0.5);
    expect(cMagSq(finalState[15])).toBeCloseTo(0.5);
  });

  test("toggleGateExpansion pushes subsequent gates right on expand and pulls back on collapse", () => {
    const { toggleGateExpansion } = require("../decompositions");
    const initialCircuit = {
      numQubits: 4,
      gates: [
        { id: "g0", gateId: "H", qubit: 0, step: 0 },
        { id: "cz1", gateId: "CZ", qubit: 0, targetQubit: 1, step: 1, isExpanded: false },
        { id: "g1", gateId: "X", qubit: 0, step: 2 },
        { id: "g2", gateId: "Z", qubit: 1, step: 3 },
      ],
    };

    // Expanding CZ at step 1 (length 3, shiftAmount = 2)
    const expandedCircuit = toggleGateExpansion(initialCircuit, "cz1");
    expect(expandedCircuit.gates.find((g: any) => g.id === "cz1").isExpanded).toBe(true);
    expect(expandedCircuit.gates.find((g: any) => g.id === "g0").step).toBe(0);
    expect(expandedCircuit.gates.find((g: any) => g.id === "g1").step).toBe(4); // 2 + 2 = 4
    expect(expandedCircuit.gates.find((g: any) => g.id === "g2").step).toBe(5); // 3 + 2 = 5

    // Collapsing CZ back
    const collapsedCircuit = toggleGateExpansion(expandedCircuit, "cz1");
    expect(collapsedCircuit.gates.find((g: any) => g.id === "cz1").isExpanded).toBe(false);
    expect(collapsedCircuit.gates.find((g: any) => g.id === "g1").step).toBe(2); // 4 - 2 = 2
    expect(collapsedCircuit.gates.find((g: any) => g.id === "g2").step).toBe(3); // 5 - 2 = 3
  });
});
