"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Underline, Undo2 } from "lucide-react";
import { copyBodyClass } from "@/lib/copy-styles";
import { cn } from "@/lib/utils";

/**
 * Rich text editor for copy versions: paragraphs, two heading levels, bold/italic/underline,
 * lists, links and quotes. Pasting from Word or an email keeps that structure. Output is HTML,
 * sanitised again on the server before it is stored.
 */
export function CopyEditor({
  initialHtml,
  onChange,
  className,
}: {
  initialHtml: string;
  /** Called with the current HTML and plain text on every change (and once on mount). */
  onChange: (html: string, text: string) => void;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
    ],
    content: initialHtml || "<p></p>",
    editorProps: {
      attributes: {
        class: cn("min-h-[260px] max-h-[50vh] overflow-y-auto px-4 py-3 outline-none", copyBodyClass),
        "aria-label": "Copy",
      },
    },
    onCreate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  function setLink() {
    if (!editor) return;
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link address (https://… or mailto:…)", previous);
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const btn = (label: string, active: boolean | undefined, onClick: () => void, Icon: React.ComponentType<{ className?: string }>, disabled = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled || !editor}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("flex size-7 items-center justify-center rounded-md text-slate transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40", active && "bg-navy-tint text-navy-deep")}
    >
      <Icon className="size-4" />
    </button>
  );

  return (
    <div className={cn("rounded-lg border border-input bg-white focus-within:ring-2 focus-within:ring-ring/40", className)}>
      <div className="hairline-b border-line flex flex-wrap items-center gap-0.5 px-2 py-1.5" role="toolbar" aria-label="Formatting">
        {btn("Bold", state?.bold, () => editor?.chain().focus().toggleBold().run(), Bold)}
        {btn("Italic", state?.italic, () => editor?.chain().focus().toggleItalic().run(), Italic)}
        {btn("Underline", state?.underline, () => editor?.chain().focus().toggleUnderline().run(), Underline)}
        <span className="mx-1 h-4 w-px bg-line" />
        {btn("Heading", state?.h1, () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), Heading1)}
        {btn("Subheading", state?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), Heading2)}
        <span className="mx-1 h-4 w-px bg-line" />
        {btn("Bulleted list", state?.bullet, () => editor?.chain().focus().toggleBulletList().run(), List)}
        {btn("Numbered list", state?.ordered, () => editor?.chain().focus().toggleOrderedList().run(), ListOrdered)}
        {btn("Quote", state?.quote, () => editor?.chain().focus().toggleBlockquote().run(), Quote)}
        {btn("Link", state?.link, setLink, Link2)}
        {btn("Clear formatting", false, () => editor?.chain().focus().unsetAllMarks().clearNodes().run(), RemoveFormatting)}
        <span className="ml-auto flex items-center gap-0.5">
          {btn("Undo", false, () => editor?.chain().focus().undo().run(), Undo2, !state?.canUndo)}
          {btn("Redo", false, () => editor?.chain().focus().redo().run(), Redo2, !state?.canRedo)}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
