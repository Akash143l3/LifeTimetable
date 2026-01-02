"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

/* ================= TYPES ================= */

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  days: string[];
}

interface HistoryItem {
  taskId: string;
  date: string; // ISO
  completed: boolean;
}

interface Stats {
  totalTasks: number;
  todayTasks: number;
  completedToday: number;
  completionRate: number;
  streak: number;
}

/* ================= CONSTANTS ================= */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ================= COMPONENT ================= */

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    todayTasks: 0,
    completedToday: 0,
    completionRate: 0,
    streak: 0,
  });

  /* ================= LOAD ON TAB FOCUS ================= */

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  /* ================= LOGIC ================= */

  const loadStats = async () => {
    try {
      const tasksRaw = await AsyncStorage.getItem("tasks");
      const historyRaw = await AsyncStorage.getItem("taskHistory");

      const tasks: Task[] = tasksRaw ? JSON.parse(tasksRaw) : [];
      const history: HistoryItem[] = historyRaw ? JSON.parse(historyRaw) : [];

      const today = new Date();
      const todayStr = today.toDateString();
      const todayName = DAYS[today.getDay()];

      const todayTasks = tasks.filter((t) => t.days.includes(todayName));

      const todayHistory = history.filter(
        (h) => new Date(h.date).toDateString() === todayStr && h.completed
      );

      const completedToday = todayHistory.length;
      const totalToday = todayTasks.length;

      const completionRate =
        totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

      /* ================= STREAK ================= */

      let streak = 0;
      let checkDate = new Date();

      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toDateString();
        const dayName = DAYS[checkDate.getDay()];

        const dayTasks = tasks.filter((t) => t.days.includes(dayName));

        if (dayTasks.length === 0) break;

        const completedForDay = history.filter(
          (h) => new Date(h.date).toDateString() === dateStr && h.completed
        );

        if (completedForDay.length < dayTasks.length) break;

        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      setStats({
        totalTasks: tasks.length,
        todayTasks: totalToday,
        completedToday,
        completionRate,
        streak,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  };

  /* ================= UI ================= */

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Track your productivity & habits
        </Text>
      </View>

      {/* STATS */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Tasks" value={stats.totalTasks} bg="#ede9fe" />
        <StatCard label="Today's Tasks" value={stats.todayTasks} bg="#e0e7ff" />
        <StatCard
          label="Completed Today"
          value={stats.completedToday}
          bg="#dcfce7"
        />
        <StatCard
          label="Completion"
          value={`${stats.completionRate}%`}
          bg="#dbeafe"
        />
      </View>

      {/* STREAK */}
      <View style={[styles.statWide, styles.streak]}>
        <Text style={styles.streakNumber}>{stats.streak} 🔥</Text>
        <Text style={styles.streakText}>Day Streak</Text>
      </View>

      {/* MOTIVATION */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {stats.streak >= 7
            ? "🔥 You’re Unstoppable!"
            : stats.streak >= 3
            ? "💪 Great Momentum!"
            : "🌱 Start Small, Win Big"}
        </Text>
        <Text style={styles.cardText}>
          {stats.streak >= 7
            ? "Your consistency is amazing. Keep pushing!"
            : stats.streak >= 3
            ? "You're building a strong habit. Stay focused!"
            : "Complete today's tasks to start your streak."}
        </Text>
      </View>

      {/* TIPS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Pro Tips</Text>
        <Text style={styles.tip}>• Plan tasks around your sleep time</Text>
        <Text style={styles.tip}>• Focus on completing today’s tasks</Text>
        <Text style={styles.tip}>• Keep streaks alive with consistency</Text>
        <Text style={styles.tip}>• Review weekly progress</Text>
      </View>
    </ScrollView>
  );
}

/* ================= REUSABLE CARD ================= */

function StatCard({
  label,
  value,
  bg,
}: {
  label: string;
  value: string | number;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    backgroundColor: "#6366f1",
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
  },
  headerSubtitle: {
    color: "#e0e7ff",
    marginTop: 6,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    color: "#6b7280",
    fontWeight: "500",
  },

  statWide: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  streak: {
    backgroundColor: "#fed7aa",
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: "800",
  },
  streakText: {
    marginTop: 4,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardText: {
    color: "#6b7280",
    lineHeight: 22,
  },
  tip: {
    color: "#6b7280",
    marginBottom: 6,
  },
});
