// src/components/PlateInput.js
import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { normalizePlate } from "../config/env";

export default function PlateInput({ value, onChangeText, style, ...rest }) {
  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        placeholder="Placa do veículo"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        value={value}
        onChangeText={(t) => onChangeText(normalizePlate(t))}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    letterSpacing: 1,
  },
});
