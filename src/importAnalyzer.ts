import * as fs from 'fs';
import * as path from 'path';
import { ImportMap, FileNode, ImportInfo } from './types';

/**
 * Project type detection
 */
enum ProjectType {
    TYPESCRIPT = 'typescript',
    JAVASCRIPT_COMMONJS = 'javascript-commonjs',
    JAVASCRIPT_ES6 = 'javascript-es6',
    MIXED = 'mixed'
}

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
    private supportedExtensions: string[] = [];
    private projectType: ProjectType = ProjectType.MIXED;
    private gitignoreParser: GitignoreParser | null = null;
    private projectRoot: string = '';
    private nuxtSrcDir: string = 'src'; // Default srcDir for Nuxt

    async analyzeProject(projectRoot: string): Promise<ImportMap> {
        // Initialize project analysis
        this.projectRoot = projectRoot;
        this.nuxtSrcDir = this.detectNuxtSrcDir(projectRoot);
        this.projectType = this.detectProjectType(projectRoot);
        this.supportedExtensions = this.getSupportedExtensions();
        this.gitignoreParser = new GitignoreParser(projectRoot);
        
        console.log(`🔍 Detected project type: ${this.projectType}`);
        console.log(`📁 Supported extensions: ${this.supportedExtensions.join(', ')}`);
        
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
        
        // Initialize project analysis
        this.projectRoot = projectRoot;
        this.nuxtSrcDir = this.detectNuxtSrcDir(projectRoot);
        this.projectType = this.detectProjectType(projectRoot);
        this.supportedExtensions = this.getSupportedExtensions();
        this.gitignoreParser = new GitignoreParser(projectRoot);
        
        console.log(`🔍 Detected project type: ${this.projectType}`);
        console.log(`📁 Supported extensions: ${this.supportedExtensions.join(', ')}`);
        
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

    /**
     * Detect Nuxt.js srcDir from nuxt.config file
     */
    private detectNuxtSrcDir(projectRoot: string): string {
        // Check for different Nuxt config file variations
        const configFiles = [
            'nuxt.config.ts',
            'nuxt.config.js',
            'nuxt.config.mjs'
        ];

        for (const configFile of configFiles) {
            const configPath = path.join(projectRoot, configFile);
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const srcDir = this.parseNuxtSrcDir(content);
                    if (srcDir) {
                        console.log(`🔧 Detected Nuxt srcDir from ${configFile}: ${srcDir}`);
                        return srcDir;
                    }
                } catch (error) {
                    console.log(`⚠️  Could not parse ${configFile}:`, error);
                }
            }
        }

        // Fallback: check if src/ directory exists, otherwise use current directory
        const srcPath = path.join(projectRoot, 'src');
        if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
            console.log(`📁 Using default srcDir: src`);
            return 'src';
        }

        console.log(`📁 Using project root as srcDir`);
        return '.';
    }

    /**
     * Parse srcDir from Nuxt config content using regex
     */
    private parseNuxtSrcDir(content: string): string | null {
        // Remove comments and normalize whitespace
        const cleanContent = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
            .replace(/\/\/.*$/gm, '') // Remove // comments
            .replace(/\s+/g, ' '); // Normalize whitespace

        // Match srcDir patterns
        const patterns = [
            /srcDir\s*:\s*['"`]([^'"`]+)['"`]/,
            /srcDir\s*:\s*'([^']+)'/,
            /srcDir\s*:\s*"([^"]+)"/,
            /srcDir\s*:\s*`([^`]+)`/
        ];

        for (const pattern of patterns) {
            const match = cleanContent.match(pattern);
            if (match && match[1]) {
                let srcDir = match[1].trim();
                // Remove trailing slash
                if (srcDir.endsWith('/')) {
                    srcDir = srcDir.slice(0, -1);
                }
                // Handle empty or root cases
                if (srcDir === '' || srcDir === './') {
                    return '.';
                }
                return srcDir;
            }
        }

        return null;
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

            // Recursively analyze imported files and update bidirectional relationships
            for (const importInfo of fileNode.imports) {
                if (!importInfo.isNodeModule && importInfo.resolvedPath) {
                    // Analyze the file recursively if not visited yet
                    await this.analyzeFileRecursive(
                        importInfo.resolvedPath,
                        projectRoot,
                        files,
                        visited
                    );
                    
                    // Update bidirectional relationship: the imported file should know who imports it  
                    const importedFile = files.get(importInfo.resolvedPath);
                    if (importedFile) {
                        if (!importedFile.importedBy.includes(filePath)) {
                            importedFile.importedBy.push(filePath);
                            console.log(`📝 Updated bidirectional: ${path.basename(importInfo.resolvedPath)} ← ${path.basename(filePath)}`);
                        }
                    } else {
                        console.log(`⚠️  No imported file found in map: ${importInfo.resolvedPath}`);
                    }
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

        // For Vue files, extract script content first
        let scriptContent = content;
        if (filePath.endsWith('.vue')) {
            scriptContent = this.extractVueScriptContent(content);
        }

        // Use regex-based parsing (more reliable for this use case)
        imports.push(...this.extractImportsWithRegex(scriptContent, fileDir, projectRoot));

        return imports;
    }

    /**
     * Extract script content from Vue Single File Component
     */
    private extractVueScriptContent(content: string): string {
        // Match <script> tags with various attributes
        const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        const matches = content.match(scriptPattern);
        
        if (!matches) {
            return '';
        }

        // Combine all script blocks (there might be multiple)
        return matches.map(match => {
            // Remove <script> tags and extract content
            return match.replace(/<script[^>]*>|<\/script>/gi, '');
        }).join('\n');
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

        // Dynamic import patterns for Vue components and lazy loading
        const dynamicImportPatterns = [
            // () => import('~/components/common/empty-data.vue')
            /\(\s*\)\s*=>\s*import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
            // import('~/path')
            /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
            // require('~/assets/images/common/no-data.png')
            /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
        ];

        const requirePattern = /(?:(?:const|let|var)\s+.*?|[\w$_]+\s*)=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

        // Process standard import patterns
        importPatterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                // For patterns with 2 groups, source is in group 2, otherwise group 1
                const source = match[2] || match[1];
                imports.push(this.createImportInfo(source, fileDir, projectRoot, 'import'));
            }
        });

        // Process dynamic import patterns
        dynamicImportPatterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const source = match[1];
                const importType = pattern.source.includes('require') ? 'require' : 'dynamic-import';
                imports.push(this.createImportInfo(source, fileDir, projectRoot, importType as 'import' | 'require'));
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
            // @/ typically maps to srcDir or project root
            const withoutAlias = source.substring(2);
            // Try srcDir first, then project root
            const srcPath = path.join(projectRoot, this.nuxtSrcDir, withoutAlias);
            if (fs.existsSync(srcPath) || fs.existsSync(path.dirname(srcPath))) {
                aliasPath = srcPath;
            } else {
                aliasPath = path.join(projectRoot, withoutAlias);
            }
        } else if (source.startsWith('~/') || source.startsWith('~~/')) {
            // ~/ and ~~/ ALWAYS map to srcDir for Nuxt.js projects (no fallback to project root)
            const withoutAlias = source.startsWith('~~/') ? source.substring(3) : source.substring(2);
            // Map to srcDir (configured in nuxt.config)
            aliasPath = path.join(projectRoot, this.nuxtSrcDir, withoutAlias);
        } else if (source.startsWith('#app/') || source.startsWith('#imports') || source.startsWith('#components/')) {
            // Nuxt 3 specific aliases - ALWAYS map to srcDir (no fallback to project root)
            const withoutAlias = source.substring(source.indexOf('/') + 1);
            aliasPath = path.join(projectRoot, this.nuxtSrcDir, withoutAlias || '');
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
        // For TypeScript projects, skip .js files if corresponding .ts file exists
        if (this.projectType === ProjectType.TYPESCRIPT || this.projectType === ProjectType.MIXED) {
            if (filePath.endsWith('.js')) {
                const tsPath = filePath.replace('.js', '.ts');
                const tsxPath = filePath.replace('.js', '.tsx');
                if (fs.existsSync(tsPath) || fs.existsSync(tsxPath)) {
                    console.log(`🚫 Skipping compiled file: ${path.relative(this.projectRoot, filePath)}`);
                    return true; // This is a compiled file, skip it
                }
            }
            
            if (filePath.endsWith('.jsx')) {
                const tsxPath = filePath.replace('.jsx', '.tsx');
                if (fs.existsSync(tsxPath)) {
                    console.log(`🚫 Skipping compiled file: ${path.relative(this.projectRoot, filePath)}`);
                    return true; // This is a compiled file, skip it
                }
            }
        }
        
        // Skip files in common build directories
        const relativePath = path.relative(this.projectRoot, filePath);
        const buildDirs = ['dist/', 'build/', 'out/', 'lib/', '.next/', 'coverage/'];
        if (buildDirs.some(dir => relativePath.startsWith(dir))) {
            console.log(`🚫 Skipping file in build directory: ${relativePath}`);
            return true;
        }
        
        return false;
    }

    private isSupportedFile(filePath: string): boolean {
        return this.supportedExtensions.some(ext => filePath.endsWith(ext));
    }

    /**
     * Detect project type based on configuration files and file structure
     */
    private detectProjectType(projectRoot: string): ProjectType {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
        
        // Check for TypeScript configuration
        const hasTypeScript = fs.existsSync(tsconfigPath);
        let hasTypeScriptDeps = false;
        
        // Check package.json for TypeScript dependencies
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const allDeps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                hasTypeScriptDeps = !!(allDeps.typescript || allDeps['@types/node'] || allDeps['ts-node']);
            } catch (error) {
                console.log('⚠️  Could not parse package.json:', error);
            }
        }
        
        // Analyze file distribution in project
        const fileStats = this.analyzeFileDistribution(projectRoot);
        
        console.log(`📊 File distribution: TS: ${fileStats.tsFiles}, JS: ${fileStats.jsFiles}, Vue: ${fileStats.vueFiles}, Svelte: ${fileStats.svelteFiles}`);
        
        // Decision logic
        if (hasTypeScript || hasTypeScriptDeps) {
            if (fileStats.tsFiles > 0) {
                return fileStats.jsFiles > 0 ? ProjectType.MIXED : ProjectType.TYPESCRIPT;
            } else if (fileStats.jsFiles > 0) {
                // Has TS config but no TS files, probably new project or compiled only
                return ProjectType.TYPESCRIPT;
            }
        }
        
        // If we have both TS and JS files without TS config, it's mixed
        if (fileStats.tsFiles > 0 && fileStats.jsFiles > 0) {
            return ProjectType.MIXED;
        }
        
        // Pure TypeScript project (only TS files)
        if (fileStats.tsFiles > 0 && fileStats.jsFiles === 0) {
            return ProjectType.TYPESCRIPT;
        }
        
        // Check import/export patterns in JS files to distinguish CommonJS vs ES6
        if (fileStats.jsFiles > 0) {
            const jsModuleType = this.detectJavaScriptModuleType(projectRoot);
            return jsModuleType;
        }
        
        // Fallback to mixed if we can't determine
        return ProjectType.MIXED;
    }

    /**
     * Analyze file distribution in project
     */
    private analyzeFileDistribution(projectRoot: string): { tsFiles: number; jsFiles: number; vueFiles: number; svelteFiles: number } {
        const stats = { tsFiles: 0, jsFiles: 0, vueFiles: 0, svelteFiles: 0 };
        
        const countFiles = (dir: string, depth: number = 0) => {
            // Limit depth to avoid deep recursion
            if (depth > 3) return;
            
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Skip common build/dependency directories
                        if (!this.shouldIgnoreDirectory(entry.name)) {
                            countFiles(fullPath, depth + 1);
                        }
                    } else if (entry.isFile()) {
                        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                            stats.tsFiles++;
                        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
                            stats.jsFiles++;
                        } else if (entry.name.endsWith('.vue')) {
                            stats.vueFiles++;
                        } else if (entry.name.endsWith('.svelte')) {
                            stats.svelteFiles++;
                        }
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };
        
        countFiles(projectRoot);
        return stats;
    }

    /**
     * Detect JavaScript module type (CommonJS vs ES6)
     */
    private detectJavaScriptModuleType(projectRoot: string): ProjectType {
        let requireCount = 0;
        let importCount = 0;
        let filesChecked = 0;
        
        const checkFiles = (dir: string, depth: number = 0) => {
            // Limit depth and files checked for performance
            if (depth > 2 || filesChecked > 20) return;
            
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (filesChecked > 20) break;
                    
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory() && !this.shouldIgnoreDirectory(entry.name)) {
                        checkFiles(fullPath, depth + 1);
                    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf-8');
                            // Count require statements
                            const requireMatches = content.match(/require\s*\(/g);
                            if (requireMatches) requireCount += requireMatches.length;
                            
                            // Count import statements  
                            const importMatches = content.match(/import\s+/g);
                            if (importMatches) importCount += importMatches.length;
                            
                            filesChecked++;
                        } catch (error) {
                            // Skip files we can't read
                        }
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };
        
        checkFiles(projectRoot);
        
        // Determine module type based on usage patterns
        if (requireCount > importCount * 2) {
            return ProjectType.JAVASCRIPT_COMMONJS;
        } else if (importCount > requireCount * 2) {
            return ProjectType.JAVASCRIPT_ES6;
        } else {
            return ProjectType.MIXED;
        }
    }

    /**
     * Get supported extensions based on detected project type
     */
    private getSupportedExtensions(): string[] {
        const baseExtensions = ['.vue', '.svelte']; // Always support these
        
        switch (this.projectType) {
            case ProjectType.TYPESCRIPT:
                return ['.ts', '.tsx', ...baseExtensions];
            case ProjectType.JAVASCRIPT_COMMONJS:
            case ProjectType.JAVASCRIPT_ES6:
                return ['.js', '.jsx', ...baseExtensions];
            case ProjectType.MIXED:
            default:
                return ['.js', '.jsx', '.ts', '.tsx', ...baseExtensions];
        }
    }
} 