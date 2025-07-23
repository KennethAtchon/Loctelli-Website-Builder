import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    const data = await api.websiteBuilder.getUserNotifications();
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    await api.websiteBuilder.markNotificationAsRead(id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await api.websiteBuilder.markAllNotificationsAsRead();
    fetchNotifications();
  };

  return (
    <Card className="fixed top-20 right-8 w-96 z-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notifications</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>Mark all as read</Button>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-muted-foreground text-sm">No notifications</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-2 p-2 border rounded-md bg-white">
                <Badge variant={n.read ? 'default' : 'destructive'}>{n.type.replace('build_', '').toUpperCase()}</Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                  <div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && (
                  <Button variant="outline" size="sm" onClick={() => markAsRead(n.id)}>Mark as read</Button>
                )}
                {n.actionUrl && (
                  <Button variant="outline" size="sm" onClick={() => window.open(n.actionUrl, '_blank')}>View</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 