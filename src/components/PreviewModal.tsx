import React, { useState, useEffect, useCallback } from 'react';
import { BehanceImage } from '@/types';
import { XMarkIcon, CheckCircleIcon, MinusIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewModalProps {
  images: BehanceImage[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedImages: BehanceImage[]) => void;
  onMinimize: () => void;
  isDownloading: boolean;
  downloadProgress: number;
  downloadMode: 'individual' | 'zip';
  onDownloadModeChange: (mode: 'individual' | 'zip') => void;
  failedDownloads: string[];
}

const ZoomView = ({ image, onClose, onPrev, onNext, hasPrev, hasNext }: { 
  image: BehanceImage; 
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 md:top-8 md:right-8"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-2 md:left-8 text-white hover:text-gray-300 p-2"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
        
        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-2 md:right-8 text-white hover:text-gray-300 p-2"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}

        <div className="w-full max-w-6xl">
          <img
            src={image.url}
            alt={image.filename}
            className="max-w-full max-h-[85vh] object-contain mx-auto"
          />
          <div className="absolute bottom-4 left-0 right-0 text-white text-sm text-center">
            {image.filename}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PreviewModal({ 
  images, 
  isOpen, 
  onClose, 
  onConfirm, 
  onMinimize,
  isDownloading,
  downloadProgress,
  downloadMode,
  onDownloadModeChange,
  failedDownloads
}: PreviewModalProps) {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [filteredImages, setFilteredImages] = useState<BehanceImage[]>([]);
  const [zoomedImage, setZoomedImage] = useState<BehanceImage | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    skipIcons: true,
    skipProfiles: true,
    minWidth: 800,
  });

  // Enhanced image filtering
  const filterImages = useCallback(() => {
    // Common patterns for icons, logos, and small images
    const iconPatterns = [
      /icon/i,
      /logo/i,
      /thumb/i,
      /svg/i,
      /badge/i,
      /button/i,
      /small/i,
      /favicon/i,
      /symbol/i,
    ];

    // Profile image patterns
    const profilePatterns = [
      /profile/i,
      /avatar/i,
      /user-pic/i,
      /user-image/i,
      /portrait/i,
      /headshot/i,
    ];

    const filtered = images.filter(image => {
      const url = image.url.toLowerCase();
      const filename = image.filename.toLowerCase();

      // Skip icons and logos
      if (filters.skipIcons && iconPatterns.some(pattern => pattern.test(url) || pattern.test(filename))) {
        return false;
      }

      // Skip profile pictures
      if (filters.skipProfiles && profilePatterns.some(pattern => pattern.test(url) || pattern.test(filename))) {
        return false;
      }

      // Skip images with small dimensions in URL
      const dimensionMatch = url.match(/\/(\d+)x(\d+)\//);
      if (dimensionMatch) {
        const [, width, height] = dimensionMatch;
        if (parseInt(width) < filters.minWidth || parseInt(height) < filters.minWidth) {
          return false;
        }
      }

      return true;
    });

    setFilteredImages(filtered);
  }, [images, filters]);

  useEffect(() => {
    filterImages();
  }, [filterImages]);

  // Toggle image selection
  const toggleImage = (url: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedImages(newSelected);
  };

  // Select/Deselect all
  const toggleAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.url)));
    }
  };

  // Handle modal click
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle image zoom
  const handleImageZoom = (e: React.MouseEvent, image: BehanceImage) => {
    e.stopPropagation();
    setZoomedImage(image);
  };

  const handlePrevImage = () => {
    if (!zoomedImage) return;
    const currentIndex = filteredImages.findIndex(img => img.url === zoomedImage.url);
    if (currentIndex > 0) {
      setZoomedImage(filteredImages[currentIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (!zoomedImage) return;
    const currentIndex = filteredImages.findIndex(img => img.url === zoomedImage.url);
    if (currentIndex < filteredImages.length - 1) {
      setZoomedImage(filteredImages[currentIndex + 1]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Preview Images</h2>
            <p className="text-sm text-gray-500 hidden sm:block">
              Select images to download
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <FilterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Minimize"
            >
              <MinusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls - Desktop */}
        <div className="hidden md:block border-b">
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.skipIcons}
                  onChange={e => setFilters(f => ({ ...f, skipIcons: e.target.checked }))}
                  className="rounded text-blue-600"
                />
                <span className="text-sm">Skip Icons & Small Images</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.skipProfiles}
                  onChange={e => setFilters(f => ({ ...f, skipProfiles: e.target.checked }))}
                  className="rounded text-blue-600"
                />
                <span className="text-sm">Skip Profile Pictures</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Min Width:</span>
                <select
                  value={filters.minWidth}
                  onChange={e => setFilters(f => ({ ...f, minWidth: Number(e.target.value) }))}
                  className="text-sm border-gray-300 rounded-md"
                >
                  <option value={400}>400px</option>
                  <option value={800}>800px</option>
                  <option value={1200}>1200px</option>
                  <option value={1600}>1600px</option>
                </select>
              </div>
              <button
                onClick={toggleAll}
                className="ml-auto text-blue-600 hover:text-blue-700 text-sm"
              >
                {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls - Mobile */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-b overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.skipIcons}
                    onChange={e => setFilters(f => ({ ...f, skipIcons: e.target.checked }))}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">Skip Icons & Small Images</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.skipProfiles}
                    onChange={e => setFilters(f => ({ ...f, skipProfiles: e.target.checked }))}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">Skip Profile Pictures</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Min Width:</span>
                  <select
                    value={filters.minWidth}
                    onChange={e => setFilters(f => ({ ...f, minWidth: Number(e.target.value) }))}
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value={400}>400px</option>
                    <option value={800}>800px</option>
                    <option value={1200}>1200px</option>
                    <option value={1600}>1600px</option>
                  </select>
                </div>
                <button
                  onClick={toggleAll}
                  className="w-full py-2 text-blue-600 hover:text-blue-700 text-sm border rounded-lg"
                >
                  {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Grid */}
        <div className="overflow-y-auto p-4 max-h-[calc(100vh-16rem)] sm:max-h-[60vh]">
          {filteredImages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No images match the current filters
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredImages.map((image, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden aspect-video ${
                    selectedImages.has(image.url) ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  <div onClick={() => toggleImage(image.url)}>
                    <img
                      src={image.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm truncate">
                      {image.filename}
                    </div>
                    {selectedImages.has(image.url) && (
                      <div className="absolute top-2 right-2">
                        <CheckCircleIcon className="w-6 h-6 text-blue-600 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleImageZoom(e, image)}
                    className="absolute top-2 left-2 p-1 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Zoom"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t">
          {isDownloading && (
            <div className="px-4 pt-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Downloading... {Math.round(downloadProgress)}%
                {failedDownloads.length > 0 && (
                  <span className="text-red-500 ml-2">
                    ({failedDownloads.length} failed)
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className="p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-sm text-gray-600">
                {selectedImages.size} of {filteredImages.length} selected
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Download as:</label>
                <select
                  value={downloadMode}
                  onChange={(e) => onDownloadModeChange(e.target.value as 'individual' | 'zip')}
                  className="text-sm border-gray-300 rounded-md"
                  disabled={isDownloading}
                >
                  <option value="individual">Individual Files</option>
                  <option value="zip">ZIP Archive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isDownloading}
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(filteredImages.filter(img => selectedImages.has(img.url)))}
                disabled={selectedImages.size === 0 || isDownloading}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {isDownloading ? 'Downloading...' : `Download ${selectedImages.size} Selected`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom View */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ZoomView
              image={zoomedImage}
              onClose={() => setZoomedImage(null)}
              onPrev={handlePrevImage}
              onNext={handleNextImage}
              hasPrev={filteredImages.indexOf(zoomedImage) > 0}
              hasNext={filteredImages.indexOf(zoomedImage) < filteredImages.length - 1}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
} 