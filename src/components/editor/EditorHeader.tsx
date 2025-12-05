import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Send, Loader2, Check } from 'lucide-react';
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

interface EditorHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  isSaving: boolean;
  isPublishing: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt?: Date;
  isNewPost: boolean;
}

export function EditorHeader({
  title,
  onTitleChange,
  onSave,
  onPublish,
  isSaving,
  isPublishing,
  hasUnsavedChanges,
  lastSavedAt,
  isNewPost,
}: EditorHeaderProps) {
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigate('/admin/posts');
    }
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    navigate('/admin/posts');
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Post title..."
            className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 h-auto"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastSavedAt && !hasUnsavedChanges && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span>Saved {formatLastSaved(lastSavedAt)}</span>
            </div>
          )}
          {hasUnsavedChanges && (
            <span className="hidden sm:block text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving || isPublishing}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save
          </Button>

          <Button
            size="sm"
            onClick={onPublish}
            disabled={isSaving || isPublishing || !title.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            {isNewPost ? 'Publish' : 'Update'}
          </Button>
        </div>
      </header>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You have unsaved changes. Are you sure you want to leave? Your changes will be saved as a draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
