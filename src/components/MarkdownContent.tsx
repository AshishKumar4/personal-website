import { memo, useMemo, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import type { Element, ElementContent, Root } from 'hast';
import 'katex/dist/katex.min.css';
import '@/components/reading/reading.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import { CodeFrame } from '@/components/reading/CodeFrame';
import { Figure } from '@/components/reading/Figure';

interface CodeOptions {
  label?: string;
  collapseAfter?: number;
}

interface MarkdownContentProps {
  children: string;
  className?: string;
  anchors?: boolean;
  code?: CodeOptions;
}

type Node = Element | Root | ElementContent;

function textOf(node: Node | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if ('children' in node) return (node.children as Node[]).map(textOf).join('');
  return '';
}

function onlyImage(node: Element | undefined): Element | null {
  if (!node) return null;
  const kids = node.children.filter(c => !(c.type === 'text' && !c.value.trim()));
  if (kids.length !== 1) return null;
  const k = kids[0];
  if (k.type === 'element' && k.tagName === 'img') return k;
  if (k.type === 'element' && k.tagName === 'a' && k.children.length === 1 && k.children[0].type === 'element' && k.children[0].tagName === 'img') return k.children[0];
  return null;
}

function langOf(node: Element | undefined): string | null {
  const code = node?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
  const cls: unknown = code?.properties?.className;
  const list = Array.isArray(cls) ? cls.map(String) : typeof cls === 'string' ? cls.split(' ') : [];
  const hit = list.find(c => c.startsWith('language-'));
  return hit ? hit.slice(9) : null;
}

type HeadingProps = ComponentPropsWithoutRef<'h2'> & { node?: Element };

function anchored(Tag: 'h1' | 'h2' | 'h3' | 'h4') {
  return function Heading({ node: _node, id, children, ...rest }: HeadingProps) {
    void _node;
    return (
      <Tag id={id} {...rest}>
        {children}
        {id && (
          <a href={`#${id}`} className="heading-anchor" aria-label="Link to this section">
            <span aria-hidden="true">#</span>
          </a>
        )}
      </Tag>
    );
  };
}

function buildComponents(anchors: boolean, code: CodeOptions | undefined): Components {
  const base: Components = {
    p({ node, children, ...rest }) {
      const img = onlyImage(node);
      if (img) {
        const p = img.properties ?? {};
        return <Figure src={String(p.src ?? '')} alt={p.alt != null ? String(p.alt) : ''} width={p.width as string | undefined} />;
      }
      return <p {...rest}>{children}</p>;
    },
    img({ node: _node, ...rest }) {
      void _node;
      return <img loading="lazy" decoding="async" {...rest} />;
    },
    pre({ node, children }) {
      return (
        <CodeFrame lang={langOf(node)} text={textOf(node)} label={code?.label} collapseAfter={code?.collapseAfter}>
          <pre>{children as ReactNode}</pre>
        </CodeFrame>
      );
    },
    table({ node: _node, children, ...rest }) {
      void _node;
      return (
        <div className="table-wrap">
          <table {...rest}>{children}</table>
        </div>
      );
    },
  };
  if (!anchors) return base;
  return { ...base, h1: anchored('h1'), h2: anchored('h2'), h3: anchored('h3'), h4: anchored('h4') };
}

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: unknown };

function remarkLoneMath() {
  const walk = (node: MdNode) => {
    const kids = node.children;
    if (!kids) return;
    kids.forEach((child, i) => {
      if (child.type === 'paragraph' && child.children) {
        const parts = child.children.filter(k => !(k.type === 'text' && !(k.value ?? '').trim()));
        if (parts.length === 1 && parts[0].type === 'inlineMath') {
          const value = (parts[0].value ?? '').trim();
          kids[i] = {
            type: 'math',
            value,
            data: { hName: 'pre', hChildren: [{ type: 'element', tagName: 'code', properties: { className: ['language-math', 'math-display'] }, children: [{ type: 'text', value }] }] },
          };
        }
        return;
      }
      walk(child);
    });
  };
  return (tree: MdNode) => walk(tree);
}

const REMARK: Options['remarkPlugins'] = [remarkGfm, remarkMath, remarkLoneMath];
const REHYPE: Options['rehypePlugins'] = [rehypeRaw, rehypeSlug, rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]];

function MarkdownContentImpl({ children, className, anchors = false, code }: MarkdownContentProps) {
  const label = code?.label;
  const collapseAfter = code?.collapseAfter;
  const components = useMemo(() => buildComponents(anchors, label || collapseAfter ? { label, collapseAfter } : undefined), [anchors, label, collapseAfter]);
  return (
    <div className={`prose-styles max-w-none ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(
  MarkdownContentImpl,
  (a, b) => a.children === b.children && a.className === b.className && a.anchors === b.anchors && a.code?.label === b.code?.label && a.code?.collapseAfter === b.code?.collapseAfter,
);
