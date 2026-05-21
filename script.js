/* =============================================
   ATMOS WEATHER APP — Script
   Fetches data from OpenWeatherMap API
   ============================================= */

// ---- API Configuration ----
const API_KEY = "0c7e783adcfc4efa0b42d44ff78ce8eb";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// ---- DOM Elements ----
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherMain = document.getElementById("weatherMain");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");

// Weather display elements
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

// ---- Country Code to Name Map (subset) ----
const countryNames = {
  CI: "Côte d'Ivoire",
  FR: "France",
  JP: "Japan",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  BR: "Brazil",
  IN: "India",
  CN: "China",
  CA: "Canada",
  AU: "Australia",
  IT: "Italy",
  ES: "Spain",
  MX: "Mexico",
  KR: "South Korea",
  RU: "Russia",
  NG: "Nigeria",
  GH: "Ghana",
  SN: "Senegal",
  ZA: "South Africa",
  EG: "Egypt",
  MA: "Morocco",
  KE: "Kenya",
  TZ: "Tanzania",
  AE: "UAE",
  SA: "Saudi Arabia",
  TR: "Turkey",
  PT: "Portugal",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  AT: "Austria",
  CH: "Switzerland",
  BE: "Belgium",
  IE: "Ireland",
  GR: "Greece",
  CZ: "Czech Republic",
  AR: "Argentina",
  CO: "Colombia",
  CL: "Chile",
  PE: "Peru",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  MY: "Malaysia",
  SG: "Singapore",
  ID: "Indonesia",
  NZ: "New Zealand",
};

// ---- Weather Icon Mapping ----
function getWeatherEmoji(iconCode, description) {
  const map = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "⛅",
    "02n": "☁️",
    "03d": "☁️",
    "03n": "☁️",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌧️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "🌨️",
    "13n": "🌨️",
    "50d": "🌫️",
    "50n": "🌫️",
  };
  return map[iconCode] || "🌤️";
}

// ---- Dynamic Gradient Based on Weather ----
function updateBackground(iconCode) {
  const gradients = {
    "01d": ["#2b5876", "#4e4376"], // clear day
    "01n": ["#0f0c29", "#302b63", "#24243e"], // clear night
    "02d": ["#4b6cb7", "#182848"], // few clouds day
    "02n": ["#0f0c29", "#302b63"], // few clouds night
    "03d": ["#4b6cb7", "#485563"], // scattered clouds
    "03n": ["#1a1a2e", "#16213e"],
    "04d": ["#485563", "#29323c"], // broken clouds
    "04n": ["#1a1a2e", "#16213e"],
    "09d": ["#2c3e50", "#4ca1af"], // rain
    "09n": ["#0f2027", "#203a43"],
    "10d": ["#2c3e50", "#4ca1af"],
    "10n": ["#0f2027", "#203a43"],
    "11d": ["#232526", "#414345"], // thunderstorm
    "11n": ["#0f0c29", "#1a1a2e"],
    "13d": ["#e6dada", "#274046"], // snow
    "13n": ["#1a1a2e", "#274046"],
    "50d": ["#616161", "#9bc5c3"], // mist
    "50n": ["#1a1a2e", "#2d3436"],
  };
  const colors = gradients[iconCode] || ["#0f0c29", "#302b63", "#24243e"];
  document.body.style.background = `linear-gradient(135deg, ${colors.join(", ")})`;
}

// ---- Utility: Format Unix Timestamp ----
function formatTime(unixTimestamp, timezoneOffset) {
  const date = new Date((unixTimestamp + timezoneOffset) * 1000);
  const hours = date.getUTCHours();
  const mins = date.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${mins} ${ampm}`;
}

// ---- Utility: Format Date ----
function formatDate(timezoneOffset) {
  const now = new Date();
  const localTime = new Date(
    now.getTime() + timezoneOffset * 1000 + now.getTimezoneOffset() * 60000,
  );
  return localTime.toLocaleDateString("en-US", {
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
  // Force reflow for animation restart
  void weatherMain.offsetWidth;
  weatherMain.classList.add("visible");
  loadingState.classList.remove("visible");
  errorState.classList.remove("visible");
}

// ---- Fetch Weather Data ----
async function fetchWeather(city) {
  if (!city.trim()) return;

  showLoading();

  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `City "${city}" not found. Check the spelling and try again.`,
        );
      } else if (response.status === 401) {
        throw new Error("API key issue. Please try again later.");
      } else {
        throw new Error("Unable to fetch weather data. Please try again.");
      }
    }

    const data = await response.json();
    displayWeather(data);
  } catch (error) {
    showError(error.message);
  }
}

// ---- Display Weather Data ----
function displayWeather(data) {
  // Location
  cityName.textContent = data.name;
  const country = countryNames[data.sys.country] || data.sys.country;
  countryName.textContent = country;
  weatherDate.textContent = formatDate(data.timezone);

  // Temperature
  tempValue.textContent = Math.round(data.main.temp);
  weatherDesc.textContent = data.weather[0].description;

  // Icon
  const iconCode = data.weather[0].icon;
  weatherIconLarge.textContent = getWeatherEmoji(
    iconCode,
    data.weather[0].description,
  );

  // Temp range
  tempHi.textContent = `H: ${Math.round(data.main.temp_max)}°`;
  tempLo.textContent = `L: ${Math.round(data.main.temp_min)}°`;

  // Details
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
  pressure.textContent = `${data.main.pressure} hPa`;
  visibility.textContent = data.visibility
    ? `${(data.visibility / 1000).toFixed(1)} km`
    : "—";

  // Sunrise / Sunset
  const sunrise = formatTime(data.sys.sunrise, data.timezone);
  const sunset = formatTime(data.sys.sunset, data.timezone);
  sunTimes.textContent = `${sunrise} / ${sunset}`;

  // Update background gradient
  updateBackground(iconCode);

  showWeather();
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
