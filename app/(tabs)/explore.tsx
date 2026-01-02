// ============================================
// FILE 2: app/(tabs)/explore.tsx
// Replace the existing explore.tsx (This will be Dashboard)
// ============================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface Stats {
  totalTasks: number;
  completedToday: number;
  completionRate: number;
  streak: number;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedToday: 0,
    completionRate: 0,
    streak: 0,
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const history = (await AsyncStorage.getItem("taskHistory")) || "[]";
      const tasks = (await AsyncStorage.getItem("tasks")) || "[]";

      const historyData = JSON.parse(history);
      const tasksData = JSON.parse(tasks);

      const today = new Date().toDateString();
      const todayHistory = historyData.filter(
        (h: any) => new Date(h.date).toDateString() === today
      );

      const completedToday = todayHistory.filter(
        (h: any) => h.completed
      ).length;
      const totalToday = todayHistory.length;
      const completionRate =
        totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

      // Calculate streak
      let streak = 0;
      let currentDate = new Date();

      for (let i = 0; i < 365; i++) {
        const dateStr = currentDate.toDateString();
        const dayTasks = historyData.filter(
          (h: any) => new Date(h.date).toDateString() === dateStr
        );

        if (dayTasks.length === 0) break;

        const allCompleted = dayTasks.every((h: any) => h.completed);
        if (!allCompleted) break;

        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      setStats({
        totalTasks: tasksData.length,
        completedToday,
        completionRate: Math.round(completionRate),
        streak,
      });
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your productivity</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardPurple]}>
          <Text style={styles.statNumber}>{stats.totalTasks}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>

        <View style={[styles.statCard, styles.statCardGreen]}>
          <Text style={styles.statNumber}>{stats.completedToday}</Text>
          <Text style={styles.statLabel}>Completed Today</Text>
        </View>

        <View style={[styles.statCard, styles.statCardBlue]}>
          <Text style={styles.statNumber}>{stats.completionRate}%</Text>
          <Text style={styles.statLabel}>Completion Rate</Text>
        </View>

        <View style={[styles.statCard, styles.statCardOrange]}>
          <Text style={styles.statNumber}>{stats.streak} 🔥</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      <View style={styles.motivationCard}>
        <Text style={styles.motivationTitle}>
          {stats.streak > 5
            ? "🎉 Amazing Consistency!"
            : stats.streak > 2
            ? "💪 Keep Going!"
            : "🌟 Start Your Journey!"}
        </Text>
        <Text style={styles.motivationText}>
          {stats.streak > 5
            ? "You're on fire! Keep up the great work!"
            : stats.streak > 2
            ? "You're building great habits!"
            : "Complete today's tasks to start your streak!"}
        </Text>
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
        <Text style={styles.tipItem}>• Set realistic daily goals</Text>
        <Text style={styles.tipItem}>• Use tags to organize your tasks</Text>
        <Text style={styles.tipItem}>• Enable alarms for important tasks</Text>
        <Text style={styles.tipItem}>• Review your progress weekly</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#6366f1",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e7ff",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardPurple: { backgroundColor: "#ede9fe" },
  statCardGreen: { backgroundColor: "#dcfce7" },
  statCardBlue: { backgroundColor: "#dbeafe" },
  statCardOrange: { backgroundColor: "#fed7aa" },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  motivationCard: {
    margin: 16,
    marginTop: 8,
    padding: 24,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  tipsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 20,
  },
});
