export interface DiagnosisResult {
  severity: string; // 'DIY' | '48h' | 'Emergency'
  category?: string;
  hypothesis?: string;
  confidence?: number;
}

export interface ParsedDiagnosis {
  badgeColor: string;
  badgeText: string;
  isDIY: boolean;
  category: string;
  hypothesis: string;
}

export function parseDiagnosis(result: DiagnosisResult | any): ParsedDiagnosis {
  const parsed: ParsedDiagnosis = {
    badgeColor: '#3b82f6', // Default blue
    badgeText: 'Pending',
    isDIY: false,
    category: result?.category || 'General Assessment',
    hypothesis: result?.hypothesis || 'Awaiting further detailed analysis based on provided media.'
  };

  const severity = (result?.severity || '').toUpperCase();

  if (severity.includes('DIY')) {
    parsed.badgeColor = '#10b981'; // Green
    parsed.badgeText = 'DIY - Safe to fix yourself';
    parsed.isDIY = true;
  } else if (severity.includes('48H') || severity.includes('STANDARD')) {
    parsed.badgeColor = '#f59e0b'; // Orange
    parsed.badgeText = 'Standard (Within 48h)';
  } else if (severity.includes('EMERGENCY') || severity.includes('URGENT')) {
    parsed.badgeColor = '#ef4444'; // Red
    parsed.badgeText = 'Emergency! Dispatching now';
  } else {
    parsed.badgeText = result?.severity || 'Assessed';
  }

  return parsed;
}
