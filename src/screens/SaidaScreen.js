// src/screens/SaidaScreen.js
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { api, getUserId } from "../services/api";

function diffMinutos(inicioISO, fim = new Date()) {
  const ini = new Date(inicioISO);
  return Math.max(1, Math.ceil((fim - ini) / 60000));
}

export default function SaidaScreen({ route, navigation }) {
  // Recebe o ticket inteiro da tela anterior
  const { ticket } = route.params || {};
  const [fechando, setFechando] = useState(false);

  const minutos = useMemo(
    () => (ticket?.hora_entrada ? diffMinutos(ticket.hora_entrada) : 0),
    [ticket?.hora_entrada]
  );

  const valor = useMemo(() => {
    const tarifa = Number(ticket?.tarifa_por_minuto || 0);
    return Number((minutos * tarifa).toFixed(2));
  }, [minutos, ticket?.tarifa_por_minuto]);

  async function handleFechar() {
    try {
      setFechando(true);

      const userId = await getUserId();
      if (!userId) {
        Alert.alert("Erro", "Usuário não identificado.");
        return;
      }

      // Forma de pagamento (ajuste depois para seleção na UI)
      const forma_pagamento = "pix";

      const closed = await api(`/api/estacionamento/${ticket?._id}/saida`, {
        method: "PATCH",
        body: {
          user_id: userId,
          forma_pagamento,
        },
      });

      Alert.alert(
        "OK",
        `Saída finalizada.\nMin: ${
          closed.ticket?.minutos_total
        }\nValor: R$ ${Number(closed.ticket?.valor_final || valor).toFixed(2)}`
      );
      navigation.popToTop();
    } catch (e) {
      Alert.alert("Erro", e?.message || "Não foi possível finalizar a saída.");
    } finally {
      setFechando(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
        Fechar Saída
      </Text>

      <Text style={{ marginBottom: 6 }}>
        Placa: <Text style={{ fontWeight: "700" }}>{ticket?.placa || "-"}</Text>
      </Text>
      <Text style={{ marginBottom: 6 }}>
        Entrada:{" "}
        {ticket?.hora_entrada
          ? new Date(ticket.hora_entrada).toLocaleString("pt-BR")
          : "-"}
      </Text>
      <Text style={{ marginBottom: 6 }}>Permanência: {minutos} min</Text>
      <Text style={{ fontSize: 22, fontWeight: "700", marginVertical: 14 }}>
        Valor parcial: R$ {Number(valor).toFixed(2)}
      </Text>

      <TouchableOpacity
        onPress={handleFechar}
        disabled={fechando}
        style={{
          backgroundColor: "#1976ed",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {fechando ? "Finalizando..." : "Finalizar Saída"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
