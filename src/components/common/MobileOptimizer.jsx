import { useEffect, useState } from 'react';

/**
 * Mobile optimization component that detects device capabilities
 * and provides _responsive behavior for better mobile experience
 */
export default function MobileOptimizer({ children }) {
  const [_deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    hasTouchSupport: false,
    connectionSpeed: 'fast',
    screenWidth: 0,
    screenHeight: 0,
    isDarkMode: false,
  });

  useEffect(() => {
    const detectDevice = () => {
      // Screen size detection
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Device type detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const isTablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobi))/i.test(
        navigator.userAgent.toLowerCase()
      );
      
      // Touch support detection
      const hasTouchSupport = 
        window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window;

      // Connection speed detection
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      let connectionSpeed = 'fast';
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          connectionSpeed = 'slow';
        } else if (effectiveType === '3g') {
          connectionSpeed = 'medium';
        }
      }

      // Dark mode detection
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

      setDeviceInfo({
        isMobile,
        isTablet,
        hasTouch: hasTouchSupport,
        connectionSpeed,
        screenWidth: width,
        screenHeight: height,
        isDarkMode,
      });

      // Store in window for global access
      window.__mobileDevice = {
        isMobile,
        isTablet,
        connectionSpeed,
        hasTouch: hasTouchSupport,
      };
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);

    // Listen for connection changes
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', detectDevice);
    }

    return () => {
      window.removeEventListener('resize', detectDevice);
      if (connection) {
        connection.removeEventListener('change', detectDevice);
      }
    };
  }, []);

  return children;
}

// Hook to use device info in components
export const useMobileDevice = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    hasTouch: false,
    connectionSpeed: 'fast',
    screenWidth: 0,
    screenHeight: 0,
  });

  useEffect(() => {
    if (window.__mobileDevice) {
      setDeviceInfo({
        isMobile: window.__mobileDevice.isMobile,
        isTablet: window.__mobileDevice.isTablet,
        hasTouch: window.__mobileDevice.hasTouch,
        connectionSpeed: window.__mobileDevice.connectionSpeed,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    }
  }, []);

  return deviceInfo;
};