import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setSelectedImage(index);
    setZoomLevel(1);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setZoomLevel(1);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;

    if (direction === 'prev') {
      setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
    } else {
      setSelectedImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1);
    }
    setZoomLevel(1);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in' && zoomLevel < 3) {
      setZoomLevel(zoomLevel + 0.5);
    } else if (direction === 'out' && zoomLevel > 0.5) {
      setZoomLevel(zoomLevel - 0.5);
    }
  };

  return (
    <>
      {/* Main Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openLightbox(index)}
            className="relative group cursor-pointer overflow-hidden bg-luxe-surface border border-luxe-border/40 hover:border-luxe-bronze/60 transition-colors"
            aria-label={`Open image ${index + 1}`}
          >
            <img
              src={image}
              alt={`${title} - Image ${index + 1}`}
              className="w-full h-40 md:h-48 object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-luxe-bg/0 group-hover:bg-luxe-bg/40 transition-colors duration-300 flex items-center justify-center pointer-events-none">
              <ZoomIn className="h-6 w-6 text-luxe-bronze opacity-0 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1.5} />
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-widest text-luxe-text bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {String(index + 1).padStart(2, '0')}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <Dialog open={true} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 m-0 bg-luxe-bg border border-luxe-border/40 rounded-none sm:rounded-none outline-none shadow-none [&>button]:hidden">
            <VisuallyHidden>
              <DialogTitle>Property Image Gallery</DialogTitle>
              <DialogDescription>View property images in fullscreen mode</DialogDescription>
            </VisuallyHidden>
            <div className="relative w-full h-full flex items-center justify-center">

              {/* Close Button */}
              <button
                type="button"
                onClick={closeLightbox}
                aria-label="Close gallery"
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 flex items-center justify-center transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => navigateImage('prev')}
                    aria-label="Previous image"
                    className="absolute left-4 z-10 w-12 h-12 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateImage('next')}
                    aria-label="Next image"
                    className="absolute right-4 z-10 w-12 h-12 bg-luxe-bg/70 hover:bg-luxe-bronze hover:text-luxe-bg text-luxe-text border border-luxe-border/40 flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
                  </button>
                </>
              )}

              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => handleZoom('out')}
                  aria-label="Zoom out"
                  disabled={zoomLevel <= 0.5}
                  className="w-8 h-8 flex items-center justify-center text-luxe-text hover:text-luxe-bronze disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <span className="text-luxe-text-muted text-[11px] uppercase tracking-widest px-2 min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoom('in')}
                  aria-label="Zoom in"
                  disabled={zoomLevel >= 3}
                  className="w-8 h-8 flex items-center justify-center text-luxe-text hover:text-luxe-bronze disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* Main Image */}
              <img
                src={images[selectedImage]}
                alt={`${title} - Image ${selectedImage + 1}`}
                className="max-w-full max-h-full object-contain transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              />

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute top-4 left-4 z-10 bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 px-3 py-1">
                  <span className="text-luxe-text text-[11px] uppercase tracking-widest">
                    {selectedImage + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
