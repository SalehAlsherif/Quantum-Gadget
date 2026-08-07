import {
  Complex,
  complex,
  C_ZERO,
  C_ONE,
  cAdd,
  cSub,
  cMul,
  cConj,
  cMagSq,
  cArg,
} from "./complex";
import { GATE_DEFS, GateDef, M_CX, M_CZ, M_SWAP } from "./quantumGates";

export interface CircuitGate {
  id: string; // unique instance id
  gateId: string; // e.g. "H", "CX", "CZ", "SWAP", "BELL", "GHZ"
  qubit: number; // primary qubit wire index (0 to numQubits-1)
  targetQubit?: number; // secondary qubit wire index for 2-qubit gates
  step: number; // time step slot (0 to MAX_STEPS-1)
  params?: Record<string, number>;
  isExpanded?: boolean;
  collapsedLabel?: string;
}

export interface Circuit {
  numQubits: number;
  gates: CircuitGate[];
}

export interface ReducedState {
  qubit: number;
  rho: Complex[][]; // 2x2 density matrix
  rx: number; // Bloch vector x
  ry: number; // Bloch vector y
  rz: number; // Bloch vector z
  purity: number;
  entropy: number;
}

export interface StepState {
  step: number;
  stateVector: Complex[]; // size 2^numQubits
  probabilities: number[]; // size 2^numQubits
  phases: number[]; // size 2^numQubits in radians [-pi, pi]
  densityMatrix: Complex[][]; // size 2^N x 2^N
  reducedStates: ReducedState[]; // per-qubit reduced density states
}

/**
 * Initialize pure ground state |0...0> for N qubits
 */
export function createInitialStateVector(numQubits: number): Complex[] {
  const size = 1 << numQubits;
  const state: Complex[] = new Array(size).fill(C_ZERO);
  state[0] = C_ONE;
  return state;
}

/**
 * Apply 1-qubit gate matrix U (2x2) on targetQubit of state vector (length 2^N)
 */
export function applySingleQubitGate(
  state: Complex[],
  numQubits: number,
  targetQubit: number,
  matrix: Complex[][]
): Complex[] {
  const size = 1 << numQubits;
  const newState: Complex[] = new Array(size).fill(C_ZERO);
  const bitMask = 1 << (numQubits - 1 - targetQubit);

  for (let i = 0; i < size; i++) {
    if ((i & bitMask) === 0) {
      const i0 = i;
      const i1 = i | bitMask;

      const v0 = state[i0];
      const v1 = state[i1];

      // newState[i0] = U[0][0]*v0 + U[0][1]*v1
      newState[i0] = cAdd(cMul(matrix[0][0], v0), cMul(matrix[0][1], v1));
      // newState[i1] = U[1][0]*v0 + U[1][1]*v1
      newState[i1] = cAdd(cMul(matrix[1][0], v0), cMul(matrix[1][1], v1));
    }
  }

  return newState;
}

/**
 * Apply 2-qubit gate matrix U (4x4) acting on controlQubit and targetQubit
 */
export function applyTwoQubitGate(
  state: Complex[],
  numQubits: number,
  controlQubit: number,
  targetQubit: number,
  matrix: Complex[][]
): Complex[] {
  const size = 1 << numQubits;
  const newState: Complex[] = new Array(size).fill(C_ZERO);

  const ctrlMask = 1 << (numQubits - 1 - controlQubit);
  const tgtMask = 1 << (numQubits - 1 - targetQubit);

  for (let i = 0; i < size; i++) {
    // Only process when both control and target bits are 0 in the basis index to avoid 4x redundant processing
    if ((i & ctrlMask) === 0 && (i & tgtMask) === 0) {
      const i00 = i;
      const i01 = i | tgtMask;
      const i10 = i | ctrlMask;
      const i11 = i | ctrlMask | tgtMask;

      const vec = [state[i00], state[i01], state[i10], state[i11]];
      const indices = [i00, i01, i10, i11];

      for (let row = 0; row < 4; row++) {
        let sum: Complex = C_ZERO;
        for (let col = 0; col < 4; col++) {
          sum = cAdd(sum, cMul(matrix[row][col], vec[col]));
        }
        newState[indices[row]] = sum;
      }
    }
  }

  return newState;
}

