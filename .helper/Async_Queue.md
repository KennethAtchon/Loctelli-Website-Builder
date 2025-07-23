# Asynchronous Build Queue: High-Level Overview

## Purpose
The asynchronous build queue system enables scalable, non-blocking website builds by decoupling user uploads from the resource-intensive build process. This ensures fast feedback, real-time progress, and robust error handling for users, while optimizing backend resource usage.

## Core Architecture

- **Frontend**: Users upload website projects and view build progress/notifications in real time.
- **API Gateway**: Accepts uploads, enqueues build jobs, and provides endpoints for job status, queue position, and notifications.
- **Build Queue**: Manages job ordering, prioritization, and concurrency limits. Can be implemented with Redis/Bull, in-memory, or database-backed queues.
- **Background Workers**: Dedicated processes that pick jobs from the queue, execute build steps (install, type-check, start server), and update job status/progress.
- **Database**: Stores job metadata, progress, logs, and notification records.
- **Notification System**: Delivers real-time updates to users via in-app UI, SSE/WebSocket, and/or email.

## Typical Flow

1. **User Uploads Project**
   - User submits files via frontend.
   - API creates a website record and enqueues a build job (returns job ID and queue position immediately).
2. **Job Queuing**
   - Job is added to the queue with metadata (user, website, priority, etc.).
   - User receives instant feedback and can view their queue/dashboard.
3. **Background Processing**
   - Worker picks up the next job (respecting concurrency/resource limits).
   - Worker executes build steps, updating progress and logs in the database.
   - On completion or failure, worker updates job status and triggers notifications.
4. **User Feedback**
   - Frontend polls or subscribes to job status/notifications (SSE/WebSocket).
   - Users see real-time progress, errors, and can access completed builds directly from the dashboard.

## Key Features

- **Non-blocking Uploads**: Users never wait for the full build to complete during upload.
- **Progress Tracking**: Each job tracks progress, current step, logs, and errors.
- **Queue Visibility**: Users can see their active and completed jobs, with queue position and status.
- **Notifications**: Real-time alerts for job queued, started, completed, or failed (in-app, optionally email/browser).
- **Resource Management**: Limits on concurrent builds, with optional priority and resource checks.
- **Retry & Error Handling**: Failed jobs can be retried, and users receive actionable error messages.
- **Scalability**: System can handle many concurrent users and builds by scaling workers and queue backend.

## Technology Choices
- **Queue**: Bull (Redis), in-memory, or DB-backed
- **Workers**: Node.js child processes, worker threads, or containers
- **Real-Time**: Server-Sent Events (SSE) or WebSockets
- **Notifications**: In-app UI, browser, or email

## Benefits
- **User Experience**: Fast feedback, real-time progress, no timeouts, clear error handling
- **System Performance**: Efficient resource use, scalable, reliable
- **Developer Experience**: Easier debugging, monitoring, and maintenance

---

This high-level summary reflects the current async queue implementation, focusing on its architecture and user/developer benefits. For detailed API, schema, or code, see the relevant source files.