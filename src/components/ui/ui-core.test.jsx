import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Input } from './input';
import { Badge } from './badge';
import { Label } from './label';
import { Textarea } from './textarea';
import { Separator } from './separator';
import { Skeleton } from './skeleton';

describe('UI core components', () => {
  it('renders button variants and interactions', () => {
    render(
      <div>
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button size="sm">Small</Button>
      </div>
    );

    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument();
  });

  it('renders card composition blocks', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Card content</CardContent>
        <CardFooter>Card footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Card title')).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
    expect(screen.getByText('Card footer')).toBeInTheDocument();
  });

  it('renders form primitives', () => {
    render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" placeholder="name@example.com" />
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" placeholder="Tell us more" />
      </div>
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tell us more')).toBeInTheDocument();
  });

  it('renders badge/separator/skeleton utilities', () => {
    const { container } = render(
      <div>
        <Badge>New</Badge>
        <Separator />
        <Skeleton className="h-4 w-16" />
      </div>
    );

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(container.querySelector('.bg-border')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
