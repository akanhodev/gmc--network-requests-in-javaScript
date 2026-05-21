/* =============================================
   ATMOS WEATHER APP — Script
   Uses Open-Meteo API (free, no key required)
   + Open-Meteo Geocoding for city search
   ============================================= */

// ---- API Configuration ----
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// ---- DOM Elements ----
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherMain = document.getElementById("weatherMain");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");

const cityName = document.getElementById("cityName");
const countryName = document.getElementById("countryName");
const weatherDate = document.getElementById("weatherDate");
const tempValue = document.getElementById("tempValue");
const weatherDesc = document.getElementById("weatherDesc");
const weatherIconLarge = document.getElementById("weatherIconLarge");
const tempHi = document.getElementById("tempHi");
const tempLo = document.getElementById("tempLo");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const sunTimes = document.getElementById("sunTimes");

// ---- WMO Weather Code Mapping ----
const WMO_DESCRIPTIONS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// ---- Weather Emoji from WMO Code ----
function getWeatherEmoji(code, isDay) {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 2) return isDay ? "⛅" : "☁️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌧️";
  if (code <= 65) return isDay ? "🌦️" : "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

// ---- Dynamic Gradient Based on Weather ----
function updateBackground(code, isDay) {
  let colors;
  if (code === 0 && isDay) colors = ["#2b5876", "#4e4376"];
  else if (code === 0) colors = ["#0f0c29", "#302b63", "#24243e"];
  else if (code <= 2 && isDay) colors = ["#4b6cb7", "#182848"];
  else if (code <= 3 && !isDay) colors = ["#1a1a2e", "#16213e"];
  else if (code <= 3) colors = ["#485563", "#29323c"];
  else if (code <= 48) colors = ["#616161", "#9bc5c3"];
  else if (code <= 67)
    colors = isDay ? ["#2c3e50", "#4ca1af"] : ["#0f2027", "#203a43"];
  else if (code <= 77) colors = ["#e6dada", "#274046"];
  else if (code <= 82)
    colors = isDay ? ["#2c3e50", "#4ca1af"] : ["#0f2027", "#203a43"];
  else if (code <= 86) colors = ["#1a1a2e", "#274046"];
  else colors = ["#232526", "#414345"];
  document.body.style.background = `linear-gradient(135deg, ${colors.join(", ")})`;
}

// ---- Utility: Format Time String ----
function formatTimeStr(isoStr) {
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// ---- Utility: Format Date ----
function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ---- UI State Management ----
function showLoading() {
  loadingState.classList.add("visible");
  weatherMain.classList.remove("visible");
  errorState.classList.remove("visible");
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.add("visible");
  loadingState.classList.remove("visible");
  weatherMain.classList.remove("visible");
}

function showWeather() {
  weatherMain.classList.remove("visible");
  void weatherMain.offsetWidth;
  weatherMain.classList.add("visible");
  loadingState.classList.remove("visible");
  errorState.classList.remove("visible");
}

// ---- Step 1: Geocode city name to coordinates ----
async function geocodeCity(city) {
  const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding service unavailable.");
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(
      `City "${city}" not found. Check the spelling and try again.`,
    );
  }
  return data.results[0];
}

// ---- Step 2: Fetch weather from Open-Meteo ----
async function fetchWeatherData(lat, lon) {
  const params = [
    `latitude=${lat}`,
    `longitude=${lon}`,
    "current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure",
    "daily=temperature_2m_max,temperature_2m_min,sunrise,sunset",
    "timezone=auto",
    "forecast_days=1",
  ].join("&");

  const url = `${WEATHER_URL}?${params}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("Weather service unavailable. Please try again.");
  return response.json();
}

// ---- Main Fetch Function ----
async function fetchWeather(city) {
  if (!city.trim()) return;
  showLoading();

  try {
    // Geocode
    const geo = await geocodeCity(city);
    const { latitude, longitude, name, country, country_code } = geo;

    // Fetch weather
    const weather = await fetchWeatherData(latitude, longitude);
    const current = weather.current;
    const daily = weather.daily;

    // Location
    cityName.textContent = name;
    countryName.textContent = country || country_code || "";
    weatherDate.textContent = formatDate();

    // Temperature
    const temp = Math.round(current.temperature_2m);
    tempValue.textContent = temp;

    // Weather description & icon
    const code = current.weather_code;
    const isDay = current.is_day === 1;
    weatherDesc.textContent = WMO_DESCRIPTIONS[code] || "Unknown";
    weatherIconLarge.textContent = getWeatherEmoji(code, isDay);

    // Temp range
    tempHi.textContent = `H: ${Math.round(daily.temperature_2m_max[0])}°`;
    tempLo.textContent = `L: ${Math.round(daily.temperature_2m_min[0])}°`;

    // Details
    feelsLike.textContent = `${Math.round(current.apparent_temperature)}°`;
    humidity.textContent = `${current.relative_humidity_2m}%`;
    windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
    visibility.textContent = "—"; // Open-Meteo free tier doesn't include visibility

    // Sunrise / Sunset
    const sunrise = formatTimeStr(daily.sunrise[0]);
    const sunset = formatTimeStr(daily.sunset[0]);
    sunTimes.textContent = `${sunrise} / ${sunset}`;

    // Dynamic background
    updateBackground(code, isDay);

    showWeather();
  } catch (error) {
    showError(error.message);
  }
}

// ---- Event Listeners ----
searchBtn.addEventListener("click", () => {
  fetchWeather(cityInput.value);
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fetchWeather(cityInput.value);
  }
});

// Quick city chips
document.querySelectorAll(".city-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const city = chip.dataset.city;
    cityInput.value = city;
    fetchWeather(city);
  });
});

// ---- Live Clock ----
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  document.getElementById("currentTime").textContent = timeStr;
}
updateClock();
setInterval(updateClock, 30000);

// ---- Background Particles ----
function createParticles() {
  const container = document.getElementById("bgParticles");
  const count = 18;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    container.appendChild(particle);
  }
}
createParticles();

// ---- Load Default City ----
fetchWeather("Abidjan");
