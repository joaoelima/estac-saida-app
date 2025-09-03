import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { api } from "../services/api";

/**
 * Espera-se que "info" traga:
 *  - entrada: ISO ou "YYYY-MM-DD HH:mm"
 *  - tarifaMinuto (centavos ou reais) OU idServicoEstacionamento
 *  - convenioOpcional: { id, nome, descontoPercent? }
 * Ajuste conforme seu back.
 */

function diffMinutos(inicioISO, fim = new Date()) {
  const ini = new Date(inicioISO);
  return Math.max(0, Math.round((fim - ini) / 60000));
}

export default function SaidaScreen({ route, navigation }) {
  const { placa, info } = route.params || {};
  const [fechando, setFechando] = useState(false);

  const minutos = useMemo(() => diffMinutos(info?.entrada), [info?.entrada]);

  const valor = useMemo(() => {
    const tarifa = Number(info?.tarifaMinuto || 0);
    let v = minutos * tarifa;
    if (info?.convenio?.descontoPercent) {
      v = v * (1 - info.convenio.descontoPercent / 100);
    }
    return Number.isFinite(v) ? v : 0;
  }, [minutos, info?.tarifaMinuto, info?.convenio]);

  async function handleFechar() {
    try {
      setFechando(true);
      // Ajuste a rota de fechamento conforme seu back
      await api(`/api/estacionamento/fechar`, {
        method: "POST",
        body: {
          placa,
          minutos,
          valor,
          convenioId: info?.convenio?.id || null,
        },
      });
      Alert.alert("OK", "Saída finalizada.");
      navigation.popToTop();
    } catch (e) {
      Alert.alert("Erro", e?.message || "Não foi possível finalizar a saída.");
    } finally {
      setFechando(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>
        Placa: <Text style={{ fontWeight: "700" }}>{placa}</Text>
      </Text>
      <Text style={{ marginBottom: 6 }}>
        Entrada: {info?.entrada ? new Date(info.entrada).toLocaleString() : "-"}
      </Text>
      <Text style={{ marginBottom: 6 }}>Permanência: {minutos} min</Text>
      <Text style={{ marginBottom: 6 }}>
        Convênio: {info?.convenio?.nome || "Nenhum"}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "700", marginVertical: 14 }}>
        Valor: R$ {Number(valor).toFixed(2)}
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
