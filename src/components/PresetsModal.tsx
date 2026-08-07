import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet } from "react-native";
import { Circuit, CircuitGate } from "../engine/quantumState";
import { exportToQASM, importFromQASM } from "../engine/qasm";
import { Sparkles, Code2, X, Check, Copy, Upload } from "lucide-react-native";

interface PresetsModalProps {
  visible: boolean;
  mode: "presets" | "qasm";
  onClose: () => void;
  onLoadCircuit: (circuit: Circuit) => void;
  currentCircuit: Circuit;
}

export const PRESET_CIRCUITS: { id: string; name: string; desc: string; numQubits: number; gates: CircuitGate[] }[] = [
  {
    id: "bell",
    name: "Bell Pair Creation (|Φ⁺⟩)",
    desc: "Generates maximally entangled 2-qubit state (|00⟩ + |11⟩)/√2 using H and CNOT.",
    numQubits: 2,
    gates: [
      { id: "p_b1", gateId: "H", qubit: 0, step: 0 },
      { id: "p_b2", gateId: "CX", qubit: 0, targetQubit: 1, step: 1 },
    ],
  },
  {
    id: "ghz",
    name: "GHZ 4-Qubit State (|GHZ₄⟩)",
    desc: "Generates 4-qubit entangled state (|0000⟩ + |1111⟩)/√2.",
    numQubits: 4,
    gates: [
      { id: "p_g1", gateId: "H", qubit: 0, step: 0 },
      { id: "p_g2", gateId: "CX", qubit: 0, targetQubit: 1, step: 1 },
      { id: "p_g3", gateId: "CX", qubit: 1, targetQubit: 2, step: 2 },
      { id: "p_g4", gateId: "CX", qubit: 2, targetQubit: 3, step: 3 },
    ],
  },
  {
    id: "teleportation",
    name: "Quantum Teleportation Protocol",
    desc: "Teleports quantum state from q[0] to q[2] using EPR pair on (q[1], q[2]).",
    numQubits: 3,
    gates: [
      { id: "p_t1", gateId: "H", qubit: 1, step: 0 },
      { id: "p_t2", gateId: "CX", qubit: 1, targetQubit: 2, step: 1 },
      { id: "p_t3", gateId: "CX", qubit: 0, targetQubit: 1, step: 2 },
      { id: "p_t4", gateId: "H", qubit: 0, step: 3 },
      { id: "p_t5", gateId: "MEASURE", qubit: 0, step: 4 },
      { id: "p_t6", gateId: "MEASURE", qubit: 1, step: 4 },
    ],
  },
  {
    id: "qft4",
    name: "4-Qubit Quantum Fourier Transform",
    desc: "Applies QFT phase transformation across 4 qubits.",
    numQubits: 4,
    gates: [
      { id: "p_q1", gateId: "H", qubit: 0, step: 0 },
      { id: "p_q2", gateId: "S", qubit: 1, step: 1 },
      { id: "p_q3", gateId: "H", qubit: 1, step: 2 },
      { id: "p_q4", gateId: "T", qubit: 2, step: 3 },
      { id: "p_q5", gateId: "H", qubit: 2, step: 4 },
      { id: "p_q6", gateId: "H", qubit: 3, step: 5 },
      { id: "p_q7", gateId: "SWAP", qubit: 0, targetQubit: 3, step: 6 },
      { id: "p_q8", gateId: "SWAP", qubit: 1, targetQubit: 2, step: 7 },
    ],
  },
  {
    id: "grover",
    name: "Grover Search Oracle Iteration",
    desc: "Applies equal superposition, oracle phase inversion, and diffusion operator.",
    numQubits: 3,
    gates: [
      { id: "p_gr1", gateId: "H", qubit: 0, step: 0 },
      { id: "p_gr2", gateId: "H", qubit: 1, step: 0 },
      { id: "p_gr3", gateId: "H", qubit: 2, step: 0 },
      { id: "p_gr4", gateId: "CZ", qubit: 0, targetQubit: 2, step: 1 },
      { id: "p_gr5", gateId: "H", qubit: 0, step: 2 },
      { id: "p_gr6", gateId: "H", qubit: 1, step: 2 },
      { id: "p_gr7", gateId: "H", qubit: 2, step: 2 },
    ],
  },
];

export const PresetsModal: React.FC<PresetsModalProps> = ({
  visible,
  mode,
  onClose,
  onLoadCircuit,
  currentCircuit,
}) => {
  const [qasmText, setQasmText] = useState(() => exportToQASM(currentCircuit));
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (visible && mode === "qasm") {
      setQasmText(exportToQASM(currentCircuit));
    }
  }, [visible, mode, currentCircuit]);

  const handleImportQASM = () => {
    try {
      const imported = importFromQASM(qasmText);
      onLoadCircuit(imported);
      onClose();
    } catch (err) {
      alert("Failed to parse QASM code!");
    }
  };

  const handleCopyQASM = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleGroup}>
              {mode === "presets" ? (
                <Sparkles color="#a855f7" size={20} />
              ) : (
                <Code2 color="#38bdf8" size={20} />
              )}
              <Text style={styles.modalTitleText}>
                {mode === "presets" ? "Algorithm Presets Gallery" : "OpenQASM 2.0 Code Editor"}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color="#94a3b8" size={18} />
            </TouchableOpacity>
          </View>

          {/* Presets List */}
          {mode === "presets" && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.presetsList}>
                {PRESET_CIRCUITS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.presetCard}
                    onPress={() => {
                      onLoadCircuit({ numQubits: p.numQubits, gates: p.gates });
                      onClose();
                    }}
                  >
                    <View style={styles.presetHeaderRow}>
                      <Text style={styles.presetNameText}>{p.name}</Text>
                      <View style={styles.qubitBadge}>
                        <Text style={styles.qubitBadgeText}>{p.numQubits} Qubits</Text>
                      </View>
                    </View>
                    <Text style={styles.presetDescText}>{p.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* QASM Code Editor */}
          {mode === "qasm" && (
            <View style={styles.modalBody}>
              <TextInput
                style={styles.qasmCodeInput}
                multiline
                value={qasmText}
                onChangeText={setQasmText}
                placeholder="Enter OpenQASM 2.0 code here..."
                placeholderTextColor="#64748b"
              />

              <View style={styles.qasmActionsRow}>
                <TouchableOpacity style={styles.qasmImportBtn} onPress={handleImportQASM}>
                  <Upload color="#ffffff" size={16} />
                  <Text style={styles.qasmImportText}>Load QASM to Canvas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.qasmCopyBtn} onPress={handleCopyQASM}>
                  {copied ? <Check color="#10b981" size={16} /> : <Copy color="#38bdf8" size={16} />}
                  <Text style={styles.qasmCopyText}>{copied ? "Copied!" : "Copy QASM"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "85%",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    overflow: "hidden",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitleText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  modalBody: {
    padding: 16,
  },
  presetsList: {
    gap: 10,
  },
  presetCard: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  presetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  presetNameText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  qubitBadge: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qubitBadgeText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "700",
  },
  presetDescText: {
    color: "#94a3b8",
    fontSize: 11,
  },
  qasmCodeInput: {
    height: 260,
    backgroundColor: "#090d16",
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: 13,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    textAlignVertical: "top",
  },
  qasmActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  qasmImportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#38bdf8",
    paddingVertical: 10,
    borderRadius: 8,
  },
  qasmImportText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
  },
  qasmCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  qasmCopyText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "700",
  },
});
