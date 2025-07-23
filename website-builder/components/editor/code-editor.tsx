"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Save, FileText, Code, Loader2, AlertCircle } from "lucide-react"
import { FileBrowser, type WebsiteFile } from "./file-browser"

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
  filePath?: string
  websiteId?: string
  files?: WebsiteFile[]
  onFileSelect?: (file: WebsiteFile) => void
  selectedFile?: WebsiteFile | null
}

export function CodeEditor({ 
  code, 
  onChange, 
  filePath, 
  websiteId, 
  files = [], 
  onFileSelect, 
  selectedFile 
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const getFileIcon = (type: string) => {
    switch (type) {
      case "html": return <FileText className="h-4 w-4" />
      case "css": return <Code className="h-4 w-4" />
      case "js": return <Code className="h-4 w-4" />
      case "tsx": return <Code className="h-4 w-4" />
      case "ts": return <Code className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!websiteId) {
      console.error("No website ID available for saving")
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      if (selectedFile) {
        // Save the selected file
        const response = await fetch(`/api/proxy/website-builder/${websiteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [{
              fileName: selectedFile.name,
              content: selectedFile.content
            }]
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to save file: ${response.statusText}`)
        }

        console.log("File saved successfully:", selectedFile.name)
        setSaveStatus('saved')
        
        // Reset saved status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        // Save the demo code (this would be for the main App.tsx or similar)
        console.log("Saving demo code:", { filePath, websiteId, code })
        // TODO: Implement demo code saving if needed
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      console.error("Error saving file:", error)
      setSaveStatus('error')
      // Reset error status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex">
              {/* File Browser Sidebar */}
        {files && files.length > 0 && (
          <div className="w-64 border-r">
            <FileBrowser
              files={files}
              selectedFile={selectedFile || null}
              onFileSelect={onFileSelect || (() => {})}
            />
          </div>
        )}

      {/* Code Editor Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Code Editor Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">Code Editor</h3>
            {selectedFile ? (
              <div className="flex items-center gap-2">
                {getFileIcon(selectedFile.type)}
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedFile.type}
                </Badge>
              </div>
            ) : (
              filePath && (
                <span className="text-sm text-muted-foreground">{filePath}</span>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : saveStatus === 'error' ? (
                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'saved' ? 'Saved!' : 
               saveStatus === 'error' ? 'Error' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 p-4">
          <textarea
            value={selectedFile ? selectedFile.content : code}
            onChange={(e) => {
              if (selectedFile) {
                // Update the selected file content
                const updatedFile = { ...selectedFile, content: e.target.value }
                onFileSelect?.(updatedFile)
              } else {
                // Update the demo code
                onChange(e.target.value)
              }
            }}
            className="w-full h-full font-mono text-sm bg-muted/30 border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Your code will appear here..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
} 