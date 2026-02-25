import { getFileName } from './utils';
import { useAiEnabled } from './AiFeatureContext';
import React, { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars } from '@codemirror/view';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { defaultKeymap, emacsStyleKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { vim } from '@replit/codemirror-vim';
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap, linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { BrainCircuit, Edit, FileText, MessageSquare, GitBranch, X, Play, HelpCircle } from 'lucide-react';

const appHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: '#c678dd' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e06c75' },
    { tag: [t.function(t.variableName), t.labelName], color: '#61afef' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#d19a66' },
    { tag: [t.definition(t.name), t.function(t.definition(t.name))], color: '#e5c07b' },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#d19a66' },
    { tag: [t.operator, t.operatorKeyword], color: '#56b6c2' },
    { tag: [t.meta, t.comment], color: '#7f848e', fontStyle: 'italic' },
    { tag: [t.string, t.inserted], color: '#98c379' },
    { tag: t.invalid, color: '#ff5555' },
]);

// Custom theme for the editor
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '14px',
        backgroundColor: '#1e1e2e',
    },
    '.cm-content': {
        fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", Menlo, Monaco, monospace',
        caretColor: '#89b4fa',
    },
    '.cm-cursor': {
        borderLeftColor: '#89b4fa',
        borderLeftWidth: '2px',
    },
    '& .cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: '#284f78',
    },
    '& .cm-content ::selection': {
        backgroundColor: 'transparent',
    },
    '& .cm-activeLine, &.cm-focused .cm-activeLine': {
        backgroundColor: '#1e2030',
    },
    '& .cm-activeLineGutter': {
        backgroundColor: '#1e2030',
    },
    '.cm-gutters': {
        backgroundColor: '#1e1e2e',
        color: '#6c7086',
        border: 'none',
        borderRight: '1px solid #313244',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 2px 0 4px',
        minWidth: 'unset',
    },
    '.cm-lineNumbers': {
        minWidth: 'unset',
        width: 'auto',
    },
    '.cm-gutter.cm-lineNumbers': {
        minWidth: 'unset',
        width: 'auto',
    },
    '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        cursor: 'pointer',
    },
    '.cm-foldGutter .cm-gutterElement:hover': {
        color: '#89b4fa',
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'rgba(137, 180, 250, 0.3)',
        outline: '1px solid #89b4fa',
    },
    '.cm-searchMatch': {
        backgroundColor: 'rgba(249, 226, 175, 0.3)',
        outline: '1px solid #f9e2af',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(166, 227, 161, 0.4)',
    },
    // Lint gutter & diagnostics
    '.cm-lint-marker-error': {
        content: '"!"',
        color: '#f38ba8',
    },
    '.cm-lint-marker-warning': {
        content: '"⚠"',
        color: '#f9e2af',
    },
    '.cm-lintRange-error': {
        backgroundImage: 'none',
        textDecoration: 'underline wavy #f38ba8',
        textUnderlineOffset: '3px',
    },
    '.cm-lintRange-warning': {
        backgroundImage: 'none',
        textDecoration: 'underline wavy #f9e2af',
        textUnderlineOffset: '3px',
    },
    '.cm-tooltip-lint': {
        backgroundColor: '#1e1e2e',
        border: '1px solid #313244',
        borderRadius: '4px',
        color: '#cdd6f4',
        padding: '4px 8px',
        fontSize: '12px',
    },
    '& .cm-selectionMatch': {
        backgroundColor: '#3d3522',
        outline: '1px solid #5c4f2a',
    },
    '.cm-panels': {
        backgroundColor: '#1e1e2e',
        color: '#cdd6f4',
    },
    '.cm-panels.cm-panels-top': {
        borderBottom: '1px solid #313244',
    },
    '.cm-panel.cm-search': {
        padding: '8px 12px',
        backgroundColor: '#181825',
    },
    '.cm-panel.cm-search input, .cm-panel.cm-search button': {
        margin: '0 4px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: '#313244',
        border: '1px solid #45475a',
        color: '#cdd6f4',
    },
    '.cm-panel.cm-search button:hover': {
        backgroundColor: '#45475a',
    },
    '.cm-panel.cm-search label': {
        margin: '0 8px',
        color: '#a6adc8',
    },
    '.cm-tooltip': {
        backgroundColor: '#1e1e2e',
        border: '1px solid #313244',
        borderRadius: '6px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete': {
        '& > ul': {
            fontFamily: '"Fira Code", monospace',
            maxHeight: '200px',
        },
        '& > ul > li': {
            padding: '4px 8px',
        },
        '& > ul > li[aria-selected]': {
            backgroundColor: '#313244',
            color: '#cdd6f4',
        },
    },
    '.cm-completionIcon': {
        width: '1em',
        marginRight: '0.5em',
    },
    // Vim mode status bar and command line
    '.cm-vim-panel': {
        backgroundColor: '#181825',
        color: '#cdd6f4',
        padding: '2px 8px',
        fontFamily: '"Fira Code", monospace',
        fontSize: '12px',
    },
    '.cm-vim-panel input': {
        backgroundColor: 'transparent',
        color: '#cdd6f4',
        border: 'none',
        outline: 'none',
        fontFamily: '"Fira Code", monospace',
    },
    // Fat cursor for vim normal mode
    '&.cm-focused .cm-fat-cursor': {
        background: '#89b4fa !important',
        color: '#1e1e2e !important',
    },
    '&:not(.cm-focused) .cm-fat-cursor': {
        background: 'none !important',
        outline: '1px solid #89b4fa !important',
        color: 'transparent !important',
    },
}, { dark: true });

