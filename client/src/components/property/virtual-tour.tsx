import { useState, useEffect, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Camera, X, Maximize2, ChevronLeft, ChevronRight, Home, Info } from "lucide-react";

interface VirtualTourProps {
  images: string[];
  propertyTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TourRoom {
  name: string;
  image: string;
}

const DEFAULT_ROOM_NAMES = [
  "Living Room",
  "Master Bedroom",
  "Kitchen",
  "Master Bathroom",
  "Dining Room",
  "Home Office",
  "Guest Bedroom",
  "Exterior View"
];

export function VirtualTour({ images, propertyTitle, isOpen, onClose }: VirtualTourProps) {
  const [currentRoom, setCurrentRoom] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });

  const rooms: TourRoom[] = DEFAULT_ROOM_NAMES.map((name, idx) => ({
    name,
    image: images?.[idx] || ""
  }));

  const handleFullscreen = () => {
    const elem = document.getElementById("virtual-tour-container");
    if (elem) {
      if (!document.fullscreenElement) {
        elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

  const navigateRoom = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentRoom((prev) => (prev - 1 + rooms.length) % rooms.length);
    } else {
      setCurrentRoom((prev) => (prev + 1) % rooms.length);
    }
    resetView();
  };

  const resetView = () => {
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastPanRef.current = { x: panX, y: panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStartRef.current.x) * 0.1;
    const deltaY = (e.clientY - dragStartRef.current.y) * 0.1;
    setPanX(Math.max(-50, Math.min(50, lastPanRef.current.x + deltaX)));
    setPanY(Math.max(-30, Math.min(30, lastPanRef.current.y + deltaY)));
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-luxe-bg/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] max-w-6xl translate-x-[-50%] translate-y-[-50%] gap-0 border border-luxe-border/50 bg-luxe-surface p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-none h-[85vh] max-h-[700px]">
          <DialogHeader className="sr-only">
            <DialogTitle>{propertyTitle} - Virtual Tour</DialogTitle>
          </DialogHeader>
          <div id="virtual-tour-container" className="h-full flex flex-col bg-luxe-bg">
            {/* Header */}
            <div className="px-5 py-4 border-b border-luxe-border/40 bg-luxe-surface flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Camera className="h-5 w-5 text-luxe-bronze shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Virtual Tour</div>
                  <p className="font-serif italic text-lg text-luxe-text truncate">{propertyTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleFullscreen}
                  aria-label="Fullscreen"
                  className="w-9 h-9 flex items-center justify-center text-luxe-text hover:text-luxe-bronze hover:bg-luxe-surface-light border border-luxe-border/40 transition-colors"
                >
                  <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 flex items-center justify-center text-luxe-text hover:text-luxe-bronze hover:bg-luxe-surface-light border border-luxe-border/40 transition-colors"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex min-h-0">
              {/* Desktop Room Navigation */}
              <div className="hidden md:flex w-60 bg-luxe-surface border-r border-luxe-border/40 flex-col">
                <div className="p-4 border-b border-luxe-border/40">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">Rooms</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {rooms.map((room, index) => {
                    const active = currentRoom === index;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentRoom(index)}
                        className={`w-full px-4 py-3 text-left border-b border-luxe-border/20 transition-colors flex items-center justify-between group ${
                          active
                            ? 'bg-luxe-bg text-luxe-bronze border-l-2 border-l-luxe-bronze'
                            : 'text-luxe-text-muted hover:text-luxe-text hover:bg-luxe-bg/50 border-l-2 border-l-transparent'
                        }`}
                      >
                        <span className={`text-xs uppercase tracking-widest ${active ? 'font-medium' : ''}`}>
                          {room.name}
                        </span>
                        {active && (
                          <span className="text-[9px] uppercase tracking-widest text-luxe-bronze border border-luxe-bronze/40 px-1.5 py-0.5">
                            Now
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 360° Viewer */}
              <div
                className="flex-1 relative bg-luxe-bg overflow-hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {rooms[currentRoom]?.image ? (
                  <img
                    src={rooms[currentRoom].image}
                    alt={rooms[currentRoom].name}
                    className="w-full h-full object-cover transition-transform duration-200"
                    style={{ transform: `translate(${panX}%, ${panY}%) scale(1.2)` }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center max-w-md px-6">
                      <div className="mb-6 relative inline-block">
                        <div className="w-24 h-24 mx-auto border border-luxe-bronze/40 flex items-center justify-center">
                          <Camera className="h-10 w-10 text-luxe-bronze" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-luxe-bg px-3 py-0.5 border border-luxe-bronze/40">
                          <span className="text-luxe-bronze text-[10px] uppercase tracking-widest">360°</span>
                        </div>
                      </div>

                      <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-2 mt-6">{rooms[currentRoom].name}</div>
                      <h3 className="font-serif italic text-2xl text-luxe-text mb-3">
                        Awaiting Tour
                      </h3>

                      <p className="text-sm text-luxe-text-muted mb-6 leading-relaxed">
                        Your immersive 360° experience for this room would appear here.
                      </p>

                      <div className="inline-flex items-center gap-2 text-luxe-bronze text-[10px] uppercase tracking-widest bg-luxe-surface px-4 py-2.5 border border-luxe-border/40">
                        <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Upload via Admin
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile room label */}
                <div className="md:hidden absolute top-4 left-4 bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 px-3 py-1.5">
                  <div className="flex items-center gap-2 text-luxe-text">
                    <Home className="h-3.5 w-3.5 text-luxe-bronze" strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-widest">{rooms[currentRoom].name}</span>
                  </div>
                </div>

                {/* Navigation controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateRoom("prev")}
                    aria-label="Previous room"
                    className="w-10 h-10 flex items-center justify-center bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 text-luxe-text hover:bg-luxe-bronze hover:text-luxe-bg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                  <div className="bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 px-4 py-2.5">
                    <p className="text-luxe-text text-[11px] uppercase tracking-widest">
                      {currentRoom + 1} / {rooms.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateRoom("next")}
                    aria-label="Next room"
                    className="w-10 h-10 flex items-center justify-center bg-luxe-bg/80 backdrop-blur-sm border border-luxe-border/40 text-luxe-text hover:bg-luxe-bronze hover:text-luxe-bg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="px-5 py-3 bg-luxe-surface border-t border-luxe-border/40">
              <p className="text-[10px] uppercase tracking-[0.25em] text-luxe-text-muted text-center">
                Click and drag to look around · Use arrows to navigate rooms
              </p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
