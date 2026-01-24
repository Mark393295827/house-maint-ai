import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Helper to render components with Router context
export function renderWithRouter(Component, options = {}) {
    return render(
        <BrowserRouter>
            {Component}
        </BrowserRouter>,
        options
    );
}

// Mock localStorage
export const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
