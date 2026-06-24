import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenProps = PropsWithChildren<{
  centered?: boolean;
}>;

export function Screen({ children, centered }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, centered && styles.centered, { paddingTop: insets.top + 16 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
