import { showAuthToast } from './auth.js';
import { safeGetItem, safeSetItem } from '../core/utils.js';

// ===== WEATHER-BASED SMART RECOMMENDATIONS =====

var WEATHER_RECOMMENDATIONS = {
    hot: {
        icon: '☀️',
        label: 'It\'s hot outside!',
        items: ['Mango Lassi', 'Cold Coffee', 'Butter Milk', 'Ice Cream', 'Fresh Lime Soda'],
        banner: 'Beat the heat with our cool refreshments!'
    },
    cold: {
        icon: '❄️',
        label: 'Chilly weather!',
        items: ['Masala Chai', 'Hot Coffee', 'Tomato Soup', 'Samosa', 'Pakora'],
        banner: 'Warm up with our hot favorites!'
    },
    rainy: {
        icon: '🌧️',
        label: 'Rainy day vibes!',
        items: ['Masala Chai', 'Pakora', 'Maggi', 'Hot Chocolate', 'Onion Bhaji'],
        banner: 'Perfect monsoon treats waiting for you!'
    },
    pleasant: {
        icon: '🌤️',
        label: 'Beautiful day!',
        items: ['Garden Salad', 'Paneer Tikka', 'Fresh Juice', 'Biryani', 'Thali'],
        banner: 'Great weather calls for a great meal!'
    }
};

var cachedWeather = null;

function getWeatherCondition(temp, weatherCode) {
    // Weather codes: 0-3 clear, 45-48 fog, 51-67 drizzle/rain, 71-77 snow, 80-82 showers, 95-99 thunderstorm
    if (weatherCode >= 51 && weatherCode <= 99) return 'rainy';
    if (temp >= 32) return 'hot';
    if (temp <= 18) return 'cold';
    return 'pleasant';
}

export function fetchWeatherRecommendations() {
    // Check cache (15 min TTL)
    var cached = safeGetItem('amogha-weather');
    if (cached) {
        try {
            var parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
                cachedWeather = parsed;
                displayWeatherWidget(parsed.condition);
                return;
            }
        } catch(e) {}
    }

    // Use Geolocation + Open-Meteo (free, no API key)
    if (!navigator.geolocation) {
        displayWeatherWidget('pleasant'); // fallback
        return;
    }

    navigator.geolocation.getCurrentPosition(function(pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.current_weather) {
                    var temp = data.current_weather.temperature;
                    var code = data.current_weather.weathercode;
                    var condition = getWeatherCondition(temp, code);
                    cachedWeather = { condition: condition, temp: temp, code: code, timestamp: Date.now() };
                    safeSetItem('amogha-weather', JSON.stringify(cachedWeather));
                    displayWeatherWidget(condition, temp);
                }
            }).catch(function() {
                displayWeatherWidget('pleasant');
            });
    }, function() {
        // Geolocation denied — use time-of-day heuristic
        var hour = new Date().getHours();
        var month = new Date().getMonth() + 1;
        var condition = 'pleasant';
        if (month >= 4 && month <= 6) condition = 'hot';
        else if (month >= 7 && month <= 9) condition = 'rainy';
        else if (month === 12 || month === 1 || month === 2) condition = 'cold';
        displayWeatherWidget(condition);
    }, { timeout: 5000 });
}

function displayWeatherWidget(condition, temp) {
    var rec = WEATHER_RECOMMENDATIONS[condition];
    if (!rec) return;

    var widget = document.getElementById('weather-recommendations');
    if (!widget) return;

    var tempStr = temp !== undefined ? ' · ' + Math.round(temp) + '°C' : '';
    widget.innerHTML =
        '<div class="weather-widget">' +
            '<div class="weather-header">' +
                '<span class="weather-icon">' + rec.icon + '</span>' +
                '<span class="weather-label">' + rec.label + tempStr + '</span>' +
            '</div>' +
            '<p class="weather-banner">' + rec.banner + '</p>' +
            '<div class="weather-items">' +
            rec.items.map(function(item) {
                return '<button class="weather-item-chip" onclick="scrollToMenuItem(\'' + item.replace(/'/g, "\\'") + '\')">' + item + '</button>';
            }).join('') +
            '</div>' +
        '</div>';
    widget.style.display = 'block';
}

export function scrollToMenuItem(name) {
    // Try to find the item in the menu and scroll to it
    var menuSection = document.getElementById('menu');
    if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
        // Trigger search with the item name
        var searchInput = document.getElementById('menu-search') || document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = name;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

export function initWeather() {
    // Delay weather fetch to not block critical path
    setTimeout(fetchWeatherRecommendations, 3000);
}

if (!window._weatherGlobalsSet) {
    window._weatherGlobalsSet = true;
    Object.assign(window, { scrollToMenuItem, initWeather });
}
