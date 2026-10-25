import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'production') {
      // Monitor page load performance
      const handleLoad = () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          const metrics = {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            domInteractive: perfData.domInteractive - perfData.fetchStart,
            timeToFirstByte: perfData.responseStart - perfData.requestStart,
          };
          
          // Log performance metrics
          console.log('Page Load Performance:', metrics);
          
          // Warn if load time is too long
          if (metrics.loadComplete > 3000) {
            console.warn('Page load time exceeds 3 seconds');
          }
        }
      };

      // Check if page is already loaded
      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
      }

      // Monitor long tasks (tasks that block the main thread for > 50ms)
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 100) {
                console.warn('Long task detected:', {
                  duration: entry.duration,
                  startTime: entry.startTime,
                });
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // Some browsers don't support longtask
        }
      }

      return () => {
        window.removeEventListener('load', handleLoad);
      };
    }
  }, []);

  return null;
}