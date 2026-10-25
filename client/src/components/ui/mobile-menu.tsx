import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, LogOut, Lock } from "lucide-react"
import { Link } from "wouter"

interface MobileMenuProps {
  isAuthenticated: boolean
  user?: any
  onLogout: () => void
}

export function MobileMenu({ isAuthenticated, user, onLogout }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleNavClick = (elementId: string) => {
    setIsOpen(false)
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-luxe-text-muted hover:text-luxe-bronze"
          data-testid="button-mobile-menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-80 bg-luxe-bg/98 border-luxe-border/30 backdrop-blur-md"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-start mb-8">
            <span className="font-serif text-2xl tracking-wide text-luxe-text">
              PRESTIGE<span className="text-luxe-bronze">EDGE</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-2 mb-8">
            <button
              onClick={() => handleNavClick("properties-section")}
              className="text-left text-sm uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors py-4 border-b border-luxe-border/30"
              data-testid="link-mobile-properties"
            >
              Properties
            </button>
            <button
              onClick={() => handleNavClick("services-section")}
              className="text-left text-sm uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors py-4 border-b border-luxe-border/30"
              data-testid="link-mobile-services"
            >
              Services
            </button>
            <button
              onClick={() => handleNavClick("agents-section")}
              className="text-left text-sm uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors py-4 border-b border-luxe-border/30"
              data-testid="link-mobile-agents"
            >
              Agents
            </button>
            <button
              onClick={() => handleNavClick("contact-section")}
              className="text-left text-sm uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors py-4 border-b border-luxe-border/30"
              data-testid="link-mobile-contact"
            >
              Contact
            </button>
            <Link href="/deal-room" onClick={() => setIsOpen(false)}>
              <button
                className="w-full text-left text-sm uppercase tracking-widest text-luxe-text-muted hover:text-luxe-bronze transition-colors py-4 border-b border-luxe-border/30 flex items-center gap-2"
                data-testid="link-mobile-dealroom"
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                Deal Room
              </button>
            </Link>
          </nav>

          {/* Auth Section */}
          <div className="mt-auto space-y-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent border-luxe-border/50 text-luxe-text-muted hover:bg-luxe-surface-light hover:text-luxe-bronze"
                    onClick={() => setIsOpen(false)}
                    data-testid="link-mobile-dashboard"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-luxe-border/50 text-luxe-text-muted hover:bg-luxe-surface-light hover:text-luxe-bronze"
                      onClick={() => setIsOpen(false)}
                      data-testid="link-mobile-admin"
                    >
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    onLogout()
                    setIsOpen(false)
                  }}
                  className="w-full justify-start bg-transparent border-luxe-border/50 text-luxe-text-muted hover:bg-luxe-surface-light hover:text-luxe-bronze"
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-luxe-border/50 text-luxe-text-muted hover:bg-luxe-surface-light hover:text-luxe-bronze"
                    onClick={() => setIsOpen(false)}
                    data-testid="link-mobile-signin"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    className="w-full bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light"
                    onClick={() => setIsOpen(false)}
                    data-testid="link-mobile-getstarted"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-luxe-border/30">
            <p className="text-xs text-luxe-text-muted/60 text-center">
              Refined Real Estate
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}