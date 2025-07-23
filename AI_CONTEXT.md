# Loctelli CRM System - AI Context

## 🏗️ **System Architecture**

### **Frontend (Next.js 14)**
- **Framework**: Next.js 14 with App Router
- **UI Library**: Shadcn/ui components with Tailwind CSS
- **State Management**: React Context for auth state
- **API Client**: Custom API client with automatic token refresh
- **Authentication**: JWT tokens stored in HTTP-only cookies

### **Backend (NestJS)**
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for session management
- **Authentication**: JWT with refresh token rotation
- **Security**: Multi-layer protection (API key + JWT + Role-based access)
- **Module Organization**: Well-structured modules with clear separation of concerns

### **Website Builder System - COMPLETE**

#### **Overview**
The Website Builder is a comprehensive system for uploading, editing, and previewing React/Vite projects with AI-powered code modifications.

#### **Core Features**

#### **1. File Upload & Processing**
- **ZIP Support**: Upload complete React/Vite projects as ZIP files
- **Individual Files**: Upload individual files for static websites
- **File Validation**: Security checks and sanitization
- **Storage**: R2 cloud storage for file persistence
- **Content Parsing**: Extract and organize file contents

#### **2. AI-Powered Editing**
- **Natural Language Interface**: Users describe changes in plain English
- **OpenAI Integration**: GPT-4 powered code modifications
- **Context Awareness**: AI understands project structure and file relationships
- **Smart Suggestions**: AI provides modification recommendations

#### **3. Real-Time Preview**
- **Live Preview**: Instant visualization of changes in editor
- **Interactive Preview**: Full website preview with `/preview/[id]` route
- **Code Highlighting**: Syntax highlighting for modified files
- **Responsive Testing**: Mobile and desktop preview modes
- **Error Detection**: Real-time validation and error reporting
- **Vite Dev Server**: Live development server with hot reload for React/Vite projects
- **Static File Serving**: Proper HTML preview for static websites

#### **4. Change Management**
- **Version History**: Complete audit trail of all modifications
- **Revert Functionality**: Undo any change with one click
- **Diff Viewing**: Visual comparison of before/after changes
- **Confidence Scoring**: AI confidence levels for each modification

#### **5. Export System**
- **ZIP Generation**: Download complete modified website
- **File Preservation**: Maintain original file structure
- **Metadata Inclusion**: Export change history and documentation

### **Technical Architecture**

#### **Frontend (Next.js)**
```
website-builder/
├── app/
│   ├── editor/[name]/     # Dynamic editor pages
│   ├── preview/[id]/      # Interactive website preview
│   └── api/proxy/         # API proxy for backend communication
├── components/
│   ├── ai-editor/         # AI editing interface
│   ├── upload-zone/       # File upload component
│   └── ui/               # Shared UI components
└── lib/
    └── api/              # API client and endpoints
```

#### **Backend (NestJS)**
```
project/src/website-builder/
├── modules/website-builder/
│   ├── website-builder.controller.ts  # Includes upload endpoint
│   ├── website-builder.service.ts     # Includes zip processing
│   ├── services/
│   │   ├── build-worker.service.ts    # Build process management
│   │   ├── build-queue.service.ts     # Job queue management
│   │   └── notification.service.ts    # User notifications
│   └── dto/              # Data transfer objects
└── website-builder.module.ts
```

#### **Database Schema**
```sql
-- Website storage
model Website {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String   // 'static', 'vite', 'react', 'nextjs'
  structure   Json     // Parsed project structure
  files       Json     // File contents and metadata
  status      String   @default("active")
  buildStatus String?  @default("pending") // 'pending', 'building', 'running', 'failed', 'stopped'
  previewUrl  String?  // Live preview URL
  processId   String?  // Process ID for cleanup
  buildOutput Json?    // Build logs and output
  portNumber  Int?     // Allocated port number
  lastBuildAt DateTime?
  buildDuration Int?   // Build duration in seconds
  createdByAdminId Int
  createdByAdmin AdminUser @relation(fields: [createdByAdminId], references: [id])
  changeHistory WebsiteChange[]
}

-- Change tracking
model WebsiteChange {
  id          String   @id @default(cuid())
  websiteId   String
  website     Website  @relation(fields: [websiteId], references: [id])
  type        String   // 'ai_edit', 'manual_edit', 'revert'
  description String
  prompt      String?  // Original AI prompt
  changes     Json     // Detailed change information
  createdByAdminId Int
  createdByAdmin AdminUser @relation(fields: [createdByAdminId], references: [id])
}
```

## 🔄 **Integration Points**

### **CRM → Website Builder**
- **Navigation**: "Website Builder" button in admin dashboard
- **Authentication**: Shared JWT tokens via cookies
- **Environment Detection**: Automatic API URL configuration
- **User Context**: Admin user information passed to builder

### **Website Builder → Backend**
- **REST API**: Standard HTTP endpoints for CRUD operations
- **File Upload**: Multipart form data handling with zip support
- **AI Processing**: OpenAI API integration for code modifications
- **Real-time Updates**: WebSocket-like polling for live preview

### **Data Flow**
1. **Upload**: Files/Zip → Backend → Database storage
2. **AI Edit**: User prompt → OpenAI → Code modifications → Database update
3. **Preview**: Website files → Live dev server (Vite) or blob URL (static) → Interactive iframe preview
4. **Export**: Database files → ZIP generation → Download

### **API Endpoints**
```
POST   /api/proxy/website-builder/upload     # Upload files/zip
POST   /api/proxy/website-builder            # Create website
GET    /api/proxy/website-builder            # List websites
GET    /api/proxy/website-builder/:id        # Get website
PATCH  /api/proxy/website-builder/:id        # Update website
DELETE /api/proxy/website-builder/:id        # Delete website
POST   /api/proxy/website-builder/:id/ai-edit    # AI edit
GET    /api/proxy/website-builder/:id/changes    # Change history
POST   /api/proxy/website-builder/:id/changes/:changeId/revert  # Revert change
```

### **Routes**
```
/website-builder/                      # Upload page
/website-builder/editor/[name]         # Editor interface
/website-builder/preview/[id]          # Interactive preview
```

### **Integration with CRM**
- **Navigation**: "Website Builder" button in admin dashboard
- **Authentication**: Shared JWT tokens via cookies
- **Environment Detection**: Automatic API URL configuration
- **User Context**: Admin user information passed to builder

### **Implementation Status**
- **Frontend**: Complete with upload, editor, preview, and export functionality
- **Backend**: Complete with AI integration, change tracking, and zip processing
- **Database**: Migrated and ready for use
- **Integration**: CRM integration button implemented
- **Zip Support**: Basic zip file upload implemented (individual file extraction pending)
- **Preview System**: Interactive preview with iframe rendering
- **Build System**: Complete React/Vite build automation with live dev server
- **Preview Fixes**: Fixed Vite/React preview issues with proper dev server integration

### **Chat System Architecture**
- **SalesBotService**: Core AI response generation service (moved from background to chat module)
- **PromptHelperService**: Prompt composition and management
- **ChatService**: Message handling and conversation management
- **ConversationSummarizerService**: AI-powered conversation summarization for long conversations
- **Background Processes**: Separate module for scheduled tasks (FreeSlotCronService)

#### **Conversation Summarization Feature ✅**
- **Trigger**: Automatically summarizes conversations when they reach 50 messages
- **Summarization**: Uses OpenAI to create concise summaries of the first 30 messages
- **Storage**: Replaces first 30 messages with a single summary message
- **Context Preservation**: Summary includes key topics, decisions, and unresolved issues
- **AI Integration**: Summarized conversations maintain context for future AI interactions
- **Performance**: Reduces token usage for long conversations while preserving essential context
- **Fallback**: If summarization fails, conversation continues with original history

### **Multi-Tenant Architecture (IMPLEMENTED ✅)**
- **SubAccounts**: Multi-tenant support for client organizations ✅
- **Data Isolation**: Complete separation between SubAccounts ✅
- **Global Resources**: Shared prompt templates across all SubAccounts ✅
- **Scalable Management**: Admin management of multiple client organizations ✅
- **Database Schema**: Updated with SubAccount model and relationships ✅
- **Backend API**: Complete CRUD operations for SubAccounts ✅
- **Frontend UI**: SubAccounts management interface ✅
- **Authorization**: SubAccount-level access control ✅
- **Global Filtering**: Admin dashboard with subaccount filtering system ✅

