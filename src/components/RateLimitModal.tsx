import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { RateLimitInfo } from '@/types';
import { XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateLimit: RateLimitInfo;
}

export default function RateLimitModal({ isOpen, onClose, rateLimit }: RateLimitModalProps) {
  const [copiedBTC, setCopiedBTC] = useState(false);
  const [copiedUSDT, setCopiedUSDT] = useState(false);

  const handleCopy = async (text: string, type: 'BTC' | 'USDT') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'BTC') {
        setCopiedBTC(true);
        setTimeout(() => setCopiedBTC(false), 2000);
      } else {
        setCopiedUSDT(true);
        setTimeout(() => setCopiedUSDT(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                    Download Limit Reached
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-red-50 rounded-lg p-4 mb-4">
                    <p className="text-red-600">
                      You've used {rateLimit.used} of your {rateLimit.limit} hourly downloads.
                    </p>
                    <p className="text-sm text-red-500 mt-1">
                      Next reset: {new Date(rateLimit.resetTime).toLocaleString()}
                    </p>
                  </div>

                  {/* Extension Promotion */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 mb-6">
                    <h4 className="text-xl font-semibold mb-2">Get Unlimited Downloads!</h4>
                    <p className="text-sm opacity-90 mb-4">
                      Upgrade to our Chrome Extension for lifetime unlimited downloads and premium features.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                    >
                      <span>Get Chrome Extension - $9.99</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h4 className="font-medium mb-2">Contact Developer</h4>
                    <a 
                      href="https://t.me/iamyohannes" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.411-.168.557-.337.717-.505.733-.421.033-.739-.277-1.147-.545-.637-.41-1.002-.666-1.62-1.064-.719-.452-.252-.7.157-.1.106.156 1.085 1.067 1.085 1.067s.276-.345.276-.345c-.473-.45-1.053-.994-1.531-1.442-.424-.398-.848-.134-1.272.267-.211.2-2.721 1.916-3.115 2.182-.379.256-.758.384-1.137.384-.379 0-1.137-.384-1.137-.384s-1.516-.878-2.274-1.318c-.758-.44-.379-.88 0-1.318.379-.44 4.832-3.076 7.106-4.394 2.274-1.318 3.79-1.758 4.548-1.758.758 0 1.516.44 1.516 1.318 0 .44-.379.88-.379.88z"/>
                      </svg>
                      <span>@iamyohannes</span>
                    </a>
                  </div>

                  {/* Donation Options */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Support the Project</h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <button
                        onClick={() => handleCopy('1H5iZ7hFNPRurxPcvixKvZc777LgdhN38e', 'BTC')}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors text-left relative group"
                      >
                        <div className="font-medium mb-1 flex justify-between items-center">
                          <span>BTC Wallet</span>
                          <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {copiedBTC ? 'Copied!' : 'Click to copy'}
                          </span>
                        </div>
                        <div className="text-gray-600 break-all text-xs sm:text-sm font-mono bg-gray-50 p-2 rounded select-all">
                          1H5iZ7hFNPRurxPcvixKvZc777LgdhN38e
                        </div>
                      </button>
                      <button
                        onClick={() => handleCopy('TPAnV7KMncWsnfeT9LxcWmERV5tVc5dmtS', 'USDT')}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors text-left relative group"
                      >
                        <div className="font-medium mb-1 flex justify-between items-center">
                          <span>USDT (TRC20)</span>
                          <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {copiedUSDT ? 'Copied!' : 'Click to copy'}
                          </span>
                        </div>
                        <div className="text-gray-600 break-all text-xs sm:text-sm font-mono bg-gray-50 p-2 rounded select-all">
                          TPAnV7KMncWsnfeT9LxcWmERV5tVc5dmtS
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function CheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
} 