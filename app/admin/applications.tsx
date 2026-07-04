import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../../lib/auth";
import {
  listInstructorApplications,
  approveInstructorApplication,
  rejectInstructorApplication,
} from "../../lib/api";
import { type InstructorApplication } from "../../lib/types";
import { fonts } from "../../lib/fonts";

const ADMIN_EMAIL = "shreevegesna@gmail.com";

type Filter = "pending" | "all";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  approved: { bg: "#D1FAE5", text: "#065F46", label: "Approved" },
  rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
};

export default function AdminApplicationsScreen() {
  const { session, loading: authLoading } = useAuth();
  const [apps, setApps] = useState<InstructorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [actionId, setActionId] = useState<string | null>(null);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && isAdmin) {
      load();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAdmin]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listInstructorApplications();
      setApps(data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: InstructorApplication) => {
    if (!app.id) return;
    Alert.alert(
      "Approve application",
      `Approve ${app.full_name ?? "this applicant"}?\n\nThey'll get host access after you schedule their intro call.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setActionId(app.id);
            try {
              const updated = await approveInstructorApplication(app.id!);
              setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
              Alert.alert(
                "Approved!",
                `${app.full_name ?? "Applicant"} is now a host.\n\nNext step: schedule their intro call at ${app.email ?? "their email"}.`
              );
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Approval failed.");
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (app: InstructorApplication) => {
    if (!app.id) return;
    Alert.alert(
      "Reject application",
      `Reject ${app.full_name ?? "this applicant"}? They'll be able to reapply.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionId(app.id);
            try {
              const updated = await rejectInstructorApplication(app.id!);
              setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Rejection failed.");
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  if (authLoading || loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#00B4A6" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={s.centered}>
        <MaterialCommunityIcons name="lock-outline" size={40} color="#D0D0D0" />
        <Text style={s.accessDeniedTitle}>Access denied</Text>
        <Text style={s.accessDeniedBody}>
          This page is only accessible to Flocked admins.
        </Text>
      </View>
    );
  }

  const displayed = filter === "pending"
    ? apps.filter((a) => a.status === "pending")
    : apps;

  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Instructor Applications</Text>
          <Text style={s.subtitle}>
            {pendingCount} pending · {apps.length} total
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn as any} onPress={load} activeOpacity={0.7}>
          <MaterialCommunityIcons name="refresh" size={16} color="#00B4A6" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(["pending", "all"] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive] as any}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
              {f === "pending" ? `Pending (${pendingCount})` : `All (${apps.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Application cards */}
      {displayed.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="inbox-outline" size={40} color="#D0D0D0" />
          <Text style={s.emptyText}>
            {filter === "pending" ? "No pending applications" : "No applications yet"}
          </Text>
        </View>
      ) : (
        displayed.map((app) => {
          const st = STATUS_STYLES[app.status] ?? STATUS_STYLES.pending;
          const isActioning = actionId === app.id;

          return (
            <View key={app.id ?? app.user_id} style={s.card}>
              {/* Card header */}
              <View style={s.cardHeader}>
                <View style={s.cardHeaderLeft}>
                  <Text style={s.applicantName}>{app.full_name ?? "—"}</Text>
                  <Text style={s.applicantEmail}>{app.email ?? "—"}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>

              {/* Categories */}
              {app.categories.length > 0 && (
                <View style={s.cardRow}>
                  <Text style={s.cardLabel}>Teaches</Text>
                  <View style={s.pillRow}>
                    {app.categories.map((cat) => (
                      <View key={cat} style={s.pill}>
                        <Text style={s.pillText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Experience */}
              {app.experience && (
                <View style={s.cardRow}>
                  <Text style={s.cardLabel}>Background</Text>
                  <Text style={s.cardValue}>{app.experience}</Text>
                </View>
              )}

              {/* Why teach */}
              {app.why_teach && (
                <View style={s.cardRow}>
                  <Text style={s.cardLabel}>Why Flocked</Text>
                  <Text style={s.cardValue}>{app.why_teach}</Text>
                </View>
              )}

              {/* Availability */}
              {app.availability && (
                <View style={s.cardRow}>
                  <Text style={s.cardLabel}>Availability</Text>
                  <Text style={s.cardValue}>{app.availability}</Text>
                </View>
              )}

              {/* Submitted date */}
              <Text style={s.submittedDate}>Submitted {formatDate(app.submitted_at)}</Text>

              {/* Actions — only for pending */}
              {app.status === "pending" && app.id && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.rejectBtn, isActioning && s.actionBtnDisabled] as any}
                    onPress={() => handleReject(app)}
                    disabled={isActioning}
                    activeOpacity={0.8}
                  >
                    {isActioning ? (
                      <ActivityIndicator color="#991B1B" size="small" />
                    ) : (
                      <Text style={s.rejectBtnText}>Reject</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.approveBtn, isActioning && s.actionBtnDisabled] as any}
                    onPress={() => handleApprove(app)}
                    disabled={isActioning}
                    activeOpacity={0.85}
                  >
                    {isActioning ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={s.approveBtnText}>Approve →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Post-approve prompt */}
              {app.status === "approved" && app.email && (
                <View style={s.approvedHint}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={14} color="#065F46" />
                  <Text style={s.approvedHintText}>
                    Schedule their intro call at{" "}
                    <Text style={s.approvedHintEmail}>{app.email}</Text>
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFBF7" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FDFBF7",
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 8,
  },
  accessDeniedBody: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#888888",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  scroll: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#888888",
    marginTop: 4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5F3",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: "#F0EDE8",
    cursor: "pointer",
  },
  filterTabActive: { backgroundColor: "#00B4A6" },
  filterTabText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#888888",
  },
  filterTabTextActive: { color: "#FFFFFF" },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#AAAAAA",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 20,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderLeft: { flex: 1, gap: 2 },
  applicantName: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  applicantEmail: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#888888",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
  },

  cardRow: { gap: 3 },
  cardLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#444444",
    lineHeight: 21,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  pill: {
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  pillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#007A70",
  },

  submittedDate: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#AAAAAA",
    marginTop: -4,
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  rejectBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#991B1B",
  },
  approveBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  approveBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionBtnDisabled: { opacity: 0.5 },

  approvedHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    padding: 10,
  },
  approvedHintText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#065F46",
    lineHeight: 19,
  },
  approvedHintEmail: {
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
});
