import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { DemoPageForm } from './components/DemoPageForm';
import { DemoPage } from './components/DemoPage';
import type { DemoPage as DemoPageType, DemoPageFormData } from './types';

function AppContent() {
  const navigate = useNavigate();
  const [pages, setPages] = React.useState<DemoPageType[]>(() => {
    const saved = localStorage.getItem('demoPages');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('demoPages', JSON.stringify(pages));
  }, [pages]);

  const handleCreatePage = (data: DemoPageFormData) => {
    const imageUrl = URL.createObjectURL(data.image!);
    const newPage: DemoPageType = {
      id: nanoid(),
      name: data.name,
      imageUrl,
      scriptTag: data.scriptTag,
    };
    setPages(prev => [...prev, newPage]);
    navigate(`/demo/${newPage.id}`);
  };

  return (
      <Routes>
        <Route 
          path="/" 
          element={
            <div className="min-h-screen bg-gray-50 py-12">
              <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-center mb-8">
                  Demo Page Generator
                </h1>
                <DemoPageForm onSubmit={handleCreatePage} />
              </div>
            </div>
          } 
        />
        <Route 
          path="/demo/:id" 
          element={<DemoPage pages={pages} />} 
        />
      </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
