import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MaintenanceGuide from './MaintenanceGuide';

describe('MaintenanceGuide', () => {
  it('renders Avant le 26 février section', () => {
    render(<MaintenanceGuide />);
    expect(screen.getByText(/Avant le 26 février/)).toBeInTheDocument();
  });

  it('renders before launch tasks', () => {
    render(<MaintenanceGuide />);
    expect(screen.getByText(/Tester chaque flux/)).toBeInTheDocument();
    expect(screen.getByText(/Sécurité: changer clés API Stripe/)).toBeInTheDocument();
    expect(screen.getByText(/HTTPS \+ domaine custom/)).toBeInTheDocument();
  });

  it('renders Routine quotidienne and daily tasks', () => {
    render(<MaintenanceGuide />);
    expect(screen.getByText('Routine quotidienne')).toBeInTheDocument();
    expect(screen.getByText(/Vérifier AdminDashboard/)).toBeInTheDocument();
    expect(screen.getByText(/Traiter modérations pendantes/)).toBeInTheDocument();
  });

  it('renders Routine hebdomadaire', () => {
    render(<MaintenanceGuide />);
    expect(screen.getByText('Routine hebdomadaire')).toBeInTheDocument();
    expect(screen.getByText(/Analytics \+ performances/)).toBeInTheDocument();
    expect(screen.getByText(/Backup données critiques/)).toBeInTheDocument();
  });

  it('renders emergencies section', () => {
    render(<MaintenanceGuide />);
    expect(screen.getByText(/Utilisateurs ne peuvent pas s'inscrire/)).toBeInTheDocument();
    expect(screen.getByText(/Paiements échouent/)).toBeInTheDocument();
  });
});
