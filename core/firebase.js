// ===== FIREBASE DB ACCESSOR =====
// window.db is set by an inline <script> in index.html BEFORE script.js loads.
// Always call getDb() lazily inside functions — never at module top level.
export function getDb() { return window.db; }

// Access firebase.firestore.FieldValue safely (used for increment/serverTimestamp)
export function getFieldValue() {
    return window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue
        ? window.firebase.firestore.FieldValue : null;
}
