import puppeteer from 'puppeteer';
import { BehanceImage } from '@/types';

// Function to validate and clean Behance URL
function validateAndCleanUrl(url: string): string {
  try {
    // Remove any query parameters and trailing slashes
    let cleanUrl = url.split('?')[0].replace(/\/+$/, '');

    // Handle search URLs by extracting the first project
    if (cleanUrl.includes('/search/projects')) {
      throw new Error('Please provide a direct Behance project URL instead of a search URL. Example: https://www.behance.net/gallery/123456/Project-Name');
    }

    // Convert short URLs to full gallery URLs
    if (cleanUrl.match(/behance\.net\/gallery\/\d+$/)) {
      return cleanUrl;
    }

    // Handle direct project URLs
    if (cleanUrl.includes('behance.net/gallery/')) {
      return cleanUrl;
    }

    throw new Error('Invalid Behance URL. Please provide a direct project URL. Example: https://www.behance.net/gallery/123456/Project-Name');
  } catch (error) {
    throw error;
  }
}

// Function to extract project ID from Behance URL
export function extractProjectId(url: string): string {
  const cleanUrl = validateAndCleanUrl(url);
  const match = cleanUrl.match(/gallery\/(\d+)/);
  if (!match) {
    throw new Error('Could not extract project ID from URL. Please provide a valid Behance project URL.');
  }
  return match[1];
}

// Function to sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) || 'image';
}

// Function to get highest quality URL
function getHighestQualityUrl(url: string): string {
  if (!url) return '';
  
  // Ensure URL starts with https://
  const cleanUrl = url.replace(/^\/\//, 'https://');
  
  // Try to get the highest quality version
  return cleanUrl
    .replace(/\/fs\/.*?\//, '/original/')
    .replace(/\/200H?\//, '/2000/')
    .replace(/\/400H?\//, '/2000/')
    .replace(/\/600H?\//, '/2000/')
    .replace(/\/800H?\//, '/2000/')
    .replace(/\/1400H?\//, '/2000/')
    .replace(/_200\./g, '_2000.')
    .replace(/_400\./g, '_2000.')
    .replace(/_600\./g, '_2000.')
    .replace(/_800\./g, '_2000.')
    .replace(/_1400\./g, '_2000.');
}

// Function to get file extension from URL or content type
function getExtensionFromUrl(url: string): string {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const urlLower = url.toLowerCase();
  
  for (const ext of extensions) {
    if (urlLower.includes(ext)) {
      return ext;
    }
  }
  
  return '.jpg';
}

// Main function to extract images from Behance project
export async function extractBehanceImages(url: string): Promise<BehanceImage[]> {
  let browser;
  try {
    const projectId = extractProjectId(url);
    const projectUrl = `https://www.behance.net/gallery/${projectId}`;

    // Launch browser with specific options
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to the page
    await page.goto(projectUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Extract project title
    const projectTitle = await page.evaluate(() => {
      const titleMeta = document.querySelector('meta[property="og:title"]');
      return titleMeta?.getAttribute('content') || 'behance_project';
    });

    // Extract all image URLs
    const images: BehanceImage[] = [];
    const seen = new Set<string>();

    const imageUrls = await page.evaluate(() => {
      const urls: string[] = [];
      document.querySelectorAll('img').forEach((img) => {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && src.includes('mir-s3-cdn-cf.behance.net')) {
          urls.push(src);
        }
      });
      return urls;
    });

    // Process found images
    for (const imageUrl of imageUrls) {
      const highQualityUrl = getHighestQualityUrl(imageUrl);
      if (highQualityUrl && !seen.has(highQualityUrl)) {
        seen.add(highQualityUrl);
        images.push({
          url: highQualityUrl,
          filename: `${sanitizeFilename(projectTitle)}_${images.length + 1}${getExtensionFromUrl(highQualityUrl)}`
        });
      }
    }

    // If no images found, try scrolling
    if (images.length === 0) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));

      const moreImageUrls = await page.evaluate(() => {
        const urls: string[] = [];
        document.querySelectorAll('img').forEach((img) => {
          const src = img.src || img.getAttribute('data-src') || '';
          if (src && src.includes('mir-s3-cdn-cf.behance.net')) {
            urls.push(src);
          }
        });
        return urls;
      });

      for (const imageUrl of moreImageUrls) {
        const highQualityUrl = getHighestQualityUrl(imageUrl);
        if (highQualityUrl && !seen.has(highQualityUrl)) {
          seen.add(highQualityUrl);
          images.push({
            url: highQualityUrl,
            filename: `${sanitizeFilename(projectTitle)}_${images.length + 1}${getExtensionFromUrl(highQualityUrl)}`
          });
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images found in the gallery. Please make sure the URL is correct and the project is public.');
    }

    return images;
  } catch (error: any) {
    if (error.message.includes('search/projects')) {
      throw new Error('Please provide a direct Behance project URL instead of a search URL. Example: https://www.behance.net/gallery/123456/Project-Name');
    }
    if (error.message.includes('Invalid Behance URL')) {
      throw new Error('Invalid URL format. Please provide a direct Behance project URL. Example: https://www.behance.net/gallery/123456/Project-Name');
    }
    console.error('Error extracting images:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 