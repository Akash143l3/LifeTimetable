import { Tabs } from "expo-router";
import React from "react";
import { Platform, Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: Platform.select({
          ios: { position: "absolute" },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => <TabBarIcon icon="📅" color={color} />,
        }}
      />

      <Tabs.Screen
        name="timetable"
        options={{
          title: "Timetable",
          tabBarIcon: ({ color }) => <TabBarIcon icon="🗓️" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{icon}</Text>;
}
