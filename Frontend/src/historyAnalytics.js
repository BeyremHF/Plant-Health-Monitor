const TIMEFRAME_TO_SECONDS = {
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "12h": 12 * 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
};

export function calcVPD(temp, humidity) {
  const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  return Math.max(0, (1 - humidity / 100) * svp);
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function normalizeHistoryRecords(fbHistory) {
  if (!fbHistory || typeof fbHistory !== "object") return [];

  return Object.values(fbHistory)
    .map((record) => {
      if (!record || typeof record !== "object") return null;

      const timestamp = toFiniteNumber(record.timestamp);
      if (timestamp === null) return null;

      const soilMoisture = toFiniteNumber(record.soil_moisture);
      const temperature = toFiniteNumber(record.temperature);
      const humidity = toFiniteNumber(record.humidity);
      const light = toFiniteNumber(record.light);
      const pressure = toFiniteNumber(record.pressure);

      if (
        soilMoisture === null ||
        temperature === null ||
        humidity === null ||
        light === null ||
        pressure === null
      ) {
        return null;
      }

      return {
        timestamp,
        soil_moisture: soilMoisture,
        temperature,
        humidity,
        light,
        pressure,
        vpd: calcVPD(temperature, humidity),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function filterRecordsByTimeframe(records, timeframe, nowSeconds = Date.now() / 1000) {
  if (!Array.isArray(records) || records.length === 0) return [];

  const timeframeSeconds = TIMEFRAME_TO_SECONDS[timeframe];
  if (!timeframeSeconds) return records;

  const minTimestamp = nowSeconds - timeframeSeconds;
  return records.filter((record) => record.timestamp >= minTimestamp);
}

export function recordsToChartData(records) {
  return {
    moisture: records.map((record) => record.soil_moisture),
    temperature: records.map((record) => record.temperature),
    humidity: records.map((record) => record.humidity),
    light: records.map((record) => record.light),
    pressure: records.map((record) => record.pressure),
    vpd: records.map((record) => record.vpd),
  };
}

export function getMemHistorySliceCount(timeframe) {
  const timeframeSeconds = TIMEFRAME_TO_SECONDS[timeframe];
  if (!timeframeSeconds) return 96;

  // The live in-memory history stores one sample roughly every 30 seconds.
  return Math.max(1, Math.floor(timeframeSeconds / 30));
}
