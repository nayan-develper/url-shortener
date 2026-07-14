const { encode } = require('../src/services/shortener');

describe('base62 encoder', () => {
  test('encodes 0 correctly', () => {
    expect(encode(0)).toBe('0');
  });

  test('encodes 62 as "10" (base62 rollover)', () => {
    expect(encode(62)).toBe('10');
  });

  test('encodes 3844 as "100"', () => {
    expect(encode(3844)).toBe('100');
  });

  test('output contains only URL-safe characters', () => {
    expect(encode(Date.now())).toMatch(/^[0-9a-zA-Z]+$/);
  });

  test('two different numbers produce different codes', () => {
    expect(encode(1000)).not.toBe(encode(1001));
  });
});
