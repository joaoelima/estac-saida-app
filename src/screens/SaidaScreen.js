// src/screens/SaidaScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { api, apiGet, getUserId } from "../services/api";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

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

  // dados retornados do backend após fechar (para usar no recibo)
  const [fechamento, setFechamento] = useState(null);

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

      const resp = await api(`/api/estacionamento/${ticket?._id}/saida`, {
        method: "PATCH",
        body: {
          user_id,
          forma_pagamento: formaPagamento,
          ...(convenioId ? { convenio_id: convenioId } : {}),
        },
      });

      setFechamento(resp?.ticket || null);

      const min = resp?.ticket?.minutos_total ?? minutos;
      const val = resp?.ticket?.valor_final ?? total;

      Alert.alert(
        "Saída finalizada",
        `Minutos: ${min}\nValor: R$ ${Number(val).toFixed(2)}`
      );

      // volta para a busca mantendo esta tela no histórico (para gerar PDF se quiser)
      navigation.reset({
        index: 0,
        routes: [{ name: "BuscaPlaca" }],
      });
    } catch (e) {
      Alert.alert("Erro", e?.message || "Não foi possível finalizar a saída.");
    } finally {
      setFechando(false);
    }
  }

  function formatBRL(v) {
    return `R$ ${Number(v || 0).toFixed(2)}`;
  }

  function horaBR(date) {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function dataHoraBR(date) {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleString("pt-BR");
  }

  async function gerarComprovante() {
    try {
      // dados do ticket (se já fechou usamos os oficiais do backend)
      const t = fechamento || ticket;

      const entrada = t?.hora_entrada;
      const saida = fechamento?.hora_saida || new Date().toISOString();

      const minutosCalc = fechamento?.minutos_total ?? minutos;
      const tarifaCalc = Number(t?.tarifa_por_minuto || tarifa);
      const subtotalCalc = Number((minutosCalc * tarifaCalc).toFixed(2));

      const convenioNome =
        fechamento?.convenio_aplicado?.nome || (conv ? conv.nome : "Nenhum");

      const descontoPct =
        fechamento?.convenio_aplicado?.desconto_percentual ??
        Number(conv?.desconto_percentual || 0);

      const descontoConvCalc = Number(
        ((subtotalCalc * descontoPct) / 100).toFixed(2)
      );
      const descontoExtraCalc = descExtraNum; // apenas local (backend atual não recebe)

      const totalCalc =
        fechamento?.valor_final ??
        Math.max(
          0,
          Number(
            (subtotalCalc - descontoConvCalc - descontoExtraCalc).toFixed(2)
          )
        );

      const formaPg = fechamento?.forma_pagamento || formaPagamento || "-";

      const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { font-family: Arial, Helvetica, sans-serif; }
          .wrap { width: 320px; margin: 0 auto; color: #111; }
          .title { text-align:center; margin: 4px 0 10px; }
          .row { margin: 6px 0; font-size: 13px; }
          .block { background: #f7f9fc; padding: 10px; border-radius: 8px; margin-top: 8px; }
          .total { font-size: 16px; font-weight: 700; margin-top: 6px; }
          hr { border: none; border-top: 1px solid #ddd; margin: 8px 0; }
          .muted { font-size: 11px; text-align:center; margin-top: 6px; color: #444; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h3 class="title">COMPROVANTE DE ESTACIONAMENTO</h3>
          <div class="row"><b>Placa:</b> ${t?.placa || "-"}</div>
          <div class="row"><b>Modelo:</b> ${t?.modelo || "-"}</div>
          <div class="row"><b>Entrada:</b> ${dataHoraBR(entrada)}</div>
          <div class="row"><b>Saída:</b> ${dataHoraBR(saida)}</div>
          <div class="row"><b>Permanência:</b> ${minutosCalc} min</div>
          <div class="row"><b>Tarifa:</b> ${formatBRL(tarifaCalc)} / min</div>
          <hr/>
          <div class="block">
            <div class="row"><b>Subtotal:</b> ${formatBRL(subtotalCalc)}</div>
            <div class="row"><b>Convênio:</b> ${convenioNome}${
        descontoPct ? ` (${descontoPct}% off)` : ""
      }</div>
            <div class="row"><b>Desconto convênio:</b> ${formatBRL(
              descontoConvCalc
            )}</div>
            <div class="row"><b>Desconto extra:</b> ${formatBRL(
              descontoExtraCalc
            )}</div>
            <div class="total">Total pago: ${formatBRL(totalCalc)}</div>
            <div class="row"><b>Forma de pagamento:</b> ${formaPg}</div>
          </div>
          <hr/>
          <div class="muted">Gerado em ${dataHoraBR(new Date())}</div>
        </div>
      </body>
      </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Compartilhar / enviar
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Compartilhar comprovante",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        // iOS sem Sharing disponível: abre o print nativo como fallback
        if (Platform.OS === "ios") {
          await Print.printAsync({ html });
        } else {
          Alert.alert(
            "Comprovante gerado",
            `Arquivo salvo em:\n${uri}\nCompartilhamento não disponível neste dispositivo.`
          );
        }
      }
    } catch (e) {
      Alert.alert(
        "Erro",
        e?.message || "Não foi possível gerar o comprovante."
      );
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
        <Text>Subtotal: {formatBRL(subtotal)}</Text>
        <Text>
          Convênio:{" "}
          {conv
            ? `${conv.nome} (${Number(conv.desconto_percentual)}% off)`
            : "Nenhum"}
        </Text>
        <Text>Desconto convênio: {formatBRL(descConv)}</Text>
        <Text>Desconto extra: {formatBRL(descExtraNum)}</Text>
        <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "700" }}>
          Total a pagar: {formatBRL(total)}
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
              marginRight: 8,
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
        Valor parcial: {formatBRL(subtotal)}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <TouchableOpacity
          onPress={gerarComprovante}
          style={{
            flex: 1,
            backgroundColor: "#1b2330",
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            Gerar Comprovante (PDF)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleFechar}
          disabled={fechando}
          style={{
            flex: 1,
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
    </View>
  );
}
