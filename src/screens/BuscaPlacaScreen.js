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
import { estacionamentos, getUserId } from "../services/api";

function normalizaPlaca(txt = "") {
  return String(txt)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export default function BuscaPlacaScreen({ navigation }) {
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
      const user_id = await getUserId();
      if (!user_id) {
        Alert.alert("Erro", "Usuário não identificado.");
        return;
      }

      // Passa também o user_id na chamada
      const ticket = await estacionamentos.getByPlaca(p, { user_id });

      // NOME DA ROTA EXISTENTE NO App.js
      navigation.navigate("Saida", { ticket });
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.includes("404") || msg.toLowerCase().includes("não encontrado")) {
        Alert.alert("Não encontrado", "Nenhum ticket aberto para esta placa.");
      } else {
        Alert.alert("Erro", msg);
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
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            Continuar
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
