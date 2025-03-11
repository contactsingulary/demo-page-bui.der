export interface DemoPage {
  id: string;
  name: string;
  imageUrl: string;
  scriptTag: string;
}

export interface DemoPageFormData {
  name: string;
  image: File | null;
  scriptTag: string;
}