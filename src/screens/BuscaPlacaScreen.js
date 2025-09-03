import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { api } from "../services/api";

export default function BuscaPlacaScreen({ navigation }) {
  const [placa, setPlaca] = useState("");

  async function handleBuscar() {
    const p = placa.trim().toUpperCase();
    if (!p) return Alert.alert("Atenção", "Informe a placa.");
    try {
      // Ajuste a rota conforme seu back para buscar veículo/estacionamento aberto
      const info = await api(
        `/api/estacionamento/buscar?placa=${encodeURIComponent(p)}`
      );
      navigation.navigate("Saida", { placa: p, info });
    } catch (e) {
      Alert.alert("Não encontrado", e?.message || "Placa não localizada.");
    }
  }

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 14 }}>
        Buscar Placa
      </Text>
      <TextInput
        value={placa}
        onChangeText={setPlaca}
        autoCapitalize="characters"
        placeholder="ABC1D23"
        maxLength={8}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />
      <TouchableOpacity
        onPress={handleBuscar}
        style={{
          backgroundColor: "#22bb33",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}
