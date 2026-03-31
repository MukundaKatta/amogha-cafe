import { getCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';
import { safeGetItem, safeSetItem } from '../core/utils.js';

function escH(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ===== COMMUNITY POLLS (Vote on new menu items) =====

var DEMO_POLLS = [
    {
        id: 'poll-march-2026',
        question: 'Which new item should we add to the menu?',
        options: [
            { id: 'a', text: 'Truffle Mushroom Biryani', icon: '🍄', votes: 0 },
            { id: 'b', text: 'Matcha Chai Latte', icon: '🍵', votes: 0 },
            { id: 'c', text: 'Korean Fried Paneer', icon: '🍳', votes: 0 },
            { id: 'd', text: 'Tiramisu Kulfi', icon: '🍮', votes: 0 }
        ],
        endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        totalVotes: 0
    }
];

export function openPollsModal() {
    var modal = document.getElementById('polls-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    loadPolls();
}

export function closePollsModal() {
    var modal = document.getElementById('polls-modal');
    if (modal) modal.style.display = 'none';
}

function loadPolls() {
    var container = document.getElementById('polls-container');
    if (!container) return;

    var db = getDb();
    if (db) {
        db.collection('polls').where('active', '==', true).limit(3).get().then(function(snap) {
            if (snap.empty) {
                renderPolls(container, DEMO_POLLS);
            } else {
                var polls = [];
                snap.forEach(function(doc) {
                    polls.push(Object.assign({ id: doc.id }, doc.data()));
                });
                renderPolls(container, polls);
            }
        }).catch(function() {
            renderPolls(container, DEMO_POLLS);
        });
    } else {
        renderPolls(container, DEMO_POLLS);
    }
}

function renderPolls(container, polls) {
    var user = getCurrentUser();
    container.innerHTML = polls.map(function(poll) {
        var userVote = safeGetItem('poll-vote-' + poll.id);
        var totalVotes = poll.options.reduce(function(sum, o) { return sum + (o.votes || 0); }, 0);
        var timeLeft = getTimeLeft(poll.endsAt);

        return '<div class="poll-card">' +
            '<h4 class="poll-question">' + escH(poll.question) + '</h4>' +
            '<div class="poll-timer">' + escH(timeLeft) + '</div>' +
            '<div class="poll-options">' +
            poll.options.map(function(opt) {
                var pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                var isVoted = userVote === opt.id;
                var showResults = !!userVote;
                return '<button class="poll-option ' + (isVoted ? 'voted' : '') + (showResults ? ' show-results' : '') + '" ' +
                    (userVote ? 'disabled' : 'onclick="votePoll(\'' + escH(String(poll.id)) + '\',\'' + escH(String(opt.id)) + '\')"') + '>' +
                    '<span class="poll-option-icon">' + escH(opt.icon) + '</span>' +
                    '<span class="poll-option-text">' + escH(opt.text) + '</span>' +
                    (showResults ? '<span class="poll-option-pct">' + pct + '%</span>' +
                        '<div class="poll-option-bar" style="width:' + pct + '%"></div>' : '') +
                    (isVoted ? '<span class="poll-voted-check">✓</span>' : '') +
                '</button>';
            }).join('') +
            '</div>' +
            '<div class="poll-total">' + totalVotes + ' votes</div>' +
        '</div>';
    }).join('');
}

function getTimeLeft(endsAt) {
    var diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return 'Voting ended';
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return days + 'd ' + hours + 'h left';
    return hours + 'h left';
}

export function votePoll(pollId, optionId) {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }

    // Prevent double voting
    if (safeGetItem('poll-vote-' + pollId)) {
        showAuthToast('You already voted on this poll!');
        return;
    }

    safeSetItem('poll-vote-' + pollId, optionId);

    var db = getDb();
    if (db) {
        // Increment the vote count in Firestore
        var pollRef = db.collection('polls').doc(pollId);
        pollRef.get().then(function(doc) {
            if (doc.exists) {
                var data = doc.data();
                var opts = data.options || [];
                opts.forEach(function(o) {
                    if (o.id === optionId) o.votes = (o.votes || 0) + 1;
                });
                pollRef.update({ options: opts }).catch(function(e) { console.error('Vote save error:', e); });
            }
        }).catch(function() {});
    }

    showAuthToast('Vote recorded! Thanks for your input!');
    loadPolls(); // Refresh to show results
}

export function initPolls() {}

Object.assign(window, { openPollsModal, closePollsModal, votePoll });
