import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MaterialBomCalculator, { MaterialItem } from './MaterialBomCalculator';
import { LanguageProvider } from '../../i18n/LanguageContext';

const renderWithContext = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

const sampleItems: MaterialItem[] = [
  {
    id: 'm1',
    name: 'Test Copper Pipe 1/2 inch',
    category: 'plumbing',
    quantity: 2,
    unit: 'pcs',
    unitPrice: 50,
    laborMultiplier: 1.2,
    sku: 'SKU-TEST-1',
    supplier: 'Test Supplier Co',
  },
  {
    id: 'm2',
    name: 'Test Latex Paint 5L',
    category: 'painting',
    quantity: 1,
    unit: 'bucket',
    unitPrice: 200,
    laborMultiplier: 1.5,
    sku: 'SKU-PAINT-5L',
  },
];

describe('MaterialBomCalculator', () => {
  it('renders title and item list correctly', () => {
    renderWithContext(<MaterialBomCalculator initialItems={sampleItems} reportTitle="Leak Fix Case" />);

    expect(screen.getByTestId('material-bom-calculator')).toBeInTheDocument();
    expect(screen.getByText('Leak Fix Case - BOM')).toBeInTheDocument();
    expect(screen.getByText('Test Copper Pipe 1/2 inch')).toBeInTheDocument();
    expect(screen.getByText('Test Latex Paint 5L')).toBeInTheDocument();
  });

  it('calculates totals accurately with quantity, labor multiplier and tax', () => {
    renderWithContext(<MaterialBomCalculator initialItems={sampleItems} readOnly />);

    // Item 1: 2 * 50 * 1.2 = 120
    // Item 2: 1 * 200 * 1.5 = 300
    // Material subtotal: 2*50 + 1*200 = 300
    // Labor subtotal: 2*50*0.2 + 1*200*0.5 = 20 + 100 = 120
    // Tax (6%): (300 + 120) * 0.06 = 25.2
    // Grand Total: 445.20
    expect(screen.getAllByText('¥300.00')[0]).toBeInTheDocument(); // Material Subtotal & item total
    expect(screen.getAllByText('¥120.00')[0]).toBeInTheDocument(); // Labor Subtotal & item total
    expect(screen.getByText('¥445.20')).toBeInTheDocument(); // Grand Total
  });

  it('allows filtering by search query', () => {
    renderWithContext(<MaterialBomCalculator initialItems={sampleItems} />);

    const searchInput = screen.getByPlaceholderText(/search material name/i);
    fireEvent.change(searchInput, { target: { value: 'Paint' } });

    expect(screen.queryByText('Test Copper Pipe 1/2 inch')).not.toBeInTheDocument();
    expect(screen.getByText('Test Latex Paint 5L')).toBeInTheDocument();
  });

  it('triggers onSave when Save BOM button is clicked', () => {
    const handleSave = vi.fn();
    renderWithContext(<MaterialBomCalculator initialItems={sampleItems} onSave={handleSave} />);

    const saveButton = screen.getByText('Save BOM');
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave.mock.calls[0][0].materialSubtotal).toBe(300);
  });
});