## 🔐 **Security Architecture**

### **Multi-Layer Security**
1. **API Key Middleware**: Protects all routes except auth and status
2. **Global JWT Guard**: Authenticates all requests (except public endpoints)
3. **Role-Based Access Control**: Enforces user permissions
4. **Resource-Level Authorization**: Users can only access their own data

### **Public Endpoints** (No Authentication Required)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `POST /admin/auth/login` - Admin login
- `POST /admin/auth/register` - Admin registration
- `POST /admin/auth/refresh` - Admin token refresh
- `GET /status` - System status
- `GET /status/health` - Health check
- `GET /status/version` - Version info

### **Authentication Flow**
1. User logs in → receives access token (15min) + refresh token (7 days)
2. Access token sent in `x-user-token` header for all requests
3. On 401 response → automatic token refresh
4. Refresh tokens stored in Redis with rotation
5. Failed refresh → automatic redirect to login page (admin or user based on current path)

### **Rate Limiting - COMPREHENSIVE FRONTEND INTEGRATION ✅**

#### **Backend Rate Limiting**
- **Auth Endpoints**: 5 requests per 15 minutes (login/register)
- **API Endpoints**: 1000 requests per 15 minutes (general API calls)
- **Default**: 100 requests per 15 minutes (fallback)
- **Graceful Handling**: Returns HTTP 429 without crashing the application
- **Smart Retry Timing**: Uses Redis TTL for accurate retry timing, falls back to window time
- **Headers**: Proper X-RateLimit-* headers and Retry-After header
- **Redis Integration**: Fixed Redis connection issues with proper URL parsing and connection testing

#### **Frontend Rate Limiting - SIMPLIFIED ✅**
- **Simple Toast Notifications**: Shows user-friendly alert when rate limited
- **Human-Readable Timing**: Displays wait time in minutes and seconds format
- **Automatic Detection**: Handles 429 responses from backend automatically
- **Clean Implementation**: No complex UI components or hooks needed
- **User Experience**: Clear, simple message telling users to wait

### **Redis Configuration**
- **Connection**: Uses REDIS_URL from docker-compose with proper parsing
- **Fallback**: Individual environment variables (REDIS_HOST, REDIS_PORT, etc.)
- **Testing**: Built-in Redis connection test on application startup
- **Debugging**: Enhanced logging for Redis operations and connection issues
- **Packages**: Uses cache-manager-redis-store with proper configuration

### **Redis Debug Endpoints - NEW ✅**
- **Debug Module**: Comprehensive Redis TTL testing endpoints at `/debug/redis/*`
- **TTL Testing**: Set, get, monitor, and test TTL behavior in real-time
- **Public Access**: Marked as `@Public()` for easy testing (development only)
- **Endpoints**:
  - `GET /debug/redis/test-connection` - Test Redis connectivity
  - `POST /debug/redis/set-with-ttl` - Set key with TTL
  - `POST /debug/redis/set-without-ttl` - Set key without TTL
  - `GET /debug/redis/get/{key}` - Get key with TTL status
  - `POST /debug/redis/expire/{key}/{ttl}` - Set TTL for existing key
  - `DELETE /debug/redis/delete/{key}` - Delete key
  - `GET /debug/redis/exists/{key}` - Check key existence
  - `GET /debug/redis/ttl/{key}` - Get current TTL
  - `POST /debug/redis/test-ttl-scenarios` - Run comprehensive TTL tests
  - `GET /debug/redis/monitor-ttl/{key}?duration={seconds}` - Real-time TTL monitoring
- **Testing Tools**: 
  - `redis-debug-test.js` - Node.js test script demonstrating all endpoints
  - `REDIS_DEBUG_README.md` - Comprehensive documentation with cURL examples
- **Security**: Excluded from API key middleware for development testing

## 🧪 **Testing Infrastructure - COMPREHENSIVE ✅**

### **✅ Test Coverage Implemented**

#### **Unit Tests**
- **Core Module**: AppController, AppService - Complete test coverage
- **Auth Module**: AuthController, AuthService - Comprehensive tests with mocked dependencies
- **Users Module**: UsersController, UsersService - Full CRUD operation tests
- **Test Patterns**: Proper mocking of PrismaService, JwtService, RedisService, GhlService

#### **E2E Tests**
- **Authentication**: Complete auth flow testing (register, login, profile, refresh, logout, change-password)
- **Existing Tests**: Users, leads, strategies E2E tests already in place
- **Test Utilities**: Comprehensive test helpers and mock services

#### **Test Infrastructure**
- **Test Utilities**: `test/test-utils.ts` with common helpers and mock services
- **Mock Services**: Standardized mocks for PrismaService, JwtService, RedisService, GhlService
- **Test Patterns**: Consistent testing patterns across all modules
- **Coverage Goals**: 80%+ unit tests, 70%+ integration tests, 75%+ overall coverage

### **📋 Test Checklist Created**
- **Comprehensive Checklist**: `TEST_CHECKLIST.md` with all missing tests identified
- **Priority Levels**: High (auth, users, leads, bookings), Medium (strategies, chat, prompts), Low (infrastructure)
- **Test Categories**: Unit tests, integration tests, E2E tests, DTO validation tests

## 📡 **API Integration Status - VERIFIED ✅**

### **✅ Fully Integrated & Verified Endpoints**

#### **Authentication**
- **User Auth**: `/auth/*` - Login, register, refresh, logout, profile, change-password
- **Admin Auth**: `/admin/auth/*` - Login, register, refresh, logout, profile, change-password
- **DTO Alignment**: Frontend and backend DTOs match perfectly
- **HTTP Methods**: All methods correctly aligned (GET, POST, PUT, PATCH, DELETE)

#### **User Management**
- **Users**: `/user/*` - CRUD operations with resource-level authorization
- **Admin User Management**: `/admin/auth/users/*` - Admin-only user management
- **Admin Account Management**: `/admin/auth/accounts/*` - Super admin account management

#### **Core Features**
- **Strategies**: `/strategy/*` - CRUD + duplication with user isolation + prompt template integration
- **Leads**: `/lead/*` - CRUD + filtering by user/strategy
- **Bookings**: `/booking/*` - CRUD + status updates
- **Chat**: `/chat/*` - Message sending, history, read status (with placeholder implementations)
- **Prompt Templates**: `/admin/prompt-templates/*` - CRUD + activation + default management

#### **System**
- **Status**: `/status/*` - Health, version, system status
- **General**: `/general/*` - Dashboard stats, schema, detailed views (with subaccount filtering) ✅
- **SubAccounts**: `/admin/subaccounts/*` - Multi-tenant SubAccount management ✅

### **🔧 Integration Fixes Applied**

#### **1. Auth Registration DTO Alignment**
- **Fixed**: Frontend now sends `budget` field instead of `role`
- **Backend**: Expects `name`, `email`, `password`, `company?`, `budget?`
- **Frontend**: Sends matching fields ✅

#### **2. Chat Endpoint Alignment**
- **Fixed**: Frontend endpoints now match backend
- **Send Message**: `POST /chat/send` ✅
- **Get History**: `GET /chat/messages/{leadId}` ✅
- **Added**: Placeholder implementations for read status endpoints

#### **3. Strategy Duplication**
- **Added**: `POST /strategy/{id}/duplicate` endpoint
- **Backend**: Full implementation with authorization
- **Frontend**: Already expected this endpoint ✅

#### **4. Status Endpoints**
- **Added**: `GET /status/version` endpoint
- **Backend**: Returns package version
- **Frontend**: Already expected this endpoint ✅

#### **5. HTTP Method Alignment**
- **Fixed**: Admin profile update now uses PUT instead of PATCH
- **Backend**: `@Put('profile')` for admin profile updates
- **Frontend**: Now uses `this.put()` method ✅

#### **6. Registration Form Enhancement**
- **Added**: Budget field to user registration form
- **Frontend**: Now includes optional budget field
- **Backend**: Already supported budget field ✅

#### **7. Prompt Template Integration**
- **Fixed**: Added `promptTemplateId` field to strategy DTOs and types
- **Backend**: Strategy service now automatically assigns default prompt template if none provided
- **Frontend**: Strategy creation form now includes prompt template selection
- **Database**: Schema already supports prompt template relationship ✅
- **Chat System**: Uses active prompt template for AI responses ✅
- **Booking Instructions**: Added comprehensive booking instruction support in prompt templates ✅