const CodeMirrorEditor = memo(({ value, onChange, filePath, onSave, onContextMenu, onSelect, onSendToTerminal, savedEditorState, onEditorStateChange, keybindMode }) => {
    const editorRef = useRef(null);

    const languageExtension = useMemo(() => {
        const ext = filePath?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js': case 'mjs': return javascript();
            case 'jsx': return javascript({ jsx: true });
            case 'ts': return javascript({ typescript: true });
            case 'tsx': return javascript({ jsx: true, typescript: true });
            case 'py': case 'pyw': return python();
            case 'json': case 'jsonc': return json();
            case 'html': case 'htm': return html();
            case 'css': case 'scss': case 'less': return css();
            case 'md': case 'markdown': return markdown();
            default: return [];
        }
    }, [filePath]);

    const customKeymap = useMemo(() => keymap.of([
        { key: 'Mod-s', run: () => { if (onSave) onSave(); return true; } },
        { key: 'Ctrl-Enter', run: (view) => {
            if (onSendToTerminal) {
                const selection = view.state.sliceDoc(
                    view.state.selection.main.from,
                    view.state.selection.main.to
                );
                if (selection) {
                    onSendToTerminal(selection);
                    return true;
                }
            }
            return false;
        }},
        { key: 'Mod-Enter', run: (view) => {
            if (onSendToTerminal) {
                const selection = view.state.sliceDoc(
                    view.state.selection.main.from,
                    view.state.selection.main.to
                );
                if (selection) {
                    onSendToTerminal(selection);
                    return true;
                }
            }
            return false;
        }},
        indentWithTab,
    ]), [onSave, onSendToTerminal]);

    const tabSize = useMemo(() => {
        const saved = localStorage.getItem('incognide_tabSize');
        return saved ? parseInt(saved) : 4;
    }, []);

    // Lint extension: runs linter via IPC, debounced
    const lintExtension = useMemo(() => {
        const ext = filePath?.split('.').pop()?.toLowerCase();
        let language: string | null = null;
        if (['js', 'mjs', 'jsx'].includes(ext || '')) language = 'javascript';
        else if (['ts', 'tsx'].includes(ext || '')) language = 'typescript';
        else if (['py', 'pyw'].includes(ext || '')) language = 'python';
        else if (ext === 'tex') language = 'tex';

        if (!language) return [];

        const lintEnabled = localStorage.getItem('incognide_lintEnabled') !== 'false';
        if (!lintEnabled) return [];

        return [
            linter(async (view) => {
                const content = view.state.doc.toString();
                if (!content.trim()) return [];
                try {
                    const results = await (window as any).api?.lintFile?.({ filePath, content, language });
                    if (!Array.isArray(results)) return [];
                    return results.map((d: any) => {
                        const fromLine = view.state.doc.line(Math.min(d.from.line + 1, view.state.doc.lines));
                        const toLine = view.state.doc.line(Math.min(d.to.line + 1, view.state.doc.lines));
                        const from = Math.min(fromLine.from + d.from.col, fromLine.to);
                        const to = Math.min(toLine.from + d.to.col, toLine.to);
                        return {
                            from: Math.max(0, from),
                            to: Math.max(from, to),
                            message: d.message,
                            severity: d.severity === 'error' ? 'error' : 'warning',
                        } as Diagnostic;
                    });
                } catch { return []; }
            }, { delay: 2000 }),
            lintGutter(),
        ];
    }, [filePath]);

    // Build keymap extensions based on keybind mode
    const keymapExtensions = useMemo(() => {
        const base = [
            ...closeBracketsKeymap,
            ...historyKeymap,
            ...searchKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
        ];

        switch (keybindMode) {
            case 'emacs':
                return [keymap.of([...base, ...emacsStyleKeymap])];
            case 'nano': {
                const nanoKeymap = [
                    { key: 'Ctrl-o', run: () => { if (onSave) onSave(); return true; } },
                    { key: 'Ctrl-k', run: (view) => {
                        // Cut current line
                        const line = view.state.doc.lineAt(view.state.selection.main.head);
                        const text = view.state.sliceDoc(line.from, line.to + 1);
                        navigator.clipboard.writeText(text);
                        view.dispatch({ changes: { from: line.from, to: Math.min(line.to + 1, view.state.doc.length) } });
                        return true;
                    }},
                    { key: 'Ctrl-u', run: (view) => {
                        // Paste from clipboard
                        navigator.clipboard.readText().then(text => {
                            view.dispatch({ changes: { from: view.state.selection.main.head, insert: text } });
                        });
                        return true;
                    }},
                    { key: 'Ctrl-w', run: (view) => {
                        // Open search
                        const searchCmd = searchKeymap.find(k => k.key === 'Mod-f');
                        if (searchCmd?.run) return searchCmd.run(view);
                        return false;
                    }},
                    { key: 'Ctrl-a', run: (view) => {
                        // Go to beginning of line
                        const line = view.state.doc.lineAt(view.state.selection.main.head);
                        view.dispatch({ selection: { anchor: line.from } });
                        return true;
                    }},
                    { key: 'Ctrl-e', run: (view) => {
                        // Go to end of line
                        const line = view.state.doc.lineAt(view.state.selection.main.head);
                        view.dispatch({ selection: { anchor: line.to } });
                        return true;
                    }},
                ];
                return [keymap.of([...nanoKeymap, ...base, ...defaultKeymap])];
            }
            default:
                return [keymap.of([...base, ...defaultKeymap])];
        }
    }, [keybindMode, onSave]);

    // Vim mode is a standalone extension, not just a keymap
    const vimExtension = useMemo(() => {
        return keybindMode === 'vim' ? [vim()] : [];
    }, [keybindMode]);

    const extensions = useMemo(() => [
        // Vim must be first if active
        ...vimExtension,

        // Core editor features
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),

        // Indentation settings
        indentUnit.of(' '.repeat(tabSize)),
        EditorState.tabSize.of(tabSize),

        // Language support
        languageExtension,

        // Lint support
        ...lintExtension,

        // Search with styled panel
        search({ top: true }),

        // Keymaps
        ...keymapExtensions,
        customKeymap,

        // Styling
        editorTheme,
        syntaxHighlighting(appHighlightStyle),

        // Optional line wrapping (comment out for horizontal scroll)
        EditorView.lineWrapping,
    ], [languageExtension, lintExtension, customKeymap, tabSize, keymapExtensions, vimExtension]);

    const handleUpdate = useCallback((viewUpdate) => {
        if (viewUpdate.selectionSet && onSelect) {
            const { from, to } = viewUpdate.state.selection.main;
            onSelect(from, to);
        }
    }, [onSelect]);

    useEffect(() => {
        const editorDOM = editorRef.current?.editor;
        if (editorDOM) {
            const handleContextMenu = (event) => {
                if (onContextMenu) {
                    const view = editorRef.current?.view;
                    let selection = '';
                    if (view) {
                        const { from, to } = view.state.selection.main;
                        if (from !== to) {
                            selection = view.state.sliceDoc(from, to);
                        }
                    }
                    onContextMenu(event, selection);
                }
            };
            editorDOM.addEventListener('contextmenu', handleContextMenu);
            return () => editorDOM.removeEventListener('contextmenu', handleContextMenu);
        }
    }, [onContextMenu]);

    // Direct keydown handler for Ctrl+Enter (or Shift+Enter) to send selection to terminal
    useEffect(() => {
        const editorDOM = editorRef.current?.editor;
        if (!editorDOM || !onSendToTerminal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (((e.ctrlKey || e.metaKey) || e.shiftKey) && e.key === 'Enter') {
                const view = editorRef.current?.view;
                if (view) {
                    const { from, to } = view.state.selection.main;
                    if (from !== to) {
                        const selection = view.state.sliceDoc(from, to);
                        if (selection) {
                            e.preventDefault();
                            e.stopPropagation();
                            onSendToTerminal(selection);
                        }
                    }
                }
            }
        };

        editorDOM.addEventListener('keydown', handleKeyDown, true);
        return () => editorDOM.removeEventListener('keydown', handleKeyDown, true);
    }, [onSendToTerminal]);

    // Save editor state (undo history, cursor) on unmount
    useEffect(() => {
        return () => {
            if (onEditorStateChange && editorRef.current?.view) {
                try {
                    const view = editorRef.current.view;
                    onEditorStateChange({
                        json: view.state.toJSON({ history: history() }),
                        cursorPos: view.state.selection.main.head,
                    });
                } catch (e) { /* serialization failure is OK */ }
            }
        };
    }, [onEditorStateChange]);

    return (
        <CodeMirror
            ref={editorRef}
            value={value}
            height="100%"
            style={{ height: '100%' }}
            extensions={extensions}
            onChange={onChange}
            onUpdate={handleUpdate}
            initialState={savedEditorState ? {
                json: savedEditorState.json,
                fields: { history: history() },
            } : undefined}
        />
    );
});


