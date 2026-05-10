import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardSkeleton, TableSkeleton } from '../shared/Skeleton';

describe('Skeleton UI Component', () => {
  it('renders CardSkeleton correctly', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders TableSkeleton correctly', () => {
    const { container } = render(<TableSkeleton rows={2} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
