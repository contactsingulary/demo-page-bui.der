import React, { useEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import type { DemoPage as DemoPageType } from '../types';
import { supabase } from '../lib/supabase';

export function DemoPage() {
  const { id } = useParams();
  const [page, setPage] = useState<DemoPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  // Fetch page data
  useEffect(() => {
    async function fetchPage() {
      try {
        if (!id) return;

        const { data, error } = await supabase
          .from('demo_pages')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPage(data);
      } catch (error) {
        console.error('Error fetching page:', error);
        setError('Failed to load demo page');
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [id]);

  // Clean up scripts when component unmounts or page changes
  useEffect(() => {
    return () => {
      if (scriptContainerRef.current) {
        scriptContainerRef.current.innerHTML = '';
      }
      mountedRef.current = false;
    };
  }, [id]);

  // Load scripts when page data is available
  useEffect(() => {
    if (page && scriptContainerRef.current && !mountedRef.current) {
      mountedRef.current = true;

      // Clean any existing scripts
      scriptContainerRef.current.innerHTML = '';
      
      // Create a temporary div to parse the HTML
      const div = document.createElement('div');
      div.innerHTML = page.script_tag;
      
      // Get all script elements
      const scripts = Array.from(div.getElementsByTagName('script'));
      
      // Function to load script and return a promise
      const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          
          // Set a unique ID for the script based on the demo page ID
          script.id = `demo-script-${page.id}`;
          script.type = 'text/javascript';
          
          if (scriptElement.src) {
            script.onload = () => resolve();
            script.onerror = () => reject();
            script.src = scriptElement.src;
          } else {
            // For inline scripts, wrap the code in an IIFE to avoid global scope pollution
            const wrappedCode = `
              (function() {
                ${scriptElement.textContent}
              })();
            `;
            script.textContent = wrappedCode;
            resolve();
          }
          
          scriptContainerRef.current?.appendChild(script);
        });
      };

      // Load scripts sequentially
      const loadScriptsSequentially = async () => {
        try {
          for (const script of scripts) {
            await loadScript(script as HTMLScriptElement);
          }
        } catch (error) {
          console.error('Error loading scripts:', error);
          setError('Failed to load demo scripts');
        }
      };

      loadScriptsSequentially();
    }
  }, [page?.script_tag, page?.id]);

  useEffect(() => {
    if (page) {
      document.title = page.name;
    }

    return () => {
      document.title = 'Demo Page Builder';
    };
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen relative">
      <img 
        src={page.image_url} 
        alt={page.name}
        className="w-full h-screen object-cover absolute top-0 left-0 -z-10"
      />
      <div 
        ref={scriptContainerRef} 
        id={`script-container-${page.id}`} 
        className="script-container"
      />
    </div>
  );
}