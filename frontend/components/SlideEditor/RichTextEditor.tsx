import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'
import React, { useEffect } from 'react'
import { Bold, Italic, List, Heading1, Heading2, Type, ChevronDown } from 'lucide-react'

// Custom Extension to handle Font Size
const FontSizeExtension = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        }
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {}
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },
})

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    // Basic Markdown-to-HTML converter for legacy slides
    const processInitialValue = (val: string) => {
        if (!val) return "";
        // If it already seems to be HTML (starts with < and ends with > roughly, or contains block tags), return as is
        if (val.trim().startsWith("<") || val.includes("<p>") || val.includes("<h1>") || val.includes("<ul>") || val.includes("span")) {
            return val;
        }

        // It's likely legacy markdown/plain text. Convert basic structures.
        // 1. Headers: # Text -> <h1>Text</h1>
        let html = val.replace(/^#\s+(.*$)/gm, '<h1>$1</h1>');

        // 2. Bold: **Text** -> <strong>Text</strong>
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 3. Bullets: - Text -> <ul><li>Text</li></ul>
        const lines = html.split('\n');
        let inList = false;
        let newLines = [];

        for (const line of lines) {
            if (line.trim().startsWith('- ')) {
                if (!inList) {
                    newLines.push('<ul>');
                    inList = true;
                }
                newLines.push(`<li>${line.trim().substring(2)}</li>`);
            } else {
                if (inList) {
                    newLines.push('</ul>');
                    inList = false;
                }
                // Wrap plain text lines in <p> if they aren't headers/html
                if (line.trim().length > 0 && !line.trim().startsWith('<')) {
                    newLines.push(`<p>${line}</p>`);
                } else {
                    newLines.push(line);
                }
            }
        }
        if (inList) newLines.push('</ul>');

        return newLines.join('');
    }

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            FontSizeExtension,
        ],
        immediatelyRender: false, // Fixes SSR hydration mismatch
        content: processInitialValue(value),
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3'
            }
        }
    })

    // Sync logic removed: We now rely on the parent to unmount/remount this component (via key prop)
    // when switching slides. This prevents focus loss/cursor jumping during typing.

    if (!editor) {
        return null
    }

    const setFontSize = (size: string) => {
        editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    }

    const currentFontSize = editor.getAttributes('textStyle').fontSize || "";

    const ToolbarButton = ({ onClick, isActive, icon: Icon, title, label }: any) => (
        <button
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors flex items-center gap-1 ${isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
            title={title}
        >
            <Icon className="w-4 h-4" />
            {label && <span className="text-xs font-semibold">{label}</span>}
        </button>
    )

    return (
        <div className="border border-slate-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 p-1 px-2 flex-wrap">
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

                <div className="relative flex items-center group">
                    <Type className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
                    <select
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'reset') {
                                editor.chain().focus().unsetMark('textStyle').run();
                            } else {
                                setFontSize(val);
                            }
                        }}
                        className="pl-6 pr-1 py-1 h-7 text-[10px] uppercase tracking-wide bg-slate-100 hover:bg-slate-200 border border-transparent rounded text-slate-600 font-bold focus:outline-none cursor-pointer w-20 appearance-none transition-colors"
                        value={currentFontSize}
                    >
                        <option value="" disabled>SIZE</option>
                        <option value="1.25rem">Small</option>
                        <option value="1.75rem">Medium</option>
                        <option value="2.5rem">Large</option>
                        <option value="3.5rem">X-Large</option>
                        <option value="reset">Default</option>
                    </select>
                </div>

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
