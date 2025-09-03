import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import PlateInput from "../components/PlateInput";
import api from "../services/api";
import { POLLING_MS, normalizePlate } from "../config/env";

export default function ParkingScreen() {
  const [placa, setPlaca] = useState("");
  const [status, setStatus] = useState(null); // { placa, entrouEm, minutos, valorPrevisto }
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    // limpa polling ao desmontar
    return () => clearInterval(pollingRef.current);
  }, []);

  async function getUserId() {
    const raw = await AsyncStorage.getItem("@user");
    const user = raw ? JSON.parse(raw) : null;
    return user?.id || user?._id || user?.user?.id || null;
  }

  async function registrarEntrada() {
    try {
      const p = normalizePlate(placa);
      if (!p) return Alert.alert("Atenção", "Informe a placa.");
      setLoading(true);
      const user_id = await getUserId();
      if (!user_id) return Alert.alert("Erro", "Usuário não identificado.");

      // ajuste a rota conforme seu backend
      await api.post("/api/estacionamento/entrada", { placa: p, user_id });
      setPlaca(p);
      await buscarStatus(p);
      iniciarPolling(p);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível registrar a entrada.");
    } finally {
      setLoading(false);
    }
  }

  async function buscarStatus(pManual) {
    const p = normalizePlate(pManual || placa);
    if (!p) return;
    try {
      setLoading(true);
      // rota de status por placa
      const { data } = await api.get(`/api/estacionamento/status?placa=${p}`);
      // esperamos algo como { placa, entrouEm: "2025-09-02T12:30:00Z", minutos: 42, valorPrevisto: 7.35 }
      setStatus(data || null);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function finalizarSaida() {
    try {
      const p = normalizePlate(placa);
      if (!p) return;
      setLoading(true);
      const user_id = await getUserId();

      // rota de saída retorna { valorCobrado, minutos }
      const { data } = await api.post(`/api/estacionamento/saida`, {
        placa: p,
        user_id,
      });
      clearInterval(pollingRef.current);

      const msg = `Tempo: ${data?.minutos ?? "--"} min\nValor: R$ ${Number(
        data?.valorCobrado ?? 0
      ).toFixed(2)}`;
      Alert.alert("Saída registrada", msg);

      setStatus(null);
      setPlaca("");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível finalizar a saída.");
    } finally {
      setLoading(false);
    }
  }

  function iniciarPolling(p) {
    clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => buscarStatus(p), POLLING_MS);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Controle de Saída</Text>

      <PlateInput value={placa} onChangeText={setPlaca} />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSec]}
          onPress={() => buscarStatus()}
        >
          <Text style={styles.btnSecText}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={registrarEntrada}
          disabled={loading}
        >
          <Text style={styles.btnPrimaryText}>
            {loading ? "..." : "Registrar Entrada"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

      {status ? (
        <View style={styles.card}>
          <Text style={styles.item}>
            <Text style={styles.label}>Placa:</Text> {status.placa}
          </Text>
          <Text style={styles.item}>
            <Text style={styles.label}>Entrou em:</Text>{" "}
            {formatDate(status.entrouEm)}
          </Text>
          <Text style={styles.item}>
            <Text style={styles.label}>Minutos:</Text> {status.minutos ?? "--"}
          </Text>
          {"valorPrevisto" in status && (
            <Text style={styles.item}>
              <Text style={styles.label}>Valor previsto:</Text> R${" "}
              {Number(status.valorPrevisto ?? 0).toFixed(2)}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btn, styles.btnOk]}
            onPress={finalizarSaida}
            disabled={loading}
          >
            <Text style={styles.btnOkText}>
              {loading ? "..." : "Finalizar Saída"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={{ marginTop: 18, color: "#64748b" }}>
          Busque uma placa ou registre a entrada para começar.
        </Text>
      )}
    </View>
  );
}

function formatDate(iso) {
  if (!iso) return "--";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9", padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#0f172a",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnPrimaryText: { color: "#fff", fontWeight: "bold" },
  btnSec: { borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff" },
  btnSecText: { color: "#0f172a", fontWeight: "bold" },
  card: {
    marginTop: 18,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  item: { fontSize: 16, marginBottom: 6, color: "#0f172a" },
  label: { fontWeight: "bold", color: "#334155" },
  btnOk: { marginTop: 12, backgroundColor: "#22c55e" },
  btnOkText: { color: "#0f172a", fontWeight: "bold" },
});
