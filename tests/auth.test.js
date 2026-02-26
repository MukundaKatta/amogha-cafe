import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUser, setCurrentUser } from '../src/modules/auth.js';

describe('Auth — getCurrentUser / setCurrentUser', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns null when no user is stored', () => {
        expect(getCurrentUser()).toBeNull();
    });

    it('stores and retrieves a user object', () => {
        const user = { name: 'Ravi Kumar', phone: '9876543210', pin: '1234' };
        setCurrentUser(user);
        const retrieved = getCurrentUser();
        expect(retrieved).not.toBeNull();
        expect(retrieved.name).toBe('Ravi Kumar');
        expect(retrieved.phone).toBe('9876543210');
    });

    it('persists user across multiple getCurrentUser calls', () => {
        setCurrentUser({ name: 'Priya', phone: '9000000001', pin: '9999' });
        expect(getCurrentUser().name).toBe('Priya');
        expect(getCurrentUser().name).toBe('Priya');
    });

    it('overwrites previous user on setCurrentUser', () => {
        setCurrentUser({ name: 'First', phone: '1111111111', pin: '0000' });
        setCurrentUser({ name: 'Second', phone: '2222222222', pin: '1111' });
        expect(getCurrentUser().name).toBe('Second');
        expect(getCurrentUser().phone).toBe('2222222222');
    });

    it('returns null if localStorage contains invalid JSON', () => {
        localStorage.setItem('amoghaUser', 'not-valid-json');
        expect(getCurrentUser()).toBeNull();
    });

    it('persists loyalty points correctly', () => {
        setCurrentUser({ name: 'Test', phone: '9000000001', pin: '0000', loyaltyPoints: 250 });
        expect(getCurrentUser().loyaltyPoints).toBe(250);
    });
});
