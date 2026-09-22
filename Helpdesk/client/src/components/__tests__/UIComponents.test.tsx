import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';

describe('UI Primitives Unit Tests', () => {
  describe('Button Primitive', () => {
    it('renders default button and accepts custom class names', () => {
      render(<Button className="custom-btn">Click Me</Button>);
      const btn = screen.getByRole('button', { name: 'Click Me' });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('custom-btn');
    });

    it('renders button variants: destructive, outline, secondary, ghost, link', () => {
      const { rerender } = render(<Button variant="destructive">Delete</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-destructive');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders different button sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-8');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10');

      rerender(<Button size="icon">Icon</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9');
      expect(screen.getByRole('button')).toHaveClass('w-9');
    });
  });

  describe('Badge Primitive', () => {
    it('renders default badge and custom variants', () => {
      const { rerender } = render(<Badge>Default Badge</Badge>);
      expect(screen.getByText('Default Badge')).toBeInTheDocument();

      rerender(<Badge variant="secondary">Secondary Badge</Badge>);
      expect(screen.getByText('Secondary Badge')).toHaveClass('bg-secondary');

      rerender(<Badge variant="destructive">Destructive Badge</Badge>);
      expect(screen.getByText('Destructive Badge')).toHaveClass('bg-destructive');

      rerender(<Badge variant="outline">Outline Badge</Badge>);
      expect(screen.getByText('Outline Badge')).toHaveClass('text-foreground');
    });
  });

  describe('Card Primitive', () => {
    it('renders card with all sections: Header, Title, Description, Content, Footer', () => {
      render(
        <Card className="test-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content area</p>
          </CardContent>
          <CardFooter>
            <p>Footer content</p>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Main content area')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });

  describe('Input Primitive', () => {
    it('renders input with type, placeholder, and disabled state', () => {
      render(<Input type="email" placeholder="test@example.com" disabled />);
      const input = screen.getByPlaceholderText('test@example.com');
      expect(input).toBeInTheDocument();
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('Label Primitive', () => {
    it('renders label linked to an input via htmlFor', () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" />
        </div>
      );

      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });
  });

  describe('Alert Primitive', () => {
    it('renders default and destructive alert boxes', () => {
      const { rerender } = render(
        <Alert>
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>Operation completed.</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Notice')).toBeInTheDocument();
      expect(screen.getByText('Operation completed.')).toBeInTheDocument();

      rerender(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to save.</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to save.')).toBeInTheDocument();
    });
  });

  describe('Skeleton Primitive', () => {
    it('renders loading skeleton with pulse animation class', () => {
      const { container } = render(<Skeleton className="h-6 w-24" />);
      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('h-6');
      expect(skeleton).toHaveClass('w-24');
    });
  });
});
