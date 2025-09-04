// src/screens/BuscaPlacaScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiGet } from "../services/api"; // <- caminho e helper corretos

function normalizaPlaca(txt = "") {
  return String(txt)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export default function BuscarPlacaScreen({ navigation }) {
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);

  async function onContinuar() {
    const p = normalizaPlaca(placa);
    if (!p || p.length < 6) {
      Alert.alert("Placa inválida", "Digite uma placa válida (ex.: ABC1D23).");
      return;
    }

    setLoading(true);
    try {
      const userId =
        (await SecureStore.getItemAsync("user_id")) ||
        "6889c4a922ac1c1fa33365b4";

      const ticket = await apiGet("/api/estacionamento/por-placa", {
        placa: p,
        user_id: userId,
      });

      navigation.navigate("FechamentoEstacionamento", { ticket });
    } catch (err) {
      if (err.status === 404) {
        Alert.alert("Não encontrado", "Nenhum ticket aberto para esta placa.");
      } else {
        Alert.alert("Erro de rede", String(err.message || err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
        Estacionamento
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>Buscar Placa</Text>

      <TextInput
        value={placa}
        onChangeText={setPlaca}
        autoCapitalize="characters"
        placeholder="ABC1D23"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <TouchableOpacity
        onPress={onContinuar}
        disabled={loading}
        style={{
          backgroundColor: "#0a9911",
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Continuar
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
