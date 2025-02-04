export interface BehanceImage {
  url: string;
  filename: string;
}

export interface RateLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

export interface DownloadResponse {
  message: string;
  remainingDownloads: number;
  images: BehanceImage[];
  useClientDownload?: boolean;
  rateLimit?: RateLimitInfo;
  instructions?: {
    selectors: string[];
    qualityReplacements: {
      from: RegExp;
      to: string;
    }[];
  };
}

export interface ErrorResponse {
  error: string;
  remainingTime?: number;
  useClientDownload?: boolean;
  rateLimit?: RateLimitInfo;
}

export interface PremiumPromotion {
  title: string;
  description: string;
  features: string[];
  price: number;
  ctaText: string;
  ctaLink: string;
} 