import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { Extension } from '@tiptap/core'
import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Palette,
    Timer,
    Unlink2
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
                    timingId: {
                        default: null,
                        parseHTML: element => element.getAttribute('data-timing-id'),
                        renderHTML: attributes => {
                            if (!attributes.timingId) {
                                return {}
                            }
                            return {
                                'data-timing-id': attributes.timingId,
                            }
                        },
                    },
                    timingType: {
                        default: null,
                        parseHTML: element => element.getAttribute('data-timing-type'),
                        renderHTML: attributes => {
                            if (!attributes.timingType) {
                                return {}
                            }
                            return {
                                'data-timing-type': attributes.timingType,
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
    narrationTokens?: Array<{ index: number; word: string }>;
    timingLinks?: Array<{ sourceId: string; tokenIndex: number }>;
    onTimingLinkAdd?: (payload: { sourceId: string; sourceType: 'word' | 'paragraph' | 'heading' | 'node' | 'edge'; sourceText: string; tokenIndex: number }) => void;
    onTimingLinkRemove?: (sourceId: string) => void;
}

export default function RichTextEditor({
    value,
    onChange,
    variant = 'default',
    narrationTokens = [],
    timingLinks = [],
    onTimingLinkAdd,
    onTimingLinkRemove,
}: RichTextEditorProps) {
    const editorWrapperRef = React.useRef<HTMLDivElement | null>(null);
    const timingPopoverRef = React.useRef<HTMLDivElement | null>(null);
    const [bubbleBoundaryEl, setBubbleBoundaryEl] = React.useState<HTMLElement | null>(null);

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
        const newLines = [];

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

    const [timingMenuOpen, setTimingMenuOpen] = React.useState(false);
    const timingEnabled = !!onTimingLinkAdd;
    const hasNarrationTokens = narrationTokens.length > 0;
    const timingLinkMap = React.useMemo(() => {
        const map = new Map<string, number>();
        timingLinks.forEach((link) => {
            map.set(link.sourceId, link.tokenIndex);
        });
        return map;
    }, [timingLinks]);

    React.useEffect(() => {
        if (!editor) return;
        const closeTimingMenu = () => setTimingMenuOpen(false);
        const closeOnEmptySelection = () => {
            if (editor.state.selection.empty) {
                setTimingMenuOpen(false);
            }
        };
        editor.on('blur', closeTimingMenu);
        editor.on('selectionUpdate', closeOnEmptySelection);
        return () => {
            editor.off('blur', closeTimingMenu);
            editor.off('selectionUpdate', closeOnEmptySelection);
        };
    }, [editor]);

    React.useEffect(() => {
        if (!timingMenuOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (timingPopoverRef.current?.contains(target)) return;
            setTimingMenuOpen(false);
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setTimingMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [timingMenuOpen]);

    React.useEffect(() => {
        const wrapper = editorWrapperRef.current;
        if (!wrapper) return;

        // Constrain bubble menu to the visible slide frame in preview.
        const boundary =
            (wrapper.closest('.aspect-video') as HTMLElement | null) ||
            (wrapper.closest('.slide-preview-content') as HTMLElement | null) ||
            wrapper.parentElement;

        setBubbleBoundaryEl(boundary);
    }, [variant]);

    React.useEffect(() => {
        if (!editor) return;
        const handleClickAway = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (editorWrapperRef.current?.contains(target)) return;

            // BubbleMenu is appended to body, so treat it as in-bounds for editor interactions.
            const element = target instanceof Element ? target : target.parentElement;
            if (element?.closest('[data-tippy-root]')) return;

            if (editor.isFocused) {
                editor.commands.blur();
            }
            setTimingMenuOpen(false);
        };

        document.addEventListener('pointerdown', handleClickAway, true);
        return () => {
            document.removeEventListener('pointerdown', handleClickAway, true);
        };
    }, [editor]);

    // Sync logic removed: We now rely on the parent to unmount/remount this component (via key prop)
    // when switching slides. This prevents focus loss/cursor jumping during typing.

    if (!editor) {
        return null
    }

    const getSelectionTimingContext = () => {
        const { from, to, empty } = editor.state.selection;
        if (empty) return null;

        const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
        if (!selectedText) return null;

        const attrs = editor.getAttributes('textStyle') as { timingId?: string; timingType?: string };
        const inferredType: 'word' | 'paragraph' | 'heading' =
            editor.isActive('heading')
                ? 'heading'
                : selectedText.split(/\s+/).length > 1
                    ? 'paragraph'
                    : 'word';

        return {
            selectedText,
            timingId: attrs.timingId || "",
            timingType: (attrs.timingType as 'word' | 'paragraph' | 'heading' | undefined) || inferredType,
        };
    };

    const applyTimingLink = (tokenIndex: number) => {
        if (!timingEnabled || !hasNarrationTokens) return;
        const ctx = getSelectionTimingContext();
        if (!ctx) return;

        const { from, to } = editor.state.selection;
        const sourceId = ctx.timingId || `timing-${from}-${to}-${ctx.timingType}`;
        editor.chain().focus().setMark('textStyle', { timingId: sourceId, timingType: ctx.timingType }).run();
        onTimingLinkAdd?.({
            sourceId,
            sourceType: ctx.timingType,
            sourceText: ctx.selectedText,
            tokenIndex,
        });
        setTimingMenuOpen(false);
    };

    const removeTimingLink = () => {
        const ctx = getSelectionTimingContext();
        if (!ctx || !ctx.timingId) return;
        editor.chain().focus().setMark('textStyle', { timingId: null, timingType: null }).run();
        onTimingLinkRemove?.(ctx.timingId);
        setTimingMenuOpen(false);
    };

    const setFontSize = (size: string) => {
        editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    }

    const setColor = (color: string) => {
        editor.chain().focus().setColor(color).run();
    }

    const currentFontSize = editor.getAttributes('textStyle').fontSize || "";
    const currentColor = editor.getAttributes('textStyle').color || "#000000"; // Default black

    const ToolbarButton = ({ onClick, isActive, icon: Icon, title, label }: { onClick: () => void; isActive: boolean; icon: LucideIcon; title: string; label?: string }) => (
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
    const renderToolbarContent = () => {
        const timingCtx = getSelectionTimingContext();
        const activeTimingToken = timingCtx?.timingId ? timingLinkMap.get(timingCtx.timingId) : undefined;
        const canUseTiming = hasNarrationTokens;

        return (
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

            {timingEnabled && (
                <>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                if (!canUseTiming) return;
                                setTimingMenuOpen((prev) => !prev);
                            }}
                            className={cn(
                                "p-1.5 rounded transition-colors flex items-center gap-1",
                                timingCtx?.timingId ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-200",
                                !canUseTiming ? "opacity-40 cursor-not-allowed" : ""
                            )}
                            title="Link timing to narration"
                            disabled={!canUseTiming}
                        >
                            <Timer className="w-4 h-4" />
                        </button>

                        {timingMenuOpen && (
                            <div ref={timingPopoverRef} className="absolute right-0 mt-2 w-72 rounded-md border bg-white shadow-lg p-3 z-[100000]">
                                <p className="text-xs font-semibold text-slate-700 mb-1">Link to narration word</p>
                                <p className="text-[11px] text-slate-500 mb-2 line-clamp-2">
                                    {timingCtx?.selectedText || "Select one or more words in on-screen text to link timing."}
                                </p>
                                {typeof activeTimingToken === "number" && narrationTokens[activeTimingToken] && (
                                    <p className="text-[11px] text-violet-700 mb-2">
                                        Linked: #{activeTimingToken} {narrationTokens[activeTimingToken].word}
                                    </p>
                                )}
                                {hasNarrationTokens ? (
                                    <div className="max-h-36 overflow-y-auto border rounded p-2 mb-2">
                                        <div className="flex flex-wrap gap-1">
                                            {narrationTokens.map((token) => (
                                                <button
                                                    key={`timing-token-${token.index}`}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        applyTimingLink(token.index);
                                                    }}
                                                    className={cn(
                                                        "text-[11px] px-1.5 py-0.5 rounded border",
                                                        activeTimingToken === token.index
                                                            ? "border-violet-600 bg-violet-600 text-white"
                                                            : "border-slate-300 text-slate-700 hover:bg-slate-50",
                                                        !timingCtx ? "opacity-50 cursor-not-allowed" : ""
                                                    )}
                                                    disabled={!timingCtx}
                                                >
                                                    {token.word}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border rounded p-2 mb-2 text-[11px] text-slate-600 bg-slate-50">
                                        Add narration text first, then select a word to link timing.
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setTimingMenuOpen(false);
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            removeTimingLink();
                                        }}
                                        className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                                        disabled={!timingCtx?.timingId}
                                    >
                                        <Unlink2 className="w-3 h-3" />
                                        Remove timing
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
            </>
        );
    };

    if (variant === 'minimal') {
        return (
            <div ref={editorWrapperRef} className="w-full h-full relative group">
                {/* Global style override still needed for defaults */}
                <style jsx global>{`
                    .ProseMirror p, .ProseMirror li {
                        font-size: var(--editor-default-size, 1.75rem); 
                    }
                    .ProseMirror [data-timing-id] {
                        background: rgba(139, 92, 246, 0.12);
                        border-bottom: 2px solid rgba(139, 92, 246, 0.45);
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
                    /* Ensure bubble menu appears above all other elements */
                    [data-tippy-root], .tippy-box, .tippy-content {
                        z-index: 99999 !important;
                    }
                `}</style>

                {editor && (
                    <BubbleMenu
                        editor={editor}
                        appendTo={() => bubbleBoundaryEl ?? document.body}
                        options={{
                            placement: 'top-start',
                            offset: 8,
                            inline: true,
                            flip: {
                                padding: 8,
                                boundary: bubbleBoundaryEl ?? undefined,
                            },
                            shift: {
                                padding: 8,
                                crossAxis: true,
                                boundary: bubbleBoundaryEl ?? undefined,
                            },
                        }}
                        className="z-[99999]"
                        shouldShow={({ editor: activeEditor, state }) => activeEditor.isFocused && !state.selection.empty}
                    >
                        <div className="flex items-center gap-1 border border-slate-200 bg-white shadow-lg rounded-full p-1.5 px-3 animate-in fade-in zoom-in duration-200">
                            {renderToolbarContent()}
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
        <div ref={editorWrapperRef} className="border border-slate-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
            {/* explicit style override to guarantee default size of 1.75rem for paragraphs/lists if no inline style is present */}
            <style jsx global>{`
                .ProseMirror p, .ProseMirror li {
                    font-size: 1.75rem; 
                }
                .ProseMirror [data-timing-id] {
                    background: rgba(139, 92, 246, 0.12);
                    border-bottom: 2px solid rgba(139, 92, 246, 0.45);
                }
            `}</style>
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 p-1 px-2 flex-wrap">
                {renderToolbarContent()}
            </div>
            <EditorContent editor={editor} className="cursor-text" />
        </div>
    )
}
