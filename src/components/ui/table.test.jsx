import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
  TableCaption,
} from './table';

describe('Table', () => {
  it('renders table with header, body, footer and caption', () => {
    render(
      <Table>
        <TableCaption>Test table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Col1</TableHead>
            <TableHead>Col2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>A</TableCell>
            <TableCell>B</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Foot1</TableCell>
            <TableCell>Foot2</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    expect(screen.getByText('Test table')).toBeInTheDocument();
    expect(screen.getByText('Col1')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Foot1')).toBeInTheDocument();
  });
});
