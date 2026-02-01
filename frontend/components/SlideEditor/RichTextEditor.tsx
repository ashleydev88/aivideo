import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { Extension } from '@tiptap/core'
import React, { useEffect } from 'react'
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Palette
} from 'lucide-react'

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
    variant?: 'default' | 'minimal';
}

export default function RichTextEditor({ value, onChange, placeholder, variant = 'default' }: RichTextEditorProps) {
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
            BubbleMenuExtension,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right'],
                defaultAlignment: 'left',
            }),
            Color,
        ],
        immediatelyRender: false, // Fixes SSR hydration mismatch
        content: processInitialValue(value),
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-xl max-w-none focus:outline-none min-h-[120px] p-3 prose-p:!leading-relaxed'
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

    const setColor = (color: string) => {
        editor.chain().focus().setColor(color).run();
    }

    const currentFontSize = editor.getAttributes('textStyle').fontSize || "";
    const currentColor = editor.getAttributes('textStyle').color || "#000000"; // Default black

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

    // Common toolbar content for reuse
    const ToolbarContent = () => (
        <>
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

            {/* Font Size */}
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
                    // Prevent bubbling click to parent container in minimal mode
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="" disabled>SIZE</option>
                    <option value="0.75rem">XS</option>
                    <option value="1.25rem">S</option>
                    <option value="reset">M</option>
                    <option value="2.25rem">L</option>
                    <option value="3.0rem">XL</option>
                    <option value="4.5rem">XXL</option>
                </select>
            </div>

            {/* Text Color */}
            <div className="relative flex items-center group ml-1">
                <div className="relative p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer group-hover:bg-slate-200">
                    <Palette className="w-4 h-4 text-slate-500" />
                    <input
                        type="color"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onMouseDown={(e) => e.preventDefault()}
                        onChange={(e) => setColor((e.target as HTMLInputElement).value)}
                        value={currentColor}
                        title="Text Color"
                    />
                </div>
            </div>

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                icon={AlignLeft}
                title="Align Left"
            />
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                icon={AlignCenter}
                title="Align Center"
            />
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                icon={AlignRight}
                title="Align Right"
            />

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={List}
                title="Bullet List"
            />
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={ListOrdered}
                title="Numbered List"
            />
        </>
    );

    if (variant === 'minimal') {
        return (
            <div className="w-full h-full relative group">
                {/* Global style override still needed for defaults */}
                <style jsx global>{`
                    .ProseMirror p, .ProseMirror li {
                        font-size: 1.75rem; 
                    }
                    /* Minimal editor specific styles */
                    .minimal-editor .ProseMirror {
                         padding: 0;
                         min-height: auto;
                         outline: none !important;
                         background: transparent;
                         color: inherit; /* Inherit color from parent */
                    }
                    .minimal-editor .ProseMirror-focused {
                        outline: none !important;
                    }
                    .minimal-editor .ProseMirror p {
                         margin-top: 0;
                         margin-bottom: 0.5em;
                    }
                `}</style>

                {editor && (
                    <BubbleMenu editor={editor}>
                        <div className="flex items-center gap-1 border border-slate-200 bg-white shadow-lg rounded-full p-1.5 px-3 animate-in fade-in zoom-in duration-200">
                            <ToolbarContent />
                        </div>
                    </BubbleMenu>
                )}

                <EditorContent editor={editor} className="minimal-editor w-full h-full" />

                {/* Visual hint on hover if empty or just to show editability */}
                <div className="absolute inset-0 border-2 border-dashed border-teal-500/0 group-hover:border-teal-500/30 rounded-lg pointer-events-none transition-all duration-300" />
            </div>
        )
    }

    return (
        <div className="border border-slate-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
            {/* explicit style override to guarantee default size of 1.75rem for paragraphs/lists if no inline style is present */}
            <style jsx global>{`
                .ProseMirror p, .ProseMirror li {
                    font-size: 1.75rem; 
                }
            `}</style>
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 p-1 px-2 flex-wrap">
                <ToolbarContent />
            </div>
            <EditorContent editor={editor} className="cursor-text" />
        </div>
    )
}
