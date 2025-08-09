'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MisterLogo } from '@/components/ui/mister-logo';
import { AIThinkingTerminal } from '@/components/trading/AIThinkingTerminal';
import MarkdownRenderer from '@/components/ui/markdown-renderer';
import {
  Send,
  Bot,
  User,
  Sparkles,
  MessageCircle,
  History,
  Settings,
  Plus,
  Trash2,
  Download,
  Upload,
  Activity,
  Brain,
  Terminal
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agentName?: string;
  isTyping?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentType: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('tomorrow-labs');
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Available agents
  const agents = {
    'tomorrow-labs': {
      id: 'tomorrow-labs',
      name: 'Tomorrow Labs Network',
      description: 'AI Network specialized in Strike Finance trading and crypto backtesting',
      avatar: '🚀',
      color: 'from-blue-500 to-purple-600',
      capabilities: ['Strike Finance Trading', 'Crypto Backtesting', 'Natural Language Strategy Analysis'],
      apiEndpoint: '/api/chat/tomorrow-labs'
    },
    'mister-v2': {
      id: 'mister-v2',
      name: 'MISTER v2 Agent',
      description: 'Advanced AI agent with enhanced trading analysis and strategy optimization',
      avatar: '🤖',
      color: 'from-purple-500 to-pink-600',
      capabilities: ['Advanced Strategy Analysis', 'Market Prediction', 'Risk Assessment', 'Portfolio Optimization'],
      apiEndpoint: 'https://misterexc6.ngrok.io/api/agents/mister-v2/generate'
    }
  };

  const currentAgent = agents[selectedAgent as keyof typeof agents];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = typeof window !== 'undefined' ? localStorage.getItem('mister-chat-sessions') : null;
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);

      // Convert date strings back to Date objects
      const sessionsWithDates = sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }))
      }));

      setChatSessions(sessionsWithDates);

      // Load the most recent session
      if (sessionsWithDates.length > 0) {
        const mostRecent = sessionsWithDates[0];
        setCurrentSessionId(mostRecent.id);
        setMessages(mostRecent.messages);
        // Always use network agent
      }
    }
  }, []);

  // Save chat sessions to localStorage
  const saveChatSessions = (sessions: ChatSession[]) => {
    if (typeof window !== 'undefined') localStorage.setItem('mister-chat-sessions', JSON.stringify(sessions));
    setChatSessions(sessions);
  };

  // Create new chat session
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      agentType: selectedAgent
    };

    const updatedSessions = [newSession, ...chatSessions];
    saveChatSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  // Update current session
  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) return;

    const updatedSessions = chatSessions.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: newMessages,
          updatedAt: new Date(),
          title: newMessages.length > 0 ? 
            newMessages[0].content.substring(0, 50) + '...' : 
            'New Chat'
        };
      }
      return session;
    });

    saveChatSessions(updatedSessions);
  };

  // Send message to agent
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: `typing_${Date.now()}`,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      agentName: currentAgent.name,
      isTyping: true
    };

    setMessages([...newMessages, typingMessage]);

    try {
      let response;

      if (selectedAgent === 'mister-v2') {
        // Call MISTER v2 Agent API (external) - uses messages format
        const chatMessages = [
          ...messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          {
            role: 'user',
            content: inputValue
          }
        ];

        response = await fetch(currentAgent.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: chatMessages
          }),
        });
      } else {
        // Call Tomorrow Labs Network API (internal)
        response = await fetch(currentAgent.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputValue,
            agentType: selectedAgent,
            chatHistory: messages.slice(-10) // Last 10 messages for context
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Remove typing indicator and add real response
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        content: data.text || data.response || data.message || 'Sorry, I encountered an error.',
        role: 'assistant',
        timestamp: new Date(),
        agentName: currentAgent.name
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove typing indicator and show error
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        agentName: 'System'
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background pt-12">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <MisterLogo size="lg" />
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  AI Chat
                </h1>
                <Badge variant="outline" className="flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
                  <Activity className="h-3 w-3" />
                  Chat & Terminal
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Bot className="w-3 h-3 mr-1" />
                AI Online
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[calc(100vh-160px)] flex gap-6">
        
        {/* Left Sidebar - Network Info & Chat History */}
        <div className="w-80 mr-6 space-y-4">

          {/* Agent Selector & Info */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Agents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Select Agent:
                </label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(agents).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span>{agent.avatar}</span>
                          <span>{agent.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Agent Info */}
              <div className={`w-full p-4 rounded-lg bg-gradient-to-r ${currentAgent.color} text-white shadow-lg`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">{currentAgent.avatar}</div>
                  <div>
                    <div className="font-bold">{currentAgent.name}</div>
                    <div className="text-sm opacity-90">{currentAgent.description}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium opacity-90">Specialized in:</div>
                  {currentAgent.capabilities.map((capability, index) => (
                    <div key={index} className="text-xs opacity-80 flex items-center gap-1">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      {capability}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat History */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="w-5 h-5 text-blue-500" />
                  Chat History
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={createNewChat}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {chatSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={currentSessionId === session.id ? "secondary" : "ghost"}
                        className="w-full justify-start h-auto p-3 text-left"
                        onClick={() => {
                          setCurrentSessionId(session.id);
                          setMessages(session.messages);
                          // Always use network agent
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <MessageCircle className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{session.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {session.updatedAt instanceof Date
                                ? session.updatedAt.toLocaleDateString()
                                : new Date(session.updatedAt).toLocaleDateString()
                              }
                            </div>
                          </div>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tab Navigation */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TabsList className="w-full h-12 bg-transparent p-0">
                <TabsTrigger 
                  value="chat" 
                  className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="terminal" 
                  className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI Terminal
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Contents */}
            <TabsContent value="chat" className="flex-1 mt-0">
              <Card className="h-full backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
                
                {/* Chat Header */}
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${currentAgent.color} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                        {currentAgent.avatar}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">
                          {currentAgent.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {currentAgent.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Online
                    </Badge>
                  </div>
                </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[calc(100vh-400px)] p-6">
                <AnimatePresence>
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12"
                    >
                      <div className="text-6xl mb-4">
                        {currentAgent.avatar}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        Welcome to {currentAgent.name}
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {currentAgent.description}. I'm here to help with your trading and analysis needs!
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`flex gap-3 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <Avatar className="w-8 h-8 mt-1">
                              <AvatarFallback className={`bg-gradient-to-r ${currentAgent.color} text-white text-sm`}>
                                {currentAgent.avatar}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className={`max-w-[70%] ${
                            message.role === 'user' ? 'order-first' : ''
                          }`}>
                            <div className={`rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-blue-500 text-white ml-auto'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                            }`}>
                              {message.isTyping ? (
                                <div className="flex items-center gap-1">
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                                  </div>
                                  <span className="text-sm text-slate-500 ml-2">
                                    {message.agentName} is thinking...
                                  </span>
                                </div>
                              ) : (
                                <MarkdownRenderer
                                  content={message.content}
                                  className="text-sm"
                                />
                              )}
                            </div>
                            <div className={`text-xs text-muted-foreground mt-1 ${
                              message.role === 'user' ? 'text-right' : 'text-left'
                            }`}>
                              {message.agentName && `${message.agentName} • `}
                              {message.timestamp instanceof Date
                                ? message.timestamp.toLocaleTimeString()
                                : new Date(message.timestamp).toLocaleTimeString()
                              }
                            </div>
                          </div>

                          {message.role === 'user' && (
                            <Avatar className="w-8 h-8 mt-1">
                              <AvatarFallback className="bg-blue-500 text-white">
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>

            {/* Input Area */}
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${currentAgent.name}...`}
                      className="pr-12 h-12 text-base border-2 focus:border-blue-500 transition-colors bg-white dark:bg-slate-900"
                      disabled={isLoading}
                    />
                    <Button
                      size="sm"
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="absolute right-2 top-2 h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Press Enter to send • Shift+Enter for new line
                </div>
              </div>
            </div>
              </Card>
            </TabsContent>

            {/* AI Terminal Tab */}
            <TabsContent value="terminal" className="flex-1 mt-0">
              <Card className="h-full backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">MISTER AI Terminal</h2>
                        <p className="text-sm text-muted-foreground">Real-time trading signals and AI analysis</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Live Terminal
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0 h-[calc(100vh-200px)]">
                  <AIThinkingTerminal
                    walletAddress="demo_address"
                    selectedStrategy="ada_custom_algorithm"
                    isActive={activeTab === 'terminal'}
                    onToggleTrading={() => {
                      // Read-only terminal - no toggle functionality
                      console.log('AI Terminal is read-only');
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
        </div>
      </main>
    </div>
  );
}
