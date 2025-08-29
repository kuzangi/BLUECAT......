const VAPID_PUBLIC = "BHQ4kYu-uXzWMxn0FV7ms6f9tg_lTr64VLRAQ-jJ5KXN6DCzOmoKy9eqD_Ypd-9zokSGCBsgiYZlq2sJ-H9GVAA";

// تحويل Base64URL لمصفوفة Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) throw new Error("No SW support");
  return navigator.serviceWorker.register("/sw.js");
}

async function askPermission() {
  const res = await Notification.requestPermission();
  if (res !== "granted") throw new Error("Permission denied");
}

async function subscribePush(registration) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  });
}

async function saveSubscription(sub) {
  await fetch("/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub }),
  });
}

document.getElementById("enable").addEventListener("click", async () => {
  try {
    const reg = await registerSW();
    await askPermission();
    const sub = await subscribePush(reg);
    await saveSubscription(sub);
    alert("تم تفعيل الإشعارات ✅");
  } catch (e) {
    console.error(e);
    alert("فشل التفعيل ❌: " + e.message);
  }
});
