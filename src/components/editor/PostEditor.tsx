import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { EditorHeader } from './EditorHeader';
import { EditorContent } from './EditorContent';
import { MarkdownPreview } from './MarkdownPreview';
import { ImageUploadDialog } from './ImageUploadDialog';
import { useEditorAutoSave } from '@/hooks/use-editor-autosave';
import { loadDraft, deleteDraft, BlogPostDraft } from '@/lib/draft-storage';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';
import { BlogPost } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenLine, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PostEditorProps {
  initialPost?: BlogPost;
  slug?: string;
}

export function PostEditor({ initialPost, slug }: PostEditorProps) {
  const navigate = useNavigate();
  const isNewPost = !slug;

  const [title, setTitle] = useState(initialPost?.title || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [author] = useState(initialPost?.author || 'Ashish Kumar Singh');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<BlogPostDraft | null>(null);

  const [mobileView, setMobileView] = useState<'write' | 'preview'>('write');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const draft = loadDraft(slug);
    if (draft) {
      const serverTime = initialPost?.createdAt || 0;
      if (draft.lastSaved > serverTime) {
        setRecoveredDraft(draft);
        setShowDraftRecovery(true);
      }
    }
  }, [slug, initialPost?.createdAt]);

  const handleRestoreDraft = () => {
    if (recoveredDraft) {
      setTitle(recoveredDraft.title);
      setContent(recoveredDraft.content);
      toast.success('Draft restored');
    }
    setShowDraftRecovery(false);
  };

  const handleDiscardDraft = () => {
    deleteDraft(slug);
    setShowDraftRecovery(false);
    toast.info('Draft discarded');
  };

  useEditorAutoSave({
    title,
    content,
    author,
    slug,
    enabled: true,
    debounceMs: 3000,
    onSave: () => {
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    },
  });

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [title, content]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
      toast.success('Draft saved');
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsPublishing(true);
    const token = getToken();

    try {
      if (isNewPost) {
        await api('/api/posts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, content, author }),
        });
        deleteDraft();
        toast.success('Post published!');
      } else {
        await api(`/api/posts/${slug}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, content }),
        });
        deleteDraft(slug);
        toast.success('Post updated!');
      }
      navigate('/admin/posts');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to publish post');
    } finally {
      setIsPublishing(false);
    }
  }, [title, content, author, isNewPost, slug, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlePublish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handlePublish]);

  const handleImageInsert = (url: string) => {
    const imageMarkdown = `![Image](${url})\n`;
    setContent((prev) => prev + imageMarkdown);
    setShowImageDialog(false);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <EditorHeader
        title={title}
        onTitleChange={setTitle}
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={isSaving}
        isPublishing={isPublishing}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        isNewPost={isNewPost}
      />

      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={mobileView}
            onValueChange={(v) => setMobileView(v as 'write' | 'preview')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-card">
              <TabsTrigger value="write" className="gap-2">
                <PenLine className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex-1 overflow-hidden">
            {mobileView === 'write' ? (
              <EditorContent
                content={content}
                onContentChange={setContent}
                onImageUpload={() => setShowImageDialog(true)}
              />
            ) : (
              <MarkdownPreview content={content} title={title} />
            )}
          </div>
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1"
        >
          <ResizablePanel defaultSize={50} minSize={30}>
            <EditorContent
              content={content}
              onContentChange={setContent}
              onImageUpload={() => setShowImageDialog(true)}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <MarkdownPreview content={content} title={title} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <ImageUploadDialog
        open={showImageDialog}
        onOpenChange={setShowImageDialog}
        onImageInsert={handleImageInsert}
      />

      <AlertDialog open={showDraftRecovery} onOpenChange={setShowDraftRecovery}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Recover Unsaved Draft?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              We found a draft from{' '}
              {recoveredDraft && new Date(recoveredDraft.lastSaved).toLocaleString()}.
              Would you like to restore it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft} className="border-border">
              Discard
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreDraft}
              className="bg-primary text-primary-foreground"
            >
              Restore Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
