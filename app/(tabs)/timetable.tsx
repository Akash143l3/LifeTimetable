import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  days: string[];
}

const formatTime12h = (t?: string) => {
  if (!t || !t.includes(":")) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export default function TimetableScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const t = await AsyncStorage.getItem("tasks");
        if (t) setTasks(JSON.parse(t));
        else setTasks([]);
      };
      load();
    }, [])
  );

  return (
    <ScrollView style={styles.container}>
      {DAYS.map((day) => {
        const dayTasks = tasks.filter((t) => t.days.includes(day));

        return (
          <View key={day} style={styles.dayBlock}>
            <Text style={styles.dayTitle}>{day}</Text>

            {dayTasks.length === 0 ? (
              <Text style={styles.empty}>No tasks</Text>
            ) : (
              dayTasks.map((t) => (
                <View key={t.id} style={styles.card}>
                  <Text style={styles.time}>
                    {formatTime12h(t.start)} → {formatTime12h(t.end)}
                  </Text>
                  <Text>{t.title}</Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  dayBlock: { marginBottom: 20 },
  dayTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  card: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  time: { color: "#6366f1", fontWeight: "600" },
  empty: { color: "#9ca3af", fontStyle: "italic" },
});
