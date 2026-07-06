import { useState, useEffect, useCallback, useRef } from 'react';
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
import { notebookToMarkdown } from '@/lib/notebook-convert';
import { uploadImageFile, dataUriToFile } from '@/lib/upload-image';
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
  const [isImporting, setIsImporting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<BlogPostDraft | null>(null);

  const [mobileView, setMobileView] = useState<'write' | 'preview'>('write');
  const [isMobile, setIsMobile] = useState(false);
  const editorTextAreaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleImportFile = useCallback(async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const isNotebook = file.name.endsWith('.ipynb');

      if (!isNotebook) {
        setContent((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
        if (!title.trim()) {
          const heading = text.match(/^#\s+(.+)$/m);
          if (heading) setTitle(heading[1].trim());
        }
        toast.success('Markdown imported');
        return;
      }

      const { markdown, images } = notebookToMarkdown(text);
      let out = markdown;

      if (images.length) {
        toast.info(`Uploading ${images.length} notebook image${images.length > 1 ? 's' : ''}...`);
        for (const img of images) {
          try {
            const url = await uploadImageFile(dataUriToFile(img.dataUri, `${img.placeholder}.${img.ext}`));
            out = out.split(`(${img.placeholder})`).join(`(${url})`);
          } catch {
            // Leave the placeholder in place; the author can re-upload that one image.
            toast.error(`Failed to upload ${img.placeholder}; left a placeholder.`);
          }
        }
      }

      setContent((prev) => (prev.trim() ? `${prev}\n\n${out}` : out));
      if (!title.trim()) {
        const heading = out.match(/^#\s+(.+)$/m);
        if (heading) setTitle(heading[1].trim());
      }
      toast.success('Notebook imported');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  }, [title]);

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
    const imageMarkdown = `![Image](${url})`;
    const textarea = editorTextAreaRef.current;

    if (!textarea || textarea.offsetParent === null) {
      setContent((prev) => {
        const needsLeadingNewline = prev.length > 0 && !prev.endsWith('\n');
        return `${prev}${needsLeadingNewline ? '\n' : ''}${imageMarkdown}\n`;
      });
      setShowImageDialog(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const needsLeadingNewline = start > 0 && !content.substring(0, start).endsWith('\n');

    setContent((prev) => {
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      const prefix = needsLeadingNewline ? '\n' : '';
      return `${before}${prefix}${imageMarkdown}\n${after}`;
    });

    requestAnimationFrame(() => {
      const newlinePrefix = needsLeadingNewline ? 1 : 0;
      const newPosition = start + newlinePrefix + imageMarkdown.length + 1;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    });

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
        onImportFile={handleImportFile}
        isImporting={isImporting}
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
                textAreaRef={editorTextAreaRef}
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
              textAreaRef={editorTextAreaRef}
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
