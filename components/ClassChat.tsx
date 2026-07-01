import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getClassMessages, sendClassMessage, type ChatMessage } from "../lib/api";
import { fonts } from "../lib/fonts";

const MAX_CHARS = 500;
const CHAR_WARN = 400;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function ClassChat({
  classId,
  currentUserId,
  isInstructor,
}: {
  classId: string;
  currentUserId: string;
  isInstructor?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const chatHeight = isDesktop ? 400 : 300;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await getClassMessages(classId);
      setMessages(msgs);
    } catch {
      // non-fatal polling failure
    }
  }, [classId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const msg = await sendClassMessage(classId, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      // keep text so user can retry
    } finally {
      setSending(false);
    }
  }, [classId, text, sending]);

  return (
    <View style={[styles.root, { height: chatHeight }]}>
      <View style={styles.headingRow}>
        <MaterialCommunityIcons name="chat-outline" size={14} color="#6B6B6B" />
        <Text style={styles.heading}>Class Chat</Text>
        {isInstructor && (
          <View style={styles.instrBadge}>
            <Text style={styles.instrBadgeText}>Instructor</Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="chat-outline" size={28} color="#E0E0E0" />
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View key={msg.id} style={[styles.msgRow, msg.is_mine && styles.msgRowMine]}>
              <View style={[styles.bubble, msg.is_mine ? styles.bubbleMine : styles.bubbleOther]}>
                {!msg.is_mine && (
                  <Text style={styles.senderName}>{msg.display_name}</Text>
                )}
                <Text style={[styles.msgText, msg.is_mine && styles.msgTextMine]}>
                  {msg.message}
                </Text>
                <Text style={[styles.msgTime, msg.is_mine && styles.msgTimeMine]}>
                  {formatTime(msg.created_at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
          placeholder="Type a message..."
          placeholderTextColor="#B0B0B0"
          multiline={false}
          onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        {text.length > CHAR_WARN && (
          <Text style={[styles.charCount, text.length >= MAX_CHARS && styles.charCountMax]}>
            {MAX_CHARS - text.length}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="send" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  heading: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    flex: 1,
  },
  instrBadge: {
    backgroundColor: "#D4EDE8",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instrBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F7B6B",
    letterSpacing: 0.3,
  },
  messageList: { flex: 1 },
  messageListContent: {
    padding: 12,
    gap: 8,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    textAlign: "center",
  },
  msgRow: { flexDirection: "row", justifyContent: "flex-start" },
  msgRowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  bubbleMine: { backgroundColor: "#00B4A6" },
  bubbleOther: { backgroundColor: "#F5F5F5" },
  senderName: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#6B6B6B",
  },
  msgText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#0F0F0F",
    lineHeight: 19,
  },
  msgTextMine: { color: "#FFFFFF" },
  msgTime: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    alignSelf: "flex-end",
  },
  msgTimeMine: { color: "rgba(255,255,255,0.65)" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },
  input: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#0F0F0F",
    backgroundColor: "#FFFFFF",
  },
  charCount: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    minWidth: 24,
    textAlign: "center",
  },
  charCountMax: { color: "#E5484D" },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
