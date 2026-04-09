import { Report } from '../types';

export interface MonthlyStats {
  volume: number;
  aiDeflectionRate: number; // TDR (percentage format 0-100)
  avgResponseTimeHours: number;
  totalCost: number;
}

export function generateMonthlyCSV(reports: Report[], stats: MonthlyStats, yearMonth: string): string {
  // Define CSV Header
  const headers = [
    'Date/Month',
    'Total Ticket Volume',
    'AI Deflection Rate (TDR) %',
    'Avg Response Time (Hrs)',
    'Total Cost (¥)'
  ];

  // Define values mapping
  const row = [
    yearMonth,
    stats.volume.toString(),
    stats.aiDeflectionRate.toFixed(2),
    stats.avgResponseTimeHours.toFixed(1),
    stats.totalCost.toFixed(2)
  ];

  // Combine into CSV payload
  const csvContent = `${headers.join(',')}\n${row.join(',')}`;

  return csvContent;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) { 
    // Browsers that support HTML5 download attribute
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function calculateSummaryMetrics(reports: Report[]): MonthlyStats {
  const volume = reports.length;
  
  const diyCount = reports.filter(r => r.ai_severity === 'DIY').length;
  const aiDeflectionRate = volume > 0 ? (diyCount / volume) * 100 : 0;
  
  // Fake response time / cost calculation loosely based on severity 
  const totalCost = reports.reduce((sum, r) => {
    if (r.ai_severity === 'Emergency') return sum + 1200; // Base rate mock
    if (r.ai_severity === '48h') return sum + 300;
    return sum + 0; // DIY is free
  }, 0);

  const avgResponseTimeHours = reports.reduce((sum, r) => sum + (r.duration_hours ?? 4), 0) / (volume || 1);

  return {
    volume,
    aiDeflectionRate,
    avgResponseTimeHours,
    totalCost
  };
}
