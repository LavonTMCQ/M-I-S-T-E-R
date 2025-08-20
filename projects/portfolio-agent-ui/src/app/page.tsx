'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceControls } from '@/components/VoiceControls';
import { MarkdownMessage } from '@/components/MarkdownMessage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { QuickActionButtons } from '@/components/QuickActionButtons';
import { TradingHeader } from '@/components/TradingHeader';
import { TradingPanels } from '@/components/TradingPanels';
import { ChatSelector } from '@/components/ChatSelector';
import { useGoogleTTS } from '@/hooks/useGoogleTTS';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import { ChatSessionProvider, useChatSession, type Message } from '@/contexts/ChatSessionContext';
import { Copy, Check, RefreshCw, AlertCircle, Search, X, Filter } from 'lucide-react';
import '../styles/markdown.css';

// Create the main component that uses chat session context
function PortfolioAgentUIContent({ isConnected }: { isConnected: boolean }) {
  const {
    currentSession,
    addMessage,
    updateMessage
  } = useChatSession();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'user' | 'agent' | 'errors'>('all');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

  // Get messages from current session
  const messages = currentSession?.messages || [];
  
  // Google TTS integration
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const {
    speak,
    pause,
    resume,
    stop,
    changeVoice,
    isPlaying,
    isPaused,
    isLoading: isTTSLoading,
    currentVoice,
    availableVoices,
  } = useGoogleTTS(googleApiKey);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && !showSearch) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, showSearch]);

  // Filter and search messages
  useEffect(() => {
    let filtered = messages;

    // Apply role filter
    if (messageFilter !== 'all') {
      if (messageFilter === 'errors') {
        filtered = filtered.filter(msg => msg.isError);
      } else {
        filtered = filtered.filter(msg => msg.role === messageFilter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(query) ||
        msg.role.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  }, [messages, messageFilter, searchQuery]);


  // Strip markdown formatting for TTS to avoid speaking "asterisk" etc
  const stripMarkdownForSpeech = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold: **text** -> text
      .replace(/\*([^*]+)\*/g, '$1')      // Italic: *text* -> text
      .replace(/`([^`]+)`/g, '$1')        // Code: `text` -> text
      .replace(/#{1,6}\s+/g, '')          // Headers: # text -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links: [text](url) -> text
      .replace(/\n\s*[-*+]\s+/g, '\n')    // List items: - item -> item
      .replace(/\n{2,}/g, '\n')           // Multiple newlines -> single
      .trim();
  };

  // Highlight search results in text
  const HighlightedText = ({ text, searchQuery }: { text: string; searchQuery: string }) => {
    if (!searchQuery.trim()) {
      return <span>{text}</span>;
    }

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };


  const handleQuickAction = async (question: string) => {
    if (isLoading) return;
    
    setInput(question);
    
    // Auto-send the quick action
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    await sendMessageWithContent(question);
  };

  const sendMessage = async (retryCount = 0) => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    if (retryCount === 0) {
      addMessage(userMessage);
    }
    
    const messageContent = input;
    setInput('');
    await sendMessageWithContent(messageContent, retryCount);
  };

  const sendMessageWithContent = async (content: string, retryCount = 0) => {
    setIsLoading(true);

    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 300000; // 5 minutes timeout - much longer for complex analysis

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      // Direct connection to Mastra server - matching playground format exactly
      const response = await fetch('http://localhost:4111/api/agents/phemexPortfolioAgent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: content }],
          stream: false, // Non-streaming for reliability
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Agent response error: ${response.status}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Agent error: ${response.status}`);
      }

      const data = await response.json();
      
      // Log the response structure for debugging
      console.log('Agent response structure:', { 
        hasText: !!data.text, 
        textLength: data.text?.length,
        hasToolCalls: data.toolCalls?.length > 0,
        finishReason: data.finishReason,
        usage: data.usage
      });
      
      // Check if we got an actual response - matching playground's field names
      // Also check steps array since the agent sometimes returns text there
      let responseText = data.text || data.content || data.message || '';
      
      // If no text at top level, check the steps array
      if (!responseText && data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
        // Get text from the first step if available
        responseText = data.steps[0].text || '';
        console.log('Found text in steps:', responseText.substring(0, 100));
      }
      
      // If still no text but we have tool results, format them
      if (!responseText && data.toolResults && Array.isArray(data.toolResults)) {
        console.log('No text but has tool results, formatting them...');
        // The agent executed tools but didn't return text - this happens with complex queries
        responseText = 'I processed your request but encountered an issue formatting the response. The agent is working but may be hitting token limits. Try asking a simpler question or breaking it into parts.';
      }
      
      if (!responseText && data.finishReason !== 'stop' && retryCount < MAX_RETRIES) {
        // If empty response and not a successful stop, retry
        console.log(`Empty response, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        console.log('Debug: Full response data:', JSON.stringify(data).substring(0, 500));
        setTimeout(() => sendMessageWithContent(content, retryCount + 1), 2000);
        return;
      }
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: responseText || 'I received your message but couldn\'t generate a proper response. Please try rephrasing your question.',
        timestamp: new Date(),
      };

      addMessage(agentMessage);
      
      // Speak the response using Google TTS (strip markdown first)
      if (responseText && googleApiKey) {
        const speechText = stripMarkdownForSpeech(responseText);
        speak(speechText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Timeout error
        if (retryCount < MAX_RETRIES) {
          console.log(`Request timed out, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => sendMessageWithContent(content, retryCount + 1), 2000);
          return;
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: `**Request Timeout**\n\nThe analysis took longer than expected (${TIMEOUT_MS/1000} seconds). This usually happens when:\n\n• Multiple tools are being executed simultaneously\n• News feeds are experiencing network issues\n• Market data APIs are slow to respond\n\nThe system continues working even if some tools fail.`,
            timestamp: new Date(),
            isError: true,
            retryAction: () => sendMessageWithContent(content, 0),
          };
          addMessage(errorMessage);
        }
      } else {
        // Other errors
        if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('fetch')) {
          console.log(`Connection error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => sendMessageWithContent(content, retryCount + 1), 2000);
          return;
        } else {
          const errorType = error instanceof Error && error.message.includes('fetch') ? 'Connection' : 'System';
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: `**${errorType} Error**\n\n${error instanceof Error ? error.message : 'Failed to connect to agent'}\n\n**Troubleshooting:**\n• Check that the Mastra server is running on port 4111\n• Verify your network connection\n• Try refreshing the page if the issue persists`,
            timestamp: new Date(),
            isError: true,
            retryAction: () => sendMessageWithContent(content, 0),
          };
          addMessage(errorMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TradingHeader 
        isConnected={isConnected} 
      />
      <div className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col gap-4 h-full">
          {/* Trading Panels - Small Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trading:</span>
              <TradingPanels isConnected={isConnected} />
            </div>
            <div className="text-xs text-muted-foreground">
              Click icons for detailed views
            </div>
          </div>
          
          {/* Main Chat Interface */}
          <Card className="flex-1 flex flex-col h-[calc(100vh-10rem)]">
          
          {/* Voice Controls */}
          {googleApiKey && (
            <div className="border-b px-4 py-2">
              <VoiceControls
                isPlaying={isPlaying}
                isPaused={isPaused}
                isLoading={isTTSLoading}
                currentVoice={currentVoice}
                availableVoices={availableVoices}
                onPlay={resume}
                onPause={pause}
                onStop={stop}
                onVoiceChange={changeVoice}
              />
            </div>
          )}
          
          {/* Search and Filter Controls */}
          <div className="border-b px-4 py-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(!showSearch)}
                  className="h-8 px-2"
                >
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </Button>
                {(searchQuery || messageFilter !== 'all') && (
                  <div className="text-xs text-muted-foreground">
                    {showSearch ? filteredMessages.length : messages.length} of {messages.length} messages
                  </div>
                )}
              </div>
              
              {showSearch && (
                <div className="flex items-center gap-2">
                  {/* Filter Dropdown */}
                  <select
                    value={messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value as any)}
                    className="text-xs border border-border rounded px-2 py-1 bg-background"
                  >
                    <option value="all">All Messages</option>
                    <option value="user">Your Messages</option>
                    <option value="agent">Agent Responses</option>
                    <option value="errors">Error Messages</option>
                  </select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setMessageFilter('all');
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {showSearch && (
              <div className="mt-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
            )}
          </div>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-lg mb-2">Welcome to your Portfolio Agent Interface</p>
                    <p className="text-sm">Ask about your positions, risk analysis, or market conditions</p>
                  </div>
                ) : showSearch && filteredMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-lg mb-2">No messages found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  (showSearch ? filteredMessages : messages).map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 relative ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.isError
                            ? 'bg-red-500/10 border border-red-500/20'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-xs">
                            {message.role === 'user' ? 'You' : 'Portfolio Agent'}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(message.content, message.id)}
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {message.role === 'agent' ? (
                          <MarkdownMessage 
                            content={message.content} 
                            onPlayFromPosition={speak}
                            isAgent={true}
                            searchQuery={showSearch && searchQuery ? searchQuery : undefined}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {showSearch && searchQuery ? (
                              <HighlightedText text={message.content} searchQuery={searchQuery} />
                            ) : (
                              message.content
                            )}
                          </div>
                        )}
                        
                        {message.isError && message.retryAction && (
                          <div className="mt-3 pt-2 border-t border-red-500/20">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={message.retryAction}
                              disabled={isLoading}
                              className="h-8 px-3 text-xs bg-red-500/5 hover:bg-red-500/10 border-red-500/30 hover:border-red-500/50"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Retry Request
                            </Button>
                          </div>
                        )}
                        
                        <div className="text-xs opacity-60 mt-2 flex items-center gap-2">
                          {message.isError && <AlertCircle className="w-3 h-3 text-red-500" />}
                          <span>{formatRelativeTime(message.timestamp)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-muted-foreground/70">{message.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/80 rounded-lg p-4 max-w-[80%] border border-border/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <div className="animate-spin h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full" />
                          <div className="absolute inset-0 animate-pulse">
                            <div className="h-5 w-5 border border-primary/20 rounded-full" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Agent is processing your request...</span>
                          <span className="text-xs text-muted-foreground">Analyzing portfolio data and market conditions</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                          <span>Fetching live positions and P&L data</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                          <span>Running comprehensive market analysis</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                          <span>This may take up to 5 minutes for complete analysis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          
          {/* Quick Action Buttons */}
          <div className="border-t px-4 pt-2">
            <QuickActionButtons 
              onQuickAction={handleQuickAction}
              isLoading={isLoading}
              isConnected={isConnected}
            />
          </div>
          
          <div className="border-t p-4 bg-muted/20">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about your portfolio, positions, or market analysis..."
                disabled={!isConnected || isLoading}
                className="flex-1 h-11 bg-background border-border/50 focus:border-primary/50 transition-colors"
              />
              <Button
                onClick={sendMessage}
                disabled={!isConnected || isLoading || !input.trim()}
                className="h-11 px-6 btn-trading"
                size="sm"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
            {!isConnected && (
              <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="text-sm text-red-400 flex items-center gap-2">
                  <div className="status-dot red"></div>
                  <span>Agent not connected. Make sure the Mastra server is running on port 4111.</span>
                </div>
              </div>
            )}
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}

// Main export with providers
export default function PortfolioAgentUI() {
  const [isConnected, setIsConnected] = useState(false);

  // Check connection to agent
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:4111/api/agents');
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ChatSessionProvider>
      <PortfolioProvider isConnected={isConnected}>
        <PortfolioAgentUIContent isConnected={isConnected} />
      </PortfolioProvider>
    </ChatSessionProvider>
  );
}