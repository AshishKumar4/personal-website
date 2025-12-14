import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatFileSize, CHUNK_SIZE, MULTIPART_THRESHOLD } from '@/lib/file-utils';
import type { MultipartUploadPart } from '@shared/types';
import { cn } from '@/lib/utils';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPrefix: string;
  onUploaded: () => void;
}

export function FileUploadDialog({ open, onOpenChange, currentPrefix, onUploaded }: FileUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const uploadSimple = async (uploadFile: UploadFile) => {
    const token = localStorage.getItem('admin_token');
    const key = currentPrefix + uploadFile.file.name;

    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('key', key);

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data;
  };

  const uploadMultipart = async (uploadFile: UploadFile) => {
    const token = localStorage.getItem('admin_token');
    const key = currentPrefix + uploadFile.file.name;
    const file = uploadFile.file;

    const initRes = await fetch('/api/files/upload/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ key, contentType: file.type || 'application/octet-stream' }),
    });

    const initData = await initRes.json();
    if (!initData.success) throw new Error(initData.error || 'Failed to initiate upload');

    const { uploadId } = initData.data;
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const parts: MultipartUploadPart[] = [];

    try {
      for (let i = 0; i < totalParts; i++) {
        if (abortRef.current) throw new Error('Upload cancelled');

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partNumber = i + 1;

        const partRes = await fetch(
          `/api/files/upload/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: chunk,
          }
        );

        const partData = await partRes.json();
        if (!partData.success) throw new Error(partData.error || 'Part upload failed');

        parts.push({
          partNumber: partData.data.partNumber,
          etag: partData.data.etag,
        });

        const progress = Math.round(((i + 1) / totalParts) * 100);
        updateFile(uploadFile.id, { progress });
      }

      const completeRes = await fetch('/api/files/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ key, uploadId, parts }),
      });

      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error(completeData.error || 'Failed to complete upload');

      return completeData;
    } catch (err) {
      await fetch('/api/files/upload/abort', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ key, uploadId }),
      }).catch(() => {});
      throw err;
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    abortRef.current = false;

    for (const uploadFile of pendingFiles) {
      if (abortRef.current) break;

      updateFile(uploadFile.id, { status: 'uploading', progress: 0 });

      try {
        if (uploadFile.file.size > MULTIPART_THRESHOLD) {
          await uploadMultipart(uploadFile);
        } else {
          await uploadSimple(uploadFile);
        }
        updateFile(uploadFile.id, { status: 'completed', progress: 100 });
      } catch (err: any) {
        updateFile(uploadFile.id, { status: 'error', error: err.message });
      }
    }

    setUploading(false);
    onUploaded();
  };

  const handleClose = () => {
    if (uploading) {
      abortRef.current = true;
    }
    setFiles([]);
    onOpenChange(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles.length) return;

    const newFiles: UploadFile[] = Array.from(droppedFiles).map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Files larger than 100MB will use multipart upload
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map(uploadFile => (
                <div
                  key={uploadFile.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    uploadFile.status === 'completed' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                    uploadFile.status === 'error' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  )}
                >
                  <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.file.size)}</p>
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="h-1 mt-2" />
                    )}
                    {uploadFile.status === 'error' && (
                      <p className="text-xs text-destructive mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {uploadFile.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {(uploadFile.status === 'pending' || uploadFile.status === 'error') && !uploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentPrefix && (
            <p className="text-xs text-muted-foreground">
              Uploading to: {currentPrefix || '/'}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {uploading ? 'Cancel' : 'Close'}
          </Button>
          <Button onClick={handleUpload} disabled={uploading || pendingCount === 0}>
            {uploading ? `Uploading... (${completedCount}/${files.length})` : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
