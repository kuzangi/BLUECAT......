/// Import Firebase functions and objects
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js';
import { getDatabase, ref, child, get } from 'https://www.gstatic.com/firebasejs/9.4.0/firebase-database.js';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/+esm';

// Register required components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwr4mnZssZ2JWVQhiOHga1lGbUz19uMYY",
  authDomain: "ultrass-935fe.web.app",
  databaseURL: "https://ultrass-935fe-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ultrass-935fe",
  storageBucket: "ultrass-935fe.appspot.com",
  messagingSenderId: "444819969358",
  appId: "1:444819969358:web:6ae1adf1b5fb1b18a57a1f"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase();
const dbRef = ref(db, 'UltraSonicSensor');

// Charts management object
const charts = {
  instances: {},
  destroyAll: function() {
    Object.values(this.instances).forEach(chart => chart.destroy());
    this.instances = {};
  }
};

// Water level visualization function
function setWaterLevel(level) {
  console.log('Attempting to set water level to:', level);
  const waterTank = document.querySelector('.water-tank');
  const waterFill = document.querySelector('.water-level');
  
  if (!waterTank) {
    console.error('Water tank element not found!');
    return;
  }
  
  if (!waterFill) {
    console.error('Water fill element not found!');
    return;
  }

  // Ensure level is a valid number
  level = Number(level);
  if (isNaN(level)) {
    console.error('Invalid water level:', level);
    return;
  }

  waterFill.style.display = 'block';
  waterFill.style.position = 'absolute';
  waterFill.style.bottom = '0';
  waterFill.style.width = '100%';
  waterFill.style.height = `${level}%`;

  waterFill.style.background = 'none';
  waterFill.style.backgroundImage = 'none';

  // ألوان حسب النسبة المطلوبة
  if (level < 10) {
    waterFill.style.backgroundColor = '#ff4d4d'; // أحمر
    // إرسال إشعار إذا وصل إلى 10% أو أقل
    sendLowLevelNotification();
  } else if (level < 25) {
    waterFill.style.backgroundColor = '#ff9800'; // برتقالي
  } else if (level < 98) {
    waterFill.style.backgroundColor = '#4caf50'; // أخضر
  } else {
    waterFill.style.backgroundColor = '#ff4d4d'; // أحمر (ممتلئ جداً)
  }

  waterFill.style.animation = `wave ${level < 10 ? '1s' : '2s'} infinite linear`;
  console.log('Water level set successfully to', level, '%');
}

// دالة إرسال إشعار عند انخفاض مستوى الماء
let notifiedLowLevel = false;
function sendLowLevelNotification() {
  if (notifiedLowLevel) return;
  if (Notification && Notification.permission === "granted") {
    new Notification("تنبيه", {
      body: "مستوى الماء في الخزان أقل من 10%. يرجى تعبئة الخزان.",
      icon: "assets/css/game-control.ico"
    });
    notifiedLowLevel = true;
  }
}

// إعادة تفعيل الإشعار إذا ارتفع المستوى ثم انخفض مجدداً
function resetLowLevelNotification(level) {
  if (level >= 12) notifiedLowLevel = false;
}

function calculateAverages(observations, period) {
  const averages = {};
  const periodGroups = {}; // Debug tracking

  observations.forEach(obs => {
    const date = new Date(obs.Time);
    let key;
    
    if (period === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      key = `${date.getFullYear()}-${date.getMonth()}`;
    } else if (period === 'annual') {
      key = date.getFullYear();
    }

    if (!averages[key]) {
      averages[key] = { sum: 0, count: 0, time: obs.Time };
      periodGroups[key] = []; // Initialize debug array
    }
    
    // Validate distance value
    const distance = Number(obs.Distance);
    if (!isNaN(distance)) {
      averages[key].sum += distance;
      averages[key].count++;
      periodGroups[key].push(distance); // Track raw values
    }
  });

  // Debug output
  console.log(`Debug - ${period} groups:`, {
    groupKeys: Object.keys(periodGroups),
    sampleValues: Object.entries(periodGroups).map(([k,v]) => 
      ({key: k, count: v.length, sample: v.slice(0,3)}))
  });

  return Object.entries(averages).map(([key, value]) => {
    const avg = value.sum / value.count;
    return {
      time: value.time,
      average: 87 - avg,
      _debug: { // Debug info
        rawValues: periodGroups[key],
        rawAverage: avg 
      }
    };
  });
}

