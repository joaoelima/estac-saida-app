import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

export async function login(email, senha) {
  // ajuste a rota conforme o seu backend
  const { data } = await api.post("/api/auth/login", { email, senha });
  const token = data?.token;
  const user = data?.user || data?.usuario || null;

  if (!token || !user) throw new Error("Credenciais inválidas");

  await SecureStore.setItemAsync("token", token);
  await AsyncStorage.setItem("@user", JSON.stringify(user));
  return user;
}

export async function logout() {
  await SecureStore.deleteItemAsync("token");
  await AsyncStorage.removeItem("@user");
}

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem("@user");
  return raw ? JSON.parse(raw) : null;
}
