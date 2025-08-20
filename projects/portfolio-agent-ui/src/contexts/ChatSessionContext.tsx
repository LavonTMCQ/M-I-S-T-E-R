'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  retryAction?: () => void;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

interface ChatSessionContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  createNewSession: (name?: string) => string;
  switchToSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newName: string) => void;
  deleteSession: (sessionId: string) => void;
  clearCurrentSession: () => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export function useChatSession() {
  const context = useContext(ChatSessionContext);
  if (context === undefined) {
    throw new Error('useChatSession must be used within a ChatSessionProvider');
  }
  return context;
}

const STORAGE_KEY = 'portfolio-agent-chat-sessions';
const CURRENT_SESSION_KEY = 'portfolio-agent-current-session';

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    const savedCurrentSession = localStorage.getItem(CURRENT_SESSION_KEY);
    
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          lastMessageAt: new Date(session.lastMessageAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setSessions(parsedSessions);
        
        // Set current session if it exists
        if (savedCurrentSession && parsedSessions.find((s: ChatSession) => s.id === savedCurrentSession)) {
          setCurrentSessionId(savedCurrentSession);
        } else if (parsedSessions.length > 0) {
          setCurrentSessionId(parsedSessions[0].id);
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
        // Create a default session if loading fails
        const defaultSession = createInitialSession();
        setSessions([defaultSession]);
        setCurrentSessionId(defaultSession.id);
      }
    } else {
      // Create initial session if none exist
      const defaultSession = createInitialSession();
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
    }
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save current session ID when it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    }
  }, [currentSessionId]);

  const createInitialSession = (): ChatSession => {
    return {
      id: generateSessionId(),
      name: `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date()
    };
  };

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createNewSession = (name?: string): string => {
    const now = new Date();
    const newSession: ChatSession = {
      id: generateSessionId(),
      name: name || `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      messages: [],
      createdAt: now,
      lastMessageAt: now
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  const switchToSession = (sessionId: string) => {
    if (sessions.find(s => s.id === sessionId)) {
      setCurrentSessionId(sessionId);
    }
  };

  const renameSession = (sessionId: string, newName: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, name: newName.trim() || session.name }
        : session
    ));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If we're deleting the current session, switch to another one
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
        } else {
          // Create a new session if all are deleted
          const newSession = createInitialSession();
          setCurrentSessionId(newSession.id);
          return [newSession];
        }
      }
      
      return filtered;
    });
  };

  const clearCurrentSession = () => {
    if (currentSessionId) {
      setSessions(prev => prev.map(session =>
        session.id === currentSessionId
          ? { ...session, messages: [], lastMessageAt: new Date() }
          : session
      ));
    }
  };

  const addMessage = (message: Message) => {
    if (currentSessionId) {
      setSessions(prev => prev.map(session =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              lastMessageAt: new Date()
            }
          : session
      ));
    }
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    if (currentSessionId) {
      setSessions(prev => prev.map(session =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: session.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              )
            }
          : session
      ));
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const value = {
    sessions,
    currentSessionId,
    currentSession,
    createNewSession,
    switchToSession,
    renameSession,
    deleteSession,
    clearCurrentSession,
    addMessage,
    updateMessage
  };

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}