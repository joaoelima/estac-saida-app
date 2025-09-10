// src/services/auth.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const USER_KEY = "@user";

export async function login(email, senha) {
  const data = await api("/api/login", {
    method: "POST",
    body: { email, senha },
  });
  // Normaliza o shape e salva
  const user = {
    id: data.id,
    nome: data.nome,
    email: data.email,
    modulos: data.modulos || [],
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ user }));
  // também salva o id no SecureStore (usado em algumas telas)
  try {
    await SecureStore.setItemAsync("user_id", user.id);
  } catch {}
  return user;
}

export async function getUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function getUserId() {
  try {
    const sid = await SecureStore.getItemAsync("user_id");
    if (sid) return sid;
  } catch {}
  const u = await getUser();
  return u?.user?.id || u?.id || null;
}

export async function logout() {
  await AsyncStorage.removeItem(USER_KEY);
  try {
    await SecureStore.deleteItemAsync("user_id");
  } catch {}
}
