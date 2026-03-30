// ===== AMBIENT MUSIC PLAYER MODULE =====
// In-app cafe atmosphere music player
// Inspired by: Starbucks + Spotify integration

var PLAYLISTS = [
    {
        id: 'morning',
        name: 'Morning Brew',
        icon: '🌅',
        description: 'Gentle acoustic tunes for your morning coffee',
        timeRange: [5, 11],
        tracks: [
            { title: 'Cafe Morning', file: '/music/cafe-morning.mp3' },
            { title: 'Gentle Sunrise', file: '/music/gentle-sunrise.mp3' },
            { title: 'Acoustic Dreams', file: '/music/acoustic-dreams.mp3' }
        ]
    },
    {
        id: 'afternoon',
        name: 'Afternoon Jazz',
        icon: '🎷',
        description: 'Smooth jazz to complement your meal',
        timeRange: [11, 17],
        tracks: [
            { title: 'Smooth Jazz', file: '/music/smooth-jazz.mp3' },
            { title: 'Cafe Jazz', file: '/music/cafe-jazz.mp3' },
            { title: 'Mellow Groove', file: '/music/mellow-groove.mp3' }
        ]
    },
    {
        id: 'evening',
        name: 'Evening Lounge',
        icon: '🌙',
        description: 'Relaxing lounge vibes for dinner',
        timeRange: [17, 23],
        tracks: [
            { title: 'Lounge Vibes', file: '/music/lounge-vibes.mp3' },
            { title: 'Twilight Cafe', file: '/music/twilight-cafe.mp3' },
            { title: 'Night Chill', file: '/music/night-chill.mp3' }
        ]
    },
    {
        id: 'indian',
        name: 'Indian Classical',
        icon: '🎵',
        description: 'Soothing Indian instrumentals',
        timeRange: [0, 24],
        tracks: [
            { title: 'Raga Morning', file: '/music/raga-morning.mp3' },
            { title: 'Sitar Dreams', file: '/music/sitar-dreams.mp3' },
            { title: 'Flute Meditation', file: '/music/flute-meditation.mp3' }
        ]
    }
];

var audio = null;
var currentPlaylist = null;
var currentTrackIndex = 0;
var isPlaying = false;
var volume = 0.3; // Default low volume for ambient

function getTimeBasedPlaylist() {
    var hour = new Date().getHours();
    for (var i = 0; i < PLAYLISTS.length; i++) {
        var range = PLAYLISTS[i].timeRange;
        if (hour >= range[0] && hour < range[1]) return PLAYLISTS[i];
    }
    return PLAYLISTS[0];
}

function createAudio() {
    if (!audio) {
        audio = new Audio();
        audio.volume = volume;
        audio.addEventListener('ended', function() {
            nextTrack();
        });
        audio.addEventListener('error', function() {
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
                isPlaying = false;
                updatePlayerUI();
                return;
            }
            // Skip to next track on error
            setTimeout(nextTrack, 1000);
        });
    }
    return audio;
}

var playPromise = null;
var consecutiveErrors = 0;

function playTrack(playlist, trackIndex) {
    currentPlaylist = playlist;
    currentTrackIndex = trackIndex % playlist.tracks.length;
    var track = playlist.tracks[currentTrackIndex];

    var a = createAudio();
    a.src = track.file;
    playPromise = a.play();
    if (playPromise) {
        playPromise.then(function() {
            playPromise = null;
            consecutiveErrors = 0;
            isPlaying = true;
            updatePlayerUI();
        }).catch(function(err) {
            playPromise = null;
            if (err.name !== 'AbortError') {
                isPlaying = false;
                updatePlayerUI();
            }
        });
    }
}

function nextTrack() {
    if (!currentPlaylist) return;
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.tracks.length;
    playTrack(currentPlaylist, currentTrackIndex);
}

function prevTrack() {
    if (!currentPlaylist) return;
    currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.tracks.length) % currentPlaylist.tracks.length;
    playTrack(currentPlaylist, currentTrackIndex);
}

function togglePlay() {
    if (!audio) {
        var pl = currentPlaylist || getTimeBasedPlaylist();
        playTrack(pl, 0);
        return;
    }

    if (isPlaying) {
        var doPause = function() {
            audio.pause();
            isPlaying = false;
            updatePlayerUI();
        };
        if (playPromise) {
            playPromise.then(doPause).catch(function() {});
        } else {
            doPause();
        }
    } else {
        playPromise = audio.play();
        if (playPromise) {
            playPromise.then(function() {
                playPromise = null;
                isPlaying = true;
                updatePlayerUI();
            }).catch(function(err) {
                playPromise = null;
                if (err.name !== 'AbortError') {
                    updatePlayerUI();
                }
            });
        }
    }
    updatePlayerUI();
}

