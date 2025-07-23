"use client"

import { useState } from "react"
import { ChatPanel } from "@/components/panels"
import { CodeEditor } from "@/components/editor"
import { PreviewPanel } from "@/components/panels"
import { EnhancedHeader } from "@/components/layout"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import logger from "@/lib/logger"
import type { WebsiteFile } from "@/components/editor"

// This will be replaced by the dynamic route [id]/page.tsx
export default function EditorPage({ websiteId }: { websiteId?: string }) {
  const [code, setCode] = useState<string>("")
  const [chatVisible, setChatVisible] = useState(true)
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview")
  const [websiteFiles, setWebsiteFiles] = useState<WebsiteFile[]>([])
  const [selectedFile, setSelectedFile] = useState<WebsiteFile | null>(null)
  const [showBuildProgress, setShowBuildProgress] = useState(false)

  // TODO: Load website data by websiteId

  return (
    <div className="h-screen flex flex-col bg-background">
      <EnhancedHeader
        chatVisible={chatVisible}
        setChatVisible={setChatVisible}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUploadClick={() => setActiveTab("preview")}
        hasUploadedWebsite={!!websiteId}
      />
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {chatVisible && (
            <>
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <ChatPanel 
                  onCodeUpdate={setCode} 
                  websiteId={websiteId}
                  currentFile={selectedFile?.name || "App.tsx"}
                />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          <ResizablePanel defaultSize={chatVisible ? 70 : 100}>
            {activeTab === "preview" ? (
              <PreviewPanel 
                code={code} 
                previewUrl={undefined} // TODO: pass previewUrl from loaded website
                websiteId={websiteId}
                websiteFiles={websiteFiles}
                selectedFile={selectedFile}
                showBuildProgress={showBuildProgress}
                onBuildComplete={() => {}}
                onBuildError={() => {}}
                onEditCode={() => setActiveTab("code")}
                // No upload, no file selection from upload
              />
            ) : (
              <CodeEditor 
                code={code} 
                onChange={setCode}
                filePath={selectedFile?.name || "App.tsx"}
                websiteId={websiteId}
                files={websiteFiles}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
} 