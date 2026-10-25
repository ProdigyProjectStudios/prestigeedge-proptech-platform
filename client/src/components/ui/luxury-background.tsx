export function LuxuryBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-luxury-gradient"></div>
      
      {/* Radial overlay */}
      <div className="absolute inset-0 bg-luxury-radial opacity-30"></div>
      
      {/* Floating gold particles - positioned to avoid mobile navigation */}
      <div className="absolute top-32 md:top-20 left-10 w-2 h-2 bg-luxury-gold rounded-full opacity-40 animate-pulse"></div>
      <div className="absolute top-48 md:top-40 right-20 w-1 h-1 bg-luxury-gold-light rounded-full opacity-60 animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-luxury-gold rounded-full opacity-50 animate-pulse" style={{animationDelay: '4s'}}></div>
      <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-luxury-gold-light rounded-full opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5" 
           style={{
             backgroundImage: `
               linear-gradient(rgba(212, 175, 55, 0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(212, 175, 55, 0.1) 1px, transparent 1px)
             `,
             backgroundSize: '50px 50px'
           }}>
      </div>
    </div>
  );
}
