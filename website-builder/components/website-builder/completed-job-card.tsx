import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export function CompletedJobCard({ job }: { job: any }) {
  const isSuccess = job.status === 'completed';
  const isFailed = job.status === 'failed';

  const handleRetry = async () => {
    await api.websiteBuilder.retryJob(job.id);
  };

  // Get the appropriate preview URL - use proxy for Vite/React projects
  const getPreviewUrl = () => {
    if (!job.previewUrl) return null;
    
    // If the job has a portNumber, it's a Vite/React project - use proxy
    if (job.portNumber) {
      return api.websiteBuilder.getProxyPreviewUrl(job.websiteId);
    }
    
    // For static sites, use the original previewUrl
    return job.previewUrl;
  };

  const finalPreviewUrl = getPreviewUrl();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{job.website?.name || 'Build Job'}</CardTitle>
          <Badge variant={isSuccess ? 'default' : 'destructive'}>{job.status.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-sm">Completed At: {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'N/A'}</div>
        {isSuccess && finalPreviewUrl && (
          <Button variant="outline" size="sm" onClick={() => window.open(finalPreviewUrl, '_blank')}>
            Open Preview
          </Button>
        )}
        {isFailed && (
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 