import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { ArrowDownTrayIcon, SparklesIcon, ClockIcon, ArrowPathIcon, BeakerIcon, FolderIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useMutation } from 'react-query';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import LoadingSpinner from '@/components/LoadingSpinner';
import { BehanceImage, DownloadResponse, ErrorResponse, RateLimitInfo } from '@/types';
import PreviewModal from '@/components/PreviewModal';
import RateLimitModal from '@/components/RateLimitModal';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Function to record a download
async function recordDownload() {
  try {
    const response = await axios.post('/api/download', { 
      action: 'download'
    });
    return response.data.rateLimit;
  } catch (error) {
    console.error('Error recording download:', error);
    throw error;
  }
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedImages, setDownloadedImages] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<BehanceImage[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [failedDownloads, setFailedDownloads] = useState<string[]>([]);
  const [downloadMode, setDownloadMode] = useState<'individual' | 'zip'>('individual');
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  // Mutation for downloading images
  const downloadMutation = useMutation<DownloadResponse, ErrorResponse, string>(
    async (url: string) => {
      const response = await axios.post('/api/download', { 
        url,
        action: 'search'
      });
      return response.data;
    },
    {
      onSuccess: async (data) => {
        setError('');
        if (data.rateLimit) {
          setRateLimitInfo(data.rateLimit);
        }
        if (data.images?.length > 0) {
          setPreviewImages(data.images);
          setIsPreviewOpen(true);
        } else {
          setError('No images found in this gallery');
        }
        setIsLoading(false);
      },
      onError: (error) => {
        setError(error.error || 'An error occurred');
        setDownloadProgress(0);
        if (error.rateLimit) {
          setRateLimitInfo(error.rateLimit);
          setShowRateLimitModal(true);
        }
        setIsLoading(false);
      }
    }
  );

  // Function to download with retry
  const downloadWithRetry = async (image: BehanceImage, attempt = 1): Promise<Blob | null> => {
    try {
      const response = await axios.get(image.url, { 
        responseType: 'blob',
        headers: {
          'Accept': 'image/webp,image/jpeg,image/png,image/*'
        }
      });
      
      // Record successful download
      const newRateLimit = await recordDownload();
      setRateLimitInfo(newRateLimit);
      
      return new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
    } catch (error) {
      console.error(`Error downloading ${image.filename} (attempt ${attempt}):`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        return downloadWithRetry(image, attempt + 1);
      }
      
      return null;
    }
  };

  // Function to download as ZIP
  const downloadAsZip = async (images: BehanceImage[]) => {
    const zip = new JSZip();
    const failed: string[] = [];
    let completed = 0;

    for (const image of images) {
      try {
        const blob = await downloadWithRetry(image);
        if (blob) {
          // Determine file extension based on content type
          const contentType = blob.type;
          let extension = '.jpg';
          if (contentType.includes('webp')) extension = '.webp';
          else if (contentType.includes('png')) extension = '.png';
          
          // Add file to zip with proper extension
          const filename = image.filename.replace(/\.[^/.]+$/, '') + extension;
          zip.file(filename, blob);
          setDownloadedImages(prev => [...prev, filename]);
        } else {
          failed.push(image.filename);
        }
      } catch (error) {
        failed.push(image.filename);
      }

      completed++;
      setDownloadProgress((completed / images.length) * 100);
    }

    if (failed.length > 0) {
      setFailedDownloads(failed);
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const projectName = images[0]?.filename.split('_')[0] || 'behance-gallery';
      saveAs(content, `${projectName}-gallery.zip`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
    }
  };

  // Function to download individually
  const downloadIndividually = async (images: BehanceImage[]) => {
    const failed: string[] = [];
    let completed = 0;

    for (const image of images) {
      try {
        const blob = await downloadWithRetry(image);
        if (blob) {
          // Determine file extension based on content type
          const contentType = blob.type;
          let extension = '.jpg';
          if (contentType.includes('webp')) extension = '.webp';
          else if (contentType.includes('png')) extension = '.png';
          
          // Save file with proper extension
          const filename = image.filename.replace(/\.[^/.]+$/, '') + extension;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          setDownloadedImages(prev => [...prev, filename]);
        } else {
          failed.push(image.filename);
        }
      } catch (error) {
        failed.push(image.filename);
      }

      completed++;
      setDownloadProgress((completed / images.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (failed.length > 0) {
      setFailedDownloads(failed);
    }
  };

  // Updated download function
  const downloadImages = async (images: BehanceImage[]) => {
    setIsDownloading(true);
    setDownloadedImages([]);
    setDownloadProgress(0);
    setFailedDownloads([]);

    try {
      if (downloadMode === 'zip') {
        await downloadAsZip(images);
      } else {
        await downloadIndividually(images);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to retry failed downloads
  const retryFailedDownloads = async () => {
    const failedImages = previewImages.filter(img => failedDownloads.includes(img.filename));
    await downloadImages(failedImages);
  };

  // Handle modal close
  const handleModalClose = () => {
    // Only close if not currently downloading
    if (!isDownloading) {
      setIsPreviewOpen(false);
      setIsPreviewMinimized(false);
    }
  };

  // Handle modal minimize/maximize
  const togglePreviewMinimize = () => {
    setIsPreviewMinimized(!isPreviewMinimized);
  };

  // Handle download confirmation
  const handleDownload = async (selectedImages: BehanceImage[]) => {
    if (selectedImages.length === 0) return;
    
    // Check rate limit before downloading
    if (rateLimitInfo && rateLimitInfo.remaining < selectedImages.length) {
      setShowRateLimitModal(true);
      return;
    }

    setIsPreviewMinimized(true);
    await downloadImages(selectedImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDownloadProgress(0);
    setDownloadedImages([]);
    setIsLoading(true);
    downloadMutation.mutate(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Head>
        <title>BEDOW - Behance Gallery Downloader</title>
        <meta name="description" content="Download high-quality Behance gallery images with ease" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8 sm:py-16 relative">
        {/* Enhanced Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-20"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              Behance Gallery Downloader
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Download high-resolution artwork from Behance galleries with just one click. Fast, simple, and efficient.
            </p>
          </motion.div>

          {/* Enhanced URL Input Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="max-w-2xl mx-auto mb-8 sm:mb-12 px-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-lg rounded-lg overflow-hidden bg-white p-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your Behance gallery URL here"
                className="flex-1 px-4 py-3 border-0 focus:ring-2 focus:ring-blue-500 rounded-lg text-base sm:text-lg"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>Download Gallery</span>
                  </>
                )}
              </button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 text-red-500 bg-red-50 p-3 rounded-lg text-sm sm:text-base"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Enhanced Download Progress */}
          <AnimatePresence>
            {downloadProgress > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto mb-8 sm:mb-12 bg-white p-4 sm:p-6 rounded-xl shadow-lg"
              >
                <div className="mb-4">
                  <div className="flex justify-between text-sm sm:text-base text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600">
                    Downloaded: {downloadedImages.length} images
                  </span>
                  {failedDownloads.length > 0 && (
                    <button
                      onClick={retryFailedDownloads}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      <span>Retry {failedDownloads.length} Failed</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Free Plan Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-4xl mx-auto mb-12 sm:mb-20 px-4"
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Free Plan</h2>
                <p className="text-gray-600">Start downloading high-quality images instantly</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-6 text-center">
                  <ClockIcon className="h-8 sm:h-10 w-8 sm:w-10 mx-auto mb-4 text-blue-600" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">20</p>
                  <p className="text-sm text-gray-600">Downloads per hour</p>
                </div>
                <div className="p-6 text-center">
                  <SparklesIcon className="h-8 sm:h-10 w-8 sm:w-10 mx-auto mb-4 text-blue-600" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">High</p>
                  <p className="text-sm text-gray-600">Quality downloads</p>
                </div>
                <div className="p-6 text-center">
                  <ArrowDownTrayIcon className="h-8 sm:h-10 w-8 sm:w-10 mx-auto mb-4 text-blue-600" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Bulk</p>
                  <p className="text-sm text-gray-600">Download support</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Enhanced Features Section */}
        <section className="mb-12 sm:mb-20 px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Why Choose Our Downloader?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.8 }}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-sm sm:text-base">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Enhanced Premium Promotion */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 }}
          className="relative overflow-hidden rounded-3xl mx-4 mb-12 sm:mb-20"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
          <div className="relative p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Want Unlimited Downloads?</h2>
            <p className="text-lg sm:text-xl mb-8 opacity-90">Get our Chrome Extension for lifetime unlimited downloads and premium features!</p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-2 mx-auto"
            >
              <span>Get Chrome Extension - $9.99</span>
              <ChevronRightIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.section>

        {/* Buy Me a Coffee Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="max-w-4xl mx-auto px-4 mb-12 sm:mb-20"
        >
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">☕</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Support the Project</h2>
              <p className="text-gray-600 mb-8">If you find this tool helpful, consider buying me a coffee!</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold mb-2">Contact Developer</h3>
                  <a 
                    href="https://t.me/iamyohannes" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.411-.168.557-.337.717-.505.733-.421.033-.739-.277-1.147-.545-.637-.41-1.002-.666-1.62-1.064-.719-.452-.252-.7.157-.1.106.156 1.085 1.067 1.085 1.067s.276-.345.276-.345c-.473-.45-1.053-.994-1.531-1.442-.424-.398-.848-.134-1.272.267-.211.2-2.721 1.916-3.115 2.182-.379.256-.758.384-1.137.384-.379 0-1.137-.384-1.137-.384s-1.516-.878-2.274-1.318c-.758-.44-.379-.88 0-1.318.379-.44 4.832-3.076 7.106-4.394 2.274-1.318 3.79-1.758 4.548-1.758.758 0 1.516.44 1.516 1.318 0 .44-.379.88-.379.88z"/>
                    </svg>
                    <span>@iamyohannes</span>
                  </a>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold mb-2">Crypto Donations</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('1H5iZ7hFNPRurxPcvixKvZc777LgdhN38e');
                        // You might want to add a toast notification here
                      }}
                      className="w-full text-left px-3 py-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="font-medium">BTC</div>
                      <div className="text-gray-500 truncate">1H5iZ7hFNPRurxPcvixKvZc777LgdhN38e</div>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('TPAnV7KMncWsnfeT9LxcWmERV5tVc5dmtS');
                        // You might want to add a toast notification here
                      }}
                      className="w-full text-left px-3 py-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="font-medium">USDT (TRC20)</div>
                      <div className="text-gray-500 truncate">TPAnV7KMncWsnfeT9LxcWmERV5tVc5dmtS</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Enhanced Footer */}
      <footer className="container mx-auto px-4 py-6 sm:py-8 mt-12 sm:mt-20 border-t">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm sm:text-base">© 2024 BEDOW. made by @iamyohannes</p>
          <div className="flex gap-4 text-sm sm:text-base">
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Minimized Preview Button */}
      {isPreviewMinimized && (
        <button
          onClick={togglePreviewMinimize}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2 z-40 text-sm sm:text-base"
        >
          <span>Show Preview</span>
          {isDownloading && (
            <span className="text-sm">
              ({Math.round(downloadProgress)}%)
            </span>
          )}
        </button>
      )}

      {/* Rate Limit Status */}
      {rateLimitInfo && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-40">
          <div className="text-sm sm:text-base text-gray-600">
            Downloads remaining: {rateLimitInfo.remaining} of {rateLimitInfo.limit}
          </div>
          <div className="h-1 sm:h-2 bg-gray-200 rounded-full mt-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
              style={{
                width: `${((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <PreviewModal
        images={previewImages}
        isOpen={isPreviewOpen && !isPreviewMinimized}
        onClose={handleModalClose}
        onConfirm={handleDownload}
        onMinimize={togglePreviewMinimize}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        downloadMode={downloadMode}
        onDownloadModeChange={setDownloadMode}
        failedDownloads={failedDownloads}
      />

      {rateLimitInfo && (
        <RateLimitModal
          isOpen={showRateLimitModal}
          onClose={() => setShowRateLimitModal(false)}
          rateLimit={rateLimitInfo}
        />
      )}
    </div>
  );
}

const features = [
  {
    icon: "🎯",
    title: "Smart Filtering",
    description: "Automatically filters out profile pictures and icons, downloading only the content you want."
  },
  {
    icon: "⚡",
    title: "Instant Processing",
    description: "Quick processing and download of multiple images at once."
  },
  {
    icon: "📁",
    title: "Organized Downloads",
    description: "Downloads are automatically organized by project name for easy access."
  }
]; 