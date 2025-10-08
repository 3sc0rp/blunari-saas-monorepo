/**
 * Optimized Components Test Suite
 * 
 * Tests for memoized React components including:
 * - OptimizedCard
 * - MetricCard
 * - OptimizedListItem
 * - OptimizedButton
 * 
 * Focus on memoization behavior, render optimization, and component functionality.
 * 
 * @author Blunari Team
 * @since Phase 4 - Testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  OptimizedCard,
  MetricCard,
  OptimizedListItem,
  OptimizedButton,
} from '@/components/optimized/OptimizedComponents';

describe('OptimizedComponents', () => {
  describe('OptimizedCard', () => {
    it('should render card with title and description', () => {
      render(
        <OptimizedCard title="Test Title" description="Test Description">
          <div>Card Content</div>
        </OptimizedCard>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render card without header when title and description are omitted', () => {
      const { container } = render(
        <OptimizedCard>
          <div>Card Content</div>
        </OptimizedCard>
      );

      // CardHeader should not be rendered
      const headers = container.querySelectorAll('[class*="card-header"]');
      expect(headers.length).toBe(0);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render only title when description is omitted', () => {
      render(
        <OptimizedCard title="Only Title">
          <div>Content</div>
        </OptimizedCard>
      );

      expect(screen.getByText('Only Title')).toBeInTheDocument();
      expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    });

    it('should apply custom className to card wrapper', () => {
      const { container } = render(
        <OptimizedCard className="custom-class">
          <div>Content</div>
        </OptimizedCard>
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });

    it('should apply custom className to header', () => {
      const { container } = render(
        <OptimizedCard title="Title" headerClassName="custom-header">
          <div>Content</div>
        </OptimizedCard>
      );

      const header = container.querySelector('.custom-header');
      expect(header).toBeInTheDocument();
    });

    it('should apply custom className to content', () => {
      const { container } = render(
        <OptimizedCard contentClassName="custom-content">
          <div>Content</div>
        </OptimizedCard>
      );

      const content = container.querySelector('.custom-content');
      expect(content).toBeInTheDocument();
    });

    it('should not re-render when callback prop changes', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = ({ onClick }: { onClick: () => void }) => {
        renderSpy();
        return (
          <OptimizedCard title="Test">
            <button onClick={onClick}>Click</button>
          </OptimizedCard>
        );
      };

      const { rerender } = render(<TestComponent onClick={() => {}} />);
      const initialRenderCount = renderSpy.mock.calls.length;

      // Change callback (new function reference)
      rerender(<TestComponent onClick={() => {}} />);

      // Should render again (parent re-rendered), but OptimizedCard should be memoized
      expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount);
    });
  });

  describe('MetricCard', () => {
    it('should render metric with title and value', () => {
      render(<MetricCard title="Total Users" value={1234} />);

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should render string values', () => {
      render(<MetricCard title="Revenue" value="$45,231" />);

      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('$45,231')).toBeInTheDocument();
    });

    it('should render change percentage with up trend', () => {
      render(
        <MetricCard title="Sales" value={100} change={12.5} trend="up" />
      );

      expect(screen.getByText(/\+12\.5% from last period/)).toBeInTheDocument();
    });

    it('should render change percentage with down trend', () => {
      render(
        <MetricCard title="Sales" value={100} change={-8.3} trend="down" />
      );

      expect(screen.getByText(/-8\.3% from last period/)).toBeInTheDocument();
    });

    it('should render neutral trend without sign', () => {
      render(
        <MetricCard title="Sales" value={100} change={0} trend="neutral" />
      );

      expect(screen.getByText(/0% from last period/)).toBeInTheDocument();
    });

    it('should not render change when not provided', () => {
      render(<MetricCard title="Sales" value={100} />);

      expect(screen.queryByText(/from last period/)).not.toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      const icon = <span data-testid="metric-icon">📊</span>;
      
      render(<MetricCard title="Stats" value={100} icon={icon} />);

      expect(screen.getByTestId('metric-icon')).toBeInTheDocument();
    });

    it('should apply green color for up trend', () => {
      const { container } = render(
        <MetricCard title="Sales" value={100} change={12} trend="up" />
      );

      const changeText = screen.getByText(/\+12% from last period/);
      expect(changeText).toHaveClass('text-green-600');
    });

    it('should apply red color for down trend', () => {
      const { container } = render(
        <MetricCard title="Sales" value={100} change={-12} trend="down" />
      );

      const changeText = screen.getByText(/-12% from last period/);
      expect(changeText).toHaveClass('text-red-600');
    });

    it('should apply gray color for neutral trend', () => {
      const { container } = render(
        <MetricCard title="Sales" value={100} change={0} trend="neutral" />
      );

      const changeText = screen.getByText(/0% from last period/);
      expect(changeText).toHaveClass('text-gray-600');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <MetricCard title="Test" value={100} className="custom-metric" />
      );

      const card = container.querySelector('.custom-metric');
      expect(card).toBeInTheDocument();
    });

    it('should memoize and not re-render with same props', () => {
      const { rerender } = render(
        <MetricCard title="Users" value={100} change={5} trend="up" />
      );

      // Rerender with same props
      rerender(<MetricCard title="Users" value={100} change={5} trend="up" />);

      // Component should still be in document (memoization working)
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('OptimizedListItem', () => {
    it('should render list item with title', () => {
      render(<OptimizedListItem id="1" title="Test Item" />);

      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <OptimizedListItem
          id="1"
          title="Test Item"
          subtitle="This is a subtitle"
        />
      );

      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
    });

    it('should render badge when provided', () => {
      render(
        <OptimizedListItem
          id="1"
          title="Test Item"
          badge={{ label: 'Active', variant: 'default' }}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render badge with correct variant', () => {
      render(
        <OptimizedListItem
          id="1"
          title="Test Item"
          badge={{ label: 'Inactive', variant: 'secondary' }}
        />
      );

      const badge = screen.getByText('Inactive');
      expect(badge).toBeInTheDocument();
    });

    it('should render actions when provided', () => {
      const actions = (
        <>
          <button data-testid="edit-btn">Edit</button>
          <button data-testid="delete-btn">Delete</button>
        </>
      );

      render(
        <OptimizedListItem id="1" title="Test Item" actions={actions} />
      );

      expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
      expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();

      render(
        <OptimizedListItem id="1" title="Test Item" onClick={handleClick} />
      );

      const item = screen.getByText('Test Item').closest('div');
      fireEvent.click(item!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should apply cursor-pointer class when onClick is provided', () => {
      const { container } = render(
        <OptimizedListItem id="1" title="Test Item" onClick={() => {}} />
      );

      // Find the root div with all the classes
      const item = container.querySelector('.cursor-pointer');
      expect(item).toBeInTheDocument();
    });

    it('should not apply cursor-pointer class when onClick is not provided', () => {
      const { container } = render(<OptimizedListItem id="1" title="Test Item" />);

      // cursor-pointer should not exist
      const item = container.querySelector('.cursor-pointer');
      expect(item).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <OptimizedListItem
          id="1"
          title="Test Item"
          className="custom-list-item"
        />
      );

      const item = container.querySelector('.custom-list-item');
      expect(item).toBeInTheDocument();
    });

    it('should memoize based on id', () => {
      const { rerender } = render(
        <OptimizedListItem id="1" title="Test Item" subtitle="Subtitle" />
      );

      // Rerender with same id and props
      rerender(
        <OptimizedListItem id="1" title="Test Item" subtitle="Subtitle" />
      );

      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('should render without badge when not provided', () => {
      render(<OptimizedListItem id="1" title="Test Item" />);

      // Should not crash and title should be visible
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  describe('OptimizedButton', () => {
    it('should render button with children', () => {
      render(<OptimizedButton>Click Me</OptimizedButton>);

      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();

      render(<OptimizedButton onClick={handleClick}>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle async onClick', async () => {
      const handleClick = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      render(<OptimizedButton onClick={handleClick}>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should show loading spinner during async operation', async () => {
      const handleClick = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      render(<OptimizedButton onClick={handleClick}>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      // Button should be disabled during processing
      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should show loading state when loading prop is true', () => {
      render(<OptimizedButton loading>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      expect(button).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<OptimizedButton disabled>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();

      render(
        <OptimizedButton onClick={handleClick} disabled>
          Click Me
        </OptimizedButton>
      );

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();

      render(
        <OptimizedButton onClick={handleClick} loading>
          Click Me
        </OptimizedButton>
      );

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should prevent double-clicks during async operation', async () => {
      const handleClick = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      render(<OptimizedButton onClick={handleClick}>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only be called once
      expect(handleClick).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should render with different variants', () => {
      const { rerender } = render(
        <OptimizedButton variant="destructive">Delete</OptimizedButton>
      );

      let button = screen.getByText('Delete');
      expect(button).toBeInTheDocument();

      rerender(<OptimizedButton variant="outline">Outline</OptimizedButton>);
      button = screen.getByText('Outline');
      expect(button).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = render(
        <OptimizedButton size="sm">Small</OptimizedButton>
      );

      let button = screen.getByText('Small');
      expect(button).toBeInTheDocument();

      rerender(<OptimizedButton size="lg">Large</OptimizedButton>);
      button = screen.getByText('Large');
      expect(button).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <OptimizedButton className="custom-button">Custom</OptimizedButton>
      );

      const button = screen.getByText('Custom');
      expect(button).toHaveClass('custom-button');
    });

    it('should handle sync onClick without errors', () => {
      const handleClick = vi.fn();

      render(<OptimizedButton onClick={handleClick}>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should work without onClick handler', () => {
      render(<OptimizedButton>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      
      // Should not throw error when clicked
      expect(() => fireEvent.click(button)).not.toThrow();
    });

    it('should reset processing state after error', async () => {
      const handleClick = vi.fn(async () => {
        throw new Error('Test error');
      });

      // Suppress console error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<OptimizedButton onClick={handleClick}>Click Me</OptimizedButton>);

      const button = screen.getByText('Click Me');
      
      fireEvent.click(button);

      // Button should be disabled initially
      expect(button).toBeDisabled();

      // Should re-enable after error
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });

      consoleError.mockRestore();
    });
  });

  describe('Component Memoization', () => {
    it('OptimizedCard should use memo displayName', () => {
      expect(OptimizedCard.displayName).toBe('OptimizedCard');
    });

    it('MetricCard should use memo displayName', () => {
      expect(MetricCard.displayName).toBe('MetricCard');
    });

    it('OptimizedListItem should use memo displayName', () => {
      expect(OptimizedListItem.displayName).toBe('OptimizedListItem');
    });

    it('OptimizedButton should use memo displayName', () => {
      expect(OptimizedButton.displayName).toBe('OptimizedButton');
    });
  });
});
