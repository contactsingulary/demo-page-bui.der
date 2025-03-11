import React, { useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import type { DemoPage as DemoPageType } from '../types';

interface Props {
  pages: DemoPageType[];
}

export function DemoPage({ pages }: Props) {
  const { id } = useParams();
  const page = pages.find(p => p.id === id);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (page && scriptContainerRef.current && !mountedRef.current) {
      mountedRef.current = true;

      // Clear any existing scripts
      scriptContainerRef.current.innerHTML = '';
      
      // Create a temporary div to parse the HTML
      const div = document.createElement('div');
      div.innerHTML = page.scriptTag;
      
      // Get all script elements
      const scripts = Array.from(div.getElementsByTagName('script'));
      
      // Function to load script and return a promise
      const loadScript = (scriptElement: HTMLScriptElement): Promise<void> => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          
          if (scriptElement.src) {
            script.onload = () => resolve();
            script.onerror = () => reject();
            script.src = scriptElement.src;
          } else {
            script.textContent = scriptElement.textContent;
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
        }
      };

      loadScriptsSequentially();

      // Cleanup function
      return () => {
        if (scriptContainerRef.current) {
          scriptContainerRef.current.innerHTML = '';
        }
        mountedRef.current = false;
      };
    }
  }, [page?.scriptTag]);

  useEffect(() => {
    if (page) {
      document.title = page.name;
    }
  }, [page]);

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen relative">
      <img 
        src={page.imageUrl} 
        alt={page.name}
        className="w-full h-screen object-cover absolute top-0 left-0 -z-10"
      />
      <div ref={scriptContainerRef} id="script-container" />
    </div>
  );
}