import { describe, it, expect, vi } from 'vitest';
import { generateMonthlyCSV, calculateSummaryMetrics } from './reportExport';
import { Report } from '../types';

describe('reportExport CSV Utility', () => {
    
  it('correctly calculates summary metrics from mocked report data', () => {
    const mockReports: Partial<Report>[] = [
      { id: 1, ai_severity: 'DIY', duration_hours: 0 },
      { id: 2, ai_severity: '48h', duration_hours: 12 },
      { id: 3, ai_severity: 'Emergency', duration_hours: 1 },
      { id: 4, ai_severity: 'DIY', duration_hours: 0 },
    ];

    const stats = calculateSummaryMetrics(mockReports as Report[]);
    
    // Total Volume = 4
    expect(stats.volume).toBe(4);
    
    // TDR calculation: 2 DIY out of 4 total = 50%
    expect(stats.aiDeflectionRate).toBe(50);
    
    // Avg Response calculation: (0 + 12 + 1 + 0) / 4 = 13 / 4 = 3.25
    expect(stats.avgResponseTimeHours).toBeCloseTo(3.25);
    
    // Cost calculation: 0 + 300 + 1200 + 0 = 1500
    expect(stats.totalCost).toBe(1500);
  });

  it('correctly formats the output string as CSV', () => {
    const mockStats = {
      volume: 120,
      aiDeflectionRate: 65.5,
      avgResponseTimeHours: 2.4,
      totalCost: 15400
    };

    const csvOutput = generateMonthlyCSV([], mockStats, '2026-04');
    
    const lines = csvOutput.split('\n');
    expect(lines.length).toBe(2);
    
    // Verify headers
    expect(lines[0]).toBe('Date/Month,Total Ticket Volume,AI Deflection Rate (TDR) %,Avg Response Time (Hrs),Total Cost (¥)');
    
    // Verify row serialization
    expect(lines[1]).toBe('2026-04,120,65.50,2.4,15400.00');
  });

  it('handles empty report edge case cleanly', () => {
    const stats = calculateSummaryMetrics([]);
    expect(stats.volume).toBe(0);
    expect(stats.aiDeflectionRate).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.avgResponseTimeHours).toBe(0);
  });
});
