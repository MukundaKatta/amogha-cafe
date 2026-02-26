// ===== FIREBASE DB ACCESSOR =====
// window.db is set by an inline <script> in index.html BEFORE script.js loads.
// Always call getDb() lazily inside functions — never at module top level.
export function getDb() { return window.db; }
