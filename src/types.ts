export interface ImportInfo {
    source: string;
    type: 'import' | 'require';
    isNodeModule: boolean;
    resolvedPath?: string;
    importedNames?: string[];
}

export interface FileNode {
    path: string;
    name: string;
    imports: ImportInfo[];
    importedBy: string[];
    isNodeModule: boolean;
}

export interface ImportMap {
    files: Map<string, FileNode>;
    entryFile?: string;
}

export interface VisualizationNode {
    id: string;
    label: string;
    path: string;
    isNodeModule: boolean;
    isCurrentFile?: boolean;
    x?: number;
    y?: number;
}

export interface VisualizationEdge {
    from: string;
    to: string;
    type: 'import' | 'require';
} 