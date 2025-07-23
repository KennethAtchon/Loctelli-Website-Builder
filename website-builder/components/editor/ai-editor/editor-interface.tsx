"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code, 
  Eye, 
  Download, 
  RotateCcw, 
  Send, 
  FileText,
  Sparkles,
  History,
  Settings
} from "lucide-react";
import { AiInput } from "./ai-input";
import { ChangeHistory } from "./change-history";
import { api } from "@/lib/api";
import type { AiEditRequest, ChangeHistory as ChangeHistoryType } from "@/types/editor";

interface EditorInterfaceProps {
  websiteName: string;
  files: Array<{
    name: string;
    content: string;
    type: string;
  }>;
  onSave: (changes: any) => void;
  onExport: () => void;
  previewUrl?: string;
}

export function EditorInterface({ 
  websiteName, 
  files, 
  onSave, 
  onExport,
  previewUrl 
}: EditorInterfaceProps) {
  const [selectedFile, setSelectedFile] = useState(files[0] || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewContent, setPreviewContent] = useState(selectedFile?.content || "");
  const [changes, setChanges] = useState<ChangeHistoryType[]>([]);
  const [activeTab, setActiveTab] = useState("ai");

  const handleAiEdit = async (prompt: string) => {
    if (!prompt.trim() || !selectedFile) return;
    
    setIsProcessing(true);
    try {
      const response = await api.websiteBuilder.aiEdit(websiteName, {
        fileName: selectedFile.name,
        prompt,
        currentContent: selectedFile.content,
        fileType: selectedFile.type
      });
      
      if (response.success) {
        setPreviewContent(response.modifiedContent);
        
        // Add to change history
        const newChange: ChangeHistoryType = {
          id: Date.now().toString(),
          websiteId: websiteName,
          fileName: selectedFile.name,
          description: response.changes.description,
          prompt,
          modifications: response.changes.modifications,
          status: 'applied',
          createdAt: new Date().toISOString(),
          confidence: response.changes.confidence || 0,
          processingTime: response.processingTime
        };
        
        setChanges(prev => [newChange, ...prev]);
      } else {
        console.error("AI edit failed:", response.error);
        alert("AI edit failed: " + response.error);
      }
    } catch (error) {
      console.error("AI edit failed:", error);
      alert("AI edit failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (file: typeof files[0]) => {
    setSelectedFile(file);
    setPreviewContent(file.content);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "html": return <FileText className="h-4 w-4" />;
      case "css": return <Code className="h-4 w-4" />;
      case "js": return <Code className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold">AI Website Editor</h1>
              <p className="text-sm text-muted-foreground">
                Editing: {websiteName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {previewUrl && (
              <Button variant="outline" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => onSave({})}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Browser & Tabs */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          {/* File Browser */}
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3">Files</h3>
            <div className="space-y-1">
              {files.map((file) => (
                <button
                  key={file.name}
                  onClick={() => handleFileSelect(file)}
                  className={`w-full text-left p-2 rounded flex items-center space-x-2 hover:bg-gray-200 transition-colors ${
                    selectedFile?.name === file.name ? 'bg-blue-100 text-blue-700' : ''
                  }`}
                >
                  {getFileIcon(file.type)}
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {file.type}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai" className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Editor</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center space-x-2">
                  <History className="h-4 w-4" />
                  <span>History</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ai" className="flex-1 p-4">
                <AiInput
                  onSubmit={handleAiEdit}
                  isProcessing={isProcessing}
                  disabled={!selectedFile}
                />
              </TabsContent>
              
              <TabsContent value="history" className="flex-1 p-0">
                <ChangeHistory
                  changes={changes}
                  onRevert={(changeId) => {
                    // TODO: Implement revert functionality
                    console.log("Reverting change:", changeId);
                  }}
                  onApply={(changeId) => {
                    // TODO: Implement apply functionality
                    console.log("Applying change:", changeId);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Panel - Code Editor & Preview */}
        <div className="flex-1 flex">
          {/* Code Editor */}
          <div className="w-1/2 border-r">
            <Card className="h-full rounded-none border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Code className="mr-2 h-4 w-4" />
                  {selectedFile?.name || 'No file selected'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Textarea
                  value={selectedFile?.content || ''}
                  onChange={(e) => {
                    if (selectedFile) {
                      setPreviewContent(e.target.value);
                    }
                  }}
                  className="h-full resize-none border-0 rounded-none font-mono text-sm"
                  placeholder="Select a file to edit..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="w-1/2">
            <Card className="h-full rounded-none border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  srcDoc={previewContent}
                  className="w-full h-full border-0"
                  title="Website Preview"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 