/**
 * Compute full Density Matrix rho = |psi><psi| (size 2^N x 2^N)
 */
export function computeDensityMatrix(state: Complex[]): Complex[][] {
  const n = state.length;
  const rho: Complex[][] = Array.from({ length: n }, () => new Array(n).fill(C_ZERO));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rho[i][j] = cMul(state[i], cConj(state[j]));
    }
  }

  return rho;
}

/**
 * Compute 1-qubit Reduced Density Matrix rho_k by tracing out all other qubits
 */
export function computeReducedDensityMatrix(
  state: Complex[],
  numQubits: number,
  targetQubit: number
): ReducedState {
  const bitMask = 1 << (numQubits - 1 - targetQubit);
  let rho00: Complex = C_ZERO;
  let rho01: Complex = C_ZERO;
  let rho10: Complex = C_ZERO;
  let rho11: Complex = C_ZERO;

  const size = 1 << numQubits;
  for (let i = 0; i < size; i++) {
    if ((i & bitMask) === 0) {
      const i0 = i;
      const i1 = i | bitMask;

      const a0 = state[i0];
      const a1 = state[i1];

      rho00 = cAdd(rho00, cMul(a0, cConj(a0)));
      rho01 = cAdd(rho01, cMul(a0, cConj(a1)));
      rho10 = cAdd(rho10, cMul(a1, cConj(a0)));
      rho11 = cAdd(rho11, cMul(a1, cConj(a1)));
    }
  }

  const rho: Complex[][] = [
    [rho00, rho01],
    [rho10, rho11],
  ];

  // Bloch vectors (Nielsen & Chuang Eq 2.148):
  // rx = 2 * Re(rho01)
  // ry = 2 * Im(rho10) = -2 * Im(rho01)
  // rz = rho00.re - rho11.re
  const rx = 2 * rho01.re;
  const ry = 2 * rho10.im;
  const rz = rho00.re - rho11.re;

  // Purity gamma = Tr(rho^2) = (rho00^2 + 2|rho01|^2 + rho11^2)
  const purity =
    rho00.re * rho00.re + 2 * cMagSq(rho01) + rho11.re * rho11.re;

  // Eigenvalues of 2x2 density matrix lambda_1,2 = (1 +/- |r|)/2
  const rNorm = Math.min(1.0, Math.hypot(rx, ry, rz));
  const l1 = (1 + rNorm) / 2;
  const l2 = (1 - rNorm) / 2;

  let entropy = 0;
  if (l1 > 1e-9) entropy -= l1 * Math.log2(l1);
  if (l2 > 1e-9) entropy -= l2 * Math.log2(l2);

  return {
    qubit: targetQubit,
    rho,
    rx,
    ry,
    rz,
    purity,
    entropy,
  };
}

/**
 * Expand a composed gate into an array of primitive CircuitGates
 */
export function expandCircuitGate(gate: CircuitGate): CircuitGate[] {
  const gateDef = GATE_DEFS[gate.gateId];
  if (!gateDef || !gateDef.isComposed || !gateDef.expandableTo) {
    return [gate];
  }

  return gateDef.expandableTo.map((elem, idx) => {
    const isTwoQubit = elem.controlOffset !== undefined;
    const ctrlQubit = isTwoQubit ? gate.qubit + elem.controlOffset! : gate.qubit + elem.targetOffset;
    const tgtQubit = isTwoQubit ? gate.qubit + elem.targetOffset : undefined;

    return {
      id: `${gate.id}_exp_${idx}`,
      gateId: elem.gateId,
      qubit: ctrlQubit,
      targetQubit: tgtQubit,
      step: gate.step + idx,
      params: elem.params,
    };
  });
}

/**
 * Simulate circuit step-by-step and return step states for timeline inspection
 */
