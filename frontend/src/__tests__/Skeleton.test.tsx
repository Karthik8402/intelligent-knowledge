import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Skeleton from '../components/Skeleton';

describe('Skeleton UI Component', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLDivElement;
    
    // Default is text rectangle
    expect(div).toHaveClass('animate-shimmer');
    expect(div).toHaveClass('w-full');
    expect(div).toHaveClass('h-4');
    expect(div).toHaveClass('rounded');
  });

  it('applies circle shape correctly', () => {
    const { container } = render(<Skeleton className="rounded-full w-10 h-10" />);
    const div = container.firstChild as HTMLDivElement;
    expect(div).toHaveClass('rounded-full');
    expect(div).toHaveClass('w-10');
  });
});
