import * as fs from 'fs';
import * as path from 'path';
import { ImportMap, FileNode, ImportInfo } from './types';

/**
 * GitignoreParser handles parsing .gitignore patterns and checking if files should be ignored
 */
class GitignoreParser {
    private patterns: { pattern: string; isNegation: boolean; isDirectory: boolean }[] = [];

    constructor(public readonly projectRoot: string) {
        this.loadGitignore();
    }

    private loadGitignore(): void {
        const gitignorePath = path.join(this.projectRoot, '.gitignore');
        
        if (!fs.existsSync(gitignorePath)) {
            console.log('📝 No .gitignore file found');
            return;
        }

        try {
            const content = fs.readFileSync(gitignorePath, 'utf-8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }

                const isNegation = trimmed.startsWith('!');
                const isDirectory = trimmed.endsWith('/');
                let pattern = trimmed;

                if (isNegation) {
                    pattern = pattern.substring(1);
                }

                if (isDirectory) {
                    pattern = pattern.substring(0, pattern.length - 1);
                }

                this.patterns.push({ pattern, isNegation, isDirectory });
            }
            
            console.log(`📝 Loaded ${this.patterns.length} .gitignore patterns`);
        } catch (error) {
            console.error('❌ Error reading .gitignore:', error);
        }
    }

    /**
     * Check if a file or directory should be ignored based on .gitignore patterns
     */
    shouldIgnore(filePath: string): boolean {
        const relativePath = path.relative(this.projectRoot, filePath);
        const isDirectory = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
        
        let shouldIgnore = false;

        for (const { pattern, isNegation, isDirectory: patternIsDirectory } of this.patterns) {
            // Skip directory patterns if checking a file, and vice versa
            if (patternIsDirectory && !isDirectory) {
                continue;
            }

            const matches = this.matchesPattern(relativePath, pattern);
            
            if (matches) {
                shouldIgnore = !isNegation;
            }
        }

        return shouldIgnore;
    }

    private matchesPattern(filePath: string, pattern: string): boolean {
        // Convert gitignore pattern to regex
        // Handle basic patterns - could be enhanced for more complex gitignore syntax
        
        // Normalize paths
        const normalizedPath = filePath.replace(/\\/g, '/');
        const normalizedPattern = pattern.replace(/\\/g, '/');
        
        // Handle absolute patterns (starting with /)
        if (normalizedPattern.startsWith('/')) {
            const absolutePattern = normalizedPattern.substring(1);
            return this.globMatch(normalizedPath, absolutePattern);
        }
        
        // Handle patterns that should match at any level
        // Check if the pattern matches the full path or any segment
        const pathSegments = normalizedPath.split('/');
        
        // Check full path match
        if (this.globMatch(normalizedPath, normalizedPattern)) {
            return true;
        }
        
        // Check if pattern matches any segment or suffix
        for (let i = 0; i < pathSegments.length; i++) {
            const suffix = pathSegments.slice(i).join('/');
            if (this.globMatch(suffix, normalizedPattern)) {
                return true;
            }
        }
        
        return false;
    }

    private globMatch(text: string, pattern: string): boolean {
        // Simple glob matching - converts * to .* and ? to .
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
            .replace(/\*/g, '.*') // * matches any characters
            .replace(/\?/g, '.'); // ? matches single character
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(text);
    }
}

export class ImportAnalyzer {
    private supportedExtensions = ['.ts', '.tsx', '.vue', '.svelte'];
    private gitignoreParser: GitignoreParser | null = null;

    async analyzeProject(projectRoot: string): Promise<ImportMap> {
        // Initialize gitignore parser
        this.gitignoreParser = new GitignoreParser(projectRoot);
        
        const files = new Map<string, FileNode>();
        const allFiles = this.getAllFiles(projectRoot);

        // First pass: analyze all files
        for (const filePath of allFiles) {
            const fileNode = await this.analyzeFileContent(filePath, projectRoot);
            if (fileNode) {
                files.set(filePath, fileNode);
            }
        }

        // Second pass: build importedBy relationships
        for (const [filePath, fileNode] of files) {
            for (const importInfo of fileNode.imports) {
                if (!importInfo.isNodeModule && importInfo.resolvedPath) {
                    const targetFile = files.get(importInfo.resolvedPath);
                    if (targetFile) {
                        targetFile.importedBy.push(filePath);
                    }
                }
            }
        }

        return { files };
    }

    /**
     * Get gitignore statistics for debugging
     */
    getGitignoreStats(): { patternsLoaded: number; hasGitignore: boolean } {
        if (!this.gitignoreParser) {
            return { patternsLoaded: 0, hasGitignore: false };
        }
        return {
            patternsLoaded: this.gitignoreParser['patterns'].length,
            hasGitignore: true
        };
    }

