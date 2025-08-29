if ("serviceWorker" in navigator && "PushManager" in window) {
  navigator.serviceWorker.register("/sw.js").then(registration => {
    console.log("Service Worker registered:", registration);

    // اطلب إذن الإشعارات من المستخدم
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array("YBHQ4kYu-uXzWMxn0FV7ms6f9tg_lTr64VLRAQ-jJ5KXN6DCzOmoKy9eqD_Ypd-9zokSGCBsgiYZlq2sJ-H9GVAA")
        }).then(subscription => {
          console.log("User is subscribed:", subscription);

          // ابعث الاشتراك للسيرفر
          fetch("/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription })
          });
        });
      }
    });
  });
}

// Helper function لتحويل المفتاح
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
