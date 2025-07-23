import { useBuildStatus } from "@/hooks/use-build-status";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useState } from "react";

export function JobCard({ job }: { job: any }) {
  const { status } = useBuildStatus({ websiteId: job.websiteId });
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await api.websiteBuilder.cancelJob(job.id);
    setCancelling(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{job.website?.name || 'Build Job'}</CardTitle>
          <Badge>{status?.buildStatus?.toUpperCase() || job.status?.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-sm">Current Step: {status?.currentStep || job.currentStep || 'N/A'}</div>
        <Progress value={status?.progress ?? job.progress ?? 0} className="h-2 mb-2" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={() => {/* TODO: View logs */}}>
            View Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 