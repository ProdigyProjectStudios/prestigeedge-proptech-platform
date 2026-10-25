import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle, Send, Bot, User, X, Minimize2, Maximize2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AIChatbot({ isOpen, onToggle }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm ARIA, your luxury real estate concierge. I'm here to help you discover the perfect estate from our exclusive portfolio. How may I assist you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (event?: any) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    // Show typing indicator immediately
    const typingMessage: Message = {
      id: 'typing',
      text: 'ARIA is typing...',
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, typingMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    // Keep input focused to prevent keyboard from closing on mobile
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'ai',
        timestamp: new Date()
      };

      // Remove typing indicator and add real response
      setMessages(prev => prev.filter(msg => msg.id !== 'typing').concat(aiMessage));
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm experiencing technical difficulties. Please feel free to contact our team directly for immediate assistance with your luxury property needs.",
        sender: 'ai',
        timestamp: new Date()
      };
      // Remove typing indicator and add error message
      setMessages(prev => prev.filter(msg => msg.id !== 'typing').concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };


  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onToggle();
      setIsClosing(false);
    }, 400); // Match animation duration
  };

  if (!isOpen && !isClosing) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-14 w-14 md:h-16 md:w-16 rounded-full bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light shadow-xl shadow-black/40 transition-all duration-300 z-50 chat-bubble-beating border-2 border-luxe-bronze-light"
        data-testid="button-chat-toggle"
      >
        <MessageCircle className="h-6 w-6 md:h-7 md:w-7" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 left-4 md:bottom-6 md:right-6 md:left-auto z-50 bg-luxe-surface border border-luxe-bronze/40 shadow-2xl shadow-black/50 transition-all duration-500 ease-out transform origin-bottom-right ${
      isMinimized ? 'h-16' : 'h-[70vh] md:h-[500px]'
    } ${isMinimized ? 'md:w-80' : 'md:w-96'} ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
      <CardHeader className="pb-3 px-4 py-3 bg-luxe-bronze/10 border-b border-luxe-bronze/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-luxe-bronze flex items-center justify-center">
              <Bot className="h-4 w-4 text-luxe-bg" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-luxe-text">ARIA</CardTitle>
              <p className="text-xs text-luxe-text-muted">Luxury Real Estate Concierge</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs px-2 py-0">
              Online
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 text-luxe-text-muted hover:text-luxe-text"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 text-luxe-text-muted hover:text-luxe-text"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[calc(70vh-140px)] md:h-[360px] p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[80%] ${
                      message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.sender === 'user' 
                          ? 'bg-luxe-bronze text-luxe-bg' 
                          : 'bg-luxe-bronze/20 text-luxe-bronze'
                      }`}>
                        {message.sender === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      </div>
                      <div className={`rounded-lg px-3 py-2 ${
                        message.sender === 'user'
                          ? 'bg-luxe-bronze text-luxe-bg'
                          : 'bg-luxe-bg text-luxe-text border border-luxe-bronze/20'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-luxe-bg/60' : 'text-luxe-text-muted'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-luxe-bronze/20 text-luxe-bronze flex items-center justify-center">
                        <Bot className="h-3 w-3" />
                      </div>
                      <div className="bg-luxe-bg text-luxe-text border border-luxe-bronze/20 rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-luxe-bronze rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-luxe-bronze rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-luxe-bronze rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t border-luxe-bronze/20">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Ask about luxury properties..."
                className="flex-1 bg-luxe-bg border-luxe-bronze/30 text-luxe-text placeholder:text-luxe-text-muted focus:border-luxe-bronze"
                disabled={isLoading}
                inputMode="text"
                enterKeyHint="send"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}