export interface DemoPage {
  id: string;
  name: string;
  image_url: string;
  script_tag: string;
  created_at: string;
  updated_at: string;
}

export interface DemoPageFormData {
  name: string;
  image: File | null;
  scriptTag: string;
}

// Supabase Database Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      demo_pages: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          image_url: string
          script_tag: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          image_url: string
          script_tag: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          image_url?: string
          script_tag?: string
        }
      }
    }
  }
}