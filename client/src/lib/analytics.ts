// Google Analytics 4 integration for luxury real estate platform
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Google Analytics not configured. Add VITE_GA_MEASUREMENT_ID to enable tracking.');
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      page_title: document.title,
      page_location: window.location.href
    });
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url,
    page_title: title || document.title
  });
};

// Track custom events for luxury real estate
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Luxury real estate specific tracking events
export const trackPropertyView = (propertyId: string, propertyPrice: number, location: string) => {
  trackEvent('view_property', 'engagement', `${propertyId}-${location}`, propertyPrice);
};

export const trackPropertySave = (propertyId: string, propertyPrice: number) => {
  trackEvent('save_property', 'engagement', propertyId, propertyPrice);
};

export const trackInquiry = (propertyId: string, propertyPrice: number, inquiryType: string) => {
  trackEvent('submit_inquiry', 'conversion', `${inquiryType}-${propertyId}`, propertyPrice);
};

export const trackTourSchedule = (propertyId: string, propertyPrice: number) => {
  trackEvent('schedule_tour', 'conversion', propertyId, propertyPrice);
};

export const trackVirtualTour = (propertyId: string, propertyPrice: number) => {
  trackEvent('start_virtual_tour', 'engagement', propertyId, propertyPrice);
};

export const trackSearch = (searchQuery: string, resultsCount: number) => {
  trackEvent('search', 'engagement', searchQuery, resultsCount);
};

export const trackUserRegistration = (userRole: string) => {
  trackEvent('sign_up', 'conversion', userRole);
};

export const trackUserLogin = (userRole: string) => {
  trackEvent('login', 'engagement', userRole);
};

// E-commerce tracking for high-value properties
export const trackPropertyConversion = (propertyId: string, propertyPrice: number, location: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'purchase', {
    transaction_id: `prop-${propertyId}-${Date.now()}`,
    value: propertyPrice,
    currency: 'USD',
    items: [{
      item_id: propertyId,
      item_name: `Luxury Property - ${location}`,
      category: 'Real Estate',
      price: propertyPrice,
      quantity: 1
    }]
  });
};