    async analyzeFile(filePath: string, projectRoot: string): Promise<ImportMap> {
        console.log(`🎯 Analyzing 2-level imports for: ${path.basename(filePath)}`);
        
        // Initialize gitignore parser
        this.gitignoreParser = new GitignoreParser(projectRoot);
        
        const files = new Map<string, FileNode>();
        
        // Step 1: Analyze current file
        const currentFileNode = await this.analyzeFileContent(filePath, projectRoot);
        if (!currentFileNode) {
            console.log(`❌ Could not analyze current file`);
            return { files, entryFile: filePath };
        }
        
        files.set(filePath, currentFileNode);
        console.log(`✅ Current: ${path.basename(filePath)}`);
        
        // Step 2: Find ALL files that import the current file (Level 1)
        const allProjectFiles = this.getAllFiles(projectRoot);
        
        for (const projectFilePath of allProjectFiles) {
            if (projectFilePath === filePath || files.has(projectFilePath)) continue;
            
            const projectFileNode = await this.analyzeFileContent(projectFilePath, projectRoot);
            if (!projectFileNode) continue;
            
            // Check if this file imports our current file
            const importsCurrentFile = projectFileNode.imports.some(imp => 
                !imp.isNodeModule && 
                imp.resolvedPath === filePath
            );
            
            if (importsCurrentFile) {
                files.set(projectFilePath, projectFileNode);
                currentFileNode.importedBy.push(projectFilePath);
                console.log(`✅ Level 1 (importer): ${path.basename(projectFilePath)}`);
            }
        }
        
        // Step 3: Analyze ALL files that current file imports (Level 2)
        for (const importInfo of currentFileNode.imports) {
            if (!importInfo.isNodeModule && importInfo.resolvedPath) {
                if (!files.has(importInfo.resolvedPath)) {
                    const dependencyNode = await this.analyzeFileContent(importInfo.resolvedPath, projectRoot);
                    if (dependencyNode) {
                        files.set(importInfo.resolvedPath, dependencyNode);
                        dependencyNode.importedBy.push(filePath);
                        console.log(`✅ Level 2 (dependency): ${path.basename(importInfo.resolvedPath)}`);
                    }
                }
            }
        }
        
        console.log(`📊 Total files: ${files.size} | Files: ${Array.from(files.keys()).map(p => path.basename(p)).join(', ')}`);
        
        // Log gitignore stats
        const gitignoreStats = this.getGitignoreStats();
        if (gitignoreStats.hasGitignore) {
            console.log(`📝 Gitignore: ${gitignoreStats.patternsLoaded} patterns loaded`);
        }
        
        return { files, entryFile: filePath };
    }



    private async analyzeFileRecursive(
        filePath: string,
        projectRoot: string,
        files: Map<string, FileNode>,
        visited: Set<string>
    ): Promise<void> {
        if (visited.has(filePath) || !this.isSupportedFile(filePath)) {
            return;
        }

        visited.add(filePath);
        const fileNode = await this.analyzeFileContent(filePath, projectRoot);
        
        if (fileNode) {
            files.set(filePath, fileNode);

            // Recursively analyze imported files
            for (const importInfo of fileNode.imports) {
                if (!importInfo.isNodeModule && importInfo.resolvedPath) {
                    await this.analyzeFileRecursive(
                        importInfo.resolvedPath,
                        projectRoot,
                        files,
                        visited
                    );
                }
            }
        }
    }

    private async analyzeFileContent(filePath: string, projectRoot: string): Promise<FileNode | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const imports = this.extractImports(content, filePath, projectRoot);

