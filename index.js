// index.js – live local clock (using API timezone) + auto-refresh every 30s

(function() {
  var API_KEY = "0b60566d1ac75f8b3ae47bd8853c82e9";
  var WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
  var FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
  var REFRESH_INTERVAL_MS = 30000; // 30 seconds

  var refreshTimer = null;
  var clockTimer = null;
  var currentOffset = null;        // timezone offset in seconds
  var currentCityName = "New York";

  // DOM elements
  var cityInput = document.getElementById('cityInput');
  var searchBtn = document.getElementById('searchBtn');
  var loadingDiv = document.getElementById('loadingMsg');
  var cityDisplay = document.getElementById('cityDisplay');
  var timeDisplaySpan = document.getElementById('timeDisplaySpan');
  var mainTempEl = document.getElementById('mainTemp');
  var highLowBlock = document.getElementById('highLowBlock');
  var feelsLikeNote = document.getElementById('feelsLikeNote');
  var realTempEl = document.getElementById('realTemp');
  var rainChanceEl = document.getElementById('rainChance');
  var windSpeedEl = document.getElementById('windSpeed');
  var humidityEl = document.getElementById('humidityVal');
  var hourlyContainer = document.getElementById('hourlyContainer');
  var uvNote = document.getElementById('uvNote');
  var visibilityNote = document.getElementById('visibilityNote');

  function setText(el, text) { if (el) el.innerText = text; }
  function setHTML(el, html) { if (el) el.innerHTML = html; }

  function setLoading(isLoading) {
    if (loadingDiv) loadingDiv.style.display = isLoading ? 'block' : 'none';
  }

  // Stop all timers
  function stopAllTimers() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (clockTimer) clearInterval(clockTimer);
    refreshTimer = null;
    clockTimer = null;
  }

  // Start the live clock (updates every second)
  function startLiveClock(offsetSeconds) {
    if (clockTimer) clearInterval(clockTimer);
    function updateClock() {
      if (offsetSeconds === undefined || offsetSeconds === null) return;
      var nowUtc = new Date();
      var localSeconds = nowUtc.getTime() / 1000 + offsetSeconds;
      var date = new Date(localSeconds * 1000);
      var hours = date.getUTCHours();
      var minutes = date.getUTCMinutes();
      var seconds = date.getUTCSeconds();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      var hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12;
      var minuteStr = minutes < 10 ? '0' + minutes : minutes;
      var secondStr = seconds < 10 ? '0' + seconds : seconds;
      var timeStr = hour12 + ':' + minuteStr + ':' + secondStr + ' ' + ampm;
      if (timeDisplaySpan) setText(timeDisplaySpan, timeStr);
    }
    updateClock(); // run immediately
    clockTimer = setInterval(updateClock, 1000);
  }

  // Manual time formatting for forecast (no seconds)
  function formatForecastTime(utcTimestamp, offsetSeconds) {
    var localSec = utcTimestamp + offsetSeconds;
    var localDate = new Date(localSec * 1000);
    var hours = localDate.getUTCHours();
    var mins = localDate.getUTCMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    var hour12 = hours % 12 || 12;
    var minStr = mins < 10 ? '0' + mins : mins;
    return hour12 + ':' + minStr + ' ' + ampm;
  }

  // Update current weather UI (does NOT touch the clock)
  function updateCurrentUI(currentData) {
    if (!currentData) return;
    var city = currentData.name || '?';
    var country = currentData.sys ? currentData.sys.country : '';
    var temp = Math.round(currentData.main.temp);
    var tempMin = Math.round(currentData.main.temp_min);
    var tempMax = Math.round(currentData.main.temp_max);
    var feelsLike = Math.round(currentData.main.feels_like);
    var humidity = currentData.main.humidity;
    var windSpeedMs = currentData.wind.speed;
    var windKmh = (windSpeedMs * 3.6).toFixed(1);
    var visibilityKm = (currentData.visibility / 1000).toFixed(1);

    setText(cityDisplay, city + ', ' + country);
    setText(mainTempEl, temp + '°C');
    if (highLowBlock) setHTML(highLowBlock, '<span><i class="fas fa-arrow-up"></i> ' + tempMax + '°</span><span><i class="fas fa-arrow-down"></i> ' + tempMin + '°</span>');
    if (feelsLikeNote) setHTML(feelsLikeNote, '<i class="fas fa-thermometer-half"></i> Feels like ' + feelsLike + '°');
    if (realTempEl) setHTML(realTempEl, temp + '<span class="unit-sub">°C</span>');
    if (windSpeedEl) setHTML(windSpeedEl, windKmh + '<span class="unit-sub"> Km/h</span>');
    if (humidityEl) setHTML(humidityEl, humidity + '<span class="unit-sub">%</span>');
    if (visibilityNote) setHTML(visibilityNote, '<i class="fas fa-eye"></i> Visibility: ' + visibilityKm + ' km');
    if (uvNote) setHTML(uvNote, '<i class="fas fa-umbrella"></i> UV: --');

    // Store offset for forecast and clock
    var offset = currentData.timezone;
    if (offset !== undefined && offset !== currentOffset) {
      currentOffset = offset;
      startLiveClock(currentOffset);
    }
  }

  function updateForecastUI(forecastData) {
    if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
      if (hourlyContainer) setHTML(hourlyContainer, '<div class="hour-item">Hourly forecast unavailable</div>');
      if (rainChanceEl) setHTML(rainChanceEl, '0<span class="unit-sub">%</span>');
      return;
    }

    var rainProb = Math.round((forecastData.list[0].pop || 0) * 100);
    if (rainChanceEl) setHTML(rainChanceEl, rainProb + '<span class="unit-sub">%</span>');

    if (forecastData.list.length >= 4 && hourlyContainer) {
      hourlyContainer.innerHTML = '';
      for (var i = 0; i < 4; i++) {
        var item = forecastData.list[i];
        var tempHour = Math.round(item.main.temp);
        var timeStr = (currentOffset !== null) ? formatForecastTime(item.dt, currentOffset) : '--:--';
        var hourNum = new Date(item.dt * 1000).getUTCHours();
        var iconHtml = (hourNum >= 6 && hourNum < 18) ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        var hourDiv = document.createElement('div');
        hourDiv.className = 'hour-item';
        hourDiv.innerHTML = '<div class="hour-time">' + timeStr + '</div><div class="hour-temp">' + iconHtml + ' ' + tempHour + '<span>°C</span></div>';
        hourlyContainer.appendChild(hourDiv);
      }
    } else if (hourlyContainer) {
      hourlyContainer.innerHTML = '<div class="hour-item">Insufficient forecast data</div>';
    }
  }

  function showError(message) {
    setText(cityDisplay, "⚠️ Error");
    setText(mainTempEl, "--°C");
    if (highLowBlock) setHTML(highLowBlock, '<span><i class="fas fa-arrow-up"></i> --°</span><span><i class="fas fa-arrow-down"></i> --°</span>');
    if (feelsLikeNote) setHTML(feelsLikeNote, '<i class="fas fa-thermometer-half"></i> Feels like --°');
    if (realTempEl) setHTML(realTempEl, '--<span class="unit-sub">°C</span>');
    if (rainChanceEl) setHTML(rainChanceEl, '--<span class="unit-sub">%</span>');
    if (windSpeedEl) setHTML(windSpeedEl, '--<span class="unit-sub"> Km/h</span>');
    if (humidityEl) setHTML(humidityEl, '--<span class="unit-sub">%</span>');
    if (hourlyContainer) setHTML(hourlyContainer, '<div class="hour-item">' + message + '</div>');
    if (timeDisplaySpan) setText(timeDisplaySpan, "--:--");
    if (uvNote) setHTML(uvNote, '<i class="fas fa-umbrella"></i> UV: --');
    if (visibilityNote) setHTML(visibilityNote, '<i class="fas fa-eye"></i> Visibility: -- km');
  }

  function fetchWeatherData(cityName, silentRefresh) {
    if (!cityName || cityName.trim() === "") {
      if (!silentRefresh) showError("Please enter a city name.");
      return;
    }
    if (!silentRefresh) setLoading(true);
    var encodedCity = encodeURIComponent(cityName.trim());
    var weatherUrl = WEATHER_URL + '?q=' + encodedCity + '&appid=' + API_KEY + '&units=metric';
    var forecastUrl = FORECAST_URL + '?q=' + encodedCity + '&appid=' + API_KEY + '&units=metric';

    var weatherDone = false, forecastDone = false;
    var weatherData = null;

    function finish() {
      if (weatherDone && forecastDone) {
        if (!silentRefresh) setLoading(false);
      }
    }

    function onWeatherSuccess(data) {
      weatherData = data;
      updateCurrentUI(weatherData);
      weatherDone = true;
      finish();
    }

    function onForecastSuccess(data) {
      updateForecastUI(data);
      forecastDone = true;
      finish();
    }

    function onWeatherError() {
      if (!silentRefresh) showError("Failed to get current weather");
      weatherDone = true;
      forecastDone = true;
      if (!silentRefresh) setLoading(false);
    }

    function onForecastError() {
      forecastDone = true;
      if (weatherData) updateForecastUI(null);
      finish();
    }

    function makeRequest(url, onSuccess, onError) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 8000;
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            onSuccess(data);
          } catch(e) { onError(); }
        } else { onError(); }
      };
      xhr.onerror = onError;
      xhr.ontimeout = onError;
      xhr.send();
    }

    makeRequest(weatherUrl, onWeatherSuccess, onWeatherError);
    makeRequest(forecastUrl, onForecastSuccess, onForecastError);
  }

  function startAutoRefresh(cityName) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(function() {
      fetchWeatherData(cityName, true);
    }, REFRESH_INTERVAL_MS);
  }

  function handleSearch() {
    var query = cityInput ? cityInput.value.trim() : "";
    if (query === "") {
      showError("Enter a city name");
      return;
    }
    currentCityName = query;
    stopAllTimers();
    fetchWeatherData(currentCityName, false);
    startAutoRefresh(currentCityName);
  }

  // Initialise
  if (searchBtn) searchBtn.addEventListener('click', handleSearch);
  if (cityInput) cityInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSearch();
  });

  // Start with New York
  currentCityName = "New York";
  fetchWeatherData(currentCityName, false);
  startAutoRefresh(currentCityName);
})();