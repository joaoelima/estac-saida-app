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

/** Fallback: calcula minutos entre a hora_entrada e agora, arredondando pra cima */
function diffMinutos(inicioISO, fim = new Date()) {
  const ini = new Date(inicioISO);
  return Math.max(1, Math.ceil((fim - ini) / 60000));
}

/** Formata currency PT-BR */
function formatBRL(n) {
  return `R$ ${(Number(n) || 0).toFixed(2)}`;
}

/** Helpers de data/hora */
function dataHoraBR(date) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("pt-BR");
}

export default function SaidaScreen({ route, navigation }) {
  const { ticket } = route.params || {};
  const [loadingInit, setLoadingInit] = useState(true);
  const [fechando, setFechando] = useState(false);

  // convênios & forma de pagamento
  const [convenios, setConvenios] = useState([]);
  const [convenioId, setConvenioId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [descontoExtra, setDescontoExtra] = useState("0");

  // dados retornados do backend após fechar (para usar no recibo)
  const [fechamento, setFechamento] = useState(null);

  // resumo de cobrança vindo do backend (com a regra atual)
  const [resumo, setResumo] = useState(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [erroResumo, setErroResumo] = useState("");

  /** Carrega convênios e primeiro resumo */
  useEffect(() => {
    (async () => {
      try {
        setLoadingInit(true);
        const user_id = await getUserId();
        if (!user_id) return;

        // Carregar convênios
        const lista = await apiGet("/api/convenios", { user_id });
        setConvenios(Array.isArray(lista) ? lista : []);

        // Carregar resumo inicial (sem convênio selecionado)
        await carregarResumo(user_id, ticket?._id, "");
      } catch {
        setConvenios([]);
      } finally {
        setLoadingInit(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id]);

  /** Recarrega resumo quando trocar de convênio */
  useEffect(() => {
    (async () => {
      const user_id = await getUserId();
      if (!user_id || !ticket?._id) return;
      await carregarResumo(user_id, ticket._id, convenioId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convenioId]);

  /** Chama o endpoint de resumo no backend */
  async function carregarResumo(user_id, ticketId, convId) {
    if (!ticketId) return;
    setCarregandoResumo(true);
    setErroResumo("");
    try {
      const qs = new URLSearchParams({
        user_id,
        ...(convId ? { convenio_id: convId } : {}),
      }).toString();

      // GET /api/estacionamento/:id/resumo?user_id=...&convenio_id=...
      const data = await apiGet(`/api/estacionamento/${ticketId}/resumo`, qs);
      // Esperado: { minutos, tarifa_label, modo, subtotal, desconto_convenio, total_sugerido }
      setResumo(data || null);
    } catch (e) {
      // Se o backend ainda não tiver o endpoint, mantemos resumo=null e usamos fallback
      setResumo(null);
      setErroResumo(
        "Não foi possível carregar o resumo automático. Usando cálculo simples por minuto (fallback)."
      );
    } finally {
      setCarregandoResumo(false);
    }
  }

  /** Fallback/cálculo local */
  const minutosFallback = useMemo(
    () => (ticket?.hora_entrada ? diffMinutos(ticket.hora_entrada) : 0),
    [ticket?.hora_entrada]
  );
  const tarifaMin = Number(ticket?.tarifa_por_minuto || 0);
  const subtotalFallback = useMemo(
    () => Number((minutosFallback * tarifaMin).toFixed(2)),
    [minutosFallback, tarifaMin]
  );

  /** Convênio selecionado (para exibir no card) */
  const convSel = useMemo(
    () => convenios.find((c) => String(c._id) === String(convenioId)),
    [convenios, convenioId]
  );

  /** Descontos */
  const descExtraNum = useMemo(
    () => Number(descontoExtra || 0),
    [descontoExtra]
  );

  /** Valores a exibir (preferindo o resumo do backend; fallback se não houver) */
  const minutos = resumo?.minutos ?? minutosFallback;
  const tarifaLabel =
    resumo?.tarifa_label ??
    (tarifaMin > 0 ? `${formatBRL(tarifaMin)} / min` : "-");
  const subtotal = resumo?.subtotal ?? subtotalFallback;
  const descontoConvenio =
    resumo?.desconto_convenio ??
    (() => {
      const pct = Number(convSel?.desconto_percentual || 0);
      return Number(((subtotalFallback * pct) / 100).toFixed(2));
    })();
  const totalBase =
    resumo?.total_sugerido ?? Number((subtotal - descontoConvenio).toFixed(2));
  const total = Math.max(0, Number((totalBase - descExtraNum).toFixed(2)));

  /** Finalizar saída */
  async function handleFechar() {
    try {
      setFechando(true);
      const user_id = await getUserId();
      if (!user_id) {
        Alert.alert("Erro", "Usuário não identificado.");
        return;
      }

      const payload = {
        user_id,
        forma_pagamento: formaPagamento,
        ...(convenioId ? { convenio_id: convenioId } : {}),
        // desconto_extra não está sendo persistido no backend (mantido local)
      };

      const resp = await api(`/api/estacionamento/${ticket?._id}/saida`, {
        method: "PATCH",
        body: payload,
      });

      setFechamento(resp?.ticket || null);

      const min = resp?.ticket?.minutos_total ?? minutos;
      const val = resp?.ticket?.valor_final ?? total;

      Alert.alert(
        "Saída finalizada",
        `Minutos: ${min}\nValor: R$ ${Number(val).toFixed(2)}`
      );

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

  /** Comprovante (PDF) */
  async function gerarComprovante() {
    try {
      // Usa o ticket fechado se já houver, senão usa o ticket e o resumo atual
      const t = fechamento || ticket;

      const entrada = t?.hora_entrada;
      const saida = fechamento?.hora_saida || new Date().toISOString();

      const minutosCalc = fechamento?.minutos_total ?? minutos;
      const tarifaTexto =
        fechamento?.tarifa_label || resumo?.tarifa_label || tarifaLabel;

      const subtotalCalc =
        fechamento?.valor_bruto ?? resumo?.subtotal ?? subtotalFallback;

      const convenioNome =
        fechamento?.convenio_aplicado?.nome ||
        (convSel ? convSel.nome : "Nenhum");

      const descontoPct =
        fechamento?.convenio_aplicado?.desconto_percentual ??
        Number(convSel?.desconto_percentual || 0);

      const descontoConvCalc =
        fechamento?.desconto_convenio ??
        Number(((subtotalCalc * (descontoPct || 0)) / 100).toFixed(2));

      const descontoExtraCalc = descExtraNum; // local

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
          <div class="row"><b>Tarifa aplicada:</b> ${tarifaTexto || "-"}</div>
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

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Compartilhar comprovante",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
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

      {/* Resumo / valores */}
      <View
        style={{
          backgroundColor: "#f7f9fc",
          padding: 12,
          borderRadius: 10,
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        {carregandoResumo ? (
          <ActivityIndicator />
        ) : (
          <>
            {erroResumo ? (
              <Text style={{ color: "#b00", marginBottom: 6 }}>
                {erroResumo}
              </Text>
            ) : null}

            <Text>Permanência: {minutos} min</Text>
            <Text>Tarifa aplicada: {tarifaLabel}</Text>
            <Text>Subtotal: {formatBRL(subtotal)}</Text>
            <Text>
              Convênio:{" "}
              {convSel
                ? `${convSel.nome} (${Number(
                    convSel.desconto_percentual
                  )}% off)`
                : "Nenhum"}
            </Text>
            <Text>Desconto convênio: {formatBRL(descontoConvenio)}</Text>
            <Text>Desconto extra: {formatBRL(descExtraNum)}</Text>
            <Text style={{ marginTop: 6, fontSize: 18, fontWeight: "700" }}>
              Total a pagar: {formatBRL(total)}
            </Text>
          </>
        )}
      </View>

      {/* Convênio */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Convênio</Text>
      {loadingInit ? (
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

      {/* Botões */}
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
          disabled={fechando || carregandoResumo}
          style={{
            flex: 1,
            backgroundColor: "#1976ed",
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
            opacity: fechando || carregandoResumo ? 0.7 : 1,
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
