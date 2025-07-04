'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Mic, MicOff, Bot, User, TrendingUp, TrendingDown, Maximize2, Settings, Copy, RefreshCw } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { EnhancedTransactionSigner } from '@/utils/wasmTransactionSigning';

// TODO: Future integration with AGUI from Copilot for enhanced AI interface
// Consider integrating @mastra/agui for advanced chat features, voice commands,
// and enhanced AI interaction capabilities when available

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  tradeAction?: {
    action?: 'long' | 'short' | 'close';
    amount?: number;
    price?: number;
    type?: string;
    requiresWalletSigning?: boolean;
    transactionCbor?: string;
    tradeDetails?: any;
  };
}

// Function to format text with bold support
const formatMessageText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export function AITradingChat() {
  const { mainWallet } = useWallet();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      content: mainWallet
        ? `Hello! I'm your Strike Agent. I can see you're connected with ${mainWallet.handle || 'your wallet'} (${mainWallet.balance.toFixed(2)} ADA). I can help you execute trades, analyze market conditions, and manage your positions. Try saying "Go long 1000 ADA" or "What's the market sentiment?"`
        : 'Hello! I\'m your Strike Agent. Please connect your wallet first to start trading. I can help you execute trades, analyze market conditions, and manage your positions.',
      timestamp: new Date(Date.now() - 60000)
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Check if wallet is connected for trading commands
    if (!mainWallet && (inputMessage.toLowerCase().includes('trade') ||
                       inputMessage.toLowerCase().includes('long') ||
                       inputMessage.toLowerCase().includes('short'))) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: 'Please connect your wallet first to execute trades. I can still help with market analysis and general questions.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call Mastra Strike Agent with wallet context
      const response = await fetch('/api/agents/strike/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context: 'trading_interface',
          userWallet: mainWallet ? {
            address: mainWallet.address,
            stakeAddress: mainWallet.stakeAddress,
            balance: mainWallet.balance,
            walletType: mainWallet.walletType,
            handle: mainWallet.handle
          } : null
        })
      });

      const result = await response.json();

      // Simulate typing delay
      setTimeout(async () => {
        const agentMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          content: result.success ? result.data.response : 'I apologize, but I\'m having trouble processing your request right now. Please try again.',
          timestamp: new Date(),
          tradeAction: result.data?.tradeAction // If the agent executed a trade
        };

        setMessages(prev => [...prev, agentMessage]);
        setIsTyping(false);

        // Check if wallet signing is required
        if (result.success && result.data?.tradeAction?.requiresWalletSigning && result.data?.tradeAction?.transactionCbor) {
          console.log('🔍 Wallet signing required, triggering signing process...');

          // Add a small delay to let the user see the agent's message first
          setTimeout(() => {
            handleWalletSigning(
              result.data.tradeAction.transactionCbor,
              result.data.tradeAction.tradeDetails
            );
          }, 1500);
        }
      }, 1000);

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: 'I\'m experiencing some technical difficulties. Please try again in a moment.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleWalletSigning = async (transactionCbor: string, tradeDetails: any) => {
    if (!mainWallet || !window.cardano) {
      console.error('❌ Wallet not connected for signing');
      return;
    }

    try {
      console.log('🔐 Starting wallet signing process...');
      console.log('📋 CBOR to sign:', transactionCbor.substring(0, 50) + '...');

      // Get the wallet API
      const walletApi = await window.cardano[mainWallet.walletType].enable();

      // Step 1: Sign the transaction with wallet (partial signing) - Strike Finance CSL approach
      console.log('🔐 Requesting wallet signature...');
      const witnessSetCbor = await walletApi.signTx(transactionCbor, true); // partial signing
      console.log('✅ Wallet signature received, length:', witnessSetCbor.length);

      // Step 2: Send to server for proper CBOR combination using CSL
      console.log('🔧 Sending to server for CSL combination...');
      const signingResponse = await fetch('/api/cardano/sign-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txCbor: transactionCbor,
          witnessSetCbor: witnessSetCbor
        })
      });

      if (!signingResponse.ok) {
        const errorData = await signingResponse.json();
        throw new Error(`Server signing failed (${signingResponse.status}): ${errorData.error || 'Unknown error'}`);
      }

      const { success, signedTxCbor, error } = await signingResponse.json();

      if (!success || !signedTxCbor) {
        throw new Error(`CSL combination failed: ${error || 'Unknown error'}`);
      }

      console.log('✅ Server: Transaction signed successfully using CSL');
      console.log('📋 Final transaction length:', signedTxCbor.length);

      // Step 3: Submit to Cardano network
      console.log('🚀 Submitting transaction to Cardano network...');
      const txHash = await walletApi.submitTx(signedTxCbor);
      console.log('🎉 Transaction successfully submitted! Hash:', txHash);

      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'agent',
        content: `✅ **Trade Executed Successfully!**\n\nYour Strike Finance position has been opened successfully.\n\n**Transaction Hash:** \`${txHash}\`\n\n**Trade Details:**\n- **Action:** ${tradeDetails?.action || 'Open'}\n- **Side:** ${tradeDetails?.side || 'Long'}\n- **Collateral:** ${tradeDetails?.collateralAmount ? (tradeDetails.collateralAmount / 1000000) + ' ADA' : 'N/A'}\n- **Leverage:** ${tradeDetails?.leverage || 'N/A'}x\n- **Pair:** ${tradeDetails?.pair || 'ADA/USD'}\n\nYou can view this transaction on [Cardanoscan](https://cardanoscan.io/transaction/${txHash})`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('❌ Wallet signing failed:', error);

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'agent',
        content: `❌ **Transaction Failed**\n\nI was unable to complete the transaction signing. Please try again.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    // Voice recognition would be implemented here
    // For now, just toggle the state
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickCommands = [
    { label: 'Market Analysis', command: 'Analyze the current ADA market conditions' },
    { label: 'Long 1000 ADA', command: 'Go long 1000 ADA with 5x leverage' },
    { label: 'Short 500 ADA', command: 'Go short 500 ADA with 3x leverage' },
    { label: 'Close Positions', command: 'Close all my open positions' },
    { label: 'Portfolio Status', command: 'Show me my current portfolio and P&L' },
    { label: 'TITAN2K Status', command: 'What is the TITAN2K strategy recommending?' }
  ];

  return (
    <Card className="flex flex-col h-full min-h-[500px]">
      {/* Enhanced Chat Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">Strike Agent</CardTitle>
              <p className="text-xs text-muted-foreground">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Online
            </Badge>
          </div>
        </div>

        {/* Wallet Info Display */}
        {mainWallet && (
          <div className="mt-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">
                  {mainWallet.handle || 'Connected Wallet'}
                </span>
              </div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {mainWallet.balance.toFixed(2)} ADA
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Professional Quick Commands */}
      <div className="px-6 py-2 border-b bg-gradient-to-r from-muted/20 to-muted/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Quick Commands</span>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Clear Chat
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {quickCommands.slice(0, 6).map((cmd, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setInputMessage(cmd.command)}
              className="justify-start text-xs h-6 px-2 hover:bg-primary/10 hover:border-primary/20"
            >
              {cmd.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <CardContent className="flex-1 p-0">
        <div className="h-[480px] overflow-y-auto p-3 space-y-3" ref={scrollAreaRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'agent' && (
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.type === 'agent' ? 'Strike Agent' : 'You'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-lg shadow-sm group ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-card border'
                  }`}
                >
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {formatMessageText(message.content)}
                  </p>

                  {/* Enhanced Trade Action Display */}
                  {message.tradeAction && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(message.tradeAction.action === 'long' || message.tradeAction.type === 'requires_wallet_signing') ? (
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                              <TrendingDown className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-sm">
                              {message.tradeAction.action ? message.tradeAction.action.toUpperCase() : 'TRADE'} Position
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {message.tradeAction.amount ? `${message.tradeAction.amount} ADA @ $${message.tradeAction.price?.toFixed(4) || '0.0000'}` : 'Trade details pending...'}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {message.tradeAction.requiresWalletSigning ? 'Signing Required' : 'Executed'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}

          {/* Enhanced Typing Indicator */}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-card border p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Strike Agent</span>
                  <span className="text-xs text-blue-500">is thinking...</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Compact Input Area */}
      <div className="p-3 border-t bg-muted/20">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me to trade, analyze markets, or check positions..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="h-9 text-xs pr-12 bg-background"
              disabled={isTyping}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
              {inputMessage.length > 0 && `${inputMessage.length}`}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleVoiceToggle}
            className={`h-9 w-9 p-0 ${isListening ? 'bg-red-500 text-white border-red-500' : ''}`}
            disabled={isTyping}
          >
            {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          </Button>

          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            size="sm"
            className="h-9 px-3"
          >
            <Send className="h-3 w-3 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
