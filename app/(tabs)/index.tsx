"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ================= CONSTANTS ================= */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ================= TYPES ================= */

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  days: string[];
  done: boolean;
}

interface SleepTime {
  start: string;
  end: string;
}

interface HistoryItem {
  taskId: string;
  date: string;
  completed: boolean;
}

/* ================= TIME HELPERS ================= */

const toMin = (t?: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const format12 = (t?: string) => {
  if (!t || !t.includes(":")) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

/* ================= COMPONENT ================= */

export default function ScheduleScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleep, setSleep] = useState<SleepTime>({ start: "", end: "" });
  const [now, setNow] = useState(new Date());
  const [sleepModal, setSleepModal] = useState(false);

  /* ===== LOAD DATA ===== */

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        const t = await AsyncStorage.getItem("tasks");
        const s = await AsyncStorage.getItem("sleep");

        if (!active) return;
        setTasks(t ? JSON.parse(t) : []);
        setSleep(s ? JSON.parse(s) : { start: "", end: "" });
      };

      load();
      return () => {
        active = false;
      };
    }, [])
  );

  /* ===== CLOCK ===== */

  useFocusEffect(
    useCallback(() => {
      const i = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(i);
    }, [])
  );

  /* ===== TODAY TASKS ===== */

  const today = DAYS[now.getDay()];

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.days.includes(today)),
    [tasks, today]
  );

  /* ===== STATUS ===== */

  const nowMin = now.getHours() * 60 + now.getMinutes();

  const statusOf = (t: Task) => {
    if (t.done) return "Done";

    const s = toMin(t.start);
    let e = toMin(t.end);
    if (e <= s) e += 1440;

    if (nowMin < s) return "Next";
    if (nowMin > e) return "Previous";
    return "Current";
  };

  /* ================= DONE HANDLER (CRITICAL FIX) ================= */

  const toggleDone = async (task: Task) => {
    const todayStr = new Date().toDateString();

    // 1️⃣ Update task state
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, done: !t.done } : t
    );
    setTasks(updatedTasks);
    await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));

    // 2️⃣ Update history
    const rawHistory = await AsyncStorage.getItem("taskHistory");
    const history: HistoryItem[] = rawHistory ? JSON.parse(rawHistory) : [];

    const filtered = history.filter(
      (h) =>
        !(h.taskId === task.id && new Date(h.date).toDateString() === todayStr)
    );

    filtered.push({
      taskId: task.id,
      date: new Date().toISOString(),
      completed: !task.done,
    });

    await AsyncStorage.setItem("taskHistory", JSON.stringify(filtered));
  };

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Today</Text>

        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{today}</Text>
          <Text style={styles.dateText}>{now.toDateString()}</Text>
          <Text style={styles.timeText}>{now.toLocaleTimeString()}</Text>
        </View>
      </View>

      <Text style={styles.note}>
        Current = ongoing • Next = upcoming • Previous = finished • Done =
        marked
      </Text>

      {/* SLEEP */}
      <TouchableOpacity
        style={styles.sleepCard}
        onPress={() => setSleepModal(true)}
      >
        <Text style={styles.sleepTitle}>Sleep Time</Text>
        <Text>
          {sleep.start && sleep.end
            ? `${format12(sleep.start)} → ${format12(sleep.end)}`
            : "Not set"}
        </Text>
      </TouchableOpacity>

      {/* TASKS */}
      <ScrollView>
        {todayTasks.length === 0 ? (
          <Text style={styles.empty}>No tasks for today</Text>
        ) : (
          todayTasks.map((t) => (
            <View key={t.id} style={styles.task}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{statusOf(t)}</Text>
              </View>

              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.time}>
                {format12(t.start)} → {format12(t.end)}
              </Text>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => toggleDone(t)}
              >
                <Text>{t.done ? "Undo" : "Mark Done"}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* SLEEP VIEW */}
      <Modal visible={sleepModal} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.box}>
            <Text style={styles.modalTitle}>Sleep Time</Text>
            <Text>
              {sleep.start && sleep.end
                ? `${format12(sleep.start)} → ${format12(sleep.end)}`
                : "Set from Timetable"}
            </Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSleepModal(false)}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  header: { fontSize: 22, fontWeight: "700" },

  dateBox: { alignItems: "flex-end" },
  dateDay: { fontWeight: "700" },
  dateText: { fontSize: 12 },
  timeText: { fontSize: 12, color: "#4f46e5" },

  note: { fontSize: 12, color: "#374151", marginVertical: 8 },

  sleepCard: {
    backgroundColor: "#fef3c7",
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
  },
  sleepTitle: { fontWeight: "600" },

  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },

  task: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#6366f1",
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgeText: { color: "white", fontSize: 10 },

  taskTitle: { fontWeight: "700", fontSize: 16 },
  time: { color: "#6b7280" },

  doneBtn: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },

  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  box: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  closeBtn: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },
});
