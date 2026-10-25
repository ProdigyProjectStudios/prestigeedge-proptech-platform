import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface PropertyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function PropertyImage({ src, alt, className = "" }: PropertyImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Generate a luxury property placeholder based on property type or title
  const generateLuxuryPlaceholder = () => {
    const gradients = [
      'from-amber-400 via-yellow-500 to-amber-600',
      'from-gray-800 via-gray-900 to-black',
      'from-blue-600 via-blue-700 to-blue-800',
      'from-purple-600 via-purple-700 to-purple-800',
      'from-green-600 via-green-700 to-green-800',
    ];
    
    const gradientIndex = alt.length % gradients.length;
    const gradient = gradients[gradientIndex];
    
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-medium opacity-90">Luxury Property</div>
            <div className="text-xs opacity-70">Image Coming Soon</div>
          </div>
        </div>
        
        {/* Luxury pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      </div>
    );
  };

  if (imageError) {
    return generateLuxuryPlaceholder();
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}