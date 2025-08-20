'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useRef, useEffect } from 'react';
import { PlayIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownMessageProps {
  content: string;
  onPlayFromPosition?: (text: string) => void;
  isAgent?: boolean;
  searchQuery?: string;
}

export function MarkdownMessage({ 
  content, 
  onPlayFromPosition,
  isAgent = false,
  searchQuery 
}: MarkdownMessageProps) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const handleTextClick = (e: React.MouseEvent) => {
    if (!onPlayFromPosition || !isAgent) return;

    const selection = window.getSelection();
    if (selection && selection.toString()) {
      // If there's a selection, use that
      return;
    }

    // Get click position in the text
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;

    const preRange = document.createRange();
    preRange.selectNodeContents(contentRef.current!);
    preRange.setEnd(range.startContainer, range.startOffset);
    
    const position = preRange.toString().length;
    setSelectedPosition(position);

    // Get text from click position to end
    const fullText = contentRef.current?.textContent || '';
    const textFromPosition = fullText.substring(position);
    
    if (textFromPosition) {
      // Strip markdown formatting before speaking
      const speechText = stripMarkdownForSpeech(textFromPosition);
      onPlayFromPosition(speechText);
    }
  };

  const getTextWithMarker = () => {
    if (selectedPosition === null || !contentRef.current) return content;
    
    const fullText = contentRef.current.textContent || '';
    if (selectedPosition >= fullText.length) return content;
    
    // We'll show a visual indicator where the user clicked
    return content;
  };

  // Highlight search terms in text nodes
  const HighlightedText = ({ children }: { children: string }) => {
    if (!searchQuery?.trim() || typeof children !== 'string') {
      return <>{children}</>;
    }

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = children.split(regex);

    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div 
            ref={contentRef}
            className={cn(
              "markdown-content relative",
              isAgent && onPlayFromPosition && "cursor-pointer hover:bg-accent/5 transition-colors rounded p-1 -m-1"
            )}
            onClick={handleTextClick}
          >
            {selectedPosition !== null && isAgent && (
              <div className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-2 animate-pulse">
                <PlayIcon className="h-3 w-3" />
                <span>Playing from selected position</span>
              </div>
            )}
      
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-4 mb-2 text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-3 mb-2 text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-2 mb-1 text-primary">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-2 mb-1">{children}</h4>
          ),
          
          // Paragraphs and text
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-muted-foreground">{children}</em>
          ),
          // Text nodes - apply highlighting here
          text: ({ children }) => <HighlightedText>{children}</HighlightedText>,
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="ml-2">
              <span className="text-muted-foreground">•</span>
              <span className="ml-2">{children}</span>
            </li>
          ),
          
          // Code
          code: ({ className, children }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-orange-500">
                {children}
              </code>
            ) : (
              <code className={cn(
                "block p-3 rounded-lg bg-muted/50 text-sm font-mono overflow-x-auto",
                className
              )}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-2 rounded-lg bg-muted/30 p-3 overflow-x-auto">
              {children}
            </pre>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 border-b-2 border-border">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/20 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-primary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-t border-border" />
          ),
          
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {getTextWithMarker()}
      </ReactMarkdown>
          </div>
        </TooltipTrigger>
        {isAgent && onPlayFromPosition && (
          <TooltipContent side="top" className="text-xs">
            <p>Click anywhere in the text to start speaking from that position</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}