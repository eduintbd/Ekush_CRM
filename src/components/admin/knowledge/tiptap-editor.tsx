"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

/**
 * Minimal TipTap wrapper used by the LearnTopic form. Ships a tiny
 * toolbar (headings, bold, italic, lists) which is enough for the
 * educational copy on the Basics tab. Output is HTML — the server
 * route stores it as-is into LearnTopic.body.
 *
 * Intentionally NOT adding image/link/embed plugins here; every
 * surface that needs media has dedicated uploads.
 */
export function TiptapEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] max-w-none px-4 py-3 text-[14px] leading-[24px] text-ink focus:outline-none [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-[20px] [&_h1]:font-semibold [&_h2]:text-[18px] [&_h2]:font-semibold [&_h3]:text-[16px] [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:font-semibold [&_strong]:font-semibold [&_em]:italic",
      },
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Keep the editor in sync when the parent swaps the whole initial
  // value (e.g. switching between two topics inside an SPA flow).
  // Identity check avoids a re-render loop when the onUpdate callback
  // bubbles the same HTML back up.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-1.5">
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 4 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
        >
          H4
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-[12px] font-medium hover:bg-white ${
        active ? "bg-white text-ekush-orange" : "text-text-body"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-gray-300" />;
}
