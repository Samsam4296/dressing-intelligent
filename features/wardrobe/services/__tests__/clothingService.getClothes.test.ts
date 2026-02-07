/**
 * clothingService.getClothes Tests
 * Story 2.8: Affichage Inventaire
 *
 * Consolidated test (subtask 3.3):
 * - Image fallback: processedImageUrl null → uses originalImageUrl for signed URL
 * - DB→UI mapping: categories + colors mapped from English to French
 * - Empty result: returns empty array
 * - Validation: rejects invalid profileId UUID
 */

import { clothingService } from '../clothingService';

// Mock supabase with storage support
const mockOrder = jest.fn();
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockCreateSignedUrls = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
    storage: {
      from: jest.fn(() => ({
        createSignedUrls: mockCreateSignedUrls,
      })),
    },
  },
}));

const validProfileId = '123e4567-e89b-12d3-a456-426614174000';

describe('clothingService.getClothes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses processedImageUrl for signed URL when available, falls back to originalImageUrl when null', async () => {
    // Arrange — 2 items: one with processed, one without
    const dbItems = [
      {
        id: 'item-1',
        category: 'top',
        color: 'black',
        original_image_url: 'user/original1.jpg',
        processed_image_url: 'user/processed1.jpg',
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'item-2',
        category: 'dress',
        color: 'red',
        original_image_url: 'user/original2.jpg',
        processed_image_url: null, // fallback case
        created_at: '2026-02-01T00:00:00Z',
      },
    ];

    mockOrder.mockResolvedValue({ data: dbItems, error: null });
    mockCreateSignedUrls.mockResolvedValue({
      data: [
        { signedUrl: 'https://signed/processed1.jpg' },
        { signedUrl: 'https://signed/original2.jpg' },
      ],
      error: null,
    });

    // Act
    const result = await clothingService.getClothes(validProfileId);

    // Assert — signed URL paths
    expect(mockCreateSignedUrls).toHaveBeenCalledWith(
      ['user/processed1.jpg', 'user/original2.jpg'], // processed used for item-1, original for item-2
      900
    );

    // Assert — DB→UI mapping
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data![0]).toMatchObject({
      id: 'item-1',
      category: 'haut', // top → haut
      color: 'noir', // black → noir
      signedUrl: 'https://signed/processed1.jpg',
    });
    expect(result.data![1]).toMatchObject({
      id: 'item-2',
      category: 'robe', // dress → robe
      color: 'rouge', // red → rouge
      signedUrl: 'https://signed/original2.jpg',
    });
  });

  it('returns empty array when profile has no clothes', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await clothingService.getClothes(validProfileId);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });

  it('rejects invalid profileId UUID format', async () => {
    const result = await clothingService.getClothes('not-a-uuid');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Invalid profile ID format');
  });

  it('returns error when database query fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'RLS violation' } });

    const result = await clothingService.getClothes(validProfileId);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Unable to load clothes');
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });

  it('returns error when signed URL generation fails', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          category: 'top',
          color: 'black',
          original_image_url: 'user/img.jpg',
          processed_image_url: null,
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      error: null,
    });
    mockCreateSignedUrls.mockResolvedValue({ data: null, error: { message: 'Storage error' } });

    const result = await clothingService.getClothes(validProfileId);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Unable to generate image URLs');
  });
});