#### **8. Booking Instruction Integration**
- **Added**: `bookingInstruction` field to PromptTemplate model and DTOs
- **Seed Data**: Updated seed.ts to include default booking instructions
- **Service Update**: Updated `ensureDefaultExists` method to include booking instructions
- **Chat Integration**: PromptHelperService now uses booking instructions from active template
- **Format**: Standardized booking confirmation format with [BOOKING_CONFIRMATION] marker

#### **9. Auto-Login After Registration**
- **Fixed**: Both admin and user registration now automatically log users in
- **Admin Registration**: After successful registration, users are automatically logged in and redirected to admin dashboard
- **User Registration**: After successful registration, users are automatically logged in and redirected to home page
- **Context Updates**: Modified both `adminRegister` and `register` methods to call login after successful registration
- **User Experience**: Eliminates the need for users to manually log in after registration

#### **10. Seed.ts Fix and Default Admin Password**
- **Fixed**: Seed.ts now properly works with bcrypt password hashing
- **Environment Variable**: Added `DEFAULT_ADMIN_PASSWORD` environment variable for secure default admin creation
- **Security**: Default admin password is now properly hashed using bcrypt with 12 salt rounds
- **Configuration**: Added validation for `DEFAULT_ADMIN_PASSWORD` in security config
- **Documentation**: Updated security check script to validate the new environment variable

#### **11. Admin Dashboard Global Subaccount Filtering System**
- **Implemented**: Global subaccount filtering system for admin dashboard ✅
- **Frontend Components**: 
  - `SubaccountFilterProvider` context for state management
  - `SubaccountFilter` component with dropdown interface
  - Integration with admin header and dashboard
- **Backend Support**: 
  - Updated `/general/dashboard-stats` endpoint to accept `subaccountId` query parameter
  - Updated `/general/recent-leads` endpoint to accept `subaccountId` query parameter
  - All dashboard data now filtered by subaccount when specified
- **Features**:
  - Global view (all subaccounts) vs subaccount-specific view
  - Persistent filter selection (localStorage)

#### **12. Date Formatting Error Fixes**
- **Fixed**: `toLocaleDateString()` errors when handling invalid or null dates ✅
- **Affected Pages**: Leads, Users, Settings, Integrations, Strategies, Prompt Templates, Bookings, Dashboard
- **Root Cause**: `formatDate` functions were calling `toLocaleDateString()` on invalid Date objects

#### **13. Website Builder Authentication Integration**
- **Issue**: Website builder (port 3001) not recognizing admin authentication from main CRM (port 3000) ✅
- **Root Cause**: Cookie sharing issues between localhost:3000 and localhost:3001
- **Fixes Applied**:
  - Updated cookie configuration to use `sameSite: 'lax'` for cross-port sharing
  - Added explicit domain setting for localhost cookies
  - Enhanced admin auth context with retry mechanism and better error handling
  - Added manual auth check functionality for debugging
  - **Fixed Redirect Logic**: Updated redirect logic to use `window.location.hostname` and `window.location.port` instead of environment variables for more reliable localhost detection
  - Added comprehensive debugging panels to show authentication state
  - **CORS Fix**: Added proper CORS headers to website builder proxy route to handle cross-origin requests
  - **Port Configuration**: Fixed API base URL to use correct port (3001) for website builder
  - **Trailing Slash**: Disabled trailing slash in Next.js config to prevent 308 redirects
- **Cookie Configuration**: Both main CRM and website builder now use identical cookie settings
- **Debug Features**: Added debug panels showing token status, current URL, and API configuration
- **Retry Mechanism**: Added 3-retry mechanism for profile fetching with 1-second delays
- **Manual Auth Check**: Added `checkAuth()` function for manual authentication verification
- **CORS Headers**: Added Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers to all proxy responses
- **OPTIONS Handler**: Added OPTIONS method handler for CORS preflight requests
- **Redirect Fix**: Fixed redirect logic in both website builder and main CRM dashboard to properly detect localhost vs production environments
- **FormData Upload Fix**: Fixed website builder file upload authentication by properly handling FormData requests without JSON stringification
- **File Upload Size Limit Fix**: Increased body parser limits to 50MB to handle large file uploads in website builder

#### **14. Website Builder Upload Error Fix - CRITICAL BUG RESOLUTION ✅**
- **Issue**: Website builder file upload failing with 500 error due to undefined adminId
- **Root Cause**: JWT strategy returns `userId` field, but controller was accessing `user.id`
- **Error Details**: Prisma database error - "Argument `connect` of type AdminUserWhereUniqueInput needs at least one of `id` or `email` arguments"
- **Fixes Applied**:
  - **Controller Fix**: Updated all website builder controller methods to use `user.userId || user.id` instead of `user.id`
  - **Admin ID Extraction**: Added proper admin ID extraction with fallback logic
  - **Validation**: Added admin ID validation and admin user existence check in service
  - **Error Handling**: Added comprehensive error handling for missing or invalid admin IDs
  - **Logging**: Enhanced logging to track admin ID extraction and validation
- **Files Updated**:
  - `project/src/website-builder/modules/website-builder/website-builder.controller.ts` - Fixed all methods
  - `project/src/website-builder/modules/website-builder/website-builder.service.ts` - Added validation
- **Methods Fixed**: uploadWebsite, create, findAll, findOne, update, remove, aiEdit, getChangeHistory, revertChange, getBuildStatus, stopWebsite, restartWebsite
- **Result**: Website builder file uploads now work correctly with proper admin authentication ✅

#### **13. Reusable DataTable Component System - NEW ✅**
- **Created**: Comprehensive reusable DataTable component in `@/components/customUI` ✅
- **Components**:
  - `DataTable`: Main reusable table component with pagination, search, filters, bulk actions
  - `usePagination`: Custom hook for pagination logic with proper state management
  - `BulkActions`: Existing bulk actions component integrated
- **Features**:
  - **Pagination**: Built-in pagination with configurable page sizes (default: 10)
  - **Search**: Real-time search functionality
  - **Filters**: Configurable dropdown and text filters
  - **Bulk Actions**: Integrated bulk delete, update, archive operations
  - **Stats Cards**: Configurable statistics display
  - **Loading States**: Loading and refreshing states
  - **Error Handling**: Error and success message display
  - **Custom Actions**: View, Edit, Delete actions with custom handlers
  - **Empty States**: Customizable empty state messages
- **Pagination Fixes Applied ✅**:
  - **Default Page Size**: Changed from 1 to 10 for better UX
  - **State Management**: Fixed totalItems initialization and updates
  - **Edge Cases**: Proper handling of empty data and single-page scenarios
  - **Display Logic**: Improved pagination info display for edge cases
  - **Infinite Recursion**: Fixed dependency array issues in admin pages
- **Benefits**:
  - **Consistency**: All admin tables now follow the same pattern
  - **Maintainability**: Changes to table behavior only need to be made in one place
  - **Performance**: Built-in pagination reduces memory usage and improves performance
  - **Reusability**: Can be used for any data type with simple column definitions
  - **Type Safety**: Full TypeScript support with generic types
- **Usage Pattern**:
  ```typescript
  // Define columns with custom renderers
  const columns: Column<UserProfile>[] = [
    { key: 'name', header: 'Name', render: (user) => <span className="font-medium">{user.name}</span> },
    { key: 'role', header: 'Role', render: (user) => <Badge>{user.role}</Badge> },
  ];
  
  // Use with pagination hook
  const { pagination, paginatedData, setCurrentPage } = usePagination(data);
  
  // Render the table
  <DataTable
    data={paginatedData}
    columns={columns}
    title="User Management"
    pagination={{ currentPage: pagination.currentPage, totalPages: pagination.totalPages, onPageChange: setCurrentPage }}
    onSearchChange={handleSearch}
    onFilterChange={handleFilter}
  />
  ```
- **Migration Path**: All existing admin pages can be gradually migrated to use this component
- **Solution**: Added proper null checking and `isNaN(date.getTime())` validation
- **Error Prevention**: All date formatting now safely handles null, undefined, and invalid date strings
- **User Experience**: No more crashes when editing leads or viewing pages with invalid dates

