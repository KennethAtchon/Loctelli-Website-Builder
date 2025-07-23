# AI Website Builder - Loctelli

A Next.js-based AI-powered website editor that allows users to upload, edit, and preview websites with natural language modifications.

## 🚨 **Current Status: Major Issues Identified**

This application has significant functionality gaps and requires immediate attention. See [WEBSITE_BUILDER_ISSUES.md](./WEBSITE_BUILDER_ISSUES.md) for a comprehensive list of issues.

### **Critical Issues**
- ❌ **Broken Routing**: Editor routes don't exist, navigation is inconsistent
- ❌ **No File Selection UI**: Users can't easily select which files to edit
- ❌ **Placeholder AI**: Chat functionality only shows placeholder responses
- ❌ **No Save Functionality**: Code editor save button doesn't persist changes
- ❌ **Authentication Issues**: Cross-port authentication problems

### **What Works**
- ✅ **File Upload**: Upload React/Vite projects and static websites
- ✅ **Build Process**: Automatic npm install and Vite server startup
- ✅ **Live Preview**: Preview websites in iframe
- ✅ **Basic UI**: Modern v0-style interface with resizable panels

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Backend API running (see main project)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) to access the website builder.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WEBSITE_BUILDER_URL=http://localhost:3001
```

## 🏗️ **Architecture**

### **Frontend Structure**
```
website-builder/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main editor interface
│   ├── preview/[id]/      # Website preview pages
│   └── api/proxy/         # API proxy for backend
├── components/            # React components
│   ├── chat-panel.tsx     # AI chat interface
│   ├── code-editor.tsx    # Code editing component
│   ├── preview-panel.tsx  # Website preview
│   └── ui/               # Shared UI components
└── lib/                  # Utilities and API client
    └── api/              # Backend API integration
```

### **Key Components**
- **Chat Panel**: AI-powered editing interface (currently placeholder)
- **Code Editor**: File editing with basic textarea (needs enhancement)
- **Preview Panel**: Live website preview and upload interface
- **Enhanced Header**: Panel controls and tab switching

## 🔧 **Development**

### **Available Scripts**
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run tests
```

### **Testing**
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## 🚨 **Known Issues**

### **High Priority**
1. **Routing Issues**: Fix broken editor routes and navigation
2. **File Management**: Add proper file selection and browser UI
3. **AI Integration**: Connect chat to real AI backend
4. **Save Functionality**: Implement file saving to backend
5. **Authentication**: Fix cross-port authentication issues

### **Medium Priority**
1. **Code Editor**: Add syntax highlighting and better editing features
2. **Live Preview**: Implement real-time preview updates
3. **File Search**: Add file search and filtering capabilities
4. **Error Handling**: Improve error messages and user feedback

## 📋 **Roadmap**

### **Phase 1: Core Fixes**
- [ ] Fix routing and navigation issues
- [ ] Add file selection component
- [ ] Implement file save functionality
- [ ] Connect to AI backend

### **Phase 2: Enhanced UI**
- [ ] Add syntax highlighting to code editor
- [ ] Implement file browser with tree view
- [ ] Add search and filtering capabilities
- [ ] Improve preview system

### **Phase 3: Advanced Features**
- [ ] Add change tracking and version control
- [ ] Implement collaboration features
- [ ] Add deployment options
- [ ] Performance optimizations

## 🔗 **Integration**

### **Backend API**
The website builder integrates with the main Loctelli CRM backend:
- **Authentication**: Shared JWT tokens via cookies
- **File Management**: Upload, edit, and save website files
- **Build System**: React/Vite project building and hosting
- **AI Integration**: Code editing via natural language

### **Main CRM**
- **Navigation**: "Website Builder" button in admin dashboard
- **User Context**: Admin user information shared between applications
- **Environment Detection**: Automatic API URL configuration

## 📚 **Documentation**

- [Issues Checklist](./WEBSITE_BUILDER_ISSUES.md) - Comprehensive list of current issues
- [AI Context](../AI_CONTEXT.md) - System architecture and integration details
- [Main Project README](../README.md) - Overall project documentation

## 🤝 **Contributing**

1. Review the [issues checklist](./WEBSITE_BUILDER_ISSUES.md)
2. Focus on high-priority issues first
3. Follow the existing code patterns and architecture
4. Test thoroughly before submitting changes

## 📄 **License**

This project is part of the Loctelli CRM system.
