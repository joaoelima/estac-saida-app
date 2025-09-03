import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../config/env";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// injeta token se existir
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