function setVolume(val) {
    volume = Math.max(0, Math.min(1, val));
    if (audio) audio.volume = volume;
    localStorage.setItem('amogha_music_volume', volume);
    updatePlayerUI();
}

function updatePlayerUI() {
    var playBtn = document.getElementById('musicPlayBtn');
    if (playBtn) {
        playBtn.innerHTML = isPlaying ? '⏸' : '▶';
        playBtn.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
    }

    var trackName = document.getElementById('musicTrackName');
    if (trackName && currentPlaylist) {
        trackName.textContent = currentPlaylist.tracks[currentTrackIndex].title;
    }

    var playlistName = document.getElementById('musicPlaylistName');
    if (playlistName && currentPlaylist) {
        playlistName.textContent = currentPlaylist.icon + ' ' + currentPlaylist.name;
    }

    var volSlider = document.getElementById('musicVolume');
    if (volSlider) volSlider.value = volume;

    var miniPlayer = document.getElementById('musicMiniPlayer');
    if (miniPlayer) {
        miniPlayer.classList.toggle('playing', isPlaying);
    }
}

export function initMusicPlayer() {
    // Restore volume preference
    var savedVol = localStorage.getItem('amogha_music_volume');
    if (savedVol !== null) volume = parseFloat(savedVol);

    // Create mini player widget
    var player = document.createElement('div');
    player.id = 'musicMiniPlayer';
    player.className = 'music-mini-player';
    player.innerHTML =
        '<button class="music-toggle-btn" id="musicToggleExpand" aria-label="Toggle music player">' +
            '<span class="music-note-icon">♪</span>' +
        '</button>' +
        '<div class="music-player-expanded">' +
            '<div class="music-player-header">' +
                '<span id="musicPlaylistName" class="music-playlist-name">' + getTimeBasedPlaylist().icon + ' ' + getTimeBasedPlaylist().name + '</span>' +
                '<span id="musicTrackName" class="music-track-name">Tap play to start</span>' +
            '</div>' +
            '<div class="music-controls">' +
                '<button class="music-ctrl-btn" id="musicPrevBtn" aria-label="Previous track">⏮</button>' +
                '<button class="music-ctrl-btn music-play-btn" id="musicPlayBtn" aria-label="Play music">▶</button>' +
                '<button class="music-ctrl-btn" id="musicNextBtn" aria-label="Next track">⏭</button>' +
            '</div>' +
            '<div class="music-volume-row">' +
                '<span class="music-vol-icon">🔈</span>' +
                '<input type="range" id="musicVolume" min="0" max="1" step="0.05" value="' + volume + '" aria-label="Volume">' +
                '<span class="music-vol-icon">🔊</span>' +
            '</div>' +
            '<div class="music-playlists">' +
                PLAYLISTS.map(function(pl) {
                    return '<button class="music-playlist-btn" data-playlist="' + pl.id + '" title="' + pl.description + '">' +
                        pl.icon + ' ' + pl.name +
                    '</button>';
                }).join('') +
            '</div>' +
        '</div>';

    document.body.appendChild(player);

    // Toggle expand
    document.getElementById('musicToggleExpand').addEventListener('click', function() {
        player.classList.toggle('expanded');
    });

    // Play/pause
    document.getElementById('musicPlayBtn').addEventListener('click', togglePlay);
    document.getElementById('musicNextBtn').addEventListener('click', nextTrack);
    document.getElementById('musicPrevBtn').addEventListener('click', prevTrack);

    // Volume
    document.getElementById('musicVolume').addEventListener('input', function() {
        setVolume(parseFloat(this.value));
    });

    // Playlist selection
    player.querySelectorAll('.music-playlist-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var plId = btn.dataset.playlist;
            var pl = PLAYLISTS.find(function(p) { return p.id === plId; });
            if (pl) {
                playTrack(pl, 0);
                player.querySelectorAll('.music-playlist-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            }
        });
    });

    // Close player when scrolling down to not obstruct
    var lastScrollY = 0;
    window.addEventListener('scroll', function() {
        if (window.scrollY > lastScrollY + 100 && player.classList.contains('expanded')) {
            player.classList.remove('expanded');
        }
        lastScrollY = window.scrollY;
    }, { passive: true });
}
