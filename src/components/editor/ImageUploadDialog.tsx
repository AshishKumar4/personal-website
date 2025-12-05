import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Loader2, ImageIcon, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageInsert: (url: string) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  onImageInsert,
}: ImageUploadDialogProps) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setUrl('');
    setPreviewUrl(null);
    setSelectedFile(null);
    setDragOver(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const token = getToken();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api<{ url: string }>('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        skipContentType: true,
      });

      onImageInsert(response.url);
      handleClose();
      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlInsert = () => {
    if (!url.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    onImageInsert(url.trim());
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Insert Image</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'upload' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-contain rounded-lg border border-border bg-muted"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background"
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop an image here, or
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <p className="text-xs text-muted-foreground mt-4">
                  Max file size: 10MB
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url" className="text-muted-foreground">
                  Image URL
                </Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              {url && (
                <div className="border border-border rounded-lg p-2">
                  <img
                    src={url}
                    alt="Preview"
                    className="w-full h-32 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} className="border-border">
            Cancel
          </Button>
          {tab === 'upload' ? (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-primary text-primary-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                'Upload & Insert'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleUrlInsert}
              disabled={!url.trim()}
              className="bg-primary text-primary-foreground"
            >
              Insert
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
