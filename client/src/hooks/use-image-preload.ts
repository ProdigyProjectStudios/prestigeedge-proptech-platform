import { useEffect } from 'react';

export function useImagePreload(imageUrls: string[]) {
  useEffect(() => {
    const preloadImages = () => {
      imageUrls.forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    };

    // Preload images after a short delay to not block initial render
    const timer = setTimeout(preloadImages, 100);

    return () => clearTimeout(timer);
  }, [imageUrls]);
}