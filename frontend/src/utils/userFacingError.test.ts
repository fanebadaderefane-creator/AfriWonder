import { describe, it, expect } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import {
  getUserFacingApiErrorMessage,
  getAlertMessageForCaughtError,
  looksLikeTechnicalErrorMessage,
  USER_FACING_NETWORK,
  USER_FACING_GENERIC,
} from './userFacingError';

describe('looksLikeTechnicalErrorMessage', () => {
  it('détecte le jargon technique', () => {
    expect(looksLikeTechnicalErrorMessage('TypeError: undefined is not a function')).toBe(true);
    expect(looksLikeTechnicalErrorMessage('PrismaClientKnownRequestError')).toBe(true);
  });
  it('accepte un message humain', () => {
    expect(looksLikeTechnicalErrorMessage('Solde insuffisant pour cette opération.')).toBe(false);
  });
  it('traite les erreurs React minifiées comme techniques', () => {
    expect(looksLikeTechnicalErrorMessage('Minified React error #418; visit https://react.dev')).toBe(true);
  });
});

describe('getUserFacingApiErrorMessage', () => {
  it('réseau sans réponse → message connexion', () => {
    const err = new AxiosError(
      'Network Error',
      'ERR_NETWORK',
      undefined as never,
      undefined,
      undefined
    );
    expect(getUserFacingApiErrorMessage(err)).toBe(USER_FACING_NETWORK);
  });

  it('timeout', () => {
    const err = new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED');
    expect(getUserFacingApiErrorMessage(err)).toContain('connexion');
  });

  it('500 → message service', () => {
    const response = {
      status: 503,
      statusText: 'Service',
      data: {},
      headers: {},
      config: {} as never,
    } as AxiosResponse;
    const err = new AxiosError('x', undefined, undefined as never, undefined, response);
    expect(getUserFacingApiErrorMessage(err)).toContain('indisponible');
  });

  it('message serveur humain conservé', () => {
    const response = {
      status: 400,
      statusText: 'Bad',
      data: { error: { message: 'Numéro Orange Money requis.' } },
      headers: {},
      config: {} as never,
    } as AxiosResponse;
    const err = new AxiosError('x', undefined, undefined as never, undefined, response);
    expect(getUserFacingApiErrorMessage(err)).toBe('Numéro Orange Money requis.');
  });

  it('message serveur technique → générique', () => {
    const response = {
      status: 400,
      statusText: 'Bad',
      data: { message: 'P2022 column Foo.bar does not exist' },
      headers: {},
      config: {} as never,
    } as AxiosResponse;
    const err = new AxiosError('x', undefined, undefined as never, undefined, response);
    expect(getUserFacingApiErrorMessage(err)).toBe(USER_FACING_GENERIC);
  });
});

describe('getAlertMessageForCaughtError', () => {
  it('préfère userFacingMessage si déjà attaché', () => {
    const err = new AxiosError('x');
    err.userFacingMessage = 'Message court pré-calculé.';
    expect(getAlertMessageForCaughtError(err)).toBe('Message court pré-calculé.');
  });

  it('sinon même logique que getUserFacingApiErrorMessage', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getAlertMessageForCaughtError(err)).toBe(USER_FACING_NETWORK);
  });
});
