import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useBuildStatus, BuildStatus } from "@/hooks/use-build-status";
import { JobCard } from "./job-card";
import { CompletedJobCard } from "./completed-job-card";
import { NotificationsPanel } from "./notifications-panel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QueueDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchJobs = useCallback(async () => {
    const userJobs: any = await api.websiteBuilder.getUserQueue();
    setJobs(userJobs.active || []);
    setCompletedJobs(userJobs.completed || []);
  }, []);

  const fetchStats = useCallback(async () => {
    const stats = await api.websiteBuilder.getQueueStats();
    setQueueStats(stats);
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchStats();
    const interval = setInterval(() => {
      fetchJobs();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs, fetchStats]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Build Queue Dashboard</h2>
        <Button variant="outline" onClick={() => setNotificationsOpen((v) => !v)}>
          Notifications
        </Button>
      </div>
      {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
      <Card>
        <CardHeader>
          <CardTitle>Queue Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {queueStats ? (
            <div className="flex gap-8">
              <div>Pending: {queueStats.pending}</div>
              <div>Building: {queueStats.building}</div>
              <div>Completed: {queueStats.completed}</div>
              <div>Failed: {queueStats.failed}</div>
              <div>Total: {queueStats.total}</div>
            </div>
          ) : (
            <div>Loading stats...</div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-4 mb-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Active</Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>Completed</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(filter === 'all' || filter === 'active') && jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
        {(filter === 'all' || filter === 'completed') && completedJobs.map((job) => (
          <CompletedJobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
} 