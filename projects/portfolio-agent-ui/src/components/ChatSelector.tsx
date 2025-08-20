'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useChatSession } from '@/contexts/ChatSessionContext';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  MessageCircle,
  Clock,
  MoreVertical
} from 'lucide-react';

export function ChatSelector() {
  const {
    sessions,
    currentSessionId,
    createNewSession,
    switchToSession,
    renameSession,
    deleteSession,
    clearCurrentSession
  } = useChatSession();

  const [isOpen, setIsOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateNew = () => {
    createNewSession();
    setIsOpen(false);
  };

  const handleSwitchSession = (sessionId: string) => {
    switchToSession(sessionId);
    setIsOpen(false);
  };

  const handleStartEdit = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingSessionId && editingName.trim()) {
      renameSession(editingSessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleDelete = (sessionId: string) => {
    if (sessions.length > 1) {
      deleteSession(sessionId);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-3 text-sm hover:bg-accent/50"
          title="Manage chat sessions"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {currentSession?.name || 'Chat Sessions'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat Sessions
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCurrentSession}
                className="h-8 px-3 text-xs"
                title="Clear current chat"
              >
                Clear Chat
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateNew}
                className="h-8 px-3 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                New Chat
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card 
                key={session.id}
                className={`cursor-pointer transition-all hover:bg-accent/50 ${
                  session.id === currentSessionId ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => handleSwitchSession(session.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="h-6 text-sm"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveEdit}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="w-3 h-3 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-sm truncate">
                            {session.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(session.lastMessageAt)}</span>
                            <span>•</span>
                            <span>{session.messages.length} messages</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingSessionId !== session.id && (
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(session.id, session.name)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-accent"
                          title="Rename session"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        {sessions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(session.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {session.id === currentSessionId && (
                    <div className="mt-2 px-2 py-1 bg-primary/10 rounded text-xs text-primary font-medium">
                      Current Session
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Sessions are saved locally and will persist between visits
        </div>
      </DialogContent>
    </Dialog>
  );
}