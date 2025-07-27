'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Enhanced markdown parser that handles multiple formats
const parseMarkdown = (text: string) => {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  let currentIndex = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    
    // Skip empty lines
    if (!line.trim()) {
      elements.push(<br key={currentIndex} />);
      currentIndex++;
      continue;
    }

    // Headers (### ## #)
    if (line.startsWith('###')) {
      elements.push(
        <h3 key={currentIndex} className="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200">
          {line.replace(/^###\s*/, '')}
        </h3>
      );
    } else if (line.startsWith('##')) {
      elements.push(
        <h2 key={currentIndex} className="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-slate-100">
          {line.replace(/^##\s*/, '')}
        </h2>
      );
    } else if (line.startsWith('#')) {
      elements.push(
        <h1 key={currentIndex} className="text-2xl font-bold mt-6 mb-4 text-slate-900 dark:text-slate-100">
          {line.replace(/^#\s*/, '')}
        </h1>
      );
    }
    // Code blocks (```language or ```)
    else if (line.startsWith('```')) {
      const language = line.replace('```', '').trim();
      const codeLines: string[] = [];
      currentIndex++;
      
      // Collect code block content
      while (currentIndex < lines.length && !lines[currentIndex].startsWith('```')) {
        codeLines.push(lines[currentIndex]);
        currentIndex++;
      }
      
      elements.push(
        <div key={`code-${currentIndex}`} className="my-4">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-lg overflow-hidden">
            {language && (
              <div className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-slate-300 text-xs font-medium border-b border-slate-700">
                {language}
              </div>
            )}
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm text-slate-100 font-mono leading-relaxed">
                {codeLines.join('\n')}
              </code>
            </pre>
          </div>
        </div>
      );
    }
    // Bullet points (* or -)
    else if (line.match(/^\s*[\*\-]\s+/)) {
      const listItems: string[] = [];
      let listIndex = currentIndex;
      
      // Collect all consecutive list items
      while (listIndex < lines.length && lines[listIndex].match(/^\s*[\*\-]\s+/)) {
        listItems.push(lines[listIndex].replace(/^\s*[\*\-]\s+/, ''));
        listIndex++;
      }
      
      elements.push(
        <ul key={`list-${currentIndex}`} className="my-3 ml-4 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1.5 text-xs">•</span>
              <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {formatInlineText(item)}
              </span>
            </li>
          ))}
        </ul>
      );
      
      currentIndex = listIndex - 1;
    }
    // Check if line is a standalone image URL
    else if (line.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
      elements.push(
        <div key={currentIndex} className="my-4">
          <img
            src={line.trim()}
            alt="Generated image"
            className="max-w-full h-auto rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Show link fallback
              const linkElement = document.createElement('a');
              linkElement.href = line.trim();
              linkElement.textContent = `🖼️ View Image: ${line.trim()}`;
              linkElement.className = 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline block';
              linkElement.target = '_blank';
              linkElement.rel = 'noopener noreferrer';
              target.parentNode?.insertBefore(linkElement, target);
            }}
          />
        </div>
      );
    }
    // Regular paragraphs
    else {
      elements.push(
        <p key={currentIndex} className="mb-3 text-slate-700 dark:text-slate-300 leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    }
    
    currentIndex++;
  }

  return elements;
};

// Format inline text with bold, italic, code, etc.
const formatInlineText = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Bold text (**text**)
    const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(
        <strong key={`bold-${keyIndex++}`} className="font-semibold text-slate-900 dark:text-slate-100">
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
      continue;
    }

    // Inline code (`code`)
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(
        <code key={`code-${keyIndex++}`} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-sm font-mono">
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    // Italic text (*text*)
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(
        <em key={`italic-${keyIndex++}`} className="italic text-slate-700 dark:text-slate-300">
          {italicMatch[2]}
        </em>
      );
      remaining = italicMatch[3];
      continue;
    }

    // Images ![alt](url)
    const imageMatch = remaining.match(/^(.*?)!\[([^\]]*)\]\(([^)]+)\)(.*)/);
    if (imageMatch) {
      if (imageMatch[1]) parts.push(imageMatch[1]);
      parts.push(
        <img
          key={`image-${keyIndex++}`}
          src={imageMatch[3]}
          alt={imageMatch[2] || 'Generated image'}
          className="max-w-full h-auto rounded-lg shadow-md my-2 border border-slate-200 dark:border-slate-700"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            // Show link fallback
            const linkElement = document.createElement('a');
            linkElement.href = imageMatch[3];
            linkElement.textContent = `🖼️ View Image: ${imageMatch[2] || 'Generated image'}`;
            linkElement.className = 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline';
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            target.parentNode?.insertBefore(linkElement, target);
          }}
        />
      );
      remaining = imageMatch[4];
      continue;
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)/);
    if (linkMatch) {
      if (linkMatch[1]) parts.push(linkMatch[1]);
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={linkMatch[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
        >
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
      continue;
    }

    // No more matches, add remaining text
    parts.push(remaining);
    break;
  }

  return parts;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className 
}) => {
  const parsedContent = parseMarkdown(content);

  return (
    <div className={cn(
      "prose prose-slate dark:prose-invert max-w-none",
      "prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100",
      "prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed",
      "prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold",
      "prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:text-slate-800 dark:prose-code:text-slate-200",
      "prose-pre:bg-slate-900 dark:prose-pre:bg-slate-800 prose-pre:text-slate-100",
      "prose-ul:text-slate-700 dark:prose-ul:text-slate-300",
      "prose-li:text-slate-700 dark:prose-li:text-slate-300",
      className
    )}>
      {parsedContent}
    </div>
  );
};

export default MarkdownRenderer;
