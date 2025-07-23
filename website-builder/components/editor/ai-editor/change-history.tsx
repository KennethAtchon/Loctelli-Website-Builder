"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  RotateCcw, 
  Check, 
  X, 
  Clock,
  FileText,
  Sparkles,
  Code,
  Eye,
  AlertCircle,
  Zap
} from "lucide-react";
import type { ChangeHistory as ChangeHistoryType } from "@/types/editor";

interface ChangeHistoryProps {
  changes: ChangeHistoryType[];
  onRevert: (changeId: string) => void;
  onApply: (changeId: string) => void;
}

export function ChangeHistory({ changes, onRevert, onApply }: ChangeHistoryProps) {
  const [selectedChange, setSelectedChange] = useState<ChangeHistoryType | null>(null);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-green-100 text-green-700 border-green-200';
      case 'reverted': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <Check className="h-3 w-3" />;
      case 'reverted': return <X className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatProcessingTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  const renderDiff = (modifications: any) => {
    if (!modifications || typeof modifications !== 'object') {
      return <div className="text-sm text-muted-foreground">No detailed changes available</div>;
    }

    return (
      <div className="space-y-2">
        {modifications.changes?.map((change: any, index: number) => (
          <div key={index} className="border rounded p-2">
            <div className="flex items-center space-x-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {change.action}
              </Badge>
              <span className="text-xs font-medium">{change.file}</span>
            </div>
            {change.originalContent && (
              <div className="mb-2">
                <div className="text-xs font-medium text-red-600 mb-1">Removed:</div>
                <pre className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-300 overflow-x-auto">
                  {change.originalContent}
                </pre>
              </div>
            )}
            {change.newContent && (
              <div>
                <div className="text-xs font-medium text-green-600 mb-1">Added:</div>
                <pre className="text-xs bg-green-50 p-2 rounded border-l-2 border-green-300 overflow-x-auto">
                  {change.newContent}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center">
            <History className="mr-2 h-4 w-4" />
            Change History
          </div>
          <Badge variant="secondary" className="text-xs">
            {changes.length} changes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {changes.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No changes yet</p>
            <p className="text-xs">AI modifications will appear here</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Change List */}
            <div className="w-1/2 border-r">
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-2">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      onClick={() => setSelectedChange(change)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedChange?.id === change.id 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-3 w-3 text-gray-500" />
                          <span className="text-xs font-medium">{change.fileName}</span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(change.status)}`}
                        >
                          {getStatusIcon(change.status)}
                          <span className="ml-1">{change.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mb-1 line-clamp-2">{change.description}</p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        "{change.prompt}"
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(change.createdAt)}
                          </span>
                          {change.confidence && (
                            <div className={`text-xs ${getConfidenceColor(change.confidence)}`}>
                              <Zap className="h-3 w-3 inline mr-1" />
                              {(change.confidence * 100).toFixed(0)}%
                            </div>
                          )}
                          {change.processingTime && (
                            <div className="text-xs text-muted-foreground">
                              {formatProcessingTime(change.processingTime)}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          {change.status === 'applied' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevert(change.id);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revert
                            </Button>
                          )}
                          {change.status === 'reverted' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onApply(change.id);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Change Details */}
            <div className="w-1/2 p-4">
              {selectedChange ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Change Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">File:</span> 
                        <Badge variant="outline" className="text-xs">{selectedChange.fileName}</Badge>
                      </div>
                      <div>
                        <span className="font-medium">Description:</span> 
                        <p className="text-muted-foreground mt-1">{selectedChange.description}</p>
                      </div>
                      <div>
                        <span className="font-medium">Prompt:</span> 
                        <p className="text-muted-foreground mt-1 italic">"{selectedChange.prompt}"</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="font-medium">Time:</span> 
                          <span className="text-muted-foreground ml-1">
                            {formatTimestamp(selectedChange.createdAt)}
                          </span>
                        </div>
                        {selectedChange.confidence && (
                          <div>
                            <span className="font-medium">Confidence:</span>
                            <span className={`ml-1 ${getConfidenceColor(selectedChange.confidence)}`}>
                              {(selectedChange.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        {selectedChange.processingTime && (
                          <div>
                            <span className="font-medium">Duration:</span>
                            <span className="text-muted-foreground ml-1">
                              {formatProcessingTime(selectedChange.processingTime)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 ${getStatusColor(selectedChange.status)}`}
                        >
                          {getStatusIcon(selectedChange.status)}
                          <span className="ml-1">{selectedChange.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Modifications</h4>
                    <Tabs defaultValue="diff" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="diff" className="text-xs">Diff View</TabsTrigger>
                        <TabsTrigger value="raw" className="text-xs">Raw Data</TabsTrigger>
                      </TabsList>
                      <TabsContent value="diff" className="mt-2">
                        {renderDiff(selectedChange.modifications)}
                      </TabsContent>
                      <TabsContent value="raw" className="mt-2">
                        <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                          <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                            {JSON.stringify(selectedChange.modifications, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a change to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 