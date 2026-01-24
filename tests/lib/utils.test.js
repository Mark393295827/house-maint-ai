/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    getTimestamp,
    getPathSeparator,
    normalizePath,
    getOSType
} from '../../scripts/lib/utils.js';

describe('utils', () => {
    describe('getTimestamp', () => {
        it('should return ISO format timestamp', () => {
            const timestamp = getTimestamp();
            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('getPathSeparator', () => {
        it('should return a valid path separator', () => {
            const sep = getPathSeparator();
            expect(['/', '\\']).toContain(sep);
        });
    });

    describe('normalizePath', () => {
        it('should normalize path', () => {
            const result = normalizePath('foo/bar/../baz');
            expect(result).toContain('foo');
            expect(result).toContain('baz');
        });
    });

    describe('getOSType', () => {
        it('should return valid OS type', () => {
            const os = getOSType();
            expect(['windows', 'macos', 'linux']).toContain(os);
        });
    });
});
