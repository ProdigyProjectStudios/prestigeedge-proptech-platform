import { useState, useEffect } from "react";
import { MapPin, Navigation, Maximize2, Minimize2 } from "lucide-react";

interface PropertyMapProps {
  address: string;
  title: string;
  price: number;
  coordinates?: { lat: number; lng: number };
  property?: { latitude?: string; longitude?: string };
  className?: string;
}

export function PropertyMap({ address, title, price, coordinates, property, className = "" }: PropertyMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const encodedAddress = encodeURIComponent(address);

  const locationQuery = property?.latitude && property?.longitude
    ? `${property.latitude},${property.longitude}`
    : coordinates
      ? `${coordinates.lat},${coordinates.lng}`
      : encodedAddress;

  const [apiKey, setApiKey] = useState<string>('');
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    fetch('/api/config/maps-key')
      .then(res => res.text())
      .then(key => {
        if (key && key !== '') {
          setApiKey(key);
        } else {
          setApiKey('');
        }
      })
      .catch(() => setApiKey(''));
  }, []);

  const mapUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${locationQuery}&zoom=17&size=600x400&maptype=satellite&markers=color:0xB8860B%7C${locationQuery}&key=${apiKey}`
    : '';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={`overflow-hidden bg-luxe-surface border border-luxe-border/50 ${className}`}>
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-luxe-bg' : 'h-80 md:h-96'}`}>
        {/* Map Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-luxe-bg/90 via-luxe-bg/50 to-transparent z-10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-1">Location</div>
              <h3 className="font-serif italic text-lg md:text-xl text-luxe-text truncate">{title}</h3>
              <p className="text-luxe-bronze text-sm font-serif mt-0.5">{formatPrice(price)}</p>
            </div>
            <div className="flex space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/search/${encodedAddress}`, '_blank')}
                className="h-9 px-3 flex items-center bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 text-[10px] uppercase tracking-widest transition-colors"
              >
                <Navigation className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Directions
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="w-9 h-9 flex items-center justify-center bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Map Image or Location Display */}
        {apiKey && mapUrl && !mapFailed ? (
          <img
            src={mapUrl}
            alt={`Satellite view of ${title}`}
            className="w-full h-full object-cover"
            onError={() => setMapFailed(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-luxe-surface">
            <div className="text-center px-6">
              <div className="w-14 h-14 border border-luxe-bronze/40 flex items-center justify-center mx-auto mb-5">
                <MapPin className="w-6 h-6 text-luxe-bronze" strokeWidth={1.5} />
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-2">Address</div>
              <div className="font-serif italic text-xl text-luxe-text mb-2">{title.split(' ').slice(0, 4).join(' ')}</div>
              <div className="text-sm text-luxe-bronze">{address.split(',')[0]}</div>
              <div className="text-xs text-luxe-text-muted mt-1">{address.split(',').slice(1).join(',').trim()}</div>
            </div>
          </div>
        )}

        {/* Address Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-luxe-bg/90 via-luxe-bg/50 to-transparent p-4">
          <div className="flex items-center text-luxe-text">
            <MapPin className="h-3.5 w-3.5 mr-2 text-luxe-bronze" strokeWidth={1.5} />
            <span className="text-xs tracking-wide truncate">{address}</span>
          </div>
        </div>

        {/* Close button for fullscreen */}
        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-20 h-9 px-4 bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light text-[10px] uppercase tracking-widest font-medium"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
