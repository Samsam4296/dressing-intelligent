/**
 * CameraOverlayGuide Tests
 * Story 2.1: Capture Photo Camera
 *
 * Tests for camera overlay framing guide component.
 * AC#3: Guide de cadrage (zone + conseil "fond uni")
 */

import { render, screen } from '@testing-library/react-native';
import { CameraOverlayGuide } from '../CameraOverlayGuide';

describe('CameraOverlayGuide', () => {
  it('renders framing guide container', () => {
    render(<CameraOverlayGuide />);

    expect(screen.getByTestId('camera-overlay-guide')).toBeTruthy();
  });

  it('renders framing zone', () => {
    render(<CameraOverlayGuide />);

    expect(screen.getByTestId('camera-framing-zone')).toBeTruthy();
  });

  it('displays placement tip text in French (AC#3)', () => {
    render(<CameraOverlayGuide />);

    expect(screen.getByText(/fond uni clair/i)).toBeTruthy();
  });

  it('has pointerEvents="none" to not block camera touch', () => {
    render(<CameraOverlayGuide />);

    const overlay = screen.getByTestId('camera-overlay-guide');
    expect(overlay.props.pointerEvents).toBe('none');
  });
});
