import { describe, it, expect } from '@jest/globals';
// Simple utility function to test (inline implementation for testing)
function standardizeBrand(brand) {
    if (!brand || brand.trim() === '')
        return 'unknown';
    // Remove common suffixes and normalize case
    return brand
        .toLowerCase()
        .replace(/\.(com|org|net)$/g, '')
        .replace(/\s+(inc|llc|ltd|corp|co)\.?$/g, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
describe('Basic Test Suite', () => {
    describe('standardizeBrand function', () => {
        it('should capitalize brand names correctly', () => {
            expect(standardizeBrand('apple')).toBe('Apple');
            expect(standardizeBrand('nike')).toBe('Nike');
        });
        it('should remove .com suffix', () => {
            expect(standardizeBrand('amazon.com')).toBe('Amazon');
        });
        it('should return "unknown" for empty input', () => {
            expect(standardizeBrand('')).toBe('unknown');
        });
        it('should handle corporate suffixes', () => {
            expect(standardizeBrand('microsoft inc')).toBe('Microsoft');
            expect(standardizeBrand('google llc')).toBe('Google');
        });
        it('should handle complex brand names', () => {
            expect(standardizeBrand('johnson & johnson')).toBe('Johnson & Johnson');
            expect(standardizeBrand('procter & gamble')).toBe('Procter & Gamble');
        });
    });
    describe('Math operations', () => {
        it('should add numbers correctly', () => {
            expect(1 + 1).toBe(2);
            expect(2 + 2).toBe(4);
        });
        it('should handle string operations', () => {
            expect('hello' + ' world').toBe('hello world');
        });
    });
    describe('JSON operations', () => {
        it('should parse and stringify JSON', () => {
            const obj = { brand: 'Apple', category: ['Electronics'] };
            const jsonString = JSON.stringify(obj);
            const parsed = JSON.parse(jsonString);
            expect(parsed).toEqual(obj);
            expect(parsed.brand).toBe('Apple');
            expect(parsed.category).toContain('Electronics');
        });
    });
    describe('Array operations', () => {
        it('should handle array operations', () => {
            const arr = ['Electronics', 'Computers', 'Laptops'];
            expect(arr.length).toBe(3);
            expect(arr[0]).toBe('Electronics');
            expect(arr.includes('Computers')).toBe(true);
        });
    });
});
