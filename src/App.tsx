import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { DemoPageForm } from './components/DemoPageForm';
import { DemoPage } from './components/DemoPage';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { EditPageContent } from './components/EditPageContent';
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
        // Only fetch pages belonging to the current user
        const { data, error } = await supabase
          .from('demo_pages')
          .select('*')
          .eq('user_id', user.id)  // Filter by current user's ID
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

    // Subscribe to realtime changes for the current user's pages only
    const channel = supabase
      .channel('demo_pages_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'demo_pages',
          filter: `user_id=eq.${user.id}`  // Only listen to changes for current user's pages
        },
        (payload) => {
          console.log('Realtime event received:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('Inserting new page:', payload.new);
            setPages(prev => [payload.new as DemoPageType, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            console.log('Deleting page:', payload.old);
            setPages(prev => {
              const updatedPages = prev.filter(page => page.id !== payload.old.id);
              console.log('Updated pages after deletion:', updatedPages);
              return updatedPages;
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('Updating page:', payload.new);
            setPages(prev => {
              const updatedPages = prev.map(page => 
                page.id === payload.new.id ? payload.new as DemoPageType : page
              );
              console.log('Updated pages after edit:', updatedPages);
              return updatedPages;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
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
      // Open demo page in new tab
      window.open(`/demo/${newPage.id}`, '_blank');
      // Navigate back to dashboard
      navigate('/');
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

      // Optimistically update the UI
      setPages(prev => prev.filter(page => page.id !== id));
      
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

  const handleEditPage = async (id: string, data: DemoPageFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        throw new Error('You must be logged in to edit a page');
      }

      let imageUrl = undefined;
      
      // Only upload new image if one was selected
      if (data.image) {
        console.log('Uploading new image...');
        imageUrl = await uploadImage(data.image);
        console.log('Image uploaded successfully:', imageUrl);
        
        // Get the old image URL to delete it
        const { data: oldPage } = await supabase
          .from('demo_pages')
          .select('image_url')
          .eq('id', id)
          .single();
          
        if (oldPage?.image_url) {
          await deleteImage(oldPage.image_url);
        }
      }

      // Update page in Supabase
      const updateData: Partial<DemoPageType> = {
        name: data.name,
        script_tag: data.scriptTag,
        user_id: user.id, // Ensure user_id is included in the update
      };
      
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }

      const { data: updatedPage, error } = await supabase
        .from('demo_pages')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Add user_id check for extra security
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Page updated successfully:', updatedPage);
      
      // Optimistically update the local state
      setPages(prev => prev.map(page => 
        page.id === id ? { ...page, ...updateData } : page
      ));
      
      navigate(`/demo/${id}`);
    } catch (error) {
      console.error('Error updating page:', error);
      setError(error instanceof Error ? error.message : 'Failed to update page. Please try again.');
      
      // Try to clean up the uploaded image if update failed
      if (imageUrl) {
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

  return (
    <div>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/demo/:id" 
          element={
            <DemoPage 
              currentUser={user}
              pages={pages}
            />
          } 
        />
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
                  {loading ? (
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                <DemoPageForm onSubmit={handleCreatePage} />
                  )}
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4">
                  <h1 className="text-3xl font-bold text-center mb-8">
                    Edit Demo Page
                  </h1>
                  {loading ? (
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                    <EditPageContent
                      pages={pages}
                      onSubmit={(data) => {
                        const id = window.location.pathname.split('/')[2];
                        handleEditPage(id, data);
                      }}
                    />
                  )}
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
