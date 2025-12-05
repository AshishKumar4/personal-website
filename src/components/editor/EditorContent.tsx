import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import { useEffect, useCallback, useRef } from 'react';
import { getEditorExtensions } from './editorExtensions';
import { EditorToolbar } from './EditorToolbar';
import { htmlToMarkdown, markdownToHtml } from './markdownUtils';

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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !editor || !onImageUpload) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        onImageUpload();
        return;
      }
    }
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
        onPaste={handlePaste}
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