            return {
                path: filePath,
                name: path.basename(filePath),
                imports,
                importedBy: [],
                isNodeModule: false
            };
        } catch (error) {
            console.error(`❌ Error analyzing ${path.basename(filePath)}:`, error);
            return null;
        }
    }

    private extractImports(content: string, filePath: string, projectRoot: string): ImportInfo[] {
        const imports: ImportInfo[] = [];
        const fileDir = path.dirname(filePath);

        // Use regex-based parsing (more reliable for this use case)
        imports.push(...this.extractImportsWithRegex(content, fileDir, projectRoot));

        return imports;
    }

    private extractImportsWithRegex(content: string, fileDir: string, projectRoot: string): ImportInfo[] {
        const imports: ImportInfo[] = [];

        // Enhanced regex patterns with more thorough matching
        const importPatterns = [
            // import { utils } from './utils';
            /import\s*\{\s*([^}]*)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/g,
            // import * as fs from 'fs';
            /import\s*\*\s*as\s+(\w+)\s+from\s*['"`]([^'"`]+)['"`]/g,
            // import express from 'express';
            /import\s+(\w+)\s+from\s*['"`]([^'"`]+)['"`]/g,
            // import './style.css';
            /import\s*['"`]([^'"`]+)['"`]/g
        ];

        const requirePattern = /(?:const|let|var)\s+.*?=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

        // Process import patterns
        importPatterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                // For patterns with 2 groups, source is in group 2, otherwise group 1
                const source = match[2] || match[1];
                imports.push(this.createImportInfo(source, fileDir, projectRoot, 'import'));
            }
        });

        // Process require pattern
        let match;
        while ((match = requirePattern.exec(content)) !== null) {
            const source = match[1];
            imports.push(this.createImportInfo(source, fileDir, projectRoot, 'require'));
        }

        return imports;
    }

    private createImportInfo(
        source: string, 
        fileDir: string, 
        projectRoot: string, 
        type: 'import' | 'require',
        importedNames?: string[]
    ): ImportInfo {
        // Check if this is a project alias (Nuxt/Next patterns)
        const isProjectAlias = this.isProjectAlias(source);
        const isNodeModule = !source.startsWith('.') && !path.isAbsolute(source) && !isProjectAlias;
        let resolvedPath: string | undefined;

        if (!isNodeModule) {
            if (isProjectAlias) {
                // Resolve project alias
                resolvedPath = this.resolveProjectAlias(source, projectRoot);
                if (resolvedPath) {
                    console.log(`🔧 Resolved alias: ${source} → ${path.relative(projectRoot, resolvedPath)}`);
                } else {
                    console.log(`⚠️  Could not resolve alias: ${source}`);
                }
            } else {
                // Resolve relative path
                const fullPath = path.resolve(fileDir, source);
                resolvedPath = this.resolveFilePath(fullPath);
            }
        }

        return {
            source,
            type,
            isNodeModule,
            resolvedPath,
            importedNames
        };
    }

    private isProjectAlias(source: string): boolean {
        // Check for common project alias patterns
        return source.startsWith('@/') || 
               source.startsWith('~/') || 
               source.startsWith('~~/') ||
               source.startsWith('#app/') ||
               source.startsWith('#imports') ||
               source.startsWith('#components/');
    }

    private resolveProjectAlias(source: string, projectRoot: string): string | undefined {
        let aliasPath: string;

        if (source.startsWith('@/')) {
            // @/ typically maps to src/ or project root
            const withoutAlias = source.substring(2);
            // Try src/ first, then project root
            const srcPath = path.join(projectRoot, 'src', withoutAlias);
            if (fs.existsSync(srcPath) || fs.existsSync(path.dirname(srcPath))) {
                aliasPath = srcPath;
            } else {
                aliasPath = path.join(projectRoot, withoutAlias);
            }
        } else if (source.startsWith('~/') || source.startsWith('~~/')) {
            // ~/ and ~~/ typically map to project root
            const withoutAlias = source.startsWith('~~/') ? source.substring(3) : source.substring(2);
            aliasPath = path.join(projectRoot, withoutAlias);
        } else if (source.startsWith('#app/') || source.startsWith('#imports') || source.startsWith('#components/')) {
            // Nuxt 3 specific aliases - map to project root for now
            const withoutAlias = source.substring(source.indexOf('/') + 1);
            aliasPath = path.join(projectRoot, withoutAlias || '');
        } else {
            return undefined;
        }

        return this.resolveFilePath(aliasPath);
    }

    private resolveFilePath(filePath: string): string {
        const extensions = ['', '.ts', '.js', '.tsx', '.jsx', '.vue', '.svelte'];
        
        for (const ext of extensions) {
            const fullPath = filePath + ext;
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                // Check if resolved file should be ignored by gitignore
                if (this.gitignoreParser && this.gitignoreParser.shouldIgnore(fullPath)) {
                    console.log(`🚫 Skipping import to ignored file: ${path.relative(this.gitignoreParser.projectRoot, fullPath)}`);
                    continue;
                }
                return fullPath;
            }
        }

        // Check for index files
        for (const ext of extensions.slice(1)) {
            const indexPath = path.join(filePath, `index${ext}`);
            if (fs.existsSync(indexPath)) {
                // Check if resolved index file should be ignored by gitignore
                if (this.gitignoreParser && this.gitignoreParser.shouldIgnore(indexPath)) {
                    console.log(`🚫 Skipping import to ignored index file: ${path.relative(this.gitignoreParser.projectRoot, indexPath)}`);
                    continue;
                }
                return indexPath;
            }
        }

        return filePath;
    }

    private getAllFiles(dir: string): string[] {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            // Check gitignore first
            if (this.gitignoreParser && this.gitignoreParser.shouldIgnore(fullPath)) {
                console.log(`🚫 Ignoring (gitignore): ${path.relative(this.gitignoreParser.projectRoot, fullPath)}`);
                continue;
            }
            
            if (entry.isDirectory() && !this.shouldIgnoreDirectory(entry.name)) {
                files.push(...this.getAllFiles(fullPath));
            } else if (entry.isFile() && this.isSupportedFile(fullPath) && !this.isCompiledFile(fullPath)) {
                files.push(fullPath);
            }
        }

        return files;
    }

    private shouldIgnoreDirectory(dirName: string): boolean {
        const ignoredDirs = ['node_modules', '.git', 'dist', 'build', 'out', '.vscode', '.next'];
        return ignoredDirs.includes(dirName) || dirName.startsWith('.');
    }

    private isCompiledFile(filePath: string): boolean {
        // Skip .js files if corresponding .ts file exists (compiled output)
        if (filePath.endsWith('.js')) {
            const tsPath = filePath.replace('.js', '.ts');
            if (fs.existsSync(tsPath)) {
                return true; // This is a compiled file, skip it
            }
        }
        return false;
    }

    private isSupportedFile(filePath: string): boolean {
        return this.supportedExtensions.some(ext => filePath.endsWith(ext));
    }
} 