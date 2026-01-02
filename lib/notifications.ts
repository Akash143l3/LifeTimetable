import * as Notifications from "expo-notifications";

/* ================= HANDLER ================= */
/* Matches your Expo NotificationBehavior exactly */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // ✅ REQUIRED (do NOT change)
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ================= PERMISSION ================= */

export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

/* ================= CLEAR ================= */

export async function clearAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/* ================= SCHEDULE ================= */
/* ONLY seconds trigger is supported in your SDK */

export async function scheduleTaskNotification(
  id: string,
  body: string,
  notifyAt: Date
) {
  const seconds = Math.floor((notifyAt.getTime() - Date.now()) / 1000);

  // ⛔ Don't schedule past notifications
  if (seconds <= 0) return;

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "⏰ Upcoming Task",
      body,
      sound: true,
    },
    trigger: {
      seconds, // ✅ ONLY valid trigger
    },
  });
}