export function simulateCircuit(circuit: Circuit, maxSteps = 16): StepState[] {
  const { numQubits, gates } = circuit;
  let currentStateVector = createInitialStateVector(numQubits);

  const stepStates: StepState[] = [];

  // Group gates by time step
  const gatesByStep: Record<number, CircuitGate[]> = {};
  for (let s = 0; s < maxSteps; s++) {
    gatesByStep[s] = [];
  }

  for (const g of gates) {
    if (gatesByStep[g.step]) {
      const gDef = GATE_DEFS[g.gateId];
      // Expand composed gates for execution to guarantee exact mathematical simulation
      if (gDef?.isComposed) {
        const expanded = expandCircuitGate(g);
        expanded.forEach((eg) => {
          if (gatesByStep[eg.step]) gatesByStep[eg.step].push(eg);
        });
      } else {
        gatesByStep[g.step].push(g);
      }
    }
  }

  // Initial State at t = -1 / before step 0
  const initialRho = computeDensityMatrix(currentStateVector);
  const initialReduced: ReducedState[] = [];
  for (let q = 0; q < numQubits; q++) {
    initialReduced.push(computeReducedDensityMatrix(currentStateVector, numQubits, q));
  }

  stepStates.push({
    step: -1,
    stateVector: [...currentStateVector],
    probabilities: currentStateVector.map(cMagSq),
    phases: currentStateVector.map(cArg),
    densityMatrix: initialRho,
    reducedStates: initialReduced,
  });

  // Execute step by step
  for (let s = 0; s < maxSteps; s++) {
    const stepGates = gatesByStep[s];

    for (const g of stepGates) {
      const gDef = GATE_DEFS[g.gateId];
      if (!gDef) continue;

      if (g.gateId === "MEASURE" || g.gateId === "RESET") {
        // Computational Z-basis projection/reset
        const bitMask = 1 << (numQubits - 1 - g.qubit);
        let prob0 = 0;
        for (let i = 0; i < currentStateVector.length; i++) {
          if ((i & bitMask) === 0) prob0 += cMagSq(currentStateVector[i]);
        }

        if (g.gateId === "MEASURE") {
          // Keep state magnitude normalized
          const factor0 = prob0 > 0 ? 1 / Math.sqrt(prob0) : 0;
          const factor1 = prob0 < 1 ? 1 / Math.sqrt(1 - prob0) : 0;
          // Deterministic demonstration (or ground state projection)
          currentStateVector = currentStateVector.map((c, i) =>
            (i & bitMask) === 0 ? complex(c.re * factor0, c.im * factor0) : complex(c.re * factor1, c.im * factor1)
          );
        } else if (g.gateId === "RESET") {
          // Project to |0>
          currentStateVector = currentStateVector.map((c, i) =>
            (i & bitMask) === 0 ? c : C_ZERO
          );
          let norm = Math.sqrt(currentStateVector.reduce((acc, c) => acc + cMagSq(c), 0));
          if (norm < 1e-9) {
            currentStateVector[0] = C_ONE;
            norm = 1;
          }
          currentStateVector = currentStateVector.map((c) => complex(c.re / norm, c.im / norm));
        }
      } else if (gDef.numQubits === 1) {
        if (g.qubit >= 0 && g.qubit < numQubits) {
          const matrix = gDef.getMatrix(g.params);
          currentStateVector = applySingleQubitGate(currentStateVector, numQubits, g.qubit, matrix);
        }
      } else if (gDef.numQubits === 2) {
        const ctrl = g.qubit;
        const tgt = g.targetQubit ?? (g.qubit + 1) % numQubits;
        if (ctrl >= 0 && ctrl < numQubits && tgt >= 0 && tgt < numQubits && ctrl !== tgt) {
          const matrix = gDef.getMatrix(g.params);
          currentStateVector = applyTwoQubitGate(currentStateVector, numQubits, ctrl, tgt, matrix);
        }
      }
    }

    const rho = computeDensityMatrix(currentStateVector);
    const reducedStates: ReducedState[] = [];
    for (let q = 0; q < numQubits; q++) {
      reducedStates.push(computeReducedDensityMatrix(currentStateVector, numQubits, q));
    }

    stepStates.push({
      step: s,
      stateVector: [...currentStateVector],
      probabilities: currentStateVector.map(cMagSq),
      phases: currentStateVector.map(cArg),
      densityMatrix: rho,
      reducedStates,
    });
  }

  return stepStates;
}
