import { describe, it, expect } from 'vitest';
import { parseDiagnosis } from '../diagnosisParser';

describe('Diagnosis Parser Logic', () => {
  it('correctly parses DIY severity', () => {
    const raw = {
      severity: 'DIY',
      category: 'Plumbing',
      hypothesis: 'Leaking P-Trap needs tightening'
    };
    const result = parseDiagnosis(raw);
    expect(result.isDIY).toBe(true);
    expect(result.badgeColor).toBe('#10b981');
    expect(result.badgeText).toContain('DIY');
    expect(result.category).toBe('Plumbing');
  });

  it('correctly parses 48h severity', () => {
    const raw = {
      severity: '48h',
      category: 'Electrical',
      hypothesis: 'Circuit breaker tripped'
    };
    const result = parseDiagnosis(raw);
    expect(result.isDIY).toBe(false);
    expect(result.badgeColor).toBe('#f59e0b');
    expect(result.badgeText).toContain('48h');
  });

  it('correctly parses Emergency severity', () => {
    const raw = {
      severity: 'Emergency',
      category: 'Water Damage',
      hypothesis: 'Burst pipe flooding'
    };
    const result = parseDiagnosis(raw);
    expect(result.isDIY).toBe(false);
    expect(result.badgeColor).toBe('#ef4444');
    expect(result.badgeText).toContain('Emergency');
  });

  it('handles missing data securely', () => {
    const raw = {};
    const result = parseDiagnosis(raw);
    expect(result.isDIY).toBe(false);
    expect(result.badgeColor).toBe('#3b82f6'); // Default pending
    expect(result.category).toBe('General Assessment');
  });
});
