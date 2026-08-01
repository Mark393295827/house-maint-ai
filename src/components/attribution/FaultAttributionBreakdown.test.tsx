import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import FaultAttributionBreakdown from './FaultAttributionBreakdown';
import { LanguageProvider } from '../../i18n/LanguageContext';

const renderWithContext = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('FaultAttributionBreakdown', () => {
  it('renders fault attribution data and responsibility badges', () => {
    renderWithContext(
      <FaultAttributionBreakdown
        initialData={{
          issueTitle: 'Bathroom Water Leak Dispute',
          landlordPct: 70,
          tenantPct: 30,
          responsibility: 'landlord',
          totalRepairCost: 1000,
        }}
      />
    );

    expect(screen.getByTestId('fault-attribution-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Bathroom Water Leak Dispute')).toBeInTheDocument();
    expect(screen.getByText('Landlord Responsibility')).toBeInTheDocument();
    expect(screen.getByText('¥700.00')).toBeInTheDocument(); // Landlord 70% of 1000
    expect(screen.getByText('¥300.00')).toBeInTheDocument(); // Tenant 30% of 1000
  });

  it('updates split dynamically when override slider is changed', () => {
    const handleUpdate = vi.fn();
    renderWithContext(
      <FaultAttributionBreakdown
        initialData={{
          totalRepairCost: 1000,
          landlordPct: 50,
          tenantPct: 50,
        }}
        onUpdateAttribution={handleUpdate}
      />
    );

    const slider = screen.getByLabelText(/Negotiated Adjustment Slider/i);
    fireEvent.change(slider, { target: { value: '80' } });

    expect(screen.getByText('¥800.00')).toBeInTheDocument(); // Landlord 80%
    expect(screen.getByText('¥200.00')).toBeInTheDocument(); // Tenant 20%
    expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({ landlordPct: 80, tenantPct: 20 }));
  });

  it('copies decision brief memorandum to clipboard on button click', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    renderWithContext(<FaultAttributionBreakdown />);

    const exportBtn = screen.getByText('Export Decision Brief');
    fireEvent.click(exportBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
