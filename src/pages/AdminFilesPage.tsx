import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Folder, File, Image, Video, Music, FileText, Archive, MoreVertical, Upload, FolderPlus, Trash2, Link, ChevronRight, Home, Loader2, RefreshCw } from 'lucide-react';
import { CreateFolderDialog } from '@/components/files/CreateFolderDialog';
import { FileUploadDialog } from '@/components/files/FileUploadDialog';
import { formatFileSize, formatDate, getPublicUrl } from '@/lib/file-utils';
import type { R2FileItem, R2ListResponse } from '@shared/types';
import { toast } from 'sonner';

const iconMap: Record<string, React.ComponentType<any>> = {
  folder: Folder,
  file: File,
  image: Image,
  video: Video,
  audio: Music,
  'file-text': FileText,
  archive: Archive,
};

function getIcon(contentType?: string, isFolder?: boolean) {
  if (isFolder) return Folder;
  if (!contentType) return File;
  if (contentType.startsWith('image/')) return Image;
  if (contentType.startsWith('video/')) return Video;
  if (contentType.startsWith('audio/')) return Music;
  if (contentType.startsWith('text/') || contentType === 'application/pdf') return FileText;
  if (contentType.includes('zip') || contentType.includes('archive')) return Archive;
  return File;
}

export function AdminFilesPage() {
  const [items, setItems] = useState<R2FileItem[]>([]);
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<R2FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async (newPrefix?: string, loadMore?: boolean) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      params.set('prefix', newPrefix ?? prefix);
      if (loadMore && cursor) {
        params.set('cursor', cursor);
      }

      const res = await fetch(`/api/files?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const response = data.data as R2ListResponse;
      if (loadMore) {
        setItems(prev => [...prev, ...response.items]);
      } else {
        setItems(response.items);
        setPrefix(response.prefix);
      }
      setCursor(response.cursor);
      setHasMore(response.truncated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [prefix, cursor]);

  useEffect(() => {
    fetchFiles('');
  }, []);

  const navigateToFolder = (folderKey: string) => {
    fetchFiles(folderKey);
  };

  const navigateUp = () => {
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    fetchFiles(newPrefix);
  };

  const getBreadcrumbs = () => {
    const parts = prefix.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: 'Root', path: '' }];
    let currentPath = '';
    for (const part of parts) {
      currentPath += part + '/';
      crumbs.push({ label: part, path: currentPath });
    }
    return crumbs;
  };

  const handleCopyUrl = async (item: R2FileItem) => {
    const url = getPublicUrl(item.key);
    await navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const isFolder = deleteTarget.type === 'folder';
      const endpoint = isFolder
        ? `/api/files/folder/${encodeURIComponent(deleteTarget.key)}`
        : `/api/files/${encodeURIComponent(deleteTarget.key)}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(isFolder ? 'Folder deleted' : 'File deleted');
      setDeleteTarget(null);
      fetchFiles(prefix);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Files</h1>
          <p className="text-sm text-muted-foreground">
            Manage files in R2 storage (r2.ashishkumarsingh.com)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchFiles(prefix)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center">
            {idx > 0 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2"
              onClick={() => fetchFiles(crumb.path)}
            >
              {idx === 0 ? <Home className="h-4 w-4" /> : crumb.label}
            </Button>
          </div>
        ))}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Name</TableHead>
              <TableHead className="w-[15%]">Size</TableHead>
              <TableHead className="w-[20%]">Modified</TableHead>
              <TableHead className="w-[15%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  This folder is empty
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => {
                const Icon = getIcon(item.contentType, item.type === 'folder');
                return (
                  <TableRow key={item.key}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        {item.type === 'folder' ? (
                          <button
                            className="text-left hover:underline font-medium"
                            onClick={() => navigateToFolder(item.key)}
                          >
                            {item.name}
                          </button>
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.type === 'folder' ? '-' : formatFileSize(item.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.lastModified)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.type === 'file' && (
                            <DropdownMenuItem onClick={() => handleCopyUrl(item)}>
                              <Link className="mr-2 h-4 w-4" />
                              Copy URL
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {hasMore && (
          <div className="p-4 border-t text-center">
            <Button variant="outline" onClick={() => fetchFiles(prefix, true)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Load More
            </Button>
          </div>
        )}
      </div>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        currentPrefix={prefix}
        onCreated={() => fetchFiles(prefix)}
      />

      <FileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        currentPrefix={prefix}
        onUploaded={() => fetchFiles(prefix)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'folder' ? 'Folder' : 'File'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === 'folder' && ' This will delete all files inside.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
