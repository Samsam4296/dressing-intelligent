/**
 * clothingService Tests
 * Story 2.5: Correction Catégorie
 *
 * Tests for the clothingService with input validation.
 */

import { clothingService } from '../clothingService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

describe('clothingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCategory', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    describe('Input validation', () => {
      it('rejects invalid UUID format', async () => {
        const result = await clothingService.updateCategory('invalid-id', 'haut');

        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('Invalid clothing ID format');
      });

      it('rejects empty clothingId', async () => {
        const result = await clothingService.updateCategory('', 'haut');

        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('Invalid clothing ID format');
      });

      it('rejects invalid category', async () => {
        const result = await clothingService.updateCategory(validUUID, 'invalid' as any);

        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('Invalid category: invalid');
      });

      it('accepts valid UUID and category', async () => {
        const mockSingle = jest.fn().mockResolvedValue({
          data: { id: validUUID, category: 'top' },
          error: null,
        });

        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        });

        const result = await clothingService.updateCategory(validUUID, 'haut');

        expect(result.error).toBeNull();
        expect(result.data).toEqual({ id: validUUID, category: 'haut' });
      });
    });

    describe('Supabase integration', () => {
      it('calls Supabase with correct parameters', async () => {
        const mockSingle = jest.fn().mockResolvedValue({
          data: { id: validUUID, category: 'bottom' },
          error: null,
        });

        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

        (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

        await clothingService.updateCategory(validUUID, 'bas');

        expect(supabase.from).toHaveBeenCalledWith('clothes');
        expect(mockUpdate).toHaveBeenCalledWith({ category: 'bottom' });
        expect(mockEq).toHaveBeenCalledWith('id', validUUID);
        expect(mockSelect).toHaveBeenCalledWith('id, category');
      });

      it('returns error on Supabase error', async () => {
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row not found' },
        });

        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        });

        const result = await clothingService.updateCategory(validUUID, 'haut');

        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('Row not found');
      });
    });

    describe('Category mapping', () => {
      const testCases = [
        { ui: 'haut', db: 'top' },
        { ui: 'bas', db: 'bottom' },
        { ui: 'robe', db: 'dress' },
        { ui: 'veste', db: 'outerwear' },
        { ui: 'chaussures', db: 'shoes' },
        { ui: 'accessoire', db: 'accessory' },
      ] as const;

      testCases.forEach(({ ui, db }) => {
        it(`maps ${ui} (UI) to ${db} (DB) correctly`, async () => {
          const mockSingle = jest.fn().mockResolvedValue({
            data: { id: validUUID, category: db },
            error: null,
          });

          const mockUpdate = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          });

          (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

          const result = await clothingService.updateCategory(validUUID, ui);

          expect(mockUpdate).toHaveBeenCalledWith({ category: db });
          expect(result.data?.category).toBe(ui);
        });
      });

      it('handles unknown DB category in response', async () => {
        const mockSingle = jest.fn().mockResolvedValue({
          data: { id: validUUID, category: 'unknown' },
          error: null,
        });

        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        });

        const result = await clothingService.updateCategory(validUUID, 'haut');

        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('Unknown DB category: unknown');
      });
    });
  });
});
