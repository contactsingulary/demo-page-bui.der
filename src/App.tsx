import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { DemoPageForm } from './components/DemoPageForm';
import { DemoPage } from './components/DemoPage';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { supabase, uploadImage, deleteImage, signOut } from './lib/supabase';
import type { DemoPage as DemoPageType, DemoPageFormData } from './types';
import { User } from '@supabase/supabase-js';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
      if (!session?.user) {
        navigate('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function AppContent() {
  const navigate = useNavigate();
  const [pages, setPages] = React.useState<DemoPageType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);

  // Check for user session on mount
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch pages from Supabase
  React.useEffect(() => {
    if (!user) return;

    async function fetchPages() {
      try {
        const { data, error } = await supabase
          .from('demo_pages')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPages(data || []);
      } catch (error) {
        console.error('Error fetching pages:', error);
        setError('Failed to load pages. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchPages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('demo_pages_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'demo_pages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPages(prev => [payload.new as DemoPageType, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setPages(prev => prev.filter(page => page.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreatePage = async (data: DemoPageFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        throw new Error('You must be logged in to create a page');
      }
      
      console.log('Starting page creation...');
      console.log('Current user:', user);
      
      // Upload image to Supabase Storage
      console.log('Uploading image...');
      const imageUrl = await uploadImage(data.image!);
      console.log('Image uploaded successfully:', imageUrl);

      // Create page in Supabase
      console.log('Creating page in database with user_id:', user.id);
      const { data: newPage, error } = await supabase
        .from('demo_pages')
        .insert([
          {
            name: data.name,
            image_url: imageUrl,
            script_tag: data.scriptTag,
            user_id: user.id
          }
        ])
        .select('id, name, image_url, script_tag, created_at, user_id')
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      console.log('Page created successfully:', newPage);
      navigate(`/demo/${newPage.id}`);
    } catch (error) {
      console.error('Detailed error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create page. Please try again.');
      
      // Try to clean up the uploaded image if page creation failed
      if (typeof imageUrl !== 'undefined') {
        try {
          await deleteImage(imageUrl);
        } catch (cleanupError) {
          console.error('Failed to clean up image:', cleanupError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get page data to get image URL
      const { data: page, error: fetchError } = await supabase
        .from('demo_pages')
        .select('image_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (page?.image_url) {
        await deleteImage(page.image_url);
      }

      // Delete page from Supabase
      const { error } = await supabase
        .from('demo_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting page:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div>
      <Routes>
        {/* Public Routes */}
        <Route path="/demo/:id" element={<DemoPage />} />
        <Route path="/login" element={<Login onSuccess={() => navigate('/')} />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>
                <div className="bg-white shadow">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                      <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                          <h1 className="text-xl font-bold">Demo Page Builder</h1>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={handleSignOut}
                          className="ml-4 px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <Dashboard pages={pages} onDelete={handleDeletePage} />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4">
                  <h1 className="text-3xl font-bold text-center mb-8">
                    Create Demo Page
                  </h1>
                  <DemoPageForm onSubmit={handleCreatePage} />
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
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
