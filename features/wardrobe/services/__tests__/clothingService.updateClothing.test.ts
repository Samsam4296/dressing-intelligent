/**
 * clothingService.updateClothing Tests
 * Story 2.10: Modification Vêtement
 *
 * Tests for updateClothing: UUID validation, category+color validation,
 * UI→DB mapping, and error handling.
 */

import { clothingService } from '../clothingService';
import { supabase } from '@/lib/supabase';

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

describe('clothingService.updateClothing', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input validation', () => {
    it('rejects invalid UUID format', async () => {
      const result = await clothingService.updateClothing('not-uuid', {
        category: 'haut',
        color: 'noir',
      });
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Invalid clothing ID format');
    });

    it('rejects invalid category', async () => {
      const result = await clothingService.updateClothing(validUUID, {
        category: 'invalid' as any,
        color: 'noir',
      });
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Invalid category provided');
    });

    it('rejects invalid color', async () => {
      const result = await clothingService.updateClothing(validUUID, {
        category: 'haut',
        color: 'invalid' as any,
      });
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Invalid color provided');
    });
  });

  describe('UI→DB mapping and Supabase call', () => {
    it('maps category + color correctly and returns mapped result', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: validUUID, category: 'bottom', color: 'red' },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await clothingService.updateClothing(validUUID, {
        category: 'bas',
        color: 'rouge',
      });

      expect(supabase.from).toHaveBeenCalledWith('clothes');
      expect(mockUpdate).toHaveBeenCalledWith({ category: 'bottom', color: 'red' });
      expect(mockEq).toHaveBeenCalledWith('id', validUUID);
      expect(mockSelect).toHaveBeenCalledWith('id, category, color');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ id: validUUID, category: 'bas', color: 'rouge' });
    });
  });

  describe('Error handling', () => {
    it('returns generic error on Supabase failure', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
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

      const result = await clothingService.updateClothing(validUUID, {
        category: 'haut',
        color: 'noir',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Unable to update clothing');
    });

    it('handles unknown DB values in response', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: validUUID, category: 'unknown', color: 'black' },
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

      const result = await clothingService.updateClothing(validUUID, {
        category: 'haut',
        color: 'noir',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Unable to update clothing');
    });
  });
});
