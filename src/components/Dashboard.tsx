import React from 'react';
import { Link } from 'react-router-dom';
import type { DemoPage } from '../types';

interface Props {
  pages: DemoPage[];
  onDelete?: (id: string) => void;
}

export function Dashboard({ pages, onDelete }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Demo Pages</h1>
          <Link 
            to="/create" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Page
          </Link>
        </div>
        
        {pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No demo pages created yet</p>
            <Link 
              to="/create" 
              className="text-blue-600 hover:text-blue-700"
            >
              Create your first demo page
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(page => (
              <div 
                key={page.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="aspect-video relative">
                  <img 
                    src={page.image_url} 
                    alt={page.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{page.name}</h3>
                  <div className="text-sm text-gray-500 mb-4">
                    Created: {new Date(page.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex justify-between items-center">
                    <Link 
                      to={`/demo/${page.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      View Demo
                    </Link>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(page.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 