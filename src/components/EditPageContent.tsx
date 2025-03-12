import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { DemoPageForm } from './DemoPageForm';
import type { DemoPage, DemoPageFormData } from '../types';

interface Props {
  pages: DemoPage[];
  onSubmit: (data: DemoPageFormData) => void;
}

export function EditPageContent({ pages, onSubmit }: Props) {
  const { id } = useParams();
  const page = pages.find(p => p.id === id);

  if (!page) {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-4">Page not found</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/demo/${id}`}
          className="text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← Back to Demo Page
        </Link>
      </div>
      <DemoPageForm
        initialData={page}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
} 