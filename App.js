import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import BuscaPlacaScreen from "./src/screens/BuscaPlacaScreen";
import SaidaScreen from "./src/screens/SaidaScreen";

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "#fff" },
};

export default function App() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerTitleAlign: "center" }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Entrar" }}
        />
        <Stack.Screen
          name="BuscaPlaca"
          component={BuscaPlacaScreen}
          options={{ title: "Estacionamento" }}
        />
        <Stack.Screen
          name="Saida"
          component={SaidaScreen}
          options={{ title: "Fechar Saída" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
