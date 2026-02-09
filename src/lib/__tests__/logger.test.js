import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('error', () => {
    it('should log errors with message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = logger.error('Test error message');
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.level).toBe('error');
      expect(result.message).toBe('Test error message');
      
      consoleSpy.mockRestore();
    });

    it('should log errors with error object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      
      const result = logger.error('Test message', error, { context: 'test' });
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.error).toBeDefined();
      expect(result.error.name).toBe('Error');
      expect(result.error.message).toBe('Test error');
      
      consoleSpy.mockRestore();
    });

    it('should include context in error logs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const context = { userId: '123', action: 'login' };
      
      const result = logger.error('Test error', null, context);
      
      expect(result.context).toEqual(context);
      
      consoleSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should log warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = logger.warn('Test warning', { context: 'test' });
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.level).toBe('warn');
      expect(result.message).toBe('Test warning');
      
      consoleSpy.mockRestore();
    });
  });

  describe('info', () => {
    it('should log info in development', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = logger.info('Test info');
      
      // In test environment, it should still log
      expect(result.level).toBe('info');
      
      consoleSpy.mockRestore();
    });
  });

  describe('debug', () => {
    it('should log debug in development', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = logger.debug('Test debug');
      
      expect(result.level).toBe('debug');
      
      consoleSpy.mockRestore();
    });
  });
});

