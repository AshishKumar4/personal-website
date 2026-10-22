import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Folder, File, Image, Video, Music, FileText, Archive, MoreVertical, Upload, FolderPlus, Trash2, Link2, ChevronRight, Home, Loader2, RefreshCw } from 'lucide-react';
import { CreateFolderDialog } from '@/components/files/CreateFolderDialog';
import { FileUploadDialog } from '@/components/files/FileUploadDialog';
import { ShareLinksDialog } from '@/components/files/ShareLinksDialog';
import { formatFileSize, formatDate } from '@/lib/file-utils';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import type { R2FileItem, R2ListResponse, ShareLink } from '@shared/types';
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
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [shareTarget, setShareTarget] = useState<R2FileItem | null>(null);

  const fetchFiles = useCallback(async (newPrefix?: string, loadMore?: boolean) => {
    setLoading(true);
    try {
      const token = getToken();
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

  const fetchLinks = useCallback(async () => {
    try {
      const res = await api<{ items: ShareLink[] }>('/api/shares', { headers: { Authorization: `Bearer ${getToken()}` } });
      setLinks(res.items);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const token = getToken();
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
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Site</div>
          <h1 className="mt-2 font-display text-5xl leading-none tracking-[-0.02em] text-foreground">Files</h1>
          <p className="text-sm text-muted-foreground">
            Private R2 storage. A file opens only through a share link you create.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => { fetchFiles(prefix); fetchLinks(); }}>
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
              <TableHead className="w-[15%] whitespace-nowrap">Size</TableHead>
              <TableHead className="hidden w-[20%] sm:table-cell">Modified</TableHead>
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
                const linkCount = links.filter(link => link.key === item.key).length;
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
                        {linkCount > 0 && (
                          <button
                            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                            onClick={() => setShareTarget(item)}
                            aria-label={`${linkCount} active share ${linkCount === 1 ? 'link' : 'links'}`}
                          >
                            <Link2 className="h-3 w-3" />
                            {linkCount}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {item.type === 'folder' ? '-' : formatFileSize(item.size)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
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
                            <DropdownMenuItem onClick={() => setShareTarget(item)}>
                              <Link2 className="mr-2 h-4 w-4" />
                              Share
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
        onUploaded={() => { fetchFiles(prefix); fetchLinks(); }}
      />

      <ShareLinksDialog
        file={shareTarget}
        links={links}
        onOpenChange={(open) => !open && setShareTarget(null)}
        onChanged={fetchLinks}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'folder' ? 'Folder' : 'File'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === 'folder' && ' This will delete all files inside.'}
              {' '}Any share links stop working. This action cannot be undone.
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
