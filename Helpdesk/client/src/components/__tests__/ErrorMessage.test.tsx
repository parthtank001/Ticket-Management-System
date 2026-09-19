import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage Component', () => {
  it('returns null when neither message nor children is provided', () => {
    const { container } = render(<ErrorMessage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when message is null or empty string', () => {
    const { container: containerNull } = render(<ErrorMessage message={null} />);
    expect(containerNull).toBeEmptyDOMElement();

    const { container: containerEmpty } = render(<ErrorMessage message="" />);
    expect(containerEmpty).toBeEmptyDOMElement();
  });

  it('renders error message string correctly with role="alert"', () => {
    render(<ErrorMessage message="Please enter a reply message." />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Please enter a reply message.');
  });

  it('renders children content when message is not passed', () => {
    render(
      <ErrorMessage>
        <span>Custom error content with <strong>bold</strong> text</span>
      </ErrorMessage>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Custom error content with bold text');
  });

  it('applies default rose variant styling', () => {
    render(<ErrorMessage message="Rose error" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-rose-50', 'border-rose-200', 'text-rose-700');
  });

  it('applies amber variant styling when specified', () => {
    render(<ErrorMessage message="Amber warning notice" variant="amber" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-amber-50', 'border-amber-200', 'text-amber-800');
  });

  it('applies red variant styling when specified', () => {
    render(<ErrorMessage message="Red alert error" variant="red" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
  });

  it('applies size classes (sm vs md)', () => {
    const { rerender } = render(<ErrorMessage message="Small size" size="sm" />);
    expect(screen.getByRole('alert')).toHaveClass('text-[11px]');

    rerender(<ErrorMessage message="Medium size" size="md" />);
    expect(screen.getByRole('alert')).toHaveClass('text-xs');
  });

  it('renders dismiss button and triggers onDismiss callback when clicked', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();

    render(<ErrorMessage message="Dismissable error" onDismiss={handleDismiss} />);

    const dismissBtn = screen.getByRole('button', { name: /dismiss error/i });
    expect(dismissBtn).toBeInTheDocument();

    await user.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies custom className alongside default classes', () => {
    render(<ErrorMessage message="Custom class test" className="my-custom-margin" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('my-custom-margin');
  });
});