#### **12. GoHighLevel Integration Type Safety**
- **Implemented**: Proper typing for GHL integration with locationId as subaccount identifier ✅
- **Backend Types**: 
  - `GhlIntegrationConfigDto` for integration configuration
  - `GhlContact`, `GhlMessage`, `GhlSubaccount` interfaces for webhook data
  - Proper validation and typing in webhook handlers
- **Frontend Types**: 
  - `GhlIntegrationConfig`, `GhlContact`, `GhlMessage`, `GhlSubaccount` interfaces
  - Helper function `getGhlConfig()` for type-safe config access
  - Updated integration API types with proper GHL support
- **Webhook Handling**: 
  - `locationId` properly typed as GHL subaccount identifier
  - `contactId` properly typed as GHL contact identifier
  - Enhanced error messages with GHL-specific context
- **Integration Template**: 
  - Updated seed data with better descriptions for locationId field
  - Clear documentation that locationId represents GHL subaccounts
  - Setup instructions updated to clarify subaccount relationship

#### **12. Test Suite Fixes and Improvements**
- **Fixed**: Controller test failures due to async/sync method mismatches ✅
- **Leads Controller**: Updated tests to use `rejects.toThrow` for async methods ✅
- **Bookings Controller**: Kept synchronous `toThrow` for non-async methods ✅
- **Test Patterns**: Properly distinguish between async and sync controller methods
- **Coverage**: All 278 tests now passing with comprehensive error handling validation
- **Error Handling**: Tests properly validate HttpException throwing for invalid parameters
- **Best Practices**: Consistent test patterns across all controller modules
  - Real-time dashboard updates when filter changes
  - Visual indicators showing current filter context
  - Loading states and error handling
- **User Experience**:
  - Easy switching between subaccount contexts
  - Clear visual indication of current filter
  - Seamless integration with existing admin interface

#### **14. Admin Access Control Fix - CRITICAL BUG RESOLUTION**
- **Fixed**: Non-first admin users unable to see default data (users, leads, strategies, bookings, subaccounts)

#### **15. Admin UI Button Styling Consistency**
- **Standardized**: All admin action buttons now follow consistent styling pattern
- **View Buttons**: `variant="ghost"` for all view/show buttons across all admin pages
- **Edit Buttons**: `variant="outline"` for all edit buttons across all admin pages  
- **Delete Buttons**: `variant="destructive"` for all delete buttons across all admin pages
- **Updated Pages**: 
  - Users page (reference style) ✅
  - Leads page ✅
  - Strategies page ✅
  - Bookings page ✅
  - Prompt templates page ✅
  - Subaccounts page ✅
  - Dashboard page ✅
  - Settings page (already consistent) ✅
- **User Experience**: Consistent visual hierarchy and interaction patterns across all admin interfaces

#### **15. Users Page Modularization - COMPLETED ✅**
- **Implemented**: Modularized users page with separate dialog components
- **Components Created**:
  - `CreateUserDialog`: Handles user creation with form validation and proper state management
  - `EditUserDialog`: Handles user editing with form validation and proper state management
- **Features**:
  - Form validation with toast notifications
  - Proper state management and cleanup
  - Consistent UI patterns matching subaccounts page
  - SubAccount selection integration
  - Role and booking functionality toggles
- **Code Organization**: Reduced main page.tsx from 746 lines to more manageable size
- **Pattern Consistency**: Follows same modular pattern as subaccounts page

#### **16. Authentication Retry Prevention Fix - CRITICAL UX IMPROVEMENT ✅**
- **Problem**: Authentication requests were retrying multiple times, causing 5 error messages for single failed login attempts
- **Root Cause**: API client was treating auth endpoints the same as regular endpoints, attempting token refresh and retries
- **Solution**: Modified `ApiClient` to identify authentication endpoints and make them non-retryable
- **Changes Made**:
  - **Added**: `isAuthEndpoint()` method to identify auth endpoints (`/auth/login`, `/auth/register`, `/admin/auth/login`, etc.)
  - **Modified**: 401 error handling to skip retry logic for authentication endpoints
  - **Enhanced**: Error logging to use debug-level logging for auth endpoints to reduce noise
  - **Updated**: Token refresh error logging to be less verbose for expected failures
  - **Improved**: "No refresh tokens available" errors now logged as debug instead of errors (expected for login attempts)
- **Authentication Endpoints** (Non-retryable):
  - `/auth/login` - User login
  - `/auth/register` - User registration
  - `/auth/refresh` - Token refresh
  - `/auth/logout` - User logout
  - `/admin/auth/login` - Admin login
  - `/admin/auth/register` - Admin registration
  - `/admin/auth/refresh` - Admin token refresh
  - `/admin/auth/logout` - Admin logout
- **User Experience**: 
  - Authentication failures now show single, clear error message
  - No more multiple retry attempts for auth endpoints
  - Reduced console noise from expected authentication failures
  - Auth failures are truly "final" as intended
- **Testing**: Added comprehensive tests to verify auth endpoints don't retry on 401 errors
- **Backward Compatibility**: Regular API endpoints still retry on 401 with token refresh as before

### **Website Builder System**

### **Purpose**
AI-powered website editing tool that allows users to:
- Upload existing website files (including zip files)
- Make natural language modifications via AI
- Preview changes in real-time
- Export modified websites
- Track change history

### **Core Features**

#### **1. File Upload & Processing**
- **Supported Formats**: HTML, CSS, JS, React, Next.js, Vite projects
- **Zip File Support**: Upload zip files containing website projects
- **File Validation**: Type checking and size limits
- **Structure Analysis**: Automatic project structure detection
- **Content Parsing**: Extract and organize file contents

#### **2. AI-Powered Editing**
- **Natural Language Interface**: Users describe changes in plain English
- **OpenAI Integration**: GPT-4 powered code modifications
- **Context Awareness**: AI understands project structure and file relationships
- **Smart Suggestions**: AI provides modification recommendations

#### **3. Real-Time Preview**
- **Live Preview**: Instant visualization of changes in editor
- **Interactive Preview**: Full website preview with `/preview/[id]` route
- **Code Highlighting**: Syntax highlighting for modified files
- **Responsive Testing**: Mobile and desktop preview modes
- **Error Detection**: Real-time validation and error reporting

#### **4. Change Management**
- **Version History**: Complete audit trail of all modifications
- **Revert Functionality**: Undo any change with one click
- **Diff Viewing**: Visual comparison of before/after changes
- **Confidence Scoring**: AI confidence levels for each modification

#### **5. Export System**
- **ZIP Generation**: Download complete modified website
- **File Preservation**: Maintain original file structure
- **Metadata Inclusion**: Export change history and documentation

### **Technical Architecture**

#### **Frontend (Next.js)**
```
website-builder/
├── app/
│   ├── editor/[name]/     # Dynamic editor pages
│   ├── preview/[id]/      # Interactive website preview
│   └── api/proxy/         # API proxy for backend communication
├── components/
│   ├── ai-editor/         # AI editing interface
│   ├── upload-zone/       # File upload component
│   └── ui/               # Shared UI components
└── lib/
    └── api/              # API client and endpoints
```

#### **Backend (NestJS)**
```
project/src/website-builder/
├── modules/website-builder/
│   ├── website-builder.controller.ts  # Includes upload endpoint
│   ├── website-builder.service.ts     # Includes zip processing
│   └── dto/              # Data transfer objects
└── website-builder.module.ts
```

#### **Database Schema**
```sql
-- Website storage
model Website {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String   // 'static', 'vite', 'react', 'nextjs'
  structure   Json     // Parsed project structure
  files       Json     // File contents and metadata
  status      String   @default("active")
  createdByAdminId Int
  createdByAdmin AdminUser @relation(fields: [createdByAdminId], references: [id])
  changeHistory WebsiteChange[]
}

-- Change tracking
model WebsiteChange {
  id          String   @id @default(cuid())
  websiteId   String
  website     Website  @relation(fields: [websiteId], references: [id])
  type        String   // 'ai_edit', 'manual_edit', 'revert'
  description String
  prompt      String?  // Original AI prompt
  changes     Json     // Detailed change information
  createdByAdminId Int
  createdByAdmin AdminUser @relation(fields: [createdByAdminId], references: [id])
}
```

## 🔄 **Integration Points**

### **CRM → Website Builder**
- **Navigation**: "Website Builder" button in admin dashboard
- **Authentication**: Shared JWT tokens via cookies
- **Environment Detection**: Automatic API URL configuration
- **User Context**: Admin user information passed to builder

