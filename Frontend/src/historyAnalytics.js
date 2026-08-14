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
const MIN_TREND_HALF_RECORDS = 3;
const TREND_NOISE_THRESHOLDS = {
  moisture: 3,
  temperature: 0.8,
  light: 75,
};

export function calcVPD(temp, humidity) {
  const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  return Math.max(0, (1 - humidity / 100) * svp);
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// Accepts either the backend's array of records or a raw Firebase keyed object.
export function normalizeHistoryRecords(rawHistory) {
  if (!rawHistory || typeof rawHistory !== "object") return [];

  return Object.values(rawHistory)
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

// How many stored records to ask the backend for so the timeframe stays full.
export function getHistoryFetchLimit(timeframe) {
  const timeframeSeconds = TIMEFRAME_TO_SECONDS[timeframe] ?? TIMEFRAME_TO_SECONDS["24h"];

  // Devices push one record roughly every 30 seconds; add headroom for jitter.
  return Math.ceil((timeframeSeconds / 30) * 1.2);
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

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTrendDirection(metric, delta) {
  const threshold = TREND_NOISE_THRESHOLDS[metric];
  if (Math.abs(delta) < threshold) return "stable";
  return delta > 0 ? "rising" : "falling";
}

function getTrendInterpretation(metric, direction, recentAverage, thresholds) {
  if (metric === "moisture") {
    if (direction === "falling" && recentAverage < thresholds.moistureMin) {
      return "Falling and now below your target moisture range.";
    }
    if (direction === "stable" && recentAverage >= thresholds.moistureMin) {
      return "Stable and staying within your target moisture range.";
    }
    if (direction === "rising" && recentAverage < thresholds.moistureMin) {
      return "Improving, but still below your target moisture range.";
    }
    return "Moisture is moving without crossing a major concern threshold.";
  }

  if (metric === "temperature") {
    const inRange =
      recentAverage >= thresholds.tempMin && recentAverage <= thresholds.tempMax;

    if (direction === "stable" && inRange) {
      return "Stable and staying within your target temperature range.";
    }
    if (direction === "rising" && recentAverage > thresholds.tempMax) {
      return "Rising and now above your target temperature range.";
    }
    if (direction === "falling" && recentAverage < thresholds.tempMin) {
      return "Falling and now below your target temperature range.";
    }
    return "Temperature changed, but not in a way that signals a major issue.";
  }

  if (direction === "rising" && recentAverage < thresholds.lightMin) {
    return "Improving, but still below your target light level.";
  }
  if (direction === "stable" && recentAverage >= thresholds.lightMin) {
    return "Stable and staying within your target light level.";
  }
  if (direction === "falling" && recentAverage < thresholds.lightMin) {
    return "Falling and now below your target light level.";
  }
  return "Light changed, but not in a way that signals a major issue.";
}

export function computeTrendSummaryCards(records, thresholds, timeframe) {
  if (!Array.isArray(records) || records.length === 0) {
    return { hasEnoughData: false, cards: [] };
  }

  const timeframeSeconds = TIMEFRAME_TO_SECONDS[timeframe];
  if (!timeframeSeconds) {
    return { hasEnoughData: false, cards: [] };
  }

  const latestTimestamp = records[records.length - 1]?.timestamp;
  if (!Number.isFinite(latestTimestamp)) {
    return { hasEnoughData: false, cards: [] };
  }

  const midpoint = latestTimestamp - timeframeSeconds / 2;
  const recentRecords = records.filter((record) => record.timestamp >= midpoint);
  const previousRecords = records.filter((record) => record.timestamp < midpoint);

  if (
    recentRecords.length < MIN_TREND_HALF_RECORDS ||
    previousRecords.length < MIN_TREND_HALF_RECORDS
  ) {
    return { hasEnoughData: false, cards: [] };
  }

  const metrics = [
    { key: "moisture", title: "Moisture", field: "soil_moisture", unit: "%", decimals: 1 },
    { key: "temperature", title: "Temperature", field: "temperature", unit: "°C", decimals: 1 },
    { key: "light", title: "Light", field: "light", unit: "lux", decimals: 0 },
  ];

  const cards = metrics.map((metric) => {
    const recentAverage = average(recentRecords.map((record) => record[metric.field]));
    const previousAverage = average(previousRecords.map((record) => record[metric.field]));
    const delta = recentAverage - previousAverage;
    const direction = getTrendDirection(metric.key, delta);

    return {
      key: metric.key,
      title: metric.title,
      direction,
      delta,
      unit: metric.unit,
      decimals: metric.decimals,
      interpretation: getTrendInterpretation(
        metric.key,
        direction,
        recentAverage,
        thresholds
      ),
    };
  });

  return { hasEnoughData: true, cards };
}
