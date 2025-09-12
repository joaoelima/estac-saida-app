// src/screens/LoginScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { login } from "../services/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false); // 👈 controla a visibilidade da senha

  async function onEntrar() {
    try {
      setLoading(true);
      if (!email || !senha) {
        Alert.alert("Atenção", "Informe e-mail e senha.");
        return;
      }
      await login(email.trim(), senha);
      navigation.replace("BuscaPlaca"); // rota que já existe no App.js
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
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha} // 👈 alterna senha visível/oculta
          placeholder="••••••••"
          style={{
            flex: 1,
            padding: 12,
          }}
        />
        <TouchableOpacity
          onPress={() => setMostrarSenha((v) => !v)}
          style={{ paddingHorizontal: 12 }}
        >
          <Icon
            name={mostrarSenha ? "eye-off" : "eye"}
            size={22}
            color="#333"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onEntrar}
        disabled={loading}
        style={{
          backgroundColor: "#1976ed",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
          {loading ? "Entrando..." : "Entrar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
