export interface AiEditRequest {
  websiteName: string;
  fileName: string;
  prompt: string;
  currentContent: string;
  fileType?: string;
}

export interface AiEditResponse {
  success: boolean;
  modifiedContent: string;
  changes: {
    description: string;
    modifications: CodeModification[];
    confidence: number;
  };
  error?: string;
  processingTime?: number;
}

export interface CodeModification {
  type: 'insert' | 'replace' | 'delete' | 'style' | 'attribute';
  target: string; // CSS selector, line number, or element identifier
  oldValue?: string;
  newValue: string;
  description: string;
  lineStart?: number;
  lineEnd?: number;
  columnStart?: number;
  columnEnd?: number;
}

export interface ChangeHistory {
  id: string;
  websiteId: string;
  fileName: string;
  description: string;
  prompt: string;
  modifications: CodeModification[];
  status: 'applied' | 'reverted' | 'pending' | 'failed';
  createdAt: string;
  appliedAt?: string;
  revertedAt?: string;
  confidence: number;
  processingTime?: number;
}

export interface EditorState {
  selectedFile: string | null;
  files: EditorFile[];
  changes: ChangeHistory[];
  isProcessing: boolean;
  lastError?: string;
  previewContent: string;
}

export interface EditorFile {
  name: string;
  content: string;
  type: string;
  originalContent: string;
  hasChanges: boolean;
  lastModified: Date;
}

export interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  showLineNumbers: boolean;
  showMinimap: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
}

export interface AiPromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'styling' | 'content' | 'layout' | 'functionality' | 'general';
  examples: string[];
  tags: string[];
}

export const DEFAULT_AI_PROMPTS: AiPromptTemplate[] = [
  {
    id: '1',
    name: 'Change Header Color',
    description: 'Change the background color of the header',
    prompt: 'Make the header background color {color}',
    category: 'styling',
    examples: ['Make the header background color blue', 'Change header to red'],
    tags: ['header', 'color', 'background']
  },
  {
    id: '2',
    name: 'Update Title',
    description: 'Change the main title of the website',
    prompt: 'Change the title to "{newTitle}"',
    category: 'content',
    examples: ['Change the title to "Welcome"', 'Update title to "My Website"'],
    tags: ['title', 'text', 'content']
  },
  {
    id: '3',
    name: 'Add Button Styling',
    description: 'Style buttons with custom colors and effects',
    prompt: 'Make all buttons {style} with {color} background',
    category: 'styling',
    examples: ['Make all buttons rounded with blue background', 'Style buttons with red background'],
    tags: ['button', 'styling', 'color']
  },
  {
    id: '4',
    name: 'Increase Font Size',
    description: 'Make text larger',
    prompt: 'Increase the font size of {element} to {size}',
    category: 'styling',
    examples: ['Increase the font size of headings to 24px', 'Make paragraph text larger'],
    tags: ['font', 'size', 'typography']
  },
  {
    id: '5',
    name: 'Add Padding',
    description: 'Add spacing around elements',
    prompt: 'Add {amount} padding to {element}',
    category: 'layout',
    examples: ['Add 20px padding to main content', 'Add padding to the header'],
    tags: ['padding', 'spacing', 'layout']
  }
];

export interface EditorError {
  type: 'validation' | 'ai' | 'network' | 'file' | 'unknown';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface EditorStats {
  totalChanges: number;
  appliedChanges: number;
  revertedChanges: number;
  averageProcessingTime: number;
  mostEditedFile: string;
  lastEditTime: Date;
  totalEditTime: number; // in minutes
} 