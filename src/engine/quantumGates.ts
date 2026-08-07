import {
  Complex,
  complex,
  C_ZERO,
  C_ONE,
  C_I,
  C_MINUS_I,
  INV_SQRT2,
  cPolar,
  cMul,
  cScale,
} from "./complex";

export type GateCategory = "clifford" | "universal" | "composed" | "measure";

export interface GateParam {
  name: string;
  label: string;
  defaultVal: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface GateDef {
  id: string;
  name: string;
  symbol: string;
  category: GateCategory;
  description: string;
  numQubits: number; // 1 or 2
  params?: GateParam[];
  color: string;
  // Matrix getter: 1-qubit returns 2x2 matrix [row][col], 2-qubit returns 4x4 matrix
  getMatrix: (params?: Record<string, number>) => Complex[][];
  // Expansion into elementary gates
  isComposed?: boolean;
  expandableTo?: {
    gateId: string;
    targetOffset: number; // relative qubit offset
    controlOffset?: number;
    params?: Record<string, number>;
  }[];
}

// 1-Qubit Identity
export const M_I: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, C_ONE],
];

// 1-Qubit Hadamard H = 1/sqrt(2) [[1, 1], [1, -1]]
export const M_H: Complex[][] = [
  [complex(INV_SQRT2), complex(INV_SQRT2)],
  [complex(INV_SQRT2), complex(-INV_SQRT2)],
];

// Pauli X (NOT) = [[0, 1], [1, 0]]
export const M_X: Complex[][] = [
  [C_ZERO, C_ONE],
  [C_ONE, C_ZERO],
];

// Pauli Y = [[0, -i], [i, 0]]
export const M_Y: Complex[][] = [
  [C_ZERO, C_MINUS_I],
  [C_I, C_ZERO],
];

// Pauli Z = [[1, 0], [0, -1]]
export const M_Z: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, complex(-1)],
];

// Phase S = [[1, 0], [0, i]]
export const M_S: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, C_I],
];

// S dagger = [[1, 0], [0, -i]]
export const M_Sdg: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, C_MINUS_I],
];

// T gate = [[1, 0], [0, e^(i pi/4)]]
export const M_T: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, cPolar(1, Math.PI / 4)],
];

// T dagger = [[1, 0], [0, e^(-i pi/4)]]
export const M_Tdg: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, cPolar(1, -Math.PI / 4)],
];

// CNOT (CX) 4x4 Matrix
// Basis order: |00>, |01>, |10>, |11>
export const M_CX: Complex[][] = [
  [C_ONE, C_ZERO, C_ZERO, C_ZERO],
  [C_ZERO, C_ONE, C_ZERO, C_ZERO],
  [C_ZERO, C_ZERO, C_ZERO, C_ONE],
  [C_ZERO, C_ZERO, C_ONE, C_ZERO],
];

// Controlled-Z (CZ) 4x4 Matrix
export const M_CZ: Complex[][] = [
  [C_ONE, C_ZERO, C_ZERO, C_ZERO],
  [C_ZERO, C_ONE, C_ZERO, C_ZERO],
  [C_ZERO, C_ZERO, C_ONE, C_ZERO],
  [C_ZERO, C_ZERO, C_ZERO, complex(-1)],
];

// SWAP 4x4 Matrix
export const M_SWAP: Complex[][] = [
  [C_ONE, C_ZERO, C_ZERO, C_ZERO],
  [C_ZERO, C_ZERO, C_ONE, C_ZERO],
  [C_ZERO, C_ONE, C_ZERO, C_ZERO],
  [C_ZERO, C_ZERO, C_ZERO, C_ONE],
];

// Rotation Gates Generators
export function getRxMatrix(theta: number): Complex[][] {
  const half = theta / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);
  return [
    [complex(cos), complex(0, -sin)],
    [complex(0, -sin), complex(cos)],
  ];
}

export function getRyMatrix(theta: number): Complex[][] {
  const half = theta / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);
  return [
    [complex(cos), complex(-sin)],
    [complex(sin), complex(cos)],
  ];
}

