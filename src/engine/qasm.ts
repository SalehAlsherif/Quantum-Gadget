import { Circuit, CircuitGate } from "./quantumState";
import { GATE_DEFS } from "./quantumGates";

/**
 * Export Circuit to OpenQASM 2.0 string
 */
export function exportToQASM(circuit: Circuit): string {
  let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\n\nqreg q[${circuit.numQubits}];\ncreg c[${circuit.numQubits}];\n\n`;

  // Sort gates by step
  const sortedGates = [...circuit.gates].sort((a, b) => a.step - b.step);

  for (const g of sortedGates) {
    const symbol = g.gateId.toLowerCase();
    if (g.gateId === "MEASURE") {
      qasm += `measure q[${g.qubit}] -> c[${g.qubit}];\n`;
    } else if (g.gateId === "RESET") {
      qasm += `reset q[${g.qubit}];\n`;
    } else if (g.gateId === "CX") {
      const tgt = g.targetQubit ?? (g.qubit + 1) % circuit.numQubits;
      qasm += `cx q[${g.qubit}], q[${tgt}];\n`;
    } else if (g.gateId === "CZ") {
      const tgt = g.targetQubit ?? (g.qubit + 1) % circuit.numQubits;
      qasm += `cz q[${g.qubit}], q[${tgt}];\n`;
    } else if (g.gateId === "SWAP") {
      const tgt = g.targetQubit ?? (g.qubit + 1) % circuit.numQubits;
      qasm += `swap q[${g.qubit}], q[${tgt}];\n`;
    } else if (g.gateId === "BELL") {
      qasm += `h q[${g.qubit}];\n`;
      const tgt = g.targetQubit ?? (g.qubit + 1) % circuit.numQubits;
      qasm += `cx q[${g.qubit}], q[${tgt}];\n`;
    } else if (g.gateId === "GHZ") {
      qasm += `h q[0];\n`;
      for (let i = 0; i < circuit.numQubits - 1; i++) {
        qasm += `cx q[${i}], q[${i + 1}];\n`;
      }
    } else if (g.gateId === "Rx") {
      const angle = g.params?.theta ?? Math.PI / 2;
      qasm += `rx(${angle.toFixed(4)}) q[${g.qubit}];\n`;
    } else if (g.gateId === "Ry") {
      const angle = g.params?.theta ?? Math.PI / 2;
      qasm += `ry(${angle.toFixed(4)}) q[${g.qubit}];\n`;
    } else if (g.gateId === "Rz") {
      const angle = g.params?.theta ?? Math.PI / 2;
      qasm += `rz(${angle.toFixed(4)}) q[${g.qubit}];\n`;
    } else if (g.gateId === "U3") {
      const th = g.params?.theta ?? Math.PI / 2;
      const ph = g.params?.phi ?? 0;
      const lm = g.params?.lambda ?? Math.PI;
      qasm += `u3(${th.toFixed(4)}, ${ph.toFixed(4)}, ${lm.toFixed(4)}) q[${g.qubit}];\n`;
    } else if (g.gateId === "Tdg") {
      qasm += `tdg q[${g.qubit}];\n`;
    } else {
      qasm += `${symbol} q[${g.qubit}];\n`;
    }
  }

  return qasm;
}

/**
 * Import OpenQASM string into Circuit object
 */
export function importFromQASM(qasmCode: string): Circuit {
  const lines = qasmCode.split("\n");
  let numQubits = 4;
  const gates: CircuitGate[] = [];
  let currentStep = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("//") || line.startsWith("OPENQASM") || line.startsWith("include")) {
      continue;
    }

    const qregMatch = line.match(/qreg\s+q\[(\d+)\];/);
    if (qregMatch) {
      numQubits = Math.min(4, Math.max(1, parseInt(qregMatch[1], 10)));
      continue;
    }

    // Gate matches
    const cxMatch = line.match(/cx\s+q\[(\d+)\]\s*,\s*q\[(\d+)\];/i);
    const czMatch = line.match(/cz\s+q\[(\d+)\]\s*,\s*q\[(\d+)\];/i);
    const swapMatch = line.match(/swap\s+q\[(\d+)\]\s*,\s*q\[(\d+)\];/i);
    const singleGateMatch = line.match(/([a-z0-9]+)(\(([^)]+)\))?\s+q\[(\d+)\];/i);
    const measureMatch = line.match(/measure\s+q\[(\d+)\]\s*->\s*c\[(\d+)\];/i);
    const resetMatch = line.match(/reset\s+q\[(\d+)\];/i);

    if (cxMatch) {
      const ctrl = parseInt(cxMatch[1], 10);
      const tgt = parseInt(cxMatch[2], 10);
      if (ctrl < numQubits && tgt < numQubits) {
        gates.push({
          id: `qasm_${Date.now()}_${gates.length}`,
          gateId: "CX",
          qubit: ctrl,
          targetQubit: tgt,
          step: currentStep++,
        });
      }
    } else if (czMatch) {
      const ctrl = parseInt(czMatch[1], 10);
      const tgt = parseInt(czMatch[2], 10);
      if (ctrl < numQubits && tgt < numQubits) {
        gates.push({
          id: `qasm_${Date.now()}_${gates.length}`,
          gateId: "CZ",
          qubit: ctrl,
          targetQubit: tgt,
          step: currentStep++,
        });
      }
    } else if (swapMatch) {
      const q1 = parseInt(swapMatch[1], 10);
      const q2 = parseInt(swapMatch[2], 10);
      if (q1 < numQubits && q2 < numQubits) {
        gates.push({
          id: `qasm_${Date.now()}_${gates.length}`,
          gateId: "SWAP",
          qubit: q1,
          targetQubit: q2,
          step: currentStep++,
        });
      }
    } else if (measureMatch) {
      const q = parseInt(measureMatch[1], 10);
      if (q < numQubits) {
        gates.push({
          id: `qasm_${Date.now()}_${gates.length}`,
          gateId: "MEASURE",
          qubit: q,
          step: currentStep++,
        });
      }
    } else if (resetMatch) {
      const q = parseInt(resetMatch[1], 10);
      if (q < numQubits) {
        gates.push({
          id: `qasm_${Date.now()}_${gates.length}`,
          gateId: "RESET",
          qubit: q,
          step: currentStep++,
        });
      }
    } else if (singleGateMatch) {
      const gName = singleGateMatch[1].toUpperCase();
      const q = parseInt(singleGateMatch[4], 10);

      let gateId = gName;
      if (gName === "TDG") gateId = "Tdg";
      else if (gName === "H") gateId = "H";
      else if (gName === "X") gateId = "X";
      else if (gName === "Y") gateId = "Y";
      else if (gName === "Z") gateId = "Z";
      else if (gName === "S") gateId = "S";
      else if (gName === "T") gateId = "T";
      else if (gName === "RX") gateId = "Rx";
      else if (gName === "RY") gateId = "Ry";
      else if (gName === "RZ") gateId = "Rz";

      if (GATE_DEFS[gateId] && q < numQubits) {
        gates.push({
          id: `qasm_${Date.now()}_${gates.length}`,
          gateId: gateId,
          qubit: q,
          step: currentStep++,
        });
      }
    }
  }

  return {
    numQubits,
    gates,
  };
}
