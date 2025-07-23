"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Code, 
  FileImage, 
  File, 
  Folder, 
  FolderOpen,
  Search,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface WebsiteFile {
  name: string
  content: string
  type: string
  size?: number
}

interface FileBrowserProps {
  files: WebsiteFile[]
  selectedFile: WebsiteFile | null
  onFileSelect: (file: WebsiteFile) => void
  className?: string
}

export function FileBrowser({ 
  files, 
  selectedFile, 
  onFileSelect, 
  className 
}: FileBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "html":
      case "htm":
        return <FileText className="h-4 w-4 text-orange-500" />
      case "css":
        return <Code className="h-4 w-4 text-blue-500" />
      case "js":
      case "javascript":
        return <Code className="h-4 w-4 text-yellow-500" />
      case "ts":
      case "typescript":
        return <Code className="h-4 w-4 text-blue-600" />
      case "tsx":
      case "jsx":
        return <Code className="h-4 w-4 text-cyan-500" />
      case "json":
        return <FileText className="h-4 w-4 text-green-500" />
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
        return <FileImage className="h-4 w-4 text-purple-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    return extension || 'unknown'
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = fileTypeFilter === "all" || getFileType(file.name) === fileTypeFilter
    return matchesSearch && matchesType
  })

  const fileTypes = Array.from(new Set(files.map(file => getFileType(file.name)))).sort()

  const getFileSize = (content: string) => {
    const bytes = new Blob([content]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={cn("flex flex-col h-full border rounded-lg", className)}>
      {/* Header */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Files</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredFiles.length} of {files.length}
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 flex-1"
          >
            <option value="all">All Types</option>
            {fileTypes.map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* File List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchTerm || fileTypeFilter !== "all" ? "No files match your search" : "No files available"}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const fileType = getFileType(file.name)
              const isSelected = selectedFile?.name === file.name
              
              return (
                <Button
                  key={file.name}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start h-auto p-2 text-left",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => onFileSelect(file)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {getFileIcon(fileType)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{fileType.toUpperCase()}</span>
                        <span>•</span>
                        <span>{getFileSize(file.content)}</span>
                      </div>
                    </div>
                  </div>
                </Button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t bg-muted/20">
        <div className="text-xs text-muted-foreground">
          {selectedFile ? (
            <div className="flex items-center gap-2">
              <span>Selected:</span>
              <span className="font-medium truncate">{selectedFile.name}</span>
            </div>
          ) : (
            "No file selected"
          )}
        </div>
      </div>
    </div>
  )
} 