export function getRzMatrix(theta: number): Complex[][] {
  const half = theta / 2;
  return [
    [cPolar(1, -half), C_ZERO],
    [C_ZERO, cPolar(1, half)],
  ];
}

export function getU3Matrix(theta: number, phi: number, lambda: number): Complex[][] {
  const half = theta / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);
  return [
    [complex(cos), cScale(cPolar(1, lambda), -sin)],
    [cScale(cPolar(1, phi), sin), cScale(cPolar(1, phi + lambda), cos)],
  ];
}

export const GATE_DEFS: Record<string, GateDef> = {
  // --- CLIFFORD GROUP ---
  H: {
    id: "H",
    name: "Hadamard",
    symbol: "H",
    category: "clifford",
    description: "Creates equal superposition: H|0> = (|0>+|1>)/√2",
    numQubits: 1,
    color: "#3b82f6",
    getMatrix: () => M_H,
  },
  X: {
    id: "X",
    name: "Pauli-X (NOT)",
    symbol: "X",
    category: "clifford",
    description: "Bit flip gate: flips |0> to |1> and vice versa",
    numQubits: 1,
    color: "#ef4444",
    getMatrix: () => M_X,
  },
  Y: {
    id: "Y",
    name: "Pauli-Y",
    symbol: "Y",
    category: "clifford",
    description: "Bit and phase flip: Y|0> = i|1>, Y|1> = -i|0>",
    numQubits: 1,
    color: "#f59e0b",
    getMatrix: () => M_Y,
  },
  Z: {
    id: "Z",
    name: "Pauli-Z",
    symbol: "Z",
    category: "clifford",
    description: "Phase flip gate: Z|1> = -|1>",
    numQubits: 1,
    color: "#10b981",
    getMatrix: () => M_Z,
  },
  S: {
    id: "S",
    name: "Phase S (√Z)",
    symbol: "S",
    category: "clifford",
    description: "Phase shift by π/2 (90 degrees)",
    numQubits: 1,
    color: "#8b5cf6",
    getMatrix: () => M_S,
  },
  CX: {
    id: "CX",
    name: "Controlled-NOT (CNOT)",
    symbol: "CX",
    category: "clifford",
    description: "Flips target qubit if control qubit is |1>",
    numQubits: 2,
    color: "#06b6d4",
    getMatrix: () => M_CX,
  },

  // --- UNIVERSAL SET ---
  T: {
    id: "T",
    name: "T Gate (π/8)",
    symbol: "T",
    category: "universal",
    description: "Phase shift by π/4 (45 degrees). Essential for fault-tolerant universal quantum computation",
    numQubits: 1,
    color: "#ec4899",
    getMatrix: () => M_T,
  },
  Tdg: {
    id: "Tdg",
    name: "T Dagger",
    symbol: "T†",
    category: "universal",
    description: "Phase shift by -π/4",
    numQubits: 1,
    color: "#db2777",
    getMatrix: () => M_Tdg,
  },
  Rx: {
    id: "Rx",
    name: "Rotation X",
    symbol: "Rx",
    category: "universal",
    description: "Rotation around X-axis by angle θ",
    numQubits: 1,
    color: "#f43f5e",
    params: [{ name: "theta", label: "θ (rad)", defaultVal: Math.PI / 2, step: 0.1 }],
    getMatrix: (p) => getRxMatrix(p?.theta ?? Math.PI / 2),
  },
  Ry: {
    id: "Ry",
    name: "Rotation Y",
    symbol: "Ry",
    category: "universal",
    description: "Rotation around Y-axis by angle θ",
    numQubits: 1,
    color: "#d97706",
    params: [{ name: "theta", label: "θ (rad)", defaultVal: Math.PI / 2, step: 0.1 }],
    getMatrix: (p) => getRyMatrix(p?.theta ?? Math.PI / 2),
  },
  Rz: {
    id: "Rz",
    name: "Rotation Z",
    symbol: "Rz",
    category: "universal",
    description: "Rotation around Z-axis by angle θ",
    numQubits: 1,
    color: "#059669",
    params: [{ name: "theta", label: "θ (rad)", defaultVal: Math.PI / 2, step: 0.1 }],
    getMatrix: (p) => getRzMatrix(p?.theta ?? Math.PI / 2),
  },
  U3: {
    id: "U3",
    name: "Universal U3",
    symbol: "U3",
    category: "universal",
    description: "Arbitrary single-qubit rotation U3(θ, φ, λ)",
    numQubits: 1,
    color: "#6366f1",
    params: [
      { name: "theta", label: "θ", defaultVal: Math.PI / 2, step: 0.1 },
      { name: "phi", label: "φ", defaultVal: 0, step: 0.1 },
      { name: "lambda", label: "λ", defaultVal: Math.PI, step: 0.1 },
    ],
    getMatrix: (p) => getU3Matrix(p?.theta ?? Math.PI / 2, p?.phi ?? 0, p?.lambda ?? Math.PI),
  },

  // --- COMPOSED / MACRO GATES ---
  CZ: {
    id: "CZ",
    name: "Controlled-Z",
    symbol: "CZ",
    category: "composed",
    description: "Applies Z phase flip on target if control is |1|. Expands to H -> CNOT -> H on target wire.",
    numQubits: 2,
    color: "#14b8a6",
    isComposed: true,
    getMatrix: () => M_CZ,
    expandableTo: [
      { gateId: "H", targetOffset: 1 }, // H on target
      { gateId: "CX", targetOffset: 1, controlOffset: 0 }, // CNOT control -> target
      { gateId: "H", targetOffset: 1 }, // H on target
    ],
  },
  SWAP: {
    id: "SWAP",
    name: "SWAP Gate",
    symbol: "SWAP",
    category: "composed",
    description: "Swaps states of 2 qubits. Expands to 3 alternating CNOT gates.",
    numQubits: 2,
    color: "#a855f7",
    isComposed: true,
    getMatrix: () => M_SWAP,
    expandableTo: [
      { gateId: "CX", targetOffset: 1, controlOffset: 0 },
      { gateId: "CX", targetOffset: 0, controlOffset: 1 },
      { gateId: "CX", targetOffset: 1, controlOffset: 0 },
    ],
  },
  BELL: {
    id: "BELL",
    name: "Bell Pair (|Φ⁺⟩)",
    symbol: "Bell",
    category: "composed",
    description: "Creates maximally entangled Bell state (|00⟩+|11⟩)/√2 on 2 qubits.",
    numQubits: 2,
    color: "#e11d48",
    isComposed: true,
    getMatrix: () => M_CX, // placeholder, executed sequentially
    expandableTo: [
      { gateId: "H", targetOffset: 0 },
      { gateId: "CX", targetOffset: 1, controlOffset: 0 },
    ],
  },
  GHZ: {
    id: "GHZ",
    name: "GHZ State (|GHZ₄⟩)",
    symbol: "GHZ",
    category: "composed",
    description: "Creates 4-qubit Greenberger-Horne-Zeilinger state (|0000⟩+|1111⟩)/√2.",
    numQubits: 4,
    color: "#c026d3",
    isComposed: true,
    getMatrix: () => M_CX,
    expandableTo: [
      { gateId: "H", targetOffset: 0 },
      { gateId: "CX", targetOffset: 1, controlOffset: 0 },
      { gateId: "CX", targetOffset: 2, controlOffset: 1 },
      { gateId: "CX", targetOffset: 3, controlOffset: 2 },
    ],
  },

  // --- MEASUREMENT & RESET ---
  MEASURE: {
    id: "MEASURE",
    name: "Measurement",
    symbol: "M",
    category: "measure",
    description: "Measures qubit state in standard Z basis {|0⟩, |1⟩}",
    numQubits: 1,
    color: "#64748b",
    getMatrix: () => M_I,
  },
  RESET: {
    id: "RESET",
    name: "Reset |0⟩",
    symbol: "|0⟩",
    category: "measure",
    description: "Resets qubit to pure ground state |0⟩",
    numQubits: 1,
    color: "#475569",
    getMatrix: () => M_I,
  },
};
