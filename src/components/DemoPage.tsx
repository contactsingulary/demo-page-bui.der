import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import type { DemoPage as DemoPageType } from '../types';

interface Props {
  pages: DemoPageType[];
}

export function DemoPage({ pages }: Props) {
  const { id } = useParams();
  const page = pages.find(p => p.id === id);

  useEffect(() => {
    if (page) {
      // Create a temporary div to parse the HTML
      const div = document.createElement('div');
      div.innerHTML = page.scriptTag;
      
      // Get all script elements
      const scripts = div.getElementsByTagName('script');
      const scriptElements: HTMLScriptElement[] = [];
      
      // Add each script to the head
      Array.from(scripts).forEach(oldScript => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        if (oldScript.src) {
          script.src = oldScript.src;
        }
        script.innerHTML = oldScript.innerHTML;
        document.head.appendChild(script);
        scriptElements.push(script);
      });
      
      // Cleanup function
      return () => {
        scriptElements.forEach(script => {
          document.head.removeChild(script);
        });
      }
    }
  }, [page?.scriptTag]);

  useEffect(() => {
    if (page) {
      // Set page title
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
    </div>
  );
}