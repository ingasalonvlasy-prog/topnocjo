"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { useState } from "react";

interface WysiwygEditorProps {
  name: string;
  defaultValue: string;
  required?: boolean;
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
      active
        ? "bg-gray-900 text-white"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnCls(editor.isActive("bold"))}>B</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnCls(editor.isActive("italic"))}>I</button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnCls(editor.isActive("underline"))}>U</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnCls(editor.isActive("heading", { level: 2 }))}>H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnCls(editor.isActive("heading", { level: 3 }))}>H3</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnCls(editor.isActive("bulletList"))}>List</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnCls(editor.isActive("orderedList"))}>1.</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnCls(editor.isActive("blockquote"))}>Quote</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => {
        const url = window.prompt("URL odkazu:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }} className={btnCls(editor.isActive("link"))}>Link</button>

      <button type="button" onClick={() => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
        }
      }} className={btnCls(false)}>Unlink</button>

      <button type="button" onClick={() => {
        const url = window.prompt("URL obrázku:");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }} className={btnCls(false)}>Img</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnCls(false)}>---</button>
    </div>
  );
}

export function WysiwygEditor({ name, defaultValue, required }: WysiwygEditorProps) {
  const [html, setHtml] = useState(defaultValue);
  const [sourceMode, setSourceMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      Underline,
    ],
    content: defaultValue,
    onUpdate: ({ editor: e }) => {
      setHtml(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "wysiwyg-content px-4 py-3 min-h-[300px] focus:outline-none",
      },
    },
  });

  return (
    <div>
      <input type="hidden" name={name} value={html} required={required} />

      <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex items-center">
          <div className="flex-1">
            {!sourceMode && <MenuBar editor={editor} />}
          </div>
          <button
            type="button"
            onClick={() => {
              if (sourceMode && editor) {
                editor.commands.setContent(html);
              }
              setSourceMode(!sourceMode);
            }}
            className={`px-3 py-1 m-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
              sourceMode
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {"</>"}
          </button>
        </div>

        {sourceMode ? (
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full px-4 py-3 min-h-[300px] text-sm font-mono border-t border-gray-200 focus:outline-none resize-y"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}
