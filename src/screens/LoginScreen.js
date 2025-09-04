// src/screens/LoginScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { login } from "../services/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onEntrar() {
    try {
      setLoading(true);
      if (!email || !senha) {
        Alert.alert("Atenção", "Informe e-mail e senha.");
        return;
      }
      await login(email.trim(), senha);
      navigation.replace("Parking");
    } catch (e) {
      Alert.alert("Erro no login", String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 24 }}>
        Entrar
      </Text>

      <Text style={{ marginBottom: 8, fontWeight: "600" }}>E-mail</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="seu@email.com"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      />

      <Text style={{ marginBottom: 8, fontWeight: "600" }}>Senha</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!showSenha} // <- mascara
          placeholder="••••••••"
          style={{ flex: 1, paddingVertical: 12 }}
        />
        <TouchableOpacity onPress={() => setShowSenha((v) => !v)}>
          <Text style={{ color: "#1976ed", fontWeight: "700" }}>
            {showSenha ? "Ocultar" : "Mostrar"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onEntrar}
        disabled={loading}
        style={{
          backgroundColor: "#1976ed",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 22,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {loading ? "Entrando..." : "Entrar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
