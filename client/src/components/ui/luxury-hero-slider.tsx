"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import { Button } from "./button"
import { useLocation } from "wouter"

interface SlideData {
  id: string
  propertyId?: string  // Add property ID for navigation
  image: string
  title: string
  subtitle: string
  location: string
  price: string
}

interface LuxuryHeroSliderProps {
  slides: SlideData[]
  autoPlayInterval?: number
  className?: string
  onViewDetails?: (propertyId: string) => void
  onScheduleTour?: (propertyId: string) => void
}

export function LuxuryHeroSlider({ 
  slides, 
  autoPlayInterval = 5000, 
  className = "",
  onViewDetails,
  onScheduleTour
}: LuxuryHeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [, navigate] = useLocation()
  
  // Preload images to prevent jarring
  useEffect(() => {
    const preloadImages = async () => {
      // Preload at least the first image before showing anything
      const firstImage = new Image()
      firstImage.src = slides[0].image
      
      await new Promise((resolve) => {
        firstImage.onload = resolve
        firstImage.onerror = resolve
        // Timeout fallback
        setTimeout(resolve, 3000)
      })
      
      // Then load remaining images
      const promises = slides.slice(1, 3).map((slide) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.src = slide.image
          img.onload = resolve
          img.onerror = resolve
        })
      })
      
      await Promise.all(promises)
      
      // Smooth transition in
      requestAnimationFrame(() => {
        setImagesLoaded(true)
        requestAnimationFrame(() => {
          setInitialLoad(false)
        })
      })
    }
    
    if (slides.length > 0) {
      preloadImages()
    }
  }, [slides])

  const nextSlide = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setTimeout(() => setIsTransitioning(false), 1000)
  }

  const prevSlide = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setTimeout(() => setIsTransitioning(false), 1000)
  }

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 1000)
  }

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return
    
    const interval = setInterval(() => {
      nextSlide()
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [isAutoPlaying, autoPlayInterval, slides.length])

  if (!slides.length) return null

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-luxe-bg ${className}`} style={{ minHeight: '100vh' }}>
      {/* Stable placeholder that prevents layout shift */}
      {!imagesLoaded && (
        <div className="absolute inset-0 bg-luxe-bg z-40">
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="h-1 w-48 bg-luxe-bronze/20 rounded mb-3 mx-auto animate-pulse"></div>
              <div className="h-1 w-32 bg-luxe-bronze/10 rounded mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Slides */}
      <div className={`relative w-full h-full ${imagesLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ 
        zIndex: 2,
        transition: imagesLoaded ? 'opacity 800ms ease-out' : 'none'
      }}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 ${
              index === currentSlide
                ? "opacity-100 z-20"
                : "opacity-0 z-10"
            }`}
            style={{
              transition: initialLoad ? 'none' : 'opacity 700ms ease-out'
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              style={{ opacity: imagesLoaded ? 1 : 0 }}
            />
            {/* LUXE overlay gradients - subtle and elegant */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
            
            {/* Slide Content */}
            <div 
              className={`absolute inset-0 flex items-center justify-center z-30 ${
                index === currentSlide 
                  ? "opacity-100" 
                  : "opacity-0"
              }`}
              style={{
                transition: initialLoad ? 'none' : 'opacity 700ms ease-out'
              }}
            >
              <div className="text-center text-white max-w-4xl mx-auto px-4">
                <div className="mb-6">
                  <span className="inline-block px-4 py-1.5 bg-black/40 backdrop-blur-sm text-luxe-text text-xs uppercase tracking-[0.2em]">
                    {slide.location}
                  </span>
                </div>
                <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-normal mb-6 text-luxe-text leading-tight tracking-wide">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-xl text-white mb-8 max-w-2xl mx-auto font-light drop-shadow-lg">
                  {slide.subtitle}
                </p>
                <div className="text-2xl md:text-3xl font-medium text-luxe-bronze mb-10 tracking-wide">
                  {slide.price}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => {
                      if (slide.propertyId) {
                        if (onViewDetails) {
                          onViewDetails(slide.propertyId);
                        } else {
                          navigate(`/property/${slide.propertyId}`);
                        }
                      }
                    }}
                    className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light transition-colors duration-300 font-medium text-sm px-8 py-3 tracking-wide"
                    data-testid="button-view-details"
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      if (slide.propertyId && onScheduleTour) {
                        onScheduleTour(slide.propertyId);
                      } else if (slide.propertyId) {
                        navigate(`/property/${slide.propertyId}#schedule-tour`);
                      }
                    }}
                    className="text-luxe-text hover:text-luxe-bronze transition-colors duration-300 font-medium text-sm px-8 py-3 tracking-wide group"
                    data-testid="button-schedule-tour"
                  >
                    Schedule Tour
                    <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls - Hidden on mobile for cleaner look */}
      <div className="absolute inset-y-0 left-6 items-center z-40 hidden md:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={isTransitioning}
          className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-luxe-text hover:bg-luxe-bronze hover:text-luxe-bg hover:border-luxe-bronze transition-colors duration-300"
          data-testid="button-prev-slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute inset-y-0 right-6 items-center z-40 hidden md:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={isTransitioning}
          className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-luxe-text hover:bg-luxe-bronze hover:text-luxe-bg hover:border-luxe-bronze transition-colors duration-300"
          data-testid="button-next-slide"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Slide Indicators - Minimal line style */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={`h-0.5 transition-all duration-500 ${
                index === currentSlide
                  ? "w-8 bg-luxe-bronze"
                  : "w-4 bg-white/30 hover:bg-white/50"
              }`}
              data-testid={`button-slide-${index}`}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar - Subtle */}
      {isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 z-40">
          <div className="h-[2px] bg-black/20">
            <div
              className="h-full bg-luxe-bronze transition-all duration-100 ease-linear"
              style={{
                animation: `luxuryProgress ${autoPlayInterval}ms linear infinite`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}