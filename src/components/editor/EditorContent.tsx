import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import { useEffect, useCallback, useRef } from 'react';
import { getEditorExtensions } from './editorExtensions';
import { EditorToolbar } from './EditorToolbar';
import { htmlToMarkdown, markdownToHtml, looksLikeMarkdown } from './markdownUtils';

interface EditorContentProps {
  content: string;
  onContentChange: (markdown: string) => void;
  onImageUpload?: () => void;
}

export function EditorContent({
  content,
  onContentChange,
  onImageUpload,
}: EditorContentProps) {
  const initializedRef = useRef(false);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: 'prose-styles max-w-none focus:outline-none min-h-full',
      },
      handlePaste: (_view, event) => {
        return processClipboardPaste(event.clipboardData);
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onContentChange(markdown);
    },
  });

  useEffect(() => {
    if (editor && !initializedRef.current) {
      initializedRef.current = true;
      if (content !== htmlToMarkdown(editor.getHTML())) {
        editor.commands.setContent(markdownToHtml(content), false);
      }
    }
  }, [editor, content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editor) return;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'k': {
          e.preventDefault();
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('Enter URL:', previousUrl);
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
          break;
        }
      }
    }
  }, [editor]);

  const processClipboardPaste = useCallback((clipboardData: DataTransfer | null): boolean => {
    if (!clipboardData || !editor) return false;

    const items = clipboardData?.items;
    if (!items) return false;

    for (const item of items) {
      if (item.type.startsWith('image/') && onImageUpload) {
        onImageUpload();
        return true;
      }
    }

    const markdownText = clipboardData.getData('text/markdown');
    if (markdownText && looksLikeMarkdown(markdownText)) {
      editor.chain().focus().insertContent(markdownToHtml(markdownText)).run();
      return true;
    }

    const plainText = clipboardData.getData('text/plain');
    if (!plainText) return false;

    if (!looksLikeMarkdown(plainText)) return false;

    editor.chain().focus().insertContent(markdownToHtml(plainText)).run();
    return true;
  }, [editor, onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    const files = e.dataTransfer?.files;
    if (!files || !editor || !onImageUpload) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        onImageUpload();
        return;
      }
    }
  }, [editor, onImageUpload]);

  return (
    <div className="h-full flex flex-col bg-card">
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      <div
        className="flex-1 overflow-auto p-4 md:p-6"
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <TiptapEditorContent editor={editor} className="h-full" />
      </div>
      <style>{`
        .ProseMirror {
          min-height: 100%;
          padding-bottom: 4rem;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
