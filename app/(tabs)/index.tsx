"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

/* ================= TIME HELPERS ================= */

const toMin = (t?: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const normalize = (s: number, e: number) => {
  if (e <= s) e += 1440;
  return { s, e };
};

const overlap = (aS: number, aE: number, bS: number, bE: number) => {
  const A = normalize(aS, aE);
  const B = normalize(bS, bE);
  return Math.max(A.s, B.s) < Math.min(A.e, B.e);
};

const format12 = (t?: string) => {
  if (!t || !t.includes(":")) return "--:--";
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (Number.isNaN(h) || Number.isNaN(m)) return "--:--";
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

/* ================= MAIN ================= */

export default function ScheduleScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleep, setSleep] = useState<SleepTime>({ start: "", end: "" });

  const [taskModal, setTaskModal] = useState(false);
  const [sleepModal, setSleepModal] = useState(false);

  const [form, setForm] = useState({
    id: "",
    title: "",
    start: "",
    end: "",
    days: [] as string[],
  });

  const [picker, setPicker] = useState<
    "start" | "end" | "sleepStart" | "sleepEnd" | null
  >(null);

  /* ================= LOAD ================= */

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("tasks");
      const s = await AsyncStorage.getItem("sleep");
      if (t) setTasks(JSON.parse(t));
      if (s) setSleep(JSON.parse(s));
      else setSleepModal(true);
    })();
  }, []);

  const saveTasks = async (list: Task[]) => {
    setTasks(list);
    await AsyncStorage.setItem("tasks", JSON.stringify(list));
  };

  /* ================= STATUS BADGE ================= */

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const statusOf = (t: Task) => {
    if (t.done) return "Done";
    const s = toMin(t.start);
    const e = normalize(s, toMin(t.end)).e;
    if (nowMin < s) return "Next";
    if (nowMin > e) return "Previous";
    return "Current";
  };

  /* ================= VALIDATION ================= */

  const validateTask = () => {
    if (!form.title.trim()) {
      Alert.alert("Task name required");
      return false;
    }

    if (tasks.some((t) => t.title === form.title && t.id !== form.id)) {
      Alert.alert("Task name must be unique");
      return false;
    }

    if (!form.start || !form.end) {
      Alert.alert("Select start and end time");
      return false;
    }

    if (form.days.length === 0) {
      Alert.alert("Select at least one day");
      return false;
    }

    const s = toMin(form.start);
    const e = toMin(form.end);

    if (s === e) {
      Alert.alert("Invalid time range");
      return false;
    }

    if (
      sleep.start &&
      sleep.end &&
      overlap(s, e, toMin(sleep.start), toMin(sleep.end))
    ) {
      Alert.alert(
        "Sleep conflict",
        `${format12(sleep.start)} – ${format12(sleep.end)}`
      );
      return false;
    }

    for (const day of form.days) {
      for (const t of tasks) {
        if (
          t.id !== form.id &&
          t.days.includes(day) &&
          overlap(s, e, toMin(t.start), toMin(t.end))
        ) {
          Alert.alert(
            "Task conflict",
            `Day: ${day}\n${t.title}\n${format12(t.start)} – ${format12(t.end)}`
          );
          return false;
        }
      }
    }

    return true;
  };

  const saveTask = async () => {
    if (!validateTask()) return;

    const updated =
      form.id === ""
        ? [
            ...tasks,
            {
              id: Date.now().toString(),
              title: form.title,
              start: form.start,
              end: form.end,
              days: form.days,
              done: false,
            },
          ]
        : tasks.map((t) => (t.id === form.id ? { ...t, ...form } : t));

    await saveTasks(updated);
    closeTaskModal();
  };

  const closeTaskModal = () => {
    setTaskModal(false);
    setForm({
      id: "",
      title: "",
      start: "",
      end: "",
      days: [],
    });
  };

  /* ================= TIME PICKER ================= */

  const onTimeChange = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type !== "set" || !d) {
      setPicker(null);
      return;
    }

    const t = `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    if (picker === "start") setForm((p) => ({ ...p, start: t }));
    if (picker === "end") setForm((p) => ({ ...p, end: t }));
    if (picker === "sleepStart") setSleep((s) => ({ ...s, start: t }));
    if (picker === "sleepEnd") setSleep((s) => ({ ...s, end: t }));

    setPicker(null);
  };

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Daily Schedule</Text>

      {/* SLEEP CARD */}
      <TouchableOpacity
        style={styles.sleepCard}
        onPress={() => setSleepModal(true)}
      >
        <Text style={styles.sleepTitle}>Sleep Time</Text>
        <Text>
          {sleep.start && sleep.end
            ? `${format12(sleep.start)} → ${format12(sleep.end)}`
            : "Tap to set"}
        </Text>
      </TouchableOpacity>

      {/* TASK LIST */}
      <ScrollView>
        {tasks.map((t) => (
          <View key={t.id} style={styles.task}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusOf(t)}</Text>
            </View>

            <Text style={styles.taskTitle}>{t.title}</Text>
            <Text style={styles.time}>
              {format12(t.start)} → {format12(t.end)}
            </Text>
            <Text style={styles.daysText}>{t.days.join(", ")}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setForm(t);
                  setTaskModal(true);
                }}
              >
                <Text>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  saveTasks(
                    tasks.map((x) =>
                      x.id === t.id ? { ...x, done: !x.done } : x
                    )
                  )
                }
              >
                <Text>{t.done ? "Undo" : "Done"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ADD BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={() => setTaskModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* TASK MODAL */}
      <Modal visible={taskModal} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.box}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task</Text>
              <TouchableOpacity onPress={closeTaskModal}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Task name"
              value={form.title}
              onChangeText={(t) => setForm((p) => ({ ...p, title: t }))}
            />

            <TouchableOpacity
              style={styles.input}
              onPress={() => setPicker("start")}
            >
              <Text>{form.start || "Start Time"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.input}
              onPress={() => setPicker("end")}
            >
              <Text>{form.end || "End Time"}</Text>
            </TouchableOpacity>

            <View style={styles.daysRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.day,
                    form.days.includes(d) && styles.dayActive,
                  ]}
                  onPress={() =>
                    setForm((p) => ({
                      ...p,
                      days: p.days.includes(d)
                        ? p.days.filter((x) => x !== d)
                        : [...p.days, d],
                    }))
                  }
                >
                  <Text>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveTask}>
              <Text style={styles.saveText}>
                {form.id ? "Update Task" : "Add Task"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SLEEP MODAL */}
      <Modal visible={sleepModal} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.box}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sleep</Text>
              <TouchableOpacity onPress={() => setSleepModal(false)}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.input}
              onPress={() => setPicker("sleepStart")}
            >
              <Text>{sleep.start || "Sleep Start"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.input}
              onPress={() => setPicker("sleepEnd")}
            >
              <Text>{sleep.end || "Wake Time"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={async () => {
                await AsyncStorage.setItem("sleep", JSON.stringify(sleep));
                setSleepModal(false);
              }}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ANDROID TIME PICKER */}
      {picker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  header: { fontSize: 22, fontWeight: "700", marginTop: 32 },

  sleepCard: {
    backgroundColor: "#fef3c7",
    padding: 14,
    borderRadius: 12,
    marginVertical: 16,
  },
  sleepTitle: { fontWeight: "600" },

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
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { color: "white", fontSize: 10 },

  taskTitle: { fontWeight: "700", fontSize: 16 },
  time: { color: "#6b7280" },
  daysText: { fontSize: 12, color: "#374151" },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },

  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "white", fontSize: 30 },

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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  close: { fontSize: 18 },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },

  daysRow: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 6,
    margin: 4,
    borderRadius: 6,
  },
  dayActive: { backgroundColor: "#c7d2fe" },

  saveBtn: {
    backgroundColor: "#6366f1",
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  saveText: { color: "white", textAlign: "center" },
});
