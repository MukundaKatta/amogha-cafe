import { describe, it, expect, beforeEach } from 'vitest';
import { submitReservation, openReservationModal, initReservations } from '../src/modules/reservations.js';

// create minimal reservation modal which scripts enhance
function setupDOM(html) {
  document.body.innerHTML = html;
  document.getElementById = (id) => document.body.querySelector('#' + id);
  document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
  document.querySelector = (sel) => document.body.querySelector(sel);
}

describe('reservations logic', () => {
  beforeEach(() => {
    setupDOM(`
      <div id="reservation-modal"></div>
      <form id="reservation-form"></form>
    `);
    // initialize to wire up listeners
    initReservations();
  });

  it('submitReservation rejects when missing fields', () => {
    // leave inputs empty
    document.body.innerHTML += `
      <input id="res-name" value="" />
      <input id="res-phone" value="" />
      <input id="res-date" value="" />
      <input id="res-time" value="" />
      <textarea id="res-requests"></textarea>
      <button class="party-btn" data-size="0"></button>
      <div id="res-msg"></div>
    `;
    submitReservation();
    expect(document.getElementById('res-msg').textContent).toMatch(/fill in all required/);

    // invalid phone
    document.getElementById('res-name').value = 'A';
    document.getElementById('res-phone').value = '123';
    document.getElementById('res-date').value = '2025-01-01';
    document.getElementById('res-time').value = '10:00';
    document.querySelector('.party-btn').classList.add('active');
    document.querySelector('.party-btn').dataset.size = '2';
    submitReservation();
    expect(document.getElementById('res-msg').textContent).toMatch(/valid 10-digit/);
  });
});
