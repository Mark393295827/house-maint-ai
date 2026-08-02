import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TurnoverPhotoDiffViewer from './TurnoverPhotoDiffViewer';
import { LanguageProvider } from '../../i18n/LanguageContext';

const renderWithContext = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('TurnoverPhotoDiffViewer', () => {
  it('renders turnover photo diff viewer header and property info', () => {
    renderWithContext(
      <TurnoverPhotoDiffViewer
        initialData={{
          propertyAddress: 'Unit 502 Sunny Apartments',
          tenantName: 'Jane Doe',
        }}
      />
    );

    expect(screen.getByTestId('turnover-photo-diff-viewer')).toBeInTheDocument();
    expect(screen.getByText(/Unit 502 Sunny Apartments/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
  });

  it('switches view mode between curtain slider, side-by-side, and overlay', () => {
    renderWithContext(<TurnoverPhotoDiffViewer />);

    const sideBySideBtn = screen.getByText('Side-by-Side');
    fireEvent.click(sideBySideBtn);

    expect(screen.getByText('BEFORE')).toBeInTheDocument();
    expect(screen.getByText('AFTER')).toBeInTheDocument();

    const overlayBtn = screen.getByText('Overlay');
    fireEvent.click(overlayBtn);

    expect(screen.getByText('DIFFERENCE OVERLAY MASK')).toBeInTheDocument();
  });

  it('filters defects when room tabs are clicked', () => {
    renderWithContext(<TurnoverPhotoDiffViewer />);

    expect(screen.getByText('Drywall Scratch & Wall Paint Peeling')).toBeInTheDocument();

    // Click Living Room filter
    const livingRoomBtn = screen.getByRole('button', { name: 'Living Room' });
    fireEvent.click(livingRoomBtn);

    expect(screen.getByText('Drywall Scratch & Wall Paint Peeling')).toBeInTheDocument();
    expect(screen.queryByText('Baseboard Water Staining')).not.toBeInTheDocument();
  });

  it('triggers onExportReport when export button is clicked', () => {
    const handleExport = vi.fn();
    renderWithContext(<TurnoverPhotoDiffViewer onExportReport={handleExport} />);

    const exportBtn = screen.getByText('Export Sign-off Report');
    fireEvent.click(exportBtn);

    expect(handleExport).toHaveBeenCalledTimes(1);
  });
});
