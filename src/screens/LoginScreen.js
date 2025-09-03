import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { login, getUser } from "../services/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Se já estiver logado, vai direto
    (async () => {
      const u = await getUser();
      if (u?.id) navigation.replace("BuscaPlaca");
    })();
  }, []);

  async function handleEntrar() {
    if (!email || !senha)
      return Alert.alert("Atenção", "Informe e-mail e senha.");
    try {
      setLoading(true);
      await login(email.trim(), senha);
      navigation.replace("BuscaPlaca");
    } catch (e) {
      Alert.alert("Erro no login", e?.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 26, fontWeight: "700", marginBottom: 24 }}>
        Estac Saída
      </Text>

      <Text style={{ marginBottom: 6 }}>E-mail</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="seuemail@dominio.com"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 14,
        }}
      />

      <Text style={{ marginBottom: 6 }}>Senha</Text>
      <TextInput
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        placeholder="••••••••"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 18,
        }}
      />

      <TouchableOpacity
        onPress={handleEntrar}
        disabled={loading}
        style={{
          backgroundColor: "#1976ed",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {loading ? "Entrando..." : "Entrar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