// Function to create and update charts
function updateCharts(observations) {
  // Destroy existing charts before creating new ones
  try {
    charts.destroyAll();
    // Also clear any remaining chart contexts
    document.querySelectorAll('canvas').forEach(canvas => {
      const chart = Chart.getChart(canvas);
      if (chart) chart.destroy();
    });
  } catch (e) {
    console.error('Error destroying charts:', e);
  }
  
  // Raw data chart
  charts.instances.distance = new Chart(document.getElementById('distanceChart'), {
    type: 'line',
    data: {
      labels: observations
        .map(o => new Date(o.Time))
        .sort((a, b) => a - b) // Sort dates chronologically
        .map(d => d.toLocaleString()),
      datasets: [{
        label: 'Water Consumption vs Time',
        data: observations
          .sort((a, b) => new Date(a.Time) - new Date(b.Time)) // Match sorted order
          .map(o => 87 - o.Distance), // Transform y-axis values
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    }
  });

  // Daily averages
  const dailyAverages = calculateAverages(observations, 'daily');
  console.log(dailyAverages.map(d => d.average))
  charts.instances.daily = new Chart(document.getElementById('dailyChart'), {
    type: 'line',
    data: {
      labels: dailyAverages.map(d => new Date(d.time).toLocaleDateString()),
      datasets: [{
        label: 'Daily Average Consumption',
        data: dailyAverages.map(d => d.average),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }]
    }
  });

  // Weekly averages
  const weeklyAverages = calculateAverages(observations, 'weekly');
  charts.instances.weekly = new Chart(document.getElementById('weeklyChart'), {
    type: 'line',
    data: {
      labels: weeklyAverages.map(w => `Week of ${new Date(w.time).toLocaleDateString()}`),
      datasets: [{
        label: 'Weekly Average Consumption',
        data: weeklyAverages.map(w => w.average),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      }]
    }
  });

  // Monthly averages
  const monthlyAverages = calculateAverages(observations, 'monthly');
  charts.instances.monthly = new Chart(document.getElementById('monthlyChart'), {
    type: 'line',
    data: {
      labels: monthlyAverages.map(m => new Date(m.time).toLocaleDateString('default', { month: 'long', year: 'numeric' })),
      datasets: [{
        label: 'Monthly Average Consumption',
        data: monthlyAverages.map(m => m.average),
        borderColor: 'rgb(255, 159, 64)',
        tension: 0.1
      }]
    }
  });

  // Annual averages
  const annualAverages = calculateAverages(observations, 'annual');
  charts.instances.annual = new Chart(document.getElementById('annualChart'), {
    type: 'line',
    data: {
      labels: annualAverages.map(a => new Date(a.time).getFullYear()),
      datasets: [{
        label: 'Annual Average Consumption',
        data: annualAverages.map(a => a.average),
        borderColor: 'rgb(153, 102, 255)',
        tension: 0.1
      }]
    }
  });
}

// تسجيل Service Worker وطلب إذن الإشعارات وتجهيز الاشتراك
let swRegistration = null;
document.addEventListener('DOMContentLoaded', async () => {
  // تسجيل Service Worker
  if ('serviceWorker' in navigator) {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', swRegistration);

    // طلب إذن الإشعارات
    if (Notification.permission !== "granted") {
      await Notification.requestPermission();
    }

    // الاشتراك في Push (يجب إرسال هذا الاشتراك لسيرفرك)
    if ('PushManager' in window) {
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BHQ4kYu-uXzWMxn0FV7ms6f9tg_lTr64VLRAQ-jJ5KXN6DCzOmoKy9eqD_Ypd-9zokSGCBsgiYZlq2sJ-H9GVAA')
      });
      // أرسل subscription لسيرفرك عبر fetch/AJAX
      await fetch("/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription })
      });
    }
  }

  // أعد تفعيل جلب البيانات الحقيقية من Firebase
  get(child(dbRef, "/")).then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const observations = Object.entries(data).map(([observationId, observation]) => ({
        id: observationId,
        ...observation
      }));
      observations.sort((a, b) => new Date(b.Time) - new Date(a.Time));
      
      // Update existing display
      const newestObservation = observations[0];
      let distance = newestObservation["Distance"];
      const time = newestObservation["Time"];
      // Ensure distance is a valid number between 0-87
      distance = Math.max(0, Math.min(87, 87 - parseInt(distance)));
      let distance1 = distance;
      distance = distance / 87 * 100;
      distance = distance.toFixed(1);
      document.getElementById("distanceValue").textContent = distance;
      document.getElementById("distanceValue1").textContent = distance1;
      document.getElementById("timeValue").textContent = time;
      setWaterLevel(distance);
      resetLowLevelNotification(distance);

      // Update charts
      updateCharts(observations);

      // إرسال إشعار Push من السيرفر إذا كان الخزان أقل من 10%
      if (Number(distance) < 10) {
        fetch('/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "تنبيه",
            body: "مستوى الماء في الخزان أقل من 10%. يرجى تعبئة الخزان."
          })
        });
      }
    } else {
      console.log("No data available");
    }
  }).catch((error) => {
    console.error(error);
  });
});

// دالة تحويل VAPID KEY
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ملاحظة: عند انخفاض مستوى الماء، يجب أن ترسل Push من السيرفر وليس من الجافاسكريبت المحلي فقط
// الكود التالي يبقى كما هو، لكن الإشعار الحقيقي يجب أن يأتي من السيرفر عبر Push API