// src/screens/SaidaScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { api, apiGet, getUserId } from "../services/api";

function diffMinutos(inicioISO, fim = new Date()) {
  const ini = new Date(inicioISO);
  return Math.max(1, Math.ceil((fim - ini) / 60000));
}

export default function SaidaScreen({ route, navigation }) {
  const { ticket } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [fechando, setFechando] = useState(false);

  // convênios & forma de pagamento
  const [convenios, setConvenios] = useState([]);
  const [convenioId, setConvenioId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [descontoExtra, setDescontoExtra] = useState("0");

  // carrega convênios do usuário
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const user_id = await getUserId();
        if (!user_id) return;
        const lista = await apiGet("/api/convenios", { user_id });
        setConvenios(Array.isArray(lista) ? lista : []);
      } catch {
        setConvenios([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const minutos = useMemo(
    () => (ticket?.hora_entrada ? diffMinutos(ticket.hora_entrada) : 0),
    [ticket?.hora_entrada]
  );

  const tarifa = Number(ticket?.tarifa_por_minuto || 0);
  const subtotal = useMemo(
    () => Number((minutos * tarifa).toFixed(2)),
    [minutos, tarifa]
  );

  const conv = useMemo(
    () => convenios.find((c) => String(c._id) === String(convenioId)),
    [convenios, convenioId]
  );

  const descConv = useMemo(() => {
    const pct = Number(conv?.desconto_percentual || 0);
    return Number(((subtotal * pct) / 100).toFixed(2));
  }, [subtotal, conv]);

  const descExtraNum = useMemo(
    () => Number(descontoExtra || 0),
    [descontoExtra]
  );

  const total = useMemo(
    () => Math.max(0, Number((subtotal - descConv - descExtraNum).toFixed(2))),
    [subtotal, descConv, descExtraNum]
  );

  async function handleFechar() {
    try {
      setFechando(true);

      const user_id = await getUserId();
      if (!user_id) {
        Alert.alert("Erro", "Usuário não identificado.");
        return;
      }

      // Backend aceita: forma_pagamento e opcional convenio_id
      const resp = await api(`/api/estacionamento/${ticket?._id}/saida`, {
        method: "PATCH",
        body: {
          user_id,
          forma_pagamento: formaPagamento,
          ...(convenioId ? { convenio_id: convenioId } : {}),
        },
      });

      const min = resp?.ticket?.minutos_total ?? minutos;
      const val = resp?.ticket?.valor_final ?? total;

      Alert.alert(
        "Saída finalizada",
        `Minutos: ${min}\nValor: R$ ${Number(val).toFixed(2)}`
      );

      // ⚠️ Troca o popToTop() (nem sempre existe) por navegação segura:
      navigation.reset({
        index: 0,
        routes: [{ name: "BuscaPlaca" }],
      });
    } catch (e) {
      // Mostra a mensagem real do erro
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

      {/* Resumo financeiro */}
      <View
        style={{
          backgroundColor: "#f7f9fc",
          padding: 12,
          borderRadius: 10,
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        <Text>Tarifa (R$/min): {tarifa.toFixed(2)}</Text>
        <Text>Subtotal: R$ {subtotal.toFixed(2)}</Text>
        <Text>
          Convênio:{" "}
          {conv
            ? `${conv.nome} (${Number(conv.desconto_percentual)}% off)`
            : "Nenhum"}
        </Text>
        <Text>Desconto convênio: R$ {descConv.toFixed(2)}</Text>
        <Text>Desconto extra: R$ {descExtraNum.toFixed(2)}</Text>
        <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "700" }}>
          Total a pagar: R$ {total.toFixed(2)}
        </Text>
      </View>

      {/* Convênio */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Convênio</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {/* Select simples sem lib (lista clicável) */}
          <TouchableOpacity
            onPress={() => setConvenioId("")}
            style={{
              padding: 12,
              backgroundColor: convenioId ? "#fff" : "#e5f0ff",
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text>Nenhum</Text>
          </TouchableOpacity>
          {convenios.map((c) => (
            <TouchableOpacity
              key={c._id}
              onPress={() => setConvenioId(c._id)}
              style={{
                padding: 12,
                backgroundColor:
                  String(convenioId) === String(c._id) ? "#e5f0ff" : "#fff",
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
              }}
            >
              <Text>
                {c.nome}{" "}
                {c.desconto_percentual
                  ? `(${Number(c.desconto_percentual)}% off)`
                  : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Forma de pagamento */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>
        Forma de pagamento
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {["pix", "debito", "credito", "dinheiro"].map((fp) => (
          <TouchableOpacity
            key={fp}
            onPress={() => setFormaPagamento(fp)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#ccc",
              backgroundColor: formaPagamento === fp ? "#1976ed" : "#fff",
            }}
          >
            <Text
              style={{
                color: formaPagamento === fp ? "#fff" : "#000",
                fontWeight: "600",
              }}
            >
              {fp}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Desconto extra (apenas cálculo local) */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>
        Desconto extra (R$)
      </Text>
      <TextInput
        value={descontoExtra}
        onChangeText={setDescontoExtra}
        keyboardType="decimal-pad"
        placeholder="0,00"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      />

      <Text style={{ fontSize: 22, fontWeight: "700", marginVertical: 14 }}>
        Valor parcial: R$ {subtotal.toFixed(2)}
      </Text>

      <TouchableOpacity
        onPress={handleFechar}
        disabled={fechando}
        style={{
          backgroundColor: "#1976ed",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
          opacity: fechando ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {fechando ? "Finalizando..." : "Finalizar Saída"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
