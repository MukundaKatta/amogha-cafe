import { getCurrentUser, showAuthToast } from './auth.js';
import { safeGetItem, safeSetItem } from '../core/utils.js';

// ===== SEASONAL THEME ENGINE WITH COUNTDOWN =====

var SEASONS = {
    diwali: {
        name: 'Diwali Special',
        months: [10, 11], // Oct-Nov
        accent: '#FF6B00',
        bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
        particles: ['🪔', '✨', '🎆', '🎇'],
        banner: 'Diwali Feast — Special Menu Available!',
        menuBadge: 'Diwali Special',
        countdown: null
    },
    christmas: {
        name: 'Christmas & New Year',
        months: [12, 1], // Dec-Jan
        accent: '#c41e3a',
        bg: 'linear-gradient(135deg, #1a3a1a 0%, #0d260d 50%, #1a3a1a 100%)',
        particles: ['🎄', '⭐', '🎅', '❄️'],
        banner: 'Christmas Special — Festive Menu Now Live!',
        menuBadge: 'Holiday Special',
        countdown: null
    },
    summer: {
        name: 'Summer Coolers',
        months: [4, 5, 6], // Apr-Jun
        accent: '#FF8C00',
        bg: 'linear-gradient(135deg, #2d1f00 0%, #4a3200 50%, #2d1f00 100%)',
        particles: ['☀️', '🍦', '🥤', '🌊'],
        banner: 'Beat the Heat — Summer Coolers Available!',
        menuBadge: 'Summer Special',
        countdown: null
    },
    monsoon: {
        name: 'Monsoon Magic',
        months: [7, 8, 9], // Jul-Sep
        accent: '#4682B4',
        bg: 'linear-gradient(135deg, #0a1628 0%, #132a4a 50%, #0a1628 100%)',
        particles: ['🌧️', '☕', '🍵', '🌈'],
        banner: 'Monsoon Specials — Hot Chai & Pakoras!',
        menuBadge: 'Monsoon Special',
        countdown: null
    },
    valentine: {
        name: 'Valentine\'s Week',
        months: [2], // Feb
        accent: '#e91e63',
        bg: 'linear-gradient(135deg, #2d0a1a 0%, #4a1230 50%, #2d0a1a 100%)',
        particles: ['💕', '🌹', '💝', '❤️'],
        banner: 'Valentine\'s Special — Couple Meals & Desserts!',
        menuBadge: 'Valentine Special',
        countdown: null
    }
};

export function getCurrentSeason() {
    var month = new Date().getMonth() + 1; // 1-based
    for (var key in SEASONS) {
        if (SEASONS[key].months.indexOf(month) !== -1) return { key: key, data: SEASONS[key] };
    }
    return null;
}

export function applySeasonalTheme() {
    var season = getCurrentSeason();
    if (!season) return;
    var data = season.data;

    // Add seasonal class to body
    document.body.classList.add('season-' + season.key);

    // Show seasonal banner
    showSeasonalBanner(data);

    // Add floating seasonal particles
    startSeasonalParticles(data.particles);

    // Update CSS custom properties for accent
    document.documentElement.style.setProperty('--seasonal-accent', data.accent);
}

function showSeasonalBanner(data) {
    var existing = document.getElementById('seasonal-banner');
    if (existing) return; // Don't show twice
    var dismissed = safeGetItem('seasonal-banner-dismissed');
    if (dismissed === data.name) return;

    var banner = document.createElement('div');
    banner.id = 'seasonal-banner';
    banner.className = 'seasonal-banner';
    banner.setAttribute('role', 'banner');
    banner.innerHTML =
        '<span class="seasonal-banner-particles">' + data.particles.join(' ') + '</span>' +
        '<span class="seasonal-banner-text">' + data.banner + '</span>' +
        '<button class="seasonal-banner-close" onclick="dismissSeasonalBanner(\'' + data.name + '\')" aria-label="Dismiss">&times;</button>';

    var header = document.querySelector('header');
    if (header && header.nextSibling) {
        header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
        document.body.insertBefore(banner, document.body.firstChild);
    }
    setTimeout(function() { banner.classList.add('show'); }, 100);
}

export function dismissSeasonalBanner(name) {
    safeSetItem('seasonal-banner-dismissed', name);
    var banner = document.getElementById('seasonal-banner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(function() { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
    }
}

var particleInterval = null;
function startSeasonalParticles(particles) {
    if (particleInterval) return;
    // Subtle floating particles in hero section only
    particleInterval = setInterval(function() {
        var hero = document.querySelector('.hero');
        if (!hero || document.hidden) return;
        var particle = document.createElement('span');
        particle.className = 'seasonal-particle';
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (3 + Math.random() * 4) + 's';
        hero.appendChild(particle);
        setTimeout(function() { if (particle.parentNode) particle.parentNode.removeChild(particle); }, 7000);
    }, 2000);
}

// Limited-time countdown
export function showLimitedTimeCountdown(endDate, itemName) {
    var countdownEl = document.getElementById('lto-countdown');
    if (!countdownEl) return;
    var end = new Date(endDate).getTime();

    function tick() {
        var now = Date.now();
        var diff = end - now;
        if (diff <= 0) {
            countdownEl.innerHTML = '<span class="lto-expired">This offer has ended</span>';
            return;
        }
        var d = Math.floor(diff / 86400000);
        var h = Math.floor((diff % 86400000) / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        countdownEl.innerHTML =
            '<div class="lto-header">Limited Time: ' + (itemName || 'Special Offer') + '</div>' +
            '<div class="lto-timer">' +
                '<div class="lto-unit"><span class="lto-num">' + d + '</span><span class="lto-label">Days</span></div>' +
                '<div class="lto-sep">:</div>' +
                '<div class="lto-unit"><span class="lto-num">' + String(h).padStart(2, '0') + '</span><span class="lto-label">Hours</span></div>' +
                '<div class="lto-sep">:</div>' +
                '<div class="lto-unit"><span class="lto-num">' + String(m).padStart(2, '0') + '</span><span class="lto-label">Min</span></div>' +
                '<div class="lto-sep">:</div>' +
                '<div class="lto-unit"><span class="lto-num">' + String(s).padStart(2, '0') + '</span><span class="lto-label">Sec</span></div>' +
            '</div>';
        setTimeout(tick, 1000);
    }
    tick();
}

export function initSeasonal() {
    applySeasonalTheme();
    // Show a limited-time offer countdown (demo: 3 days from now)
    var endDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    var season = getCurrentSeason();
    if (season) {
        showLimitedTimeCountdown(endDate, season.data.menuBadge);
    }
}

if (!window._seasonalGlobalsSet) {
    window._seasonalGlobalsSet = true;
    Object.assign(window, { dismissSeasonalBanner, initSeasonal });
}
