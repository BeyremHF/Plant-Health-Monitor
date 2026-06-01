const TIMEFRAME_TO_SECONDS = {
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "12h": 12 * 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
};

const SCORE_WEIGHTS = {
  moisture: 0.4,
  temperature: 0.35,
  light: 0.25,
};

const SCORE_LABELS = [
  { min: 85, label: "Excellent" },
  { min: 70, label: "Good" },
  { min: 50, label: "Fair" },
  { min: 0, label: "Needs attention" },
];

const TIMEFRAME_LABELS = {
  "1h": "last 1 hour",
  "6h": "last 6 hours",
  "12h": "last 12 hours",
  "24h": "last 24 hours",
  "7d": "last 7 days",
};

const MIN_SCORE_RECORDS = 10;

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

function ratioToPercent(ratio) {
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

function scoreLabelFromValue(score) {
  return SCORE_LABELS.find((entry) => score >= entry.min)?.label ?? "Needs attention";
}

function computeSubScores(records, thresholds) {
  const moistureScore = ratioToPercent(
    records.filter((record) => record.soil_moisture >= thresholds.moistureMin).length / records.length
  );
  const temperatureScore = ratioToPercent(
    records.filter(
      (record) =>
        record.temperature >= thresholds.tempMin && record.temperature <= thresholds.tempMax
    ).length / records.length
  );
  const lightScore = ratioToPercent(
    records.filter((record) => record.light >= thresholds.lightMin).length / records.length
  );

  return {
    moisture: moistureScore,
    temperature: temperatureScore,
    light: lightScore,
  };
}

export function computePlantHealthScore(records, thresholds, timeframe) {
  const windowLabel = TIMEFRAME_LABELS[timeframe] ?? "selected timeframe";

  if (!Array.isArray(records) || records.length < MIN_SCORE_RECORDS) {
    return {
      hasEnoughData: false,
      score: null,
      label: null,
      windowLabel,
      breakdown: null,
    };
  }

  const breakdown = computeSubScores(records, thresholds);
  const score = Math.round(
    breakdown.moisture * SCORE_WEIGHTS.moisture +
      breakdown.temperature * SCORE_WEIGHTS.temperature +
      breakdown.light * SCORE_WEIGHTS.light
  );

  return {
    hasEnoughData: true,
    score,
    label: scoreLabelFromValue(score),
    windowLabel,
    breakdown,
  };
}

export function getLowScoreWarning(records, thresholds, overallScore) {
  if (!Array.isArray(records) || records.length === 0 || overallScore < 70) return null;

  const recentRecords = filterRecordsByTimeframe(records, "7d");
  if (recentRecords.length === 0) return null;

  const dayBuckets = new Map();
  for (const record of recentRecords) {
    const dayKey = new Date(record.timestamp * 1000).toISOString().slice(0, 10);
    if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, []);
    dayBuckets.get(dayKey).push(record);
  }

  const lastFiveDays = [...dayBuckets.entries()].slice(-5);
  if (lastFiveDays.length < 5) return null;

  const factorLabels = {
    moisture: "Moisture",
    temperature: "Temperature",
    light: "Light",
  };

  for (const factor of ["moisture", "temperature", "light"]) {
    const consistentlyLow = lastFiveDays.every(([, dayRecords]) => {
      if (dayRecords.length < MIN_SCORE_RECORDS) return false;
      return computeSubScores(dayRecords, thresholds)[factor] < 50;
    });

    if (consistentlyLow) {
      return `${factorLabels[factor]} has stayed weak for the past 5 days even though the overall score is still good.`;
    }
  }

  return null;
}
