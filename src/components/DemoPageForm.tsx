import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import type { DemoPage, DemoPageFormData } from '../types';

interface Props {
  onSubmit: (data: DemoPageFormData) => void;
  initialData?: DemoPage;
  submitLabel?: string;
}

export function DemoPageForm({ onSubmit, initialData, submitLabel = 'Create Demo Page' }: Props) {
  const [formData, setFormData] = useState<DemoPageFormData>({
    name: initialData?.name || '',
    image: null,
    scriptTag: initialData?.script_tag || '',
  });
  const [preview, setPreview] = useState<string | null>(initialData?.image_url || null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        image: null,
        scriptTag: initialData.script_tag,
      });
      setPreview(initialData.image_url);
    }
  }, [initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData && !formData.image) {
      alert('Please upload an image');
      return;
    }
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Page Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter page name"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Hero Screenshot
        </label>
        <label
          htmlFor="image"
          className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
        >
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600 justify-center">
              <span className="text-blue-600 hover:text-blue-500">
                {initialData ? 'Change image' : 'Upload a file'}
              </span>
              <input
                id="image"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        </label>
        {preview && (
          <div className="mt-4">
            <img src={preview} alt="Preview" className="max-h-48 mx-auto" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="scriptTag" className="block text-sm font-medium text-gray-700">
          Script Tag
        </label>
        <textarea
          id="scriptTag"
          value={formData.scriptTag}
          onChange={e => setFormData(prev => ({ ...prev, scriptTag: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter script tag"
          rows={4}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}