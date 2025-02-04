import { NextApiRequest, NextApiResponse } from 'next';
import { parseISO, subHours, addHours } from 'date-fns';
import { extractBehanceImages } from '@/utils/behanceExtractor';
import { BehanceImage, RateLimitInfo } from '@/types';
import axios, { AxiosError } from 'axios';

const HOURLY_LIMIT = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory store for rate limiting
// In production, use Redis or a database
interface RateLimitStore {
  [ip: string]: {
    downloads: string[];
    resetTime: string;
  };
}

const rateLimitStore: RateLimitStore = {};

// Cleanup function to remove expired rate limit entries
function cleanupRateLimitStore() {
  const now = new Date();
  Object.keys(rateLimitStore).forEach(ip => {
    if (new Date(rateLimitStore[ip].resetTime) < now) {
      delete rateLimitStore[ip];
    }
  });
}

// Run cleanup every hour
setInterval(cleanupRateLimitStore, RATE_LIMIT_WINDOW);

// Function to get rate limit info
function getRateLimitInfo(clientIp: string): RateLimitInfo {
  const now = new Date();
  const store = rateLimitStore[clientIp];
  
  if (!store || new Date(store.resetTime) < now) {
    // Initialize or reset rate limit
    rateLimitStore[clientIp] = {
      downloads: [],
      resetTime: addHours(now, 1).toISOString()
    };
    return {
      used: 0,
      limit: HOURLY_LIMIT,
      remaining: HOURLY_LIMIT,
      resetTime: rateLimitStore[clientIp].resetTime
    };
  }

  // Clean up old downloads within the current window
  store.downloads = store.downloads.filter(timestamp => 
    new Date(timestamp) > subHours(now, 1)
  );

  const used = store.downloads.length;
  return {
    used,
    limit: HOURLY_LIMIT,
    remaining: Math.max(0, HOURLY_LIMIT - used),
    resetTime: store.resetTime
  };
}

// Function to check rate limit without updating
function checkRateLimitOnly(clientIp: string): { allowed: boolean; info: RateLimitInfo } {
  const info = getRateLimitInfo(clientIp);
  return { allowed: info.remaining > 0, info };
}

// Function to record a download
function recordDownload(clientIp: string): RateLimitInfo {
  const store = rateLimitStore[clientIp];
  if (!store) return getRateLimitInfo(clientIp);
  
  store.downloads.push(new Date().toISOString());
  return getRateLimitInfo(clientIp);
}

// Get client IP with fallback options
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded : forwarded[0])
    : req.socket.remoteAddress;
  return ip || 'unknown';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { url, action = 'search' } = req.body;
      const clientIp = getClientIp(req);

      if (!url) {
        return res.status(400).json({ 
          error: 'URL is required',
          rateLimit: getRateLimitInfo(clientIp)
        });
      }

      if (!url.includes('behance.net/gallery')) {
        return res.status(400).json({ 
          error: 'Invalid Behance gallery URL',
          rateLimit: getRateLimitInfo(clientIp)
        });
      }

      // For search action, just check the limit without counting
      if (action === 'search') {
        const { allowed, info } = checkRateLimitOnly(clientIp);
        if (!allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded. Please try again later or upgrade to our Chrome extension for unlimited downloads.',
            rateLimit: info
          });
        }

        try {
          const images = await extractBehanceImages(url);
          if (images.length > 0) {
            return res.status(200).json({
              message: 'Success',
              images: images.map(img => ({
                ...img,
                url: img.url.replace(/^\/\//, 'https://') // Ensure URLs have protocol
              })),
              rateLimit: info
            });
          }
        } catch (error) {
          console.error('Server-side extraction failed:', error);
          return res.status(200).json({
            message: 'Please use client-side download',
            useClientDownload: true,
            rateLimit: info,
            instructions: {
              selectors: [
                'img[src*="mir-s3-cdn-cf.behance.net"]',
                'img[data-src*="mir-s3-cdn-cf.behance.net"]',
                'img[srcset*="mir-s3-cdn-cf.behance.net"]',
                '[style*="background-image"][style*="mir-s3-cdn-cf.behance.net"]',
                'source[srcset*="mir-s3-cdn-cf.behance.net"]'
              ],
              qualityReplacements: [
                { from: /\/fs\/.*?\//, to: '/original/' },
                { from: /\/[2-8]00\//, to: '/2000/' }
              ]
            }
          });
        }
      }
      
      // For download action, check and update the limit
      if (action === 'download') {
        const { allowed, info } = checkRateLimitOnly(clientIp);
        if (!allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded. Please try again later or upgrade to our Chrome extension for unlimited downloads.',
            rateLimit: info
          });
        }

        // Record the download and get updated info
        const updatedInfo = recordDownload(clientIp);
        return res.status(200).json({
          message: 'Download recorded',
          rateLimit: updatedInfo
        });
      }

    } catch (error) {
      console.error('Download error:', error);
      const clientIp = getClientIp(req);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        useClientDownload: true,
        rateLimit: getRateLimitInfo(clientIp)
      });
    }
  }

  return res.status(405).json({ 
    error: 'Method not allowed',
    rateLimit: getRateLimitInfo(getClientIp(req))
  });
} 