export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: ServiceStatus;
  uptime: number; // percentage
  latency?: number; // ms
  lastChecked: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'monitoring' | 'resolved';
  startedAt: string;
  resolvedAt?: string;
  affectedServices: string[];
}

export const STATUS_COLORS: Record<ServiceStatus, string> = {
  operational: '#22C55E',
  degraded: '#F59E0B',
  outage: '#EF4444',
  maintenance: '#6B7280',
};

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  operational: 'يعمل بشكل طبيعي',
  degraded: 'أداء متدهور',
  outage: 'توقف عن العمل',
  maintenance: 'صيانة مجدولة',
};

export const STATUS_ICONS: Record<ServiceStatus, string> = {
  operational: 'check-circle',
  degraded: 'warning',
  outage: 'error',
  maintenance: 'build',
};

// Mock service status - in production this would be fetched from a real endpoint
export function fetchServiceStatuses(): ServiceItem[] {
  return [
    { id: 'api', name: 'واجهة API الرئيسية', description: 'خدمة API الأساسية للتطبيق', icon: 'api', status: 'operational', uptime: 99.9, latency: 45, lastChecked: new Date().toISOString() },
    { id: 'database', name: 'قاعدة البيانات', description: 'PostgreSQL عبر OnSpace Cloud', icon: 'storage', status: 'operational', uptime: 99.95, latency: 12, lastChecked: new Date().toISOString() },
    { id: 'auth', name: 'نظام المصادقة', description: 'تسجيل الدخول والتسجيل', icon: 'security', status: 'operational', uptime: 99.8, latency: 67, lastChecked: new Date().toISOString() },
    { id: 'storage', name: 'مخزن الملفات', description: 'رفع وتخزين الوسائط', icon: 'folder', status: 'operational', uptime: 99.7, latency: 89, lastChecked: new Date().toISOString() },
    { id: 'ai', name: 'خدمات الذكاء الاصطناعي', description: 'توليد الصور والنصوص', icon: 'auto-awesome', status: 'operational', uptime: 98.5, latency: 1200, lastChecked: new Date().toISOString() },
    { id: 'email', name: 'البريد الإلكتروني', description: 'إرسال الإشعارات والتحقق', icon: 'email', status: 'operational', uptime: 99.6, lastChecked: new Date().toISOString() },
    { id: 'notifications', name: 'الإشعارات الفورية', description: 'إشعارات التطبيق', icon: 'notifications', status: 'operational', uptime: 99.2, lastChecked: new Date().toISOString() },
    { id: 'search', name: 'محرك البحث', description: 'البحث في الأدوات والمحتوى', icon: 'search', status: 'operational', uptime: 99.5, lastChecked: new Date().toISOString() },
    { id: 'cdn', name: 'شبكة توصيل المحتوى', description: 'تسريع تحميل الأصول', icon: 'cloud', status: 'operational', uptime: 99.9, latency: 23, lastChecked: new Date().toISOString() },
  ];
}

export function fetchRecentIncidents(): Incident[] {
  return [
    {
      id: 'inc1',
      title: 'تأخر في بعض طلبات الذكاء الاصطناعي',
      description: 'لاحظنا تأخراً في الاستجابة لطلبات توليد الصور. تم حل المشكلة.',
      status: 'resolved',
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString(),
      affectedServices: ['ai'],
    },
    {
      id: 'inc2',
      title: 'صيانة مجدولة لقاعدة البيانات',
      description: 'صيانة دورية لتحسين الأداء وتحديث الإصدار.',
      status: 'resolved',
      startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 13.8 * 24 * 60 * 60 * 1000).toISOString(),
      affectedServices: ['database', 'api'],
    },
  ];
}

export function getOverallStatus(services: ServiceItem[]): ServiceStatus {
  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  return 'operational';
}
