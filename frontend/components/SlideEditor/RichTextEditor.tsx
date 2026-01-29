
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useEffect } from 'react'
import { Bold, Italic, List, Heading1, Heading2 } from 'lucide-react'

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3'
            }
        }
    })

    // Sync external value changes if needed (be careful of loops)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            // Only update if content is significantly different to avoid cursor jumping
            // simple check: if value is empty/different and editor is empty
            if (editor.isEmpty && value) {
                editor.commands.setContent(value)
            }
        }
    }, [value, editor])

    if (!editor) {
        return null
    }

    const ToolbarButton = ({ onClick, isActive, icon: Icon, title }: any) => (
        <button
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    )

    return (
        <div className="border border-slate-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 p-1 px-2">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon={Bold}
                    title="Bold"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon={Italic}
                    title="Italic"
                />
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon={Heading1}
                    title="Large Header"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon={Heading2}
                    title="Small Header"
                />
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    icon={List}
                    title="Bullet List"
                />
            </div>
            <EditorContent editor={editor} className="cursor-text" />
        </div>
    )
}
