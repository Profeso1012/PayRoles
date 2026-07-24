import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Calendar, Mail, MessageSquare, CheckCheck } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS, USE_REAL_API } from '@/lib/api/adapter';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

// Real backend Notification entity (notification.entity.ts) fields -
// this used to assume a mock shape (title/isRead/relatedEntity) that never
// matched what the API actually returns.
interface Notification {
  id: string;
  recipientUserId: string | null;
  type: 'email' | 'sms' | 'in_app'; // delivery channel, not a category
  subject: string;
  message: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// `type` is the delivery channel the notification went out on, not a
// category - shown as a small channel indicator rather than an alert-type icon.
const NOTIFICATION_ICONS: Record<Notification['type'], React.ReactNode> = {
  email: <Mail size={18} style={{ color: '#4FAD72' }} />,
  sms: <MessageSquare size={18} style={{ color: '#4FAD72' }} />,
  in_app: <Bell size={18} style={{ color: '#4FAD72' }} />,
};

export default function Notifications() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!USE_REAL_API) {
        return [];
      }
      const response = await apiClient<any>(ENDPOINTS.NOTIFICATIONS.LIST);
      return Array.isArray(response) ? response : (response.data || []);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.NOTIFICATIONS.MARK_READ(id), { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'clamp(300px, 50vh, 60vh)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load notifications." onRetry={refetch} />;
  }

  const allNotifications = notifications || [];
  const unreadNotifications = allNotifications.filter((n: Notification) => !n.readAt);
  const readNotifications = allNotifications.filter((n: Notification) => !!n.readAt);

  const displayNotifications =
    activeTab === 'unread' ? unreadNotifications :
    activeTab === 'read' ? readNotifications :
    allNotifications;

  return (
    <div style={{ maxWidth: 'clamp(600px, 95vw, 900px)', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(1rem, 3vw, 1.5rem)' }}>
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Notifications' }]}
        action={
          unreadNotifications.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              loading={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck size={14} />
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: allNotifications.length },
          { id: 'unread', label: 'Unread', count: unreadNotifications.length },
          { id: 'read', label: 'Read', count: readNotifications.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {/* Notifications List */}
      {displayNotifications.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #CDEFD7',
          borderRadius: '0.75rem',
          padding: 'clamp(2rem, 5vw, 3rem)',
          textAlign: 'center',
        }}>
          <BellOff size={48} style={{ color: '#CDEFD7', margin: '0 auto clamp(0.75rem, 2vw, 1rem)' }} />
          <p style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', fontWeight: 500, color: '#0F2E23', marginBottom: '0.5rem' }}>
            No notifications
          </p>
          <p style={{ fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', color: '#1F6F4E' }}>
            {activeTab === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}>
          {displayNotifications.map((notification: Notification) => (
            <div
              key={notification.id}
              style={{
                background: notification.readAt ? '#fff' : '#F7FAF8',
                border: notification.readAt ? '1px solid #CDEFD7' : '1px solid #4FAD72',
                borderRadius: '0.75rem',
                padding: 'clamp(1rem, 3vw, 1.25rem)',
                display: 'flex',
                gap: 'clamp(0.75rem, 2vw, 1rem)',
                alignItems: 'flex-start',
                position: 'relative',
                transition: 'all 0.2s',
                cursor: notification.readAt ? 'default' : 'pointer',
              }}
              onClick={() => {
                if (!notification.readAt) markReadMutation.mutate(notification.id);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4FAD72';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(79, 173, 114, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = notification.readAt ? '#CDEFD7' : '#4FAD72';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Icon */}
              <div style={{
                width: 'clamp(2.5rem, 5vw, 3rem)',
                height: 'clamp(2.5rem, 5vw, 3rem)',
                borderRadius: '0.5rem',
                background: notification.readAt ? '#F7FAF8' : '#CDEFD7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {NOTIFICATION_ICONS[notification.type] || <Bell size={18} style={{ color: '#4FAD72' }} />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{
                    fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
                    fontWeight: 600,
                    color: '#0F2E23',
                    lineHeight: 1.4,
                  }}>
                    {notification.subject}
                  </h3>
                  {!notification.readAt && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4FAD72',
                      flexShrink: 0,
                      marginTop: '0.25rem',
                    }} />
                  )}
                </div>

                <p style={{
                  fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
                  color: '#1F6F4E',
                  lineHeight: 1.5,
                  marginBottom: 'clamp(0.5rem, 2vw, 0.75rem)',
                }}>
                  {notification.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)', color: '#1F6F4E' }}>
                  <Calendar size={12} />
                  {formatDate(notification.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
