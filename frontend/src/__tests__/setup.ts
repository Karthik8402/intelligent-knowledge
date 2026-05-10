/**
 * Global Vitest setup — runs before each test file.
 * Configures jest-dom matchers and global browser API stubs.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Silence console.error noise from React during tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress known React testing warnings
  const msg = args[0]?.toString() ?? '';
  if (
    msg.includes('Warning:') ||
    msg.includes('act(') ||
    msg.includes('ReactDOMTestUtils')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Stub window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub IntersectionObserver (framer-motion requirement)
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Stub ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});
