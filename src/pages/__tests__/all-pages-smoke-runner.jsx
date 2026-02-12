/**
 * Runner partagé pour les tests smoke des pages (évite duplication de la logique render).
 */
import React, { act } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export function runSmokeTestsForEntries(entries) {
  entries.forEach(([pageName, PageComponent]) => {
    it(`${pageName} rend sans crash`, async () => {
      expect(PageComponent).toBeDefined();
      const { container } = render(
        <MemoryRouter>
          <PageComponent />
        </MemoryRouter>
      );
      expect(container).toBeTruthy();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    });
  });
}
