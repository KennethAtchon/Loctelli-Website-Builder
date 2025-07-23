"use client";

import { useState, useEffect, useCallback } from "react";
import { WebsiteBuilderApi } from "@/lib/api/website-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function DashboardClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Job queue state
  const [jobs, setJobs] = useState<any[]>([]);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const { toast } = useToast();

  // Fetch job queue on mount and when jobs change
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    setJobError(null);
    try {
      const res = await api.websiteBuilder.getUserQueue();
      const jobs = (res as any).jobs || [];
      setJobs(jobs);
      setQueueStats((res as any).stats || null);
      // Find the most recent active job
      const active = jobs.find((j: any) => ["pending", "queued", "building"].includes(j.status));
      setActiveJob(active || null);
    } catch (err: any) {
      setJobError(err?.message || "Failed to load job queue");
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll build status for the active job
  useEffect(() => {
    if (!activeJob || !activeJob.id) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const status = await api.websiteBuilder.getJob(activeJob.id);
        setActiveJob(status);
        // If job is done, refresh the job queue
        if (["completed", "failed", "cancelled"].includes((status as any).status)) {
          setTimeout(() => window.location.reload(), 1000); // quick refresh for demo
          return;
        }
      } catch (e) {}
      pollingRef.current = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      stopped = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [activeJob?.id]);

  // Fetch notifications on mount
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    setNotifError(null);
    try {
      const notifs = await api.websiteBuilder.getUserNotifications();
      const notifArr = Array.isArray(notifs) ? notifs : [];
      setNotifications(notifArr);
      setUnreadCount(notifArr.filter((n: any) => !n.read).length);
    } catch (err: any) {
      setNotifError(err?.message || "Failed to load notifications");
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchJobs();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchJobs]);

  // Mark as read
  const markAsRead = async (id: string) => {
    await api.websiteBuilder.markNotificationAsRead(id);
    fetchNotifications();
  };

  // Delete notification
  const deleteNotif = async (id: string) => {
    await api.websiteBuilder.deleteNotification(id);
    fetchNotifications();
  };

  // TODO: Add polling for build status, job dashboard, notifications, etc.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setQueuePosition(null);
    setJobId(null);
    try {
      const websiteName = `website-${Date.now()}`;
      const response = await api.websiteBuilder.uploadWebsite(files, websiteName, "Uploaded via dashboard");
      setUploadResult(response);
      if (response && 'jobId' in response) {
        setJobId((response as any).jobId ?? null);
        setQueuePosition((response as any).queuePosition ?? null);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Get the appropriate preview URL - use proxy for Vite/React projects
  const getPreviewUrl = (job: any) => {
    if (!job.previewUrl) return null;
    
    // If the job has a portNumber, it's a Vite/React project - use proxy
    if (job.portNumber) {
      return api.websiteBuilder.getProxyPreviewUrl(job.websiteId);
    }
    
    // For static sites, use the original previewUrl
    return job.previewUrl;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10">
      <Card className="w-full max-w-xl mb-8">
        <CardHeader>
          <CardTitle>Upload Website</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Input type="file" multiple onChange={handleFileChange} disabled={isUploading} />
            <Button onClick={handleUpload} disabled={isUploading || files.length === 0}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
            {uploadError && <div className="text-red-500">{uploadError}</div>}
            {jobId && (
              <div className="text-green-600">
                Build job queued! Job ID: <span className="font-mono">{jobId}</span>
                {queuePosition && (
                  <span> (Queue position: {queuePosition})</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Build Progress Section */}
      {activeJob && (
        <div className="w-full max-w-2xl mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Build Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-mono">Job ID: {activeJob.id}</div>
                <div className="text-xs text-muted-foreground">Status: <Badge>{activeJob.status}</Badge></div>
                <div className="text-xs">Progress: {activeJob.progress}%</div>
                {activeJob.currentStep && <div className="text-xs">Step: {activeJob.currentStep}</div>}
                <Progress value={activeJob.progress} className="h-2 mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job Queue Section */}
      <div className="w-full max-w-4xl mb-8">
        <Card>
          <CardHeader>
            <CardTitle>My Build Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingJobs ? (
              <div className="text-center py-8">Loading jobs...</div>
            ) : jobError ? (
              <div className="text-red-500 text-center py-8">{jobError}</div>
            ) : jobs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">No jobs found.</div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <div className="font-mono text-sm">{job.id}</div>
                      <div className="text-lg font-semibold">{job.website?.name || "(no name)"}</div>
                      <div className="text-xs text-muted-foreground">Status: <Badge>{job.status}</Badge></div>
                      <div className="text-xs text-muted-foreground">Progress: {job.progress}%</div>
                      {job.currentStep && <div className="text-xs">Step: {job.currentStep}</div>}
                    </div>
                    <div className="flex gap-2">
                      {job.status === "pending" || job.status === "building" ? (
                        <Button size="sm" variant="destructive" onClick={() => api.websiteBuilder.cancelJob(job.id)}>Cancel</Button>
                      ) : null}
                      {job.status === "failed" ? (
                        <Button size="sm" variant="outline" onClick={() => api.websiteBuilder.retryJob(job.id)}>Retry</Button>
                      ) : null}
                      {job.previewUrl && (
                        <Button size="sm" asChild variant="secondary">
                          <a href={getPreviewUrl(job) || `/preview/${job.websiteId}`} target="_blank" rel="noopener noreferrer">Preview</a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications Panel */}
      <div className="w-full max-w-2xl mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white">{unreadCount}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNotifs ? (
              <div className="text-center py-8">Loading notifications...</div>
            ) : notifError ? (
              <div className="text-red-500 text-center py-8">{notifError}</div>
            ) : notifications.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">No notifications.</div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`flex items-start justify-between border rounded-lg p-4 ${!notif.read ? "bg-primary/10" : ""}`}>
                    <div>
                      <div className="font-semibold text-sm">{notif.title}</div>
                      <div className="text-xs text-muted-foreground mb-1">{notif.type.replace("_", " ")}</div>
                      <div className="text-sm mb-1">{notif.message}</div>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</div>
                    </div>
                    <div className="flex flex-col gap-2 items-end ml-4">
                      {!notif.read && (
                        <Button size="sm" variant="outline" onClick={() => markAsRead(notif.id)}>Mark as read</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteNotif(notif.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TODO: Build Progress, Notifications */}
      <div className="w-full max-w-4xl">
        <div className="text-muted-foreground text-center py-8">
          <span>Build progress and notifications coming soon...</span>
        </div>
      </div>
    </div>
  );
} 