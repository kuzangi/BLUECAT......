// طلب إذن الإشعارات من المستخدم
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        console.log('تم منح إذن الإشعارات.');
      } else if (permission === 'denied') {
        console.log('تم رفض إذن الإشعارات.');
      } else {
        console.log('لم يتم اتخاذ قرار بشأن إذن الإشعارات.');
      }
    });
  } else {
    console.log('المتصفح لا يدعم الإشعارات.');
  }
}

// يمكنك استدعاء هذه الدالة عند تحميل الصفحة أو عند الضغط على زر مخصص