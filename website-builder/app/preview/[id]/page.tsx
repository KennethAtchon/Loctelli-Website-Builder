"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Website, WebsiteFile } from "@/lib/api/website-builder";

export default function PreviewPage() {
  const params = useParams();
  const websiteId = params.id as string;
  
  const [website, setWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadWebsite = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load website from API
        const websiteData = await api.websiteBuilder.getWebsite(websiteId);
        setWebsite(websiteData);
        
        console.log("📊 Website data received:", {
          id: websiteData.id,
          name: websiteData.name,
          type: websiteData.type,
          buildStatus: websiteData.buildStatus,
          previewUrl: websiteData.previewUrl,
          portNumber: websiteData.portNumber,
          fileCount: websiteData.files?.length || 0,
          files: websiteData.files?.map(f => ({ name: f.name, type: f.type, size: f.content?.length || 0 }))
        });
        
        // Handle different website types
        if (websiteData.previewUrl && (websiteData.type === 'vite' || websiteData.type === 'react' || websiteData.type === 'nextjs')) {
          // For React/Vite projects, use the proxy URL if portNumber is available
          if (websiteData.portNumber) {
            const proxyUrl = api.websiteBuilder.getProxyPreviewUrl(websiteId);
            console.log(`🌐 Using proxy preview URL: ${proxyUrl}`);
            console.log(`📊 Website type: ${websiteData.type}, build status: ${websiteData.buildStatus}, port: ${websiteData.portNumber}`);
            setPreviewUrl(proxyUrl);
          } else {
            // Fallback to direct URL if no port number (legacy)
            console.log(`🌐 Using direct preview URL: ${websiteData.previewUrl}`);
            setPreviewUrl(websiteData.previewUrl);
          }
        } else if (websiteData.files && websiteData.files.length > 0) {
          // For static sites, find any HTML file (not just index.html)
          const htmlFile = websiteData.files.find(f => 
            f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')
          );
          
          if (htmlFile) {
            // Create a blob URL for the HTML content with proper base URL
            const htmlContent = htmlFile.content;
            
            console.log(`📄 HTML file details:`, {
              name: htmlFile.name,
              type: htmlFile.type,
              contentLength: htmlContent.length,
              contentPreview: htmlContent.substring(0, 200) + '...',
              contentEnd: htmlContent.substring(htmlContent.length - 100) + '...',
              hasDoctype: htmlContent.includes('<!DOCTYPE'),
              hasHtmlTag: htmlContent.includes('<html'),
              hasHeadTag: htmlContent.includes('<head'),
              hasBodyTag: htmlContent.includes('<body')
            });
            
            // Create a blob with the HTML content
            const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            
            console.log(`📄 HTML file found: ${htmlFile.name}`);
            console.log(`📄 HTML content length: ${htmlContent.length} characters`);
            console.log(`🌐 Preview URL created: ${url}`);
          } else {
            console.log("❌ No HTML file found in files:", websiteData.files.map(f => f.name));
            setError("No HTML file found in this website.");
          }
        } else {
          console.log("❌ No files found in website data");
          setError("No files found for this website.");
        }
      } catch (err) {
        console.error("Failed to load website:", err);
        setError("Failed to load website. Please check if the website exists and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (websiteId) {
      loadWebsite();
    }
  }, [websiteId]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading website preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error Loading Website
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex space-x-2">
              <Button asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!website || !previewUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Preview Available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              No HTML file found for this website. Please edit the website to add an entry point.
            </p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Editor
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Editor
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{website.name}</h1>
                <p className="text-sm text-muted-foreground">Website Preview</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button asChild variant="outline">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Preview Frame */}
      <main className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="ml-2 text-sm text-gray-600">Website Preview</span>
            </div>
          </div>
          <iframe
            src={previewUrl}
            className="w-full h-[calc(100vh-200px)] border-0"
            title={`Preview of ${website.name}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => console.log(`✅ Iframe loaded successfully for ${website.name} at ${previewUrl}`)}
            onError={(e) => console.error(`❌ Iframe failed to load:`, e)}
            onLoadStart={() => console.log(`🔄 Iframe loading started for ${website.name} at ${previewUrl}`)}
          />
        </div>
      </main>
    </div>
  );
} 