"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Lightbulb } from "lucide-react";

interface AiInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isProcessing?: boolean;
  disabled?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Make the header blue",
  "Change the title to 'Welcome'",
  "Add a red border to all buttons",
  "Increase the font size of headings",
  "Make the background light gray",
  "Add padding to the main content",
  "Change the button text to 'Submit'",
  "Make the navigation sticky"
];

export function AiInput({ onSubmit, isProcessing = false, disabled = false }: AiInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing || disabled) return;
    
    await onSubmit(prompt);
    setPrompt("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
          AI Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Area */}
        <div className="space-y-2">
          <Textarea
            placeholder="Describe the changes you want to make... (e.g., 'Make the header blue', 'Change the title to Welcome')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[100px] resize-none"
            disabled={isProcessing || disabled}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Press Cmd/Ctrl + Enter to submit</span>
            <span>{prompt.length}/500</span>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={!prompt.trim() || isProcessing || disabled}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Apply Changes
            </>
          )}
        </Button>

        {/* Suggested Prompts */}
        <div className="space-y-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <Lightbulb className="mr-1 h-3 w-3" />
            Suggested prompts:
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 