import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { GATE_DEFS, GateCategory, GateDef } from "../engine/quantumGates";
import { Layers, Sparkles, Sliders, Info, Split } from "lucide-react-native";

interface GatePaletteProps {
  selectedGateId: string | null;
  onSelectGate: (gateId: string) => void;
  twoQubitPending?: { qubit: number; step: number; gateId: string } | null;
}

export const GatePalette: React.FC<GatePaletteProps> = ({
  selectedGateId,
  onSelectGate,
  twoQubitPending,
}) => {
  const [activeCategory, setActiveCategory] = useState<GateCategory | "all">("all");
  const [hoveredGate, setHoveredGate] = useState<GateDef | null>(null);

  const categories: { id: GateCategory | "all"; label: string }[] = [
    { id: "all", label: "All Gates" },
    { id: "clifford", label: "Clifford Set" },
    { id: "universal", label: "Universal Set" },
    { id: "composed", label: "Composed (Expandable)" },
    { id: "measure", label: "Measure / Reset" },
  ];

  const gatesList = Object.values(GATE_DEFS).filter(
    (g) => activeCategory === "all" || g.category === activeCategory
  );

  return (
    <View style={styles.paletteContainer}>
      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollView}>
        <View style={styles.tabsRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.tabItem,
                activeCategory === cat.id && styles.tabItemActive,
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeCategory === cat.id && styles.tabTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Gate Icons Grid */}
      <ScrollView style={styles.gatesScrollView} contentContainerStyle={styles.gatesGrid}>
        {gatesList.map((g) => {
          const isSelected = selectedGateId === g.id;

          return (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.gateCard,
                { borderColor: g.color },
                isSelected && styles.gateCardSelected,
              ]}
              onPress={() => onSelectGate(g.id)}
            >
              <View style={[styles.gateSymbolBadge, { backgroundColor: g.color }]}>
                <Text
                  style={[
                    styles.gateSymbolText,
                    { fontSize: g.symbol.length <= 1 ? 14 : g.symbol.length === 2 ? 11 : 9 },
                  ]}
                >
                  {g.symbol}
                </Text>
              </View>

              <View style={styles.gateInfoBlock}>
                <View style={styles.gateNameRow}>
                  <Text style={styles.gateNameText}>{g.name}</Text>
                  {g.isComposed && (
                    <View style={styles.expandTag}>
                      <Split size={10} color="#38bdf8" />
                      <Text style={styles.expandTagText}>Expand</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gateDescText} numberOfLines={1}>
                  {g.description}
                </Text>
              </View>

              <View style={styles.qubitCountBadge}>
                <Text style={styles.qubitCountText}>{g.numQubits}Q</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Two-click placement hint for CX, CZ, SWAP */}
      {(selectedGateId === "CX" || selectedGateId === "CZ" || selectedGateId === "SWAP") && (
        <View style={[styles.placementHint, twoQubitPending ? styles.placementHintStep2 : styles.placementHintStep1]}>
          <Text style={styles.placementHintStep}>
            {twoQubitPending ? "Step 2 / 2" : "Step 1 / 2"}
          </Text>
          <Text style={styles.placementHintText}>
            {twoQubitPending
              ? `Now click the target qubit on the same column`
              : `Click the control qubit wire on the circuit`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  paletteContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderRightWidth: 1,
    borderRightColor: "rgba(56, 189, 248, 0.2)",
    width: 270,
    flexDirection: "column",
  },
  tabsScrollView: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  tabItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
  },
  tabItemActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.5)",
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#38bdf8",
  },
  gatesScrollView: {
    flex: 1,
    padding: 8,
  },
  gatesGrid: {
    gap: 8,
  },
  gateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    gap: 10,
  },
  gateCardSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.25)",
    borderWidth: 2,
    shadowColor: "#38bdf8",
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  gateSymbolBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gateSymbolText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  gateInfoBlock: {
    flex: 1,
  },
  gateNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gateNameText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  expandTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandTagText: {
    color: "#38bdf8",
    fontSize: 9,
    fontWeight: "700",
  },
  gateDescText: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2,
  },
  qubitCountBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qubitCountText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
  },
  placementHint: {
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  placementHintStep1: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  placementHintStep2: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  placementHintStep: {
    color: "#38bdf8",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  placementHintText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },
});
