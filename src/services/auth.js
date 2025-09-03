import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const USER_KEY = "@user";

export async function login(email, senha) {
  const data = await api("/api/login", {
    method: "POST",
    body: { email, senha },
  });
  // backend já retorna { user: { id, nome, ... }, token? }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data?.user || data));
  return data?.user || data;
}

export async function getUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function logout() {
  await AsyncStorage.removeItem(USER_KEY);
}