const KbRow = ({ keys, desc }: { keys: string; desc: string }) => (
    <div className="flex justify-between gap-2">
        <kbd className="text-purple-300/80 font-mono shrink-0">{keys}</kbd>
        <span className="text-gray-500 text-right">{desc}</span>
    </div>
);

const CodeEditorPane = ({
    nodeId,
    contentDataRef,
    setRootLayoutNode,
    activeContentPaneId,
    editorContextMenuPos,
    setEditorContextMenuPos,
    aiEditModal,
    renamingPaneId,
    setRenamingPaneId,
    editedFileName,
    setEditedFileName,
    handleTextSelection,
    handleEditorCopy,
    handleEditorPaste,
    handleAddToChat,
    handleAIEdit,
    startAgenticEdit,
    setPromptModal,
    onGitBlame,
    currentPath,
    onRunScript,
    onSendToTerminal,
}) => {
    const aiEnabled = useAiEnabled();
    const paneData = contentDataRef.current[nodeId];
    const [showBlame, setShowBlame] = useState(false);
    const [blameData, setBlameData] = useState<any[] | null>(null);
    const [blameLoading, setBlameLoading] = useState(false);
    const [contextMenuSelection, setContextMenuSelection] = useState('');
    const [keybindMode, setKeybindMode] = useState(() => {
        return localStorage.getItem('incognide_editorKeybindMode') || 'default';
    });
    const [showKeybindGuide, setShowKeybindGuide] = useState(false);

    if (!paneData) return null;

    const { contentId: filePath, fileContent, fileChanged } = paneData;
    const fileName = getFileName(filePath) || 'Untitled';
    const isRenaming = renamingPaneId === nodeId;

    const handleLoadBlame = useCallback(async () => {
        if (!currentPath || !filePath) return;
        setBlameLoading(true);
        try {
            // Get relative path from currentPath
            const relativePath = filePath.startsWith(currentPath)
                ? filePath.slice(currentPath.length + 1)
                : filePath;
            const result = await (window as any).api.gitBlame(currentPath, relativePath);
            if (result?.success && Array.isArray(result.blame)) {
                setBlameData(result.blame);
                setShowBlame(true);
            } else {
                console.error('Git blame failed:', result?.error);
                setBlameData(null);
            }
        } catch (err) {
            console.error('Failed to load git blame:', err);
            setBlameData(null);
        } finally {
            setBlameLoading(false);
        }
    }, [currentPath, filePath]);

    const onContentChange = useCallback((value) => {
        if (contentDataRef.current[nodeId]) {
            contentDataRef.current[nodeId].fileContent = value;
            if (!contentDataRef.current[nodeId].fileChanged) {
                contentDataRef.current[nodeId].fileChanged = true;
                setRootLayoutNode(p => ({ ...p }));
            }
        }
    }, [nodeId, contentDataRef, setRootLayoutNode]);

    const onSave = useCallback(async () => {
        const currentPaneData = contentDataRef.current[nodeId];
        if (!currentPaneData) return;

        // If untitled file, prompt for filename
        if (!currentPaneData.contentId && currentPaneData.isUntitled) {
            setPromptModal({
                isOpen: true,
                title: 'Save File',
                message: 'Enter filename with extension (e.g., script.py, index.js, notes.md)',
                defaultValue: 'untitled.txt',
                onConfirm: async (inputFilename) => {
                    if (!inputFilename || inputFilename.trim() === '') return;
                    const cleanName = inputFilename.trim();
                    const filepath = `${currentPath}/${cleanName}`;
                    await window.api.writeFileContent(filepath, currentPaneData.fileContent || '');
                    // Update pane data with the new file path
                    currentPaneData.contentId = filepath;
                    currentPaneData.isUntitled = false;
                    currentPaneData.fileChanged = false;
                    setRootLayoutNode(p => ({ ...p }));
                }
            });
            return;
        }

        // Normal save for existing files
        if (currentPaneData.contentId && currentPaneData.fileChanged) {
            await window.api.writeFileContent(currentPaneData.contentId, currentPaneData.fileContent);
            currentPaneData.fileChanged = false;
            setRootLayoutNode(p => ({ ...p }));
        }
    }, [nodeId, contentDataRef, setRootLayoutNode, setPromptModal, currentPath]);

    // Expose save function on paneData so the header save button can call it
    useEffect(() => {
        const paneData = contentDataRef.current[nodeId];
        if (paneData) paneData.onSave = onSave;
        return () => { if (paneData) delete paneData.onSave; };
    }, [nodeId, onSave, contentDataRef]);

    // Autosave: debounced write to disk 3 seconds after last edit
    useEffect(() => {
        const currentPaneData = contentDataRef.current[nodeId];
        if (!currentPaneData?.fileChanged || !currentPaneData?.contentId || currentPaneData?.isUntitled) return;
        const timer = setTimeout(async () => {
            try {
                await (window as any).api.writeFileContent(currentPaneData.contentId, currentPaneData.fileContent);
                currentPaneData.fileChanged = false;
                setRootLayoutNode(p => ({ ...p }));
            } catch (e) {
                // Silent fail for autosave
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [fileContent, fileChanged, nodeId, contentDataRef, setRootLayoutNode]);

    const onEditorContextMenu = useCallback((e, selection) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeContentPaneId === nodeId) {
            setContextMenuSelection(selection || '');
            setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
        }
    }, [nodeId, activeContentPaneId, setEditorContextMenuPos]);

    const handleStartRename = useCallback(() => {
        setRenamingPaneId(nodeId);
        setEditedFileName(fileName);
    }, [nodeId, fileName, setRenamingPaneId, setEditedFileName]);

    return (
        <div className="flex-1 flex flex-col min-h-0 theme-bg-secondary relative">
            <div className="flex-1 flex min-h-0">
                {/* Git Blame Panel */}
                {showBlame && Array.isArray(blameData) && (
                    <div className="w-64 border-r theme-border flex flex-col bg-black/20 overflow-hidden">
                        <div className="flex items-center justify-between px-2 py-1 border-b theme-border bg-black/20">
                            <span className="text-xs font-medium theme-text-muted">Git Blame</span>
                            <button onClick={() => setShowBlame(false)} className="p-0.5 theme-hover rounded">
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto text-xs font-mono">
                            {blameData.map((line: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="flex items-center px-2 py-0.5 hover:bg-white/5 border-b border-white/5"
                                    style={{ minHeight: '20px' }}
                                >
                                    <div className="flex-1 truncate">
                                        <span className="text-purple-400">{line.hash?.slice(0, 7) || '-------'}</span>
                                        <span className="text-gray-500 mx-1">|</span>
                                        <span className="text-gray-400">{line.author?.slice(0, 12) || 'Unknown'}</span>
                                    </div>
                                    <div className="text-gray-500 text-right w-10">{idx + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Editor */}
                <div className="flex-1 overflow-auto min-h-0 relative">
                    <CodeMirrorEditor
                        value={fileContent || ''}
                        onChange={onContentChange}
                        onSave={onSave}
                        filePath={filePath}
                        onSelect={handleTextSelection}
                        onContextMenu={onEditorContextMenu}
                        onSendToTerminal={onSendToTerminal}
                        keybindMode={keybindMode}
                        savedEditorState={paneData?._editorStateJSON ? { json: paneData._editorStateJSON } : undefined}
                        onEditorStateChange={(state) => { if (paneData) { paneData._editorStateJSON = state.json; paneData._cursorPos = state.cursorPos; } }}
                    />
                    {/* Keybinding mode selector + guide */}
                    <div className="absolute bottom-1 right-2 z-10 flex items-center gap-1">
                        <select
                            value={keybindMode}
                            onChange={(e) => {
                                const mode = e.target.value;
                                setKeybindMode(mode);
                                localStorage.setItem('incognide_editorKeybindMode', mode);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-gray-400 border border-white/10 hover:bg-black/60 hover:text-gray-200 cursor-pointer outline-none"
                            title="Editor keybinding mode"
                        >
                            <option value="default">Default</option>
                            <option value="vim">Vim</option>
                            <option value="emacs">Emacs</option>
                            <option value="nano">Nano</option>
                        </select>
                        <button
                            onClick={() => setShowKeybindGuide(prev => !prev)}
                            className={`p-0.5 rounded hover:bg-black/60 ${showKeybindGuide ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Keybinding reference"
                        >
                            <HelpCircle size={12} />
                        </button>
                    </div>
                    {showKeybindGuide && (
                        <div className="absolute bottom-7 right-2 z-20 w-64 rounded-lg border border-white/10 bg-[#181825]/95 backdrop-blur shadow-xl text-[11px] text-gray-300 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/20">
                                <span className="font-medium text-gray-200 text-xs">
                                    {keybindMode === 'default' ? 'Default' : keybindMode === 'vim' ? 'Vim' : keybindMode === 'emacs' ? 'Emacs' : 'Nano'} Keybindings
                                </span>
                                <button onClick={() => setShowKeybindGuide(false)} className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300">
                                    <X size={10} />
                                </button>
                            </div>
                            <div className="px-3 py-2 space-y-1 max-h-60 overflow-y-auto">
                                {keybindMode === 'default' && <>
                                    <KbRow keys="Cmd/Ctrl+S" desc="Save file" />
                                    <KbRow keys="Cmd/Ctrl+Z" desc="Undo" />
                                    <KbRow keys="Cmd/Ctrl+Shift+Z" desc="Redo" />
                                    <KbRow keys="Cmd/Ctrl+F" desc="Find" />
                                    <KbRow keys="Cmd/Ctrl+H" desc="Find & replace" />
                                    <KbRow keys="Cmd/Ctrl+D" desc="Select next occurrence" />
                                    <KbRow keys="Cmd/Ctrl+/" desc="Toggle comment" />
                                    <KbRow keys="Tab" desc="Indent" />
                                    <KbRow keys="Shift+Tab" desc="Dedent" />
                                    <KbRow keys="Cmd/Ctrl+Enter" desc="Send selection to terminal" />
                                </>}
                                {keybindMode === 'vim' && <>
                                    <div className="text-gray-500 font-medium mb-0.5">Normal Mode</div>
                                    <KbRow keys="i / a / o" desc="Insert / append / open line" />
                                    <KbRow keys="h j k l" desc="Move left/down/up/right" />
                                    <KbRow keys="w / b / e" desc="Word forward/back/end" />
                                    <KbRow keys="0 / $" desc="Line start / end" />
                                    <KbRow keys="gg / G" desc="File start / end" />
                                    <KbRow keys="dd / yy / p" desc="Delete / yank / paste line" />
                                    <KbRow keys="u / Ctrl+R" desc="Undo / redo" />
                                    <KbRow keys="/ / n / N" desc="Search / next / prev" />
                                    <KbRow keys="ci( / di&quot;" desc="Change/delete inside" />
                                    <div className="text-gray-500 font-medium mt-1.5 mb-0.5">Command</div>
                                    <KbRow keys=":w" desc="Save" />
                                    <KbRow keys=":noh" desc="Clear search highlight" />
                                    <div className="text-gray-500 font-medium mt-1.5 mb-0.5">Visual Mode</div>
                                    <KbRow keys="v / V / Ctrl+V" desc="Char / line / block select" />
                                </>}
                                {keybindMode === 'emacs' && <>
                                    <KbRow keys="Ctrl+A / Ctrl+E" desc="Line start / end" />
                                    <KbRow keys="Ctrl+F / Ctrl+B" desc="Forward / back char" />
                                    <KbRow keys="Alt+F / Alt+B" desc="Forward / back word" />
                                    <KbRow keys="Ctrl+N / Ctrl+P" desc="Next / previous line" />
                                    <KbRow keys="Ctrl+K" desc="Kill to end of line" />
                                    <KbRow keys="Ctrl+Y" desc="Yank (paste kill ring)" />
                                    <KbRow keys="Ctrl+D" desc="Delete forward char" />
                                    <KbRow keys="Ctrl+H" desc="Delete backward char" />
                                    <KbRow keys="Ctrl+S" desc="Incremental search" />
                                    <KbRow keys="Ctrl+G" desc="Cancel" />
                                    <KbRow keys="Ctrl+Space" desc="Set mark" />
                                    <KbRow keys="Ctrl+W" desc="Kill region" />
                                    <KbRow keys="Cmd/Ctrl+S" desc="Save file" />
                                </>}
                                {keybindMode === 'nano' && <>
                                    <KbRow keys="Ctrl+O" desc="Save file" />
                                    <KbRow keys="Ctrl+K" desc="Cut line" />
                                    <KbRow keys="Ctrl+U" desc="Paste" />
                                    <KbRow keys="Ctrl+W" desc="Search" />
                                    <KbRow keys="Ctrl+A" desc="Go to line start" />
                                    <KbRow keys="Ctrl+E" desc="Go to line end" />
                                    <KbRow keys="Cmd/Ctrl+Z" desc="Undo" />
                                    <KbRow keys="Cmd/Ctrl+S" desc="Save file (alt)" />
                                    <KbRow keys="Cmd/Ctrl+Enter" desc="Send selection to terminal" />
                                </>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editorContextMenuPos && activeContentPaneId === nodeId && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setEditorContextMenuPos(null)}
                    />
                    <div
                        className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                        style={{
                            top: `${editorContextMenuPos.y}px`,
                            left: `${editorContextMenuPos.x}px`
                        }}
                    >
                        <button
                            onClick={() => { if (contextMenuSelection) navigator.clipboard.writeText(contextMenuSelection); setEditorContextMenuPos(null); }}
                            disabled={!contextMenuSelection}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            Copy
                        </button>
                        <button onClick={handleEditorPaste}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            Paste
                        </button>
                        {aiEnabled && contextMenuSelection && (
                            <>
                                <div className="border-t theme-border my-1"></div>
                                <button onClick={() => { handleAIEdit('ask', contextMenuSelection); setEditorContextMenuPos(null); }}
                                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                                    <MessageSquare size={16} />Explain
                                </button>
                                <button onClick={() => { handleAIEdit('document', contextMenuSelection); setEditorContextMenuPos(null); }}
                                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                                    <FileText size={16} />Add Comments
                                </button>
                                <button onClick={() => { handleAIEdit('edit', contextMenuSelection); setEditorContextMenuPos(null); }}
                                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                                    <Edit size={16} />Refactor
                                </button>
                            </>
                        )}
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                handleLoadBlame();
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-purple-400 text-sm">
                            <GitBranch size={16} />Git Blame
                        </button>
                        {contextMenuSelection && (
                            <>
                                <div className="border-t theme-border my-1"></div>
                                <button
                                    onClick={() => {
                                        setEditorContextMenuPos(null);
                                        handleAddToChat(contextMenuSelection);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-blue-400 text-sm">
                                    <MessageSquare size={16} />Add to Chat
                                </button>
                            </>
                        )}
                        {onSendToTerminal && contextMenuSelection && (
                            <>
                                <div className="border-t theme-border my-1"></div>
                                <button
                                    onClick={() => {
                                        setEditorContextMenuPos(null);
                                        onSendToTerminal(contextMenuSelection);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-green-400 text-sm">
                                    <Play size={16} />Send to Terminal
                                </button>
                            </>
                        )}
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                handleStartRename();
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            <Edit size={16} />Rename File
                        </button>
                        {aiEnabled && (
                            <>
                                <div className="border-t theme-border my-1"></div>
                                <button
                                    onClick={() => {
                                        setEditorContextMenuPos(null);
                                        setPromptModal({
                                            isOpen: true,
                                            title: 'Agentic Code Edit',
                                            message: 'What would you like AI to do with all open files?',
                                            defaultValue: 'Add error handling and improve code quality',
                                            onConfirm: (instruction) => startAgenticEdit(instruction)
                                        });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-blue-400 text-sm">
                                    <BrainCircuit size={16} />Agentic Edit
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CodeEditorPane;




    const renderFileContextMenu = () => (
        fileContextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFileContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: fileContextMenuPos.y, left: fileContextMenuPos.x }}
                    onMouseLeave={() => setFileContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToFiles('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('refactor')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Code2 size={16} />
                        <span>Refactor Code ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFiles('document')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Document Code ({selectedFiles.size})</span>
                    </button>
                </div>
            </>
        )
    );