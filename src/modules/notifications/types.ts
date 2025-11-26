export type NotificationCategory = 'auth' | 'security' | 'trip' | 'attendance' | 'sos' | 'system' | 'billing' | 'school';

export interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  category: NotificationCategory;
  data?: Record<string, any>;
  channels?: { email?: boolean; sms?: boolean; push?: boolean; inapp?: boolean };
}
