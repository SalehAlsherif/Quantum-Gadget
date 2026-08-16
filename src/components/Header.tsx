import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Atom, Play, Trash2, Code2, Sparkles, RotateCcw } from "lucide-react-native";

interface HeaderProps {
  numQubits: number;
  onSelectQubits: (n: number) => void;
  onClear: () => void;
  onResetState: () => void;
  onOpenQASM: () => void;
  onOpenPresets: () => void;
  selectedStep: number;
}

export const Header: React.FC<HeaderProps> = ({
  numQubits,
  onSelectQubits,
  onClear,
  onResetState,
  onOpenQASM,
  onOpenPresets,
  selectedStep,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Brand Title */}
      <View style={styles.brandGroup}>
        <View style={styles.iconGlow}>
          <Atom color="#38bdf8" size={22} />
        </View>
        <View style={styles.brandTextBlock}>
          <Text style={styles.titleText}>Quantum Gadget</Text>
          <Text style={styles.subtitleText}>Nielsen & Chuang Engine • 4 Qubit Simulator</Text>
        </View>
      </View>

      {/* Qubit Wire Count Selector */}
      <View style={styles.qubitSelectorGroup}>
        <Text style={styles.labelText}>Qubits:</Text>
        {[1, 2, 3, 4].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.qubitBtn, numQubits === n && styles.qubitBtnActive]}
            onPress={() => onSelectQubits(n)}
          >
            <Text style={[styles.qubitBtnText, numQubits === n && styles.qubitBtnTextActive]}>
              {n}Q
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionsGroup}>
        <TouchableOpacity style={styles.actionBtnPreset} onPress={onOpenPresets}>
          <Sparkles color="#a855f7" size={16} />
          <Text style={styles.actionBtnPresetText}>Presets</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnQASM} onPress={onOpenQASM}>
          <Code2 color="#38bdf8" size={16} />
          <Text style={styles.actionBtnQASMText}>QASM 2.0</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnReset} onPress={onResetState}>
          <RotateCcw color="#94a3b8" size={16} />
          <Text style={styles.actionBtnResetText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnClear} onPress={onClear}>
          <Trash2 color="#f43f5e" size={16} />
          <Text style={styles.actionBtnClearText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "column",
    gap: 10,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 189, 248, 0.2)",
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconGlow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  brandTextBlock: {
    flexShrink: 1,
  },
  titleText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
  },
  qubitSelectorGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  labelText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  qubitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  qubitBtnActive: {
    backgroundColor: "#38bdf8",
  },
  qubitBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  qubitBtnTextActive: {
    color: "#0f172a",
  },
  actionsGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  actionBtnPreset: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnPresetText: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnQASM: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnQASMText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnReset: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnResetText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
  },
  actionBtnClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnClearText: {
    color: "#fb7185",
    fontSize: 12,
    fontWeight: "600",
  },
});
