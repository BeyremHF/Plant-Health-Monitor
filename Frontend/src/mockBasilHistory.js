// This file generates mock historical data for the Basil 1, simulating sensor readings over time.
// they should be removed once we have real data from the backend!

// TODO: Remove this file and delete the MOCK_BASIL_HISTORY import/usage in
// Frontend/src/App.jsx to make the app read only actual Firebase history again.

function buildMockBasilHistory() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const intervalSeconds = 45 * 60;

  const moistureValues = [
    46, 45, 44, 43, 42, 41, 40, 39, 38, 37,
    36, 35, 34, 33, 32, 30, 29, 28, 27, 26,
    24, 23, 22, 21, 19, 18, 17, 16, 15, 14,
  ];

  const temperatureValues = [
    21.0, 21.2, 21.5, 21.3, 21.7, 21.9, 22.0, 21.8, 22.1, 21.9,
    22.2, 22.0, 22.4, 22.1, 22.3, 22.2, 22.5, 22.3, 22.6, 22.4,
    22.5, 22.2, 22.4, 22.3, 22.1, 22.2, 22.0, 22.1, 22.0, 21.9,
  ];

  const humidityValues = [
    63, 64, 62, 63, 61, 62, 60, 61, 60, 59,
    60, 58, 59, 58, 57, 58, 57, 56, 57, 55,
    56, 55, 54, 55, 54, 53, 54, 53, 52, 52,
  ];

  const lightValues = [
    72, 75, 78, 80, 82, 85, 87, 90, 92, 94,
    96, 98, 100, 102, 104, 88, 90, 92, 94, 96,
    98, 100, 102, 104, 106, 108, 110, 112, 114, 116,
  ];

  const pressureValues = [
    1013, 1013, 1012, 1012, 1011, 1011, 1012, 1012, 1013, 1013,
    1014, 1014, 1013, 1013, 1012, 1012, 1011, 1011, 1012, 1012,
    1013, 1013, 1014, 1014, 1013, 1013, 1012, 1012, 1011, 1011,
  ];

  return Object.fromEntries(
    moistureValues.map((soil_moisture, index) => [
      `mock-${index + 1}`,
      {
        timestamp: nowSeconds - (moistureValues.length - 1 - index) * intervalSeconds,
        soil_moisture,
        temperature: temperatureValues[index],
        humidity: humidityValues[index],
        light: lightValues[index],
        pressure: pressureValues[index],
      },
    ])
  );
}

export const MOCK_BASIL_HISTORY = buildMockBasilHistory();
