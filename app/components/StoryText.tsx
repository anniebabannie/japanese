import React from 'react';

interface StoryTextProps {
  text: string;
  onWordSelected?: (word: string) => void;
  highlightedWord?: string | null;
}

export default function StoryText({ text, onWordSelected, highlightedWord }: StoryTextProps) {
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString().trim();
    
    // Check if the selected text contains Japanese characters
    const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(selectedText);
    
    if (selectedText && hasJapaneseChars && onWordSelected) {
      onWordSelected(selectedText);
    }
  };

  // Function to highlight text with HTML spans
  const highlightText = (text: string, wordToHighlight: string | null) => {
    if (!wordToHighlight) {
      return text;
    }

    // Escape special regex characters
    const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedWord})`, 'gi');
    
    return text.replace(regex, '<span class="bg-yellow-200 px-1 py-0.5 rounded">$1</span>');
  };

  const highlightedText = highlightText(text, highlightedWord || null);

  return (
    <div 
      className="prose prose-lg max-w-none font-japanese leading-relaxed select-text"
      onMouseUp={handleTextSelection}
      dangerouslySetInnerHTML={{ __html: highlightedText }}
    />
  );
} 