import { useEffect, useState } from "react";
import { database } from "./firebase";
import { ref, onValue } from "firebase/database";

function App() {
  const [sensors, setSensors] = useState(null);

  useEffect(() => {
    const sensorsRef = ref(database, "sensors");
    onValue(sensorsRef, (snapshot) => {
      setSensors(snapshot.val());
    });
  }, []);

  if (!sensors) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🌱 Plant Health Monitor</h1>
      <p>🌡️ Temperature: {sensors.temperature}°C</p>
      <p>💧 Humidity: {sensors.humidity}%</p>
      <p>🔵 Pressure: {sensors.pressure} hPa</p>
      <p>☀️ Light: {sensors.light} lux</p>
      <p>🌱 Soil Moisture: {sensors.soil_moisture}%</p>
    </div>
  );
}

export default App;