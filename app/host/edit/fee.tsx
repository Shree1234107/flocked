import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { colors } from "../../../lib/colors";

export default function HostEditFee() {
  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <View style={styles.container}>
          <Text style={styles.text}>Edit Fee — coming soon</Text>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  text: { color: colors.navy },
});