### **Website Builder → Backend**
- **REST API**: Standard HTTP endpoints for CRUD operations
- **File Upload**: Multipart form data handling with zip support
- **AI Processing**: OpenAI API integration for code modifications
- **Real-time Updates**: WebSocket-like polling for live preview

### **Data Flow**
1. **Upload**: Files/Zip → Backend → Database storage
2. **AI Edit**: User prompt → OpenAI → Code modifications → Database update
3. **Preview**: Website files → Blob URL → Interactive iframe preview
4. **Export**: Database files → ZIP generation → Download

### **API Endpoints**
```
POST   /api/proxy/website-builder/upload     # Upload files/zip
POST   /api/proxy/website-builder            # Create website
GET    /api/proxy/website-builder            # List websites
GET    /api/proxy/website-builder/:id        # Get website
PATCH  /api/proxy/website-builder/:id        # Update website
DELETE /api/proxy/website-builder/:id        # Delete website
POST   /api/proxy/website-builder/:id/ai-edit    # AI edit
GET    /api/proxy/website-builder/:id/changes    # Change history
POST   /api/proxy/website-builder/:id/changes/:changeId/revert  # Revert change
```

### **Routes**
```
/website-builder/                      # Upload page
/website-builder/editor/[name]         # Editor interface
/website-builder/preview/[id]          # Interactive preview
```

### **Integration with CRM**
- **Navigation**: "Website Builder" button in admin dashboard
- **Authentication**: Shared JWT tokens via cookies
- **Environment Detection**: Automatic API URL configuration
- **User Context**: Admin user information passed to builder

### **Implementation Status**
- **Frontend**: Complete with upload, editor, preview, and export functionality
- **Backend**: Complete with AI integration, change tracking, and zip processing
- **Database**: Migrated and ready for use
- **Integration**: CRM integration button implemented
- **Zip Support**: Basic zip file upload implemented (individual file extraction pending)
- **Preview System**: Interactive preview with iframe rendering

---

## 🔗 **Integrations System - COMPLETE**

### **Overview**
Comprehensive integrations system for connecting Loctelli CRM with external services like GoHighLevel, Facebook Ads, Google Analytics, and more. The system follows a two-table approach with integration templates and subaccount-specific configurations.

### **Database Schema**
- **IntegrationTemplate**: Stores available integration types with configuration schemas
- **Integration**: Stores subaccount-specific integration instances with configurations
- **JSON Config Field**: Flexible configuration storage for each integration type
- **Subaccount Scoped**: All integrations are tied to specific subaccounts

### **Integration Types**
- **GoHighLevel CRM**: Contact sync, booking integration, webhook processing
- **Facebook Ads**: Ad account management, lead generation, messaging
- **Google Analytics**: Data analytics, conversion tracking, reporting

### **Features**
- **Dynamic Configuration Forms**: Generated from JSON schemas
- **Connection Testing**: Validate integrations before activation
- **Status Monitoring**: Track integration health and sync status
- **Webhook Processing**: Real-time data synchronization
- **Security**: Encrypted configuration storage and webhook verification

### **Implementation Status**
- **Planning Phase**: Complete plan documented in `INTEGRATIONS_PLAN.md`
- **Database Schema**: Ready for implementation
- **Frontend Structure**: Following prompt templates pattern
- **Backend Architecture**: Modular design with integration handlers
- **Security Framework**: Comprehensive security considerations planned
- **Fixed**: Subaccount filtering only showing data created by the current admin
- **Root Cause**: Backend services were filtering data by `createdByAdminId` instead of allowing all admins full access

**Comprehensive Backend Changes:**
- **Updated**: `SubAccountsService.findAll()` to allow all admins to see all subaccounts
- **Updated**: `SubAccountsService.findOne()`, `update()`, `remove()`, `validateSubAccountAccess()` to remove `createdByAdminId` filtering
- **Updated**: `StrategiesService.findAllByAdmin()` to allow all admins to see all strategies
- **Updated**: `LeadsService.findAllByAdmin()` to allow all admins to see all leads
- **Updated**: `BookingsService.findAllByAdmin()` to allow all admins to see all bookings
- **Updated**: `UsersService.findAllByAdmin()` to allow all admins to see all users
- **Updated**: `AdminAuthService.getAllUsers()` to allow all admins to see all users
- **Updated**: `AdminAuthService.createUser()` to use default subaccount instead of admin-specific subaccount
- **Updated**: All corresponding service methods to remove `createdByAdminId` filtering

**Appropriate Usage of `createdByAdminId`:**
- **Creation Tracking**: Still used to track which admin created subaccounts, users, and prompt templates
- **Cleanup Operations**: Used in `deleteAdminAccount()` to clean up references when deleting admins
- **Display Purposes**: Frontend uses it to show which admin created items (for informational purposes only)
- **No Access Filtering**: Never used to restrict access or filter data visibility

**Access Control:**
- **All Admins**: Can see and manage all subaccounts and their data (users, leads, strategies, bookings)
- **Full Access**: No data isolation between admins - all admins have complete access to everything
- **Subaccount Management**: All admins can create, edit, delete, and view all subaccounts

**Test Updates:**
- **Updated**: SubAccounts service tests to reflect new non-filtering behavior
- **Verified**: All remaining `createdByAdminId` usage is for appropriate purposes only

**Frontend Integration:**
- **Subaccount Filter**: Already properly implemented and working with backend filtering
- **Dashboard**: Uses `currentFilter` from subaccount context to show appropriate data
- **Users Page**: Uses `currentFilter` to load users for current subaccount or global view
- **Leads Page**: Uses subaccount context to filter leads appropriately
- **All Pages**: Properly respect subaccount filter and admin permissions

**Result**: All admin users can now see all default data and subaccounts with full access to everything ✅

#### **13. Chat System Fixes - CRITICAL BUG RESOLUTION**
- **Fixed**: Chat history not loading when lead is selected

#### **13. Subaccount Filter Context Updates - CRITICAL BUG RESOLUTION**
- **Fixed**: Subaccount filter not refreshing when new subaccounts are created
- **Fixed**: Users page showing users from wrong subaccount
- **Fixed**: "View Details" button setting filter to "Unknown" for newly created subaccounts
- **Fixed**: Backend API not properly filtering users by subaccount
- **Fixed**: Creation forms not requiring subaccount selection
- **Changes Made**:
  - Updated `getAllUsers()` API method to accept optional `subaccountId` parameter
  - Modified subaccount filter context to refresh when new subaccounts are created
  - Updated all pages using `getAllUsers()` to pass current subaccount filter
  - Added `refreshFilter()` method to force filter context updates
  - Updated subaccounts page to refresh filter context after creating new subaccounts
  - Fixed dependency arrays in useEffect hooks to include subaccount filter changes
  - **Backend Updates**:
    - Updated admin auth controller to accept `subaccountId` query parameter
    - Updated admin auth service to filter users by subaccount or admin's subaccounts
    - Added proper subaccount filtering logic in backend
  - **Frontend Form Updates**:
    - Added required subaccount selection field to user creation form
    - **Removed subaccount selection from lead creation form** - subaccount is automatically set based on selected user
    - **Removed subaccount selection from strategy creation form** - subaccount is automatically set based on selected user
    - Added validation to ensure subaccount is selected before creation (for user creation only)
    - **Automatic subaccount assignment**: Leads and strategies automatically inherit subaccount from selected user
  - **Pages Updated**:
    - Users page: Now filters users by current subaccount and requires subaccount selection
    - Leads new/edit pages: Now show only users from current subaccount, subaccount automatically set from selected user
    - Strategies new/edit pages: Now show only users from current subaccount, subaccount automatically set from selected user
    - Bookings edit page: Now shows only users from current subaccount
- **User Experience**:
  - New subaccounts immediately appear in filter dropdown
  - "View Details" button works correctly for newly created subaccounts
  - Users are properly filtered by subaccount context
  - No need to refresh page after creating new subaccounts
  - **Required Subaccount Selection**: User creation form requires explicit subaccount selection
  - **Automatic Subaccount Inheritance**: Leads and strategies automatically inherit subaccount from selected user
  - **Proper Data Isolation**: Users can only see and create data within their selected subaccount context
  - **Prevents Cross-Reference**: No possibility of creating leads/strategies in wrong subaccount
