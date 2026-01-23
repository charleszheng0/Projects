"use client";

import { useEffect } from "react";

/**
 * Client-side clipboard polyfill
 * Prevents hydration errors by running only on the client
 */
export function ClipboardPolyfill() {
  useEffect(() => {
    // Polyfill for navigator.clipboard to prevent errors in third-party scripts
    if (typeof navigator !== 'undefined' && !navigator.clipboard) {
      (navigator as any).clipboard = {
        writeText: function(text: string) {
          return new Promise<void>(function(resolve, reject) {
            try {
              // Fallback to execCommand if clipboard API not available
              const textarea = document.createElement('textarea');
              textarea.value = text;
              textarea.style.position = 'fixed';
              textarea.style.left = '-999999px';
              document.body.appendChild(textarea);
              textarea.select();
              const success = document.execCommand('copy');
              document.body.removeChild(textarea);
              if (success) {
                resolve();
              } else {
                reject(new Error('Failed to copy text'));
              }
            } catch (err) {
              reject(err);
            }
          });
        },
        readText: function() {
          return Promise.reject(new Error('readText not supported'));
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
}

