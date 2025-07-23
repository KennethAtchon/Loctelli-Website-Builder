"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  RotateCcw, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Terminal
} from "lucide-react";
import { api } from "@/lib/api";
import logger from "@/lib/logger";

interface BuildStatus {
  websiteId: string;
  buildStatus: 'pending' | 'building' | 'running' | 'failed' | 'stopped';
  previewUrl?: string;
  portNumber?: number;
  lastBuildAt?: string;
  buildDuration?: number;
  buildOutput?: string[];
  processInfo?: {
    status: string;
    startTime?: string;
    endTime?: string;
    buildOutput: string[];
  };
}

interface BuildProgressProps {
  websiteId: string;
  onBuildComplete?: (previewUrl: string) => void;
  onBuildError?: (error: string) => void;
}

export function BuildProgress({ websiteId, onBuildComplete, onBuildError }: BuildProgressProps) {
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollBuildStatus = async () => {
    try {
      const status = await api.websiteBuilder.getBuildStatus(websiteId);
      setBuildStatus(status);
      
      // Handle build completion
      if (status.buildStatus === 'running' && status.previewUrl) {
        setIsPolling(false);
        onBuildComplete?.(status.previewUrl);
      }
      
      // Handle build failure
      if (status.buildStatus === 'failed') {
        setIsPolling(false);
        const errorMessage = status.buildOutput?.[0] || 'Build failed';
        setError(errorMessage);
        onBuildError?.(errorMessage);
      }
      
      // Continue polling if still building
      if (status.buildStatus === 'building' || status.buildStatus === 'pending') {
        setTimeout(pollBuildStatus, 2000); // Poll every 2 seconds
      }
    } catch (err) {
      logger.error('Failed to poll build status:', err);
      setError('Failed to check build status');
      setIsPolling(false);
    }
  };

  const startPolling = () => {
    setIsPolling(true);
    pollBuildStatus();
  };

  const stopWebsite = async () => {
    try {
      await api.websiteBuilder.stopWebsite(websiteId);
      setBuildStatus(prev => prev ? { ...prev, buildStatus: 'stopped' } : null);
    } catch (err) {
      logger.error('Failed to stop website:', err);
      setError('Failed to stop website');
    }
  };

  const restartWebsite = async () => {
    try {
      setError(null);
      setIsPolling(true);
      await api.websiteBuilder.restartWebsite(websiteId);
      pollBuildStatus();
    } catch (err) {
      logger.error('Failed to restart website:', err);
      setError('Failed to restart website');
      setIsPolling(false);
    }
  };

  useEffect(() => {
    if (websiteId) {
      startPolling();
    }
    
    return () => {
      setIsPolling(false);
    };
  }, [websiteId]);

  if (!buildStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span>Loading build status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (buildStatus.buildStatus) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'building':
        return <Terminal className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'running':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'stopped':
        return <Square className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (buildStatus.buildStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'building':
        return 'bg-blue-100 text-blue-800';
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressValue = () => {
    switch (buildStatus.buildStatus) {
      case 'pending':
        return 10;
      case 'building':
        return 60;
      case 'running':
        return 100;
      case 'failed':
        return 100;
      case 'stopped':
        return 0;
      default:
        return 0;
    }
  };

  // Get the appropriate preview URL - use proxy for Vite/React projects
  const getPreviewUrl = () => {
    if (!buildStatus?.previewUrl) return null;
    
    // If the website has a portNumber, it's a Vite/React project - use proxy
    if (buildStatus.portNumber) {
      return api.websiteBuilder.getProxyPreviewUrl(websiteId);
    }
    
    // For static sites, use the original previewUrl
    return buildStatus.previewUrl;
  };

  const finalPreviewUrl = getPreviewUrl();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Build Status</CardTitle>
          </div>
          <Badge className={getStatusColor()}>
            {buildStatus.buildStatus.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          {buildStatus.buildStatus === 'building' && 'Installing dependencies and starting development server...'}
          {buildStatus.buildStatus === 'running' && 'Website is running and ready for preview'}
          {buildStatus.buildStatus === 'failed' && 'Build failed. Check the logs below for details'}
          {buildStatus.buildStatus === 'stopped' && 'Website has been stopped'}
          {buildStatus.buildStatus === 'pending' && 'Waiting to start build process...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Build Progress</span>
            <span>{getProgressValue()}%</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>

        {/* Build Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Port:</span>
            <span className="ml-2">{buildStatus.portNumber || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium">Duration:</span>
            <span className="ml-2">
              {buildStatus.buildDuration ? `${buildStatus.buildDuration}s` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Build Output */}
        {buildStatus.buildOutput && buildStatus.buildOutput.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Build Logs</h4>
            <div className="bg-gray-900 text-green-400 p-3 rounded-md text-xs font-mono max-h-32 overflow-y-auto">
              {buildStatus.buildOutput.slice(-10).map((line, index) => (
                <div key={index} className="whitespace-pre-wrap">{line}</div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {buildStatus.buildStatus === 'running' && finalPreviewUrl && (
            <Button
              onClick={() => window.open(finalPreviewUrl, '_blank')}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Preview
            </Button>
          )}
          
          {(buildStatus.buildStatus === 'running' || buildStatus.buildStatus === 'building') && (
            <Button
              onClick={stopWebsite}
              variant="outline"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
          
          {(buildStatus.buildStatus === 'failed' || buildStatus.buildStatus === 'stopped') && (
            <Button
              onClick={restartWebsite}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          )}
        </div>

        {/* Polling Status */}
        {isPolling && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Monitoring build status...
          </div>
        )}
      </CardContent>
    </Card>
  );
} 