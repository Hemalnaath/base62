export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Url {
  id: number;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
  isPublic: boolean;
  qrCodeDataUrl?: string;
  customAlias?: string | null;
}

export interface ClickEvent {
  id: number;
  url_id: number;
  clicked_at: string;
  ip_address: string;
  country: string;
  city: string;
  device_type: string;
  browser: string;
  os: string;
  referrer: string;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface DeviceClicks {
  device_type: string;
  clicks: number;
}

export interface CountryClicks {
  country: string;
  clicks: number;
}

export interface BrowserClicks {
  browser: string;
  clicks: number;
}

export interface AnalyticsData {
  totalClicks: number;
  lastVisited: string | null;
  recentVisits: ClickEvent[];
  clicksByDay: DailyClicks[];
  clicksByDevice: DeviceClicks[];
  clicksByCountry: CountryClicks[];
  clicksByBrowser: BrowserClicks[];
}
