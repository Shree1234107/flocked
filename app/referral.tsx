import { colors } from "../lib/colors";
import { Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const MOCK_CODE = "FLOCKED-LSK7";
const MOCK_FRIENDS = 3;
const MOCK_PERKS = [
  { icon: "account-plus-outline", text: "Friend joins Flocked" },
  { icon: "star-outline", text: "You both get 1 free class credit" },
  { icon: "gift-outline", text: "3 referrals = 1 month free" },
];

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Flocked — the best place for live wellness classes! Use my code ${MOCK_CODE} to get your first class free. Download at flocked.app`,
        title: "Join Flocked",
      });
    } catch {
      // user dismissed
    }
  };

  const handleCopyCode = () => {
    // In a real app: Clipboard.setStringAsync(MOCK_CODE)
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Invite Friends</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="account-group-outline" size={44} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Give a class,{"\n"}get a class</Text>
        <Text style={styles.heroSub}>
          Share your code and you both earn a free class when your friend joins.
        </Text>
      </View>

      {/* Code card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your referral code</Text>
        <TouchableOpacity
          style={styles.codeBox}
          onPress={handleCopyCode}
          activeOpacity={0.8}
        >
          <Text style={styles.codeText}>{MOCK_CODE}</Text>
          <View style={styles.copyBadge}>
            <MaterialCommunityIcons name="content-copy" size={14} color={colors.primary} />
            <Text style={styles.copyText}>Copy</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Friends joined */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{MOCK_FRIENDS}</Text>
          <Text style={styles.statLabel}>Friends joined</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{MOCK_FRIENDS}</Text>
          <Text style={styles.statLabel}>Credits earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.primary }]}>0</Text>
          <Text style={styles.statLabel}>Months free</Text>
        </View>
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.perksList}>
          {MOCK_PERKS.map((p, i) => (
            <View key={i} style={styles.perkRow}>
              <View style={styles.perkStep}>
                <Text style={styles.perkStepNum}>{i + 1}</Text>
              </View>
              <View style={styles.perkIcon}>
                <MaterialCommunityIcons name={p.icon as never} size={18} color={colors.primary} />
              </View>
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* Share button */}
      <View style={styles.shareWrap}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <MaterialCommunityIcons name="share-outline" size={18} color="#FFFFFF" />
          <Text style={styles.shareBtnText}>Share with Friends</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 12,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: "#D4E8CC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroSub: {
    fontSize: 15,
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
  },
  codeCard: {
    marginHorizontal: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 16,
    gap: 8,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: 1.5,
  },
  copyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryTint,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 18,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
  },
  statLabel: {
    fontSize: 11,
    color: "#888888",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#EEEEEE",
    alignSelf: "center",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  perksList: {
    gap: 8,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  perkStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkStepNum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  perkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkText: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
  },
  shareWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  shareBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
