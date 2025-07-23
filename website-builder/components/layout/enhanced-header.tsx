"use client"

import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeftOpen, Sparkles, Upload } from "lucide-react"

interface EnhancedHeaderProps {
  chatVisible: boolean
  setChatVisible: (visible: boolean) => void
  activeTab: "preview" | "code"
  setActiveTab: (tab: "preview" | "code") => void
  onUploadClick?: () => void
  hasUploadedWebsite?: boolean
}

export function EnhancedHeader({ 
  chatVisible, 
  setChatVisible, 
  activeTab, 
  setActiveTab,
  onUploadClick,
  hasUploadedWebsite
}: EnhancedHeaderProps) {
  return (
    <header className="border-b px-4 py-3 flex items-center justify-between bg-background">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setChatVisible(!chatVisible)}>
          {chatVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h1 className="font-semibold text-lg">AI Website Builder</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {!hasUploadedWebsite && onUploadClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Website
          </Button>
        )}
        <Button
          variant={activeTab === "preview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("preview")}
        >
          Preview
        </Button>
        <Button 
          variant={activeTab === "code" ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setActiveTab("code")}
        >
          Code
        </Button>
      </div>
    </header>
  )
} 