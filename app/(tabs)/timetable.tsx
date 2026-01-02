"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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
}

interface SleepTime {
  start: string;
  end: string;
}

/* ================= TIME HELPERS ================= */

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const toRanges = (start: number, end: number) => {
  if (end > start) {
    return [[start, end]];
  }
  // overnight → split into two ranges
  return [
    [start, 1440],
    [0, end],
  ];
};

const rangesOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) => {
  const A = toRanges(aStart, aEnd);
  const B = toRanges(bStart, bEnd);

  for (const [as, ae] of A) {
    for (const [bs, be] of B) {
      if (Math.max(as, bs) < Math.min(ae, be)) {
        return true;
      }
    }
  }
  return false;
};

const format12 = (t?: string) => {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

/* ================= COMPONENT ================= */

export default function TimetableScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sleep, setSleep] = useState<SleepTime>({ start: "", end: "" });

  const [taskModal, setTaskModal] = useState(false);
  const [sleepModal, setSleepModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Task>({
    id: "",
    title: "",
    start: "",
    end: "",
    days: [],
  });

  const [picker, setPicker] = useState<
    "start" | "end" | "sleepStart" | "sleepEnd" | null
  >(null);

  // 🔑 THIS FIXES THE ANDROID TIME PICKER BUG
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  /* ================= LOAD ================= */

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const t = await AsyncStorage.getItem("tasks");
        const s = await AsyncStorage.getItem("sleep");
        setTasks(t ? JSON.parse(t) : []);
        setSleep(s ? JSON.parse(s) : { start: "", end: "" });
      })();
    }, [])
  );

  const persistTasks = async (list: Task[]) => {
    setTasks(list);
    await AsyncStorage.setItem("tasks", JSON.stringify(list));
  };

  /* ================= VALIDATION ================= */

  const validate = (task: Task) => {
    if (!task.title.trim()) {
      Alert.alert("Task name required");
      return false;
    }

    if (!task.start || !task.end) {
      Alert.alert("Select start & end time");
      return false;
    }

    if (task.days.length === 0) {
      Alert.alert("Select at least one day");
      return false;
    }

    const s = toMin(task.start);
    const e = toMin(task.end);

    if (s === e) {
      Alert.alert("Invalid time range", "Start and end time cannot be same");
      return false;
    }

    /* ---------- SLEEP CONFLICT ---------- */
    if (sleep.start && sleep.end) {
      const ss = toMin(sleep.start);
      const se = toMin(sleep.end);

      if (rangesOverlap(s, e, ss, se)) {
        Alert.alert(
          "Sleep conflict",
          `Task overlaps sleep time\n${format12(sleep.start)} → ${format12(
            sleep.end
          )}`
        );
        return false;
      }
    }

    /* ---------- TASK CONFLICT ---------- */
    for (const day of task.days) {
      for (const t of tasks) {
        if (t.id === task.id) continue;
        if (!t.days.includes(day)) continue;

        // unique task name per day
        if (t.title === task.title) {
          Alert.alert(
            "Duplicate task",
            `"${task.title}" already exists on ${day}`
          );
          return false;
        }

        const ts = toMin(t.start);
        const te = toMin(t.end);

        if (rangesOverlap(s, e, ts, te)) {
          Alert.alert(
            "Task conflict",
            `${day}\n${t.title}\n${format12(t.start)} → ${format12(t.end)}`
          );
          return false;
        }
      }
    }

    return true;
  };

  /* ================= SAVE TASK ================= */

  const saveTask = async () => {
    if (!validate(form)) return;

    const updated =
      editingId === null
        ? [...tasks, { ...form, id: Date.now().toString() }]
        : tasks.map((t) =>
            t.id === editingId ? { ...form, id: editingId } : t
          );

    await persistTasks(updated);
    closeTaskModal();
  };

  const closeTaskModal = () => {
    setTaskModal(false);
    setEditingId(null);
    setForm({ id: "", title: "", start: "", end: "", days: [] });
  };

  /* ================= DELETE CONFIRM ================= */

  const confirmDelete = (id: string, title: string) => {
    Alert.alert("Delete Task", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await persistTasks(tasks.filter((t) => t.id !== id));
        },
      },
    ]);
  };

  /* ================= TIME PICKER ================= */

  const onTimeChange = (_: any, d?: Date) => {
    if (!d) {
      setPicker(null);
      return;
    }

    const time = `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    setPickerValue(d);

    if (picker === "start") setForm((p) => ({ ...p, start: time }));
    if (picker === "end") setForm((p) => ({ ...p, end: time }));
    if (picker === "sleepStart") setSleep((s) => ({ ...s, start: time }));
    if (picker === "sleepEnd") setSleep((s) => ({ ...s, end: time }));

    setPicker(null);
  };

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Weekly Timetable</Text>

      {/* ACTION BUTTONS */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setTaskModal(true)}
        >
          <Text style={styles.primaryText}>+ Add Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setSleepModal(true)}
        >
          <Text>
            Sleep:{" "}
            {sleep.start && sleep.end
              ? `${format12(sleep.start)} → ${format12(sleep.end)}`
              : "Set"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DAYS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {DAYS.map((day) => {
          const dayTasks = tasks
            .filter((t) => t.days.includes(day))
            .sort((a, b) => toMin(a.start) - toMin(b.start));

          return (
            <View key={day} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{day}</Text>

              {dayTasks.length === 0 ? (
                <Text style={styles.empty}>No tasks</Text>
              ) : (
                dayTasks.map((t) => (
                  <View key={t.id} style={styles.taskCard}>
                    <Text style={styles.time}>
                      {format12(t.start)} → {format12(t.end)}
                    </Text>
                    <Text style={styles.title}>{t.title}</Text>

                    <View style={styles.row}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => {
                          setEditingId(t.id);
                          setForm(t);
                          setTaskModal(true);
                        }}
                      >
                        <Text>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => confirmDelete(t.id, t.title)}
                      >
                        <Text style={{ color: "white" }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* TASK MODAL */}
      <Modal visible={taskModal} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.box}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Task" : "Add Task"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Task name"
              value={form.title}
              onChangeText={(t) => setForm((p) => ({ ...p, title: t }))}
            />

            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setPickerValue(new Date());
                setPicker("start");
              }}
            >
              <Text>{form.start || "Start Time"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setPickerValue(new Date());
                setPicker("end");
              }}
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
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={closeTaskModal}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SLEEP MODAL */}
      <Modal visible={sleepModal} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.box}>
            <Text style={styles.modalTitle}>Sleep Time</Text>

            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setPickerValue(new Date());
                setPicker("sleepStart");
              }}
            >
              <Text>{sleep.start || "Sleep Start"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setPickerValue(new Date());
                setPicker("sleepEnd");
              }}
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

      {picker && (
        <DateTimePicker
          value={pickerValue}
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
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 40 },
  header: { fontSize: 22, fontWeight: "700", paddingHorizontal: 16 },

  topActions: { padding: 16 },
  primaryBtn: {
    backgroundColor: "#6366f1",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryText: { color: "white", fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: "#e5e7eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  dayCard: {
    width: 280,
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 8,
  },
  dayTitle: { fontSize: 18, fontWeight: "700", color: "#4338ca" },
  empty: { color: "#6b7280", fontStyle: "italic" },

  taskCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  time: { color: "#4338ca", fontWeight: "600" },
  title: { fontWeight: "600", marginVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },

  editBtn: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
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
    marginTop: 8,
  },
  saveText: { color: "white", textAlign: "center", fontWeight: "600" },

  cancelBtn: { padding: 12, alignItems: "center" },
});
