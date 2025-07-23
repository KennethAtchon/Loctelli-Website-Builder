"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ExternalLink, Upload, Code, Eye, Download, Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UploadZone } from "@/components/website-builder"
import { BuildProgress } from "@/components/website-builder"
import { api } from "@/lib/api"

interface PreviewPanelProps {
  code?: string
  previewUrl?: string
  websiteId?: string
  onFilesSelected?: (files: File[]) => void
  onUpload?: () => void
  isUploading?: boolean
  showBuildProgress?: boolean
  uploadedWebsite?: any
  onBuildComplete?: (previewUrl: string) => void
  onBuildError?: (error: string) => void
  onEditCode?: () => void
  websiteFiles?: Array<{
    name: string
    content: string
    type: string
  }>
  selectedFile?: {
    name: string
    content: string
    type: string
  } | null
}

export function PreviewPanel({ 
  code, 
  previewUrl, 
  websiteId, 
  onFilesSelected, 
  onUpload, 
  isUploading, 
  showBuildProgress, 
  uploadedWebsite, 
  onBuildComplete, 
  onBuildError,
  onEditCode,
  websiteFiles = [],
  selectedFile
}: PreviewPanelProps) {
  const [iframeKey, setIframeKey] = useState(0)

  const refreshPreview = () => {
    setIframeKey((prev: number) => prev + 1)
  }

  // Get the appropriate preview URL - use proxy for Vite/React projects
  const getPreviewUrl = () => {
    if (!websiteId) return previewUrl;
    
    // If the website has a portNumber, it's a Vite/React project - use proxy
    if (uploadedWebsite?.portNumber) {
      return api.websiteBuilder.getProxyPreviewUrl(websiteId);
    }
    
    // For static sites, use the original previewUrl
    return previewUrl;
  };

  const finalPreviewUrl = getPreviewUrl();

  const PreviewComponent = useMemo(() => {
    if (!code) return null
    
    // Only try to create a preview component if this looks like our demo code
    // and we don't have uploaded website files
    if (uploadedWebsite) return null
    
    // Additional check: only try to parse if it looks like a React component
    if (!code.includes('export default function') && !code.includes('return')) {
      return null
    }
    
    try {
      // Grab everything between the first `{` after `export default function`
      // and the matching closing brace at the end of the file.
      const match = code.match(/export\s+default\s+function\s+\w*\s*\([^)]*\)\s*{([\s\S]*?)}\s*$/)

      if (!match) return null

      const functionBody = match[1]

      // Build a component from the extracted body
      const ComponentFactory = new Function(
        "React",
        `
        "use strict";
        const { useState, useEffect, useMemo, useCallback } = React;
        return function GeneratedComponent() {
          ${functionBody}
        }
        `,
      )

      return ComponentFactory(React)
    } catch (err) {
      console.error("Error creating component:", err)
      return null
    }
  }, [code, uploadedWebsite])

  // If we have a preview URL, show the live website
  if (finalPreviewUrl) {
    return (
      <div className="h-full flex flex-col">
        {/* Preview Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Live Preview</h3>
          <div className="flex items-center gap-2">
            {selectedFile && (
              <span className="text-sm text-muted-foreground">
                Editing: {selectedFile.name}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPreview}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(finalPreviewUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-white">
          <iframe
            key={iframeKey}
            src={finalPreviewUrl}
            className="w-full h-full border-0"
            title="Website Preview"
          />
        </div>
      </div>
    )
  }

  // If we have code but no preview URL, try to render the component
  // Only show this for demo code, not for uploaded website files
  if (code && PreviewComponent && !uploadedWebsite) {
    return (
      <div className="h-full flex flex-col">
        {/* Preview Header */}
        <div className="p-4 border-b">
          <h3 className="font-semibold">Code Preview</h3>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-white">
          <div className="h-full w-full">
            <PreviewComponent />
          </div>
        </div>
      </div>
    )
  }

  // Show a message when we have uploaded website but no preview URL yet
  if (uploadedWebsite && !finalPreviewUrl) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Website Uploaded</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Your website is being processed. Preview will be available soon.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You can switch to the Code tab to edit files while waiting.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  // Show file content preview when we have website files but no live preview
  if (websiteFiles.length > 0 && selectedFile && !finalPreviewUrl) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">File Preview</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedFile.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditCode}
            >
              <Code className="h-4 w-4 mr-2" />
              Edit Code
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4">
          {selectedFile.type === 'html' || selectedFile.type === 'htm' ? (
            <div className="h-full border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <span className="text-sm font-medium">HTML Preview</span>
              </div>
              <iframe
                srcDoc={selectedFile.content}
                className="w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : selectedFile.type === 'css' ? (
            <div className="h-full border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <span className="text-sm font-medium">CSS Preview</span>
              </div>
              <div className="p-4 h-full overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          ) : selectedFile.type === 'js' || selectedFile.type === 'ts' || selectedFile.type === 'tsx' || selectedFile.type === 'jsx' ? (
            <div className="h-full border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <span className="text-sm font-medium">JavaScript/TypeScript Preview</span>
              </div>
              <div className="p-4 h-full overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <span className="text-sm font-medium">File Content</span>
              </div>
              <div className="p-4 h-full overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show upload interface when no website is loaded
  if (!uploadedWebsite && !finalPreviewUrl) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Upload Your Website</h3>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">
                React/Vite Project Hosting & AI Editing
              </h1>
              <p className="text-muted-foreground">
                Upload your React/Vite projects and get instant live preview with automatic builds. 
                Edit with AI and deploy with confidence.
              </p>
            </div>

            {/* Upload Section */}
            <Card className="mb-8">
              <CardHeader className="text-center">
                <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Upload Your Website</CardTitle>
                <CardDescription>
                  Drag and drop your website files or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadZone
                  onFilesSelected={onFilesSelected || (() => {})}
                  onUpload={onUpload || (() => {})}
                  isUploading={isUploading || false}
                />
              </CardContent>
            </Card>

            {/* Build Progress Section */}
            {showBuildProgress && uploadedWebsite && (
              <div className="mb-8">
                <BuildProgress
                  websiteId={uploadedWebsite.id}
                  onBuildComplete={onBuildComplete}
                  onBuildError={onBuildError}
                />
                
                {/* Success Actions */}
                {uploadedWebsite?.previewUrl && (
                  <Card className="mt-4">
                    <CardContent className="p-6">
                      <div className="flex space-x-4">
                        <Button
                          onClick={() => {
                            const url = uploadedWebsite.portNumber 
                              ? api.websiteBuilder.getProxyPreviewUrl(uploadedWebsite.id)
                              : uploadedWebsite.previewUrl;
                            window.open(url, '_blank');
                          }}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Live Preview
                        </Button>
                        <Button
                          onClick={onEditCode}
                          variant="outline"
                          className="flex-1"
                        >
                          <Code className="h-4 w-4 mr-2" />
                          Edit Code
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="text-center">
                  <Code className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-sm">React/Vite Support</CardTitle>
                  <CardDescription className="text-xs">
                    Automatic npm install, type checking, and live preview
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                  <CardDescription className="text-xs">
                    Real-time with hot reload. Interact with your application
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <Download className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-sm">AI-Powered Editing</CardTitle>
                  <CardDescription className="text-xs">
                    Use natural language to describe changes
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">Quick Start Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-xs">1</span>
                    </div>
                    <h3 className="font-semibold text-xs mb-1">Upload</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload your React/Vite project files
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-xs">2</span>
                    </div>
                    <h3 className="font-semibold text-xs mb-1">Build</h3>
                    <p className="text-xs text-muted-foreground">
                      Automatic npm install and build
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-xs">3</span>
                    </div>
                    <h3 className="font-semibold text-xs mb-1">Preview</h3>
                    <p className="text-xs text-muted-foreground">
                      Interact with your running app
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-xs">4</span>
                    </div>
                    <h3 className="font-semibold text-xs mb-1">Edit</h3>
                    <p className="text-xs text-muted-foreground">
                      Use AI to edit your website
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Fallback when no code or preview URL
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Preview</h3>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            {code ? "Unable to render preview. Check your code for errors." : "No preview available"}
          </p>
          {websiteId && (
            <p className="text-sm text-muted-foreground mt-2">
              Website ID: {websiteId}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
} 