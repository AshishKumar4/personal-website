import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Typography from '@tiptap/extension-typography';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

export function getEditorExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: {
        levels: [1, 2, 3, 4],
      },
    }),
    Placeholder.configure({
      placeholder: 'Start writing your blog post...',
      emptyEditorClass: 'is-editor-empty',
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'rounded-lg max-w-full',
      },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        class: 'text-primary underline',
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'javascript',
      HTMLAttributes: {
        class: 'hljs',
      },
    }),
    Typography,
  ];
}
