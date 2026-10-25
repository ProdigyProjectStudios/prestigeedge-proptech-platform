import { useEffect } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

export const useScrollRestoration = (key: string) => {
  useEffect(() => {
    // Restore scroll position when component mounts
    const savedPosition = sessionStorage.getItem(`scroll-${key}`);
    if (savedPosition) {
      const { x, y } = JSON.parse(savedPosition);
      // Use setTimeout to ensure the page has loaded
      setTimeout(() => {
        window.scrollTo(x, y);
      }, 100);
    }

    // Save scroll position when component unmounts
    return () => {
      const currentPosition = {
        x: window.scrollX,
        y: window.scrollY
      };
      sessionStorage.setItem(`scroll-${key}`, JSON.stringify(currentPosition));
    };
  }, [key]);

  const saveScrollPosition = () => {
    const currentPosition = {
      x: window.scrollX,
      y: window.scrollY
    };
    sessionStorage.setItem(`scroll-${key}`, JSON.stringify(currentPosition));
  };

  return { saveScrollPosition };
};