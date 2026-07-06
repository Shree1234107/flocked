import { colors } from "../lib/colors";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";

type Message = {
  id: string;
  text: string;
  from: "user" | "support";
  time: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hi there! I'm Maya from the Flocked support team. How can I help you today?",
    from: "support",
    time: "2:01 PM",
  },
  {
    id: "2",
    text: "Hey, I'm having trouble joining a class. It just shows a loading screen.",
    from: "user",
    time: "2:03 PM",
  },
  {
    id: "3",
    text: "I'm sorry to hear that! A few quick things to try — make sure you're on Wi-Fi or a strong signal, then force-quit the app and reopen it. Does that help?",
    from: "support",
    time: "2:04 PM",
  },
  {
    id: "4",
    text: "I tried restarting but it's still loading. The class was supposed to start 5 minutes ago.",
    from: "user",
    time: "2:06 PM",
  },
  {
    id: "5",
    text: "No worries! I can see the class is still active and the teacher is in the room. Let me send you a direct join link — please check your email in the next 2 minutes.",
    from: "support",
    time: "2:07 PM",
  },
  {
    id: "6",
    text: "Got it, thank you so much!",
    from: "user",
    time: "2:08 PM",
  },
  {
    id: "7",
    text: "Happy to help! If you run into this again, you can also try tapping the class from the Home tab rather than from the confirmation screen. Let me know if you need anything else!",
    from: "support",
    time: "2:08 PM",
  },
];

const QUICK_REPLIES = [
  "How do I join a class?",
  "Cancel or reschedule",
  "Report an instructor",
  "Billing question",
];

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: String(Date.now()),
      text: text.trim(),
      from: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
      const reply: Message = {
        id: String(Date.now() + 1),
        text: "Thanks for your message! A member of our team will follow up shortly. Average response time is under 2 minutes.",
        from: "support",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, reply]);
      listRef.current?.scrollToEnd({ animated: true });
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <View style={styles.avatarSmall}>
            <MaterialCommunityIcons name="headset" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.navTitle}>Flocked Support</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online · Usually replies in 2 min</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <View style={styles.startBadge}>
            <Text style={styles.startBadgeText}>Today · Conversation started</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isUser = item.from === "user";
          const prev = index > 0 ? messages[index - 1] : null;
          const showAvatar = !isUser && (!prev || prev.from !== "support");
          return (
            <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
              {!isUser && (
                <View style={[styles.supportAvatar, { opacity: showAvatar ? 1 : 0 }]}>
                  <MaterialCommunityIcons name="headset" size={14} color={colors.primary} />
                </View>
              )}
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleSupport]}>
                <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
                  {item.time}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Quick replies */}
      <View style={styles.quickWrap}>
        <FlatList
          horizontal
          data={QUICK_REPLIES}
          keyExtractor={(q) => q}
          contentContainerStyle={styles.quickList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => sendMessage(item)}
              activeOpacity={0.75}
            >
              <Text style={styles.quickChipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#C0C0C0"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(inputText)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage(inputText)}
          activeOpacity={0.85}
          disabled={!inputText.trim()}
        >
          <MaterialCommunityIcons name="send" size={18} color={inputText.trim() ? "#FFFFFF" : "#C0C0C0"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
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
  navCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    borderWidth: 1.5,
    borderColor: "#D4E8CC",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.navy,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  onlineText: {
    fontSize: 11,
    color: "#888888",
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  startBadge: {
    alignSelf: "center",
    backgroundColor: "#EEEEEE",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  startBadgeText: {
    fontSize: 11,
    color: "#888888",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  msgRowUser: {
    flexDirection: "row-reverse",
  },
  supportAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: "#D4E8CC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "76%",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  bubbleSupport: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.navy,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  bubbleTime: {
    fontSize: 10,
    color: "#888888",
    alignSelf: "flex-end",
  },
  bubbleTimeUser: {
    color: "rgba(255,255,255,0.7)",
  },
  quickWrap: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  quickList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  quickChip: {
    backgroundColor: colors.primaryTint,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  quickChipText: {
    fontSize: 12,
    color: "#007A70",
    fontWeight: "500",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F9F9F9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.navy,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
});