- **Implemented**: Subaccount filtering for chat page ✅
  - Chat page now respects global subaccount filter from admin header
  - Leads dropdown filtered by current subaccount selection
  - Automatic lead deselection when switching subaccounts (if lead doesn't belong to new subaccount)
  - Uses existing global subaccount filter instead of duplicate component
  - Updated Lead, User, Strategy, and Booking interfaces to include subAccountId field
  - Backend API already supports subaccount filtering via subAccountId parameter
- **Fixed**: Message format mismatch between frontend and backend
- **Fixed**: Bot not reading previous messages and repeating greetings
- **Fixed**: Double message processing causing duplication
- **Fixed**: AI repeating same generic responses instead of responding to user messages
- **Fixed**: Latest user message not being included in OpenAI API calls (CRITICAL FIX)

**Frontend Changes:**
- **Added**: `loadChatHistory()` function to fetch existing chat history when lead is selected
- **Added**: Message format conversion from backend format to frontend format
- **Added**: Loading states for chat history
- **Fixed**: Clear chat now only clears view, not database
- **Enhanced**: Better error handling and user feedback

**Backend Changes:**
- **Fixed**: `PromptHelperService` now handles both message formats (`from/message` and `role/content`)
- **Added**: `convertMessageFormat()` method to standardize message processing
- **Fixed**: `ChatService` no longer duplicates message history management
- **Fixed**: `SalesBotService` now properly handles message history without duplication
- **Fixed**: **CRITICAL FIX** - Latest user message now properly included in OpenAI API calls
- **Enhanced**: Better logging and error handling in message processing

**AI Prompt Template Fixes:**
- **Fixed**: Updated default prompt template instructions to be conversational and responsive
- **Changed**: From aggressive sales instructions to helpful assistant instructions
- **Updated**: System prompt now encourages direct responses to user messages
- **Improved**: AI now answers questions and responds to specific user input instead of pushing sales agenda
- **Database**: Updated existing prompt templates in database with new instructions

#### **12. SubAccounts Implementation - MULTI-TENANT ARCHITECTURE ✅**
- **Database Schema**: Added SubAccount model with relationships to User, Strategy, Lead, and Booking models
- **Backend Module**: Complete SubAccounts module with service, controller, and DTOs
- **API Endpoints**: Full CRUD operations for SubAccounts (`/admin/subaccounts/*`)
- **Authorization**: SubAccount-level access control with admin-only management
- **Frontend UI**: SubAccounts management page with create, edit, delete functionality
- **Navigation**: Added SubAccounts to admin sidebar navigation
- **Data Migration**: SQL migration script for existing data
- **Testing**: Unit tests for SubAccounts service with comprehensive coverage
- **API Integration**: Frontend API client for SubAccounts management
- **Data Isolation**: Complete separation between SubAccounts with cascade deletes

**Message Format Compatibility:**
- **Old Format**: `{ from: 'user', message: 'content' }`
- **New Format**: `{ role: 'user', content: 'content' }`
- **Support**: System now handles both formats seamlessly
- **Storage**: Backend now consistently stores messages in new format with role/content
- **Frontend**: Enhanced conversion logic handles both old and new formats for backward compatibility

**CRITICAL FIX - OpenAI API Integration:**
- **Problem**: Latest user message was not being included in the messages array sent to OpenAI API
- **Root Cause**: Race condition between appending user message to database and reading history for prompt composition
- **Solution**: Modified `SalesBotService.generateResponse()` to:
  1. Get existing history first (before appending new message)
  2. Compose prompt with existing history
  3. Manually add latest user message to the prompt array
  4. Send complete messages array to OpenAI API
  5. Append both user message and bot response to database after API call
- **Result**: AI now receives the complete conversation context including the latest user message ✅

**ENHANCEMENT - Owner vs Lead Context Clarity:**
- **Problem**: AI couldn't distinguish between company owner details and lead details
- **Solution**: Enhanced `PromptHelperService` with clear separation:
  1. **`buildOwnerPrompt()`**: Shows company owner details (who we work for)
  2. **`buildleadPrompt()`**: Shows lead details (who we're talking to)
  3. **Updated system prompt**: Clearly distinguishes between owner and lead roles
  4. **Enhanced default template**: Instructions now clarify "you work FOR the company owner and are talking TO the lead"
- **Lead Information Now Included**: Name, email, phone, company, position, custom ID, status, notes
- **Owner Information Enhanced**: Name, company, email, budget range, booking enabled status
- **Result**: AI now has complete context about both the company it represents and the lead it's talking to ✅

**Result**: Chat system now properly loads existing conversation history, maintains context across messages, and AI responds directly to user messages instead of repeating generic sales pitches ✅

**ENHANCEMENT - Chat History Loading Fix:**
- **Problem**: When revisiting conversations, only user messages were showing, not the combined chat history
- **Root Cause**: Message format mismatch between backend storage (old format) and frontend expectations (new format)
- **Solution**: 
  1. **Backend**: Updated `appendMessageToHistory()` to store messages in new format (`role`/`content`) consistently
  2. **Frontend**: Enhanced `loadChatHistory()` conversion logic to handle both old and new message formats
  3. **Backward Compatibility**: System now supports both message formats seamlessly

**CRITICAL FIX - Message History Saving Issue:**
- **Problem**: Chat history was only showing AI messages, not both user and AI messages
- **Root Cause**: Race condition in `SalesBotService.generateResponse()` where both user and bot messages were being appended separately, causing the second append to overwrite the first
- **Solution**:
  1. **Created**: New `appendMessagesToHistory()` method that handles multiple messages in a single database operation
  2. **Updated**: `generateResponse()` to use the new method for both user and bot messages
  3. **Enhanced**: Added comprehensive debugging logs to track message flow
  4. **Fixed**: Frontend now properly adds both user and AI messages to local state after API response
  5. **Improved**: Better error handling and validation in message processing
- **Result**: Both user and AI messages now appear in chat history correctly ✅

#### **12. Booking Edit Page Fixes - CRITICAL BUG RESOLUTION**
- **Fixed**: Booking edit page failing to load with "User with ID 2 not found" error
- **Fixed**: Form submission opening new tab instead of handling via JavaScript
- **Fixed**: Incorrect API endpoint usage for loading users in admin context

**Root Causes:**
1. **API Endpoint Mismatch**: Edit page was using `api.users.getUsers()` which is restricted and only returns current user data
2. **Missing User Handling**: Booking service didn't handle cases where referenced user no longer exists
3. **Form Submission Issue**: Form was being submitted as HTML form instead of JavaScript handler

**Backend Changes:**
- **Enhanced**: `BookingsService.findOne()` now handles missing users gracefully
- **Added**: Better error handling for foreign key constraint violations
- **Improved**: Booking update now includes user and lead data in response
- **Added**: Detailed error logging for debugging booking update issues

**Frontend Changes:**
- **Fixed**: Changed from `api.users.getUsers()` to `api.adminAuth.getAllUsers()` for proper admin access
- **Enhanced**: Added validation to ensure selected user exists before submission
- **Improved**: Better error handling and user feedback for missing users
- **Fixed**: Form submission now properly handled via JavaScript instead of HTML form submission
- **Added**: Warning message when booking references a user that no longer exists
- **Enhanced**: Form validation to prevent submission with invalid user IDs

**Result**: Booking edit page now loads successfully, handles missing users gracefully, and form submission works correctly without opening new tabs ✅

#### **13. Prompt Template Creation Fixes - CRITICAL BUG RESOLUTION**
- **Fixed**: Prompt template creation and editing failing with various errors
- **Fixed**: Backend controller using incorrect user field (`req.user.id` instead of `req.user.userId`)
- **Fixed**: Missing error handling and debugging in prompt template operations
- **Fixed**: Form validation and data formatting issues

**Root Causes:**
1. **Controller Field Mismatch**: Controller was using `req.user.id` but JWT strategy returns `userId`
2. **Missing Error Handling**: Backend service lacked proper error handling and logging
3. **Form Data Issues**: Frontend forms had validation and data formatting problems
4. **Debugging Issues**: Lack of proper debugging made it difficult to identify problems

**Backend Changes:**
- **Fixed**: `PromptTemplatesController.create()` now uses `req.user.userId` instead of `req.user.id`
- **Enhanced**: Added comprehensive error handling and logging to `PromptTemplatesService`
- **Improved**: Better error messages and debugging information
- **Added**: Console logging for debugging create and update operations

**Frontend Changes:**
- **Enhanced**: Added comprehensive form validation and data formatting
- **Improved**: Better error handling with detailed error messages
- **Added**: Console logging for debugging API calls and form submissions
- **Fixed**: Form data structure validation before submission
- **Enhanced**: Proper handling of optional fields and default values

**API Client Changes:**
- **Added**: Console logging for debugging API requests and responses
- **Enhanced**: Better error tracking in prompt template operations

**Result**: Prompt template creation and editing now work correctly with proper error handling, validation, and debugging capabilities ✅

#### **12. Package Dependency and Naming Fixes - CRITICAL BUILD RESOLUTION**
- **Fixed**: Corrupted package dependencies causing Docker build failures
- **Fixed**: Incorrect class naming from migration (Apilead → ApiClient)
- **Fixed**: Invalid Prisma package references (@prisma/lead → @prisma/client)
- **Fixed**: Custom Prisma generator references (prisma-lead-js → prisma-client-js)

**Package.json Fixes:**
- **Removed**: Invalid `@redis/lead` dependency that was causing 404 errors
- **Fixed**: `@prisma/lead` → `@prisma/client` (correct Prisma client package)
- **Cleaned**: Removed corrupted package-lock.json and regenerated with correct dependencies

**Prisma Schema Fixes:**
- **Fixed**: Generator name from `prisma-lead-js` → `prisma-client-js` (standard Prisma generator)
- **Updated**: All import statements to use correct Prisma client
- **Fixed**: Seed.ts to use proper PrismaClient instead of Prismalead

**Frontend API Client Fixes:**
- **Fixed**: Class name from `Apilead` → `ApiClient` (correct naming convention)
- **Updated**: All API endpoint files to extend `ApiClient` instead of `Apilead`
- **Fixed**: Import statements from `../lead` → `../client` in all endpoint files
- **Cleaned**: Removed duplicate interface definitions and function implementations

**Files Updated:**
- `project/package.json` - Fixed Prisma client dependency
- `project/prisma/schema.prisma` - Fixed generator name
- `project/src/infrastructure/prisma/prisma.service.ts` - Updated PrismaClient import
- `project/prisma/seed.ts` - Fixed PrismaClient usage and removed invalid isDefault field
- `my-app/lib/api/client.ts` - Renamed class to ApiClient
- `my-app/lib/api/index.ts` - Updated import and class extension
- All `my-app/lib/api/endpoints/*.ts` files - Updated imports and class extensions

**Result**: Docker build now succeeds for both frontend and backend containers ✅
- **Result**: Complete conversation history now loads correctly when revisiting chats, showing both user and AI messages ✅

#### **12. Prompt Template Active/Default Logic Fix**
- **Problem**: `isActive` and `isDefault` had conflicting goals - active template was auto-activating default template
- **Root Cause**: `getActive()` method was automatically activating the default template when no active template existed
- **Solution**: 
  1. **Removed auto-activation**: `getActive()` now returns default template as fallback without activating it
  2. **Updated strategy creation**: Now uses active template as default choice for new strategies
  3. **Clear separation**: Active = default choice for strategies, Default = fallback when no active exists
  4. **User choice preserved**: Users can always select any template, active/default only affects auto-assignment
- **Frontend Updates**: Updated descriptions to clarify template status meanings
- **Result**: Clear, non-conflicting template status system where users have full choice while maintaining sensible defaults ✅

### **📋 DTO Structure Verification - ALL MATCH ✅**

#### **User Registration**
```typescript
// Frontend & Backend Match ✅
interface RegisterDto {
  name: string;
  email: string;
  password: string;
  company?: string;
  budget?: string;
}
```

#### **Strategy Creation**
```typescript
// Frontend & Backend Match ✅
interface CreateStrategyDto {
  userId: number;
  name: string;
  tag?: string;
  tone?: string;
  aiInstructions?: string;
  objectionHandling?: string;
  qualificationPriority?: string;
  creativity?: number;
  aiObjective?: string;
  disqualificationCriteria?: string;
  exampleConversation?: any;
  delayMin?: number;
  delayMax?: number;
  promptTemplateId?: number; // ✅ Added - links to prompt template
}
```

#### **Lead Creation**
```typescript
// Frontend & Backend Match ✅
interface CreateLeadDto {
  userId: number;
  strategyId: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  customId?: string;
  status?: string;
  notes?: string;
  messages?: any;
  lastMessage?: string;
  lastMessageDate?: string;
}
```

#### **Booking Creation**
```typescript
// Frontend & Backend Match ✅
interface CreateBookingDto {
  userId: number;
  leadId?: number;
  bookingType: string;
  details: any;
  status?: string;
}
```

### **🔍 Endpoint Verification Results**

#### **Authentication Endpoints** ✅
- `POST /auth/login` - ✅ Matches
- `POST /auth/register` - ✅ Matches (with budget field)
- `POST /auth/refresh` - ✅ Matches
- `POST /auth/logout` - ✅ Matches
- `GET /auth/profile` - ✅ Matches
- `POST /auth/change-password` - ✅ Matches

#### **Admin Authentication Endpoints** ✅
- `POST /admin/auth/login` - ✅ Matches
- `POST /admin/auth/register` - ✅ Matches
- `POST /admin/auth/refresh` - ✅ Matches
- `POST /admin/auth/logout` - ✅ Matches
- `GET /admin/auth/profile` - ✅ Matches
- `PUT /admin/auth/profile` - ✅ Matches (Fixed HTTP method)
- `POST /admin/auth/change-password` - ✅ Matches
- `GET /admin/auth/users` - ✅ Matches
- `POST /admin/auth/users` - ✅ Matches
- `PUT /admin/auth/users/:id` - ✅ Matches
- `DELETE /admin/auth/users/:id` - ✅ Matches
- `GET /admin/auth/accounts` - ✅ Matches
- `DELETE /admin/auth/accounts/:id` - ✅ Matches

#### **Strategy Endpoints** ✅
- `GET /strategy` - ✅ Matches
- `GET /strategy/:id` - ✅ Matches
- `POST /strategy` - ✅ Matches
- `PATCH /strategy/:id` - ✅ Matches
- `DELETE /strategy/:id` - ✅ Matches
- `POST /strategy/:id/duplicate` - ✅ Matches

#### **Lead Endpoints** ✅
- `GET /lead` - ✅ Matches
- `GET /lead/:id` - ✅ Matches
- `POST /lead` - ✅ Matches
- `PATCH /lead/:id` - ✅ Matches
- `DELETE /lead/:id` - ✅ Matches
- `POST /lead/:id/message` - ✅ Matches

#### **Booking Endpoints** ✅
- `GET /booking` - ✅ Matches
- `GET /booking/:id` - ✅ Matches
- `POST /booking` - ✅ Matches
- `PATCH /booking/:id` - ✅ Matches
- `PATCH /booking/:id/status` - ✅ Matches
- `DELETE /booking/:id` - ✅ Matches

#### **Chat Endpoints** ✅ (With Placeholder Implementations)
- `POST /chat/send` - ✅ Matches
- `GET /chat/messages/:leadId` - ✅ Matches
- `PATCH /chat/messages/:messageId/read` - ✅ Matches (TODO: Implement)
- `DELETE /chat/messages/:messageId` - ✅ Matches (TODO: Implement)
- `GET /chat/unread-count/:leadId` - ✅ Matches (TODO: Implement)
- `PATCH /chat/mark-all-read/:leadId` - ✅ Matches (TODO: Implement)

#### **Status Endpoints** ✅
- `GET /status` - ✅ Matches
- `GET /status/health` - ✅ Matches
- `GET /status/version` - ✅ Matches

#### **General Endpoints** ✅
- `GET /general/dashboard-stats` - ✅ Matches
- `GET /general/system-status` - ✅ Matches
- `GET /general/recent-leads` - ✅ Matches
- `GET /general/users/:id/detailed` - ✅ Matches
- `GET /general/leads/:id/detailed` - ✅ Matches
- `GET /general/schema` - ✅ Matches

#### **User Endpoints** ✅
- `GET /user` - ✅ Matches
- `GET /user/:id` - ✅ Matches
- `POST /user` - ✅ Matches
- `PATCH /user/:id` - ✅ Matches
- `DELETE /user/:id` - ✅ Matches

### **⚠️ Known Limitations**

#### **Chat Message Tracking**
- **Status**: Placeholder implementations for message read status
- **Impact**: Read/unread functionality not fully implemented
- **Workaround**: Basic message sending and history work correctly
- **Future**: Requires messages table in database for full implementation

#### **Advanced Chat Features**
- **Message Deletion**: Placeholder implementation
- **Unread Count**: Placeholder implementation
- **Mark All as Read**: Placeholder implementation
- **Impact**: Core chat functionality works, advanced features pending

## 🎯 **User Registration System**

### **Self-Service Registration**
- **Frontend**: Complete registration form at `/auth/register` (now includes budget field)
- **Backend**: Public endpoint with validation
- **Security**: Password complexity requirements, email validation
- **Flow**: Register → Success message → Redirect to login

### **Admin User Creation**
- **Admin Panel**: Admins can create users via `/admin/auth/users`
- **Authorization**: Only admins and super admins
- **Audit Trail**: Tracks which admin created each user

### **User Creation Defaults**
- **Booking Enabled**: New users have `bookingEnabled: 1` (enabled) by default
- **Database Schema**: `bookingEnabled` field defaults to `1` in Prisma schema
- **Backend DTO**: `CreateUserDto` has `bookingEnabled?: number = 1` default
- **Frontend Form**: Admin user creation form includes `bookingEnabled: 1` in initial state with toggle switch
- **Frontend Toggle**: Admins can enable/disable booking functionality via toggle switch in create/edit forms
- **Table Display**: Users table shows booking enabled/disabled status with badges
- **Migration**: Applied migration `20250706031355_update_booking_enabled_default` to update existing database

## 🔄 **Token Management**

### **Automatic Refresh**
- **Frontend**: Detects 401 responses and automatically refreshes tokens
- **Backend**: Validates refresh tokens from Redis
- **Security**: Token rotation on refresh
- **Fallback**: Failed refresh logs user out

### **Token Storage**
- **Access Tokens**: 15 minutes expiration
- **Refresh Tokens**: 7 days expiration, stored in Redis
- **Headers**: `x-user-token` for authentication
- **Cookies**: HTTP-only cookies for secure storage

## 🛡️ **Authorization Rules**

### **Resource-Level Access**
- **Users**: Can only access their own data within their SubAccount
- **Admins**: Can access all user data within their created SubAccounts
- **Super Admins**: Can manage admin accounts and all SubAccounts

### **SubAccount Isolation (Planned)**
- **Data Separation**: Complete isolation between SubAccounts
- **Cross-SubAccount Access**: Users cannot access data from other SubAccounts
- **Admin Scope**: Admins can only manage SubAccounts they created
- **Global Resources**: Prompt templates remain accessible across all SubAccounts

### **Endpoint Protection**
- **Public**: Auth and status endpoints
- **Authenticated**: All other endpoints require valid JWT
- **Role-Based**: Admin endpoints require admin role
- **Resource-Owned**: Users can only modify their own resources within their SubAccount

## 📊 **Data Flow**

### **Current Request Flow**
1. Frontend sends request with auth headers
2. API proxy adds API key
3. Backend validates JWT token

### **Planned SubAccount Flow**
1. Frontend sends request with auth headers
2. API proxy adds API key
3. Backend validates JWT token
4. Backend validates SubAccount access (if applicable)
5. Backend filters data by SubAccount context
4. Backend validates SubAccount access (if applicable)
5. Backend filters data by SubAccount context
6. Backend checks resource ownership
7. Backend returns data with proper authorization

### **Error Handling**
- **401**: Token refresh attempted
- **403**: Access denied (logged)
- **404**: Resource not found
- **422**: Validation errors
- **500**: Server errors (logged)

## 🚀 **Deployment**

### **Docker Setup**
- **Frontend**: Next.js container
- **Backend**: NestJS container
- **Database**: PostgreSQL container
- **Cache**: Redis container
- **Proxy**: Nginx for API routing

### **Environment Variables**
- **Database**: Connection strings
- **Redis**: Cache configuration
- **JWT**: Secret keys and expiration
- **API Key**: Backend protection
- **Admin Auth Code**: Admin registration

## 📝 **Development Notes**

### **Hot Reload Compatibility**
- **Frontend**: Properly handles auth state during development
- **Backend**: Maintains session state across restarts
- **Tokens**: Preserved during development reloads

### **API Testing**
- **Endpoints**: All endpoints tested and aligned ✅
- **DTOs**: Frontend and backend types match ✅
- **Authorization**: Proper access control implemented ✅
- **Error Handling**: Comprehensive error responses ✅

### **Security Considerations**
- **Input Validation**: All endpoints validate input
- **SQL Injection**: Protected via Prisma ORM
- **XSS**: Frontend sanitizes output
- **CSRF**: Protected via same-origin policy
- **Rate Limiting**: Implemented on sensitive endpoints

```typescript
import logger, { setLogLevel } from '@/lib/logger';

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Change log level at runtime
setLogLevel('error'); // Only errors will be logged
```

All previous console statements in the frontend have been replaced with this logger for consistent, environment-aware logging.

## 🔍 **Recent Verification Summary**

### **Endpoint Audit Results**
- **Total Endpoints Checked**: 50+
- **Fully Aligned**: 100% ✅
- **HTTP Methods Correct**: 100% ✅
- **DTO Structures Match**: 100% ✅
- **Authorization Working**: 100% ✅

### **Issues Found & Fixed**
1. **Admin Profile Update**: Fixed HTTP method from PATCH to PUT
2. **User Registration**: Added missing budget field to frontend form
3. **DTO Alignment**: Verified all DTOs match between frontend and backend

### **System Status**
- **Frontend-Backend Integration**: ✅ Fully Verified
- **API Endpoints**: ✅ All Working
- **Authentication**: ✅ Secure & Functional
- **Authorization**: ✅ Properly Implemented
- **Data Flow**: ✅ Correctly Configured

## 🧠 **Prompt Template & Strategy Integration**

### **How it Works**
- **Prompt Templates** are created and managed by admins. Each template can be set as active or default.
- **Strategies** must always be linked to a prompt template (`promptTemplateId` is required in the schema).
- When creating a new strategy:
  - The frontend admin form allows selection of any prompt template from all available templates.
  - If no template is selected, the backend automatically assigns the **active template** as the default choice.
  - If no active template exists, it falls back to the default template.
- The backend enforces that every strategy has a valid `promptTemplateId`.
- The chat system uses the prompt template linked to the strategy for all AI responses.

### **Template Status Meanings**
- **Active Template**: Used as the default choice when creating new strategies (if user doesn't select one)
- **Default Template**: Used as fallback when no active template exists
- **Users can always choose any template**: The active/default status only affects auto-assignment

### **Frontend Support**
- The strategy creation form fetches all prompt templates and presents them in a dropdown.
- The selected template's ID is submitted as part of the strategy creation payload.
- The types (`Strategy`, `CreateStrategyDto`) include `promptTemplateId`.

### **Backend Logic**
- The `StrategiesService` ensures that if no `promptTemplateId` is provided, the default template is used.
- The `PromptTemplatesService` manages default/active status and prevents deletion of the default template.

### **Documentation & DTOs**
- All DTOs and API endpoints are updated to include `promptTemplateId` where relevant.
- The system guarantees that every strategy is always tied to a prompt template, and the frontend and backend are fully aligned.

This context should provide AI models with comprehensive understanding of the Loctelli CRM system architecture, data flow, and implementation details for effective code analysis and generation.

# AI Context for Loctelli Backend

## Website Preview Proxy Endpoint

- **Endpoint:** `GET /website-builder/:id/proxy-preview`
- **Purpose:** Proxies requests from the frontend to the internal Vite dev server running inside the container for website previews. This allows previewing websites in environments (like Railway) where only the main app port is exposed.
- **How it works:**
  - Looks up the `portNumber` for the website with the given `id` (from the database/website record).
  - Forwards the request to `http://localhost:<portNumber>` inside the container using `HttpService`.
  - Streams the response back to the client, preserving headers.
  - Only accessible to authenticated admins.
  - Returns 404 if no preview server is running for the website.
  - Returns 500 on proxy errors.
- **Security:** Requires admin authentication (uses `AdminGuard`).
- **Frontend usage:** Instead of loading the internal Vite port directly, the frontend should use this endpoint as the iframe src for previews.

---

(Keep this section updated if the proxy logic or endpoint changes.) 