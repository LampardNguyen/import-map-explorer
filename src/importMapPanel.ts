import * as vscode from 'vscode';
import * as path from 'path';
import { ImportMap, VisualizationNode, VisualizationEdge } from './types';

/**
 * ImportMapPanel manages the webview panel that displays the interactive import relationship map.
 * This class handles creating the webview, rendering the graph visualization, and managing user interactions.
 * 
 * Features:
 * - Interactive node dragging with position persistence
 * - Zoom and pan functionality
 * - Toggle visibility of node modules
 * - Support for project aliases (@/, ~/, etc.)
 * - Dual mode: current file analysis vs full project analysis
 */
export class ImportMapPanel {
    public static currentPanel: ImportMapPanel | undefined;
    public static readonly viewType = 'importMapExplorer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Creates or shows the import map panel. Optionally updates the content based on shouldUpdate parameter.
     * 
     * @param extensionUri - URI of the extension for loading resources
     * @param importMap - The analyzed import data to visualize
     * @param currentFile - Path of the currently focused file (for current file mode)
     * @param isProjectMode - Whether to show full project analysis or current file analysis
     * @param shouldUpdate - Whether to update content (true for explicit commands, false for just showing panel)
     */
    public static createOrShow(extensionUri: vscode.Uri, importMap: ImportMap, currentFile?: string, isProjectMode = false, shouldUpdate = true) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ImportMapPanel.currentPanel) {
            ImportMapPanel.currentPanel._panel.reveal(column);
            // Only update content if explicitly requested
            if (shouldUpdate) {
                ImportMapPanel.currentPanel.updateContent(importMap, currentFile, isProjectMode);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ImportMapPanel.viewType,
            'Import Map Explorer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        ImportMapPanel.currentPanel = new ImportMapPanel(panel, extensionUri);
        ImportMapPanel.currentPanel.updateContent(importMap, currentFile, isProjectMode);
    }

    /**
     * Shows the import map panel without updating content. Creates panel if it doesn't exist.
     * 
     * @param extensionUri - URI of the extension for loading resources
     */
    public static show(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ImportMapPanel.currentPanel) {
            ImportMapPanel.currentPanel._panel.reveal(column);
            return;
        }

        // If panel doesn't exist, we need at least basic data to create it
        // In this case, create empty panel that will be updated later
        const panel = vscode.window.createWebviewPanel(
            ImportMapPanel.viewType,
            'Import Map Explorer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        ImportMapPanel.currentPanel = new ImportMapPanel(panel, extensionUri);
        // Show empty panel with placeholder content
        ImportMapPanel.currentPanel._panel.webview.html = ImportMapPanel.currentPanel.getHtmlForWebview();
    }

    /**
     * Private constructor for the ImportMapPanel.
     * Sets up the webview panel, message handling, and dispose listeners.
     * 
     * @param panel - The VSCode webview panel instance
     * @param extensionUri - URI of the extension for loading resources
     */
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openFile':
                        this.openFile(message.filePath);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Updates the webview content with new import map data.
     * 
     * @param importMap - The analyzed import data to visualize
     * @param currentFile - Path of the currently focused file
     * @param isProjectMode - Whether to show full project or current file analysis
     */
    private updateContent(importMap: ImportMap, currentFile?: string, isProjectMode = false) {
        this._panel.webview.html = this.getHtmlForWebview(importMap, currentFile, isProjectMode);
    }

    /**
     * Public method to update content from external commands.
     * 
     * @param importMap - The analyzed import data to visualize
     * @param currentFile - Path of the currently focused file
     * @param isProjectMode - Whether to show full project or current file analysis
     */
    public static updateContent(importMap: ImportMap, currentFile?: string, isProjectMode = false) {
        if (ImportMapPanel.currentPanel) {
            ImportMapPanel.currentPanel.updateContent(importMap, currentFile, isProjectMode);
        }
    }

    /**
     * Opens a file in VSCode editor when user double-clicks a node.
     * 
     * @param filePath - Absolute path of the file to open
     */
    private async openFile(filePath: string) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
        }
    }

    /**
     * Generates the complete HTML content for the webview panel.
     * This includes the canvas, controls, styling, and all JavaScript logic for the interactive map.
     * 
     * @param importMap - The analyzed import data to visualize (optional for empty panel)
     * @param currentFile - Path of the currently focused file
     * @param isProjectMode - Whether to show full project or current file analysis
     * @returns Complete HTML string for the webview
     */
    private getHtmlForWebview(importMap?: ImportMap, currentFile?: string, isProjectMode = false): string {
        let nodes: VisualizationNode[] = [];
        let edges: VisualizationEdge[] = [];
        
        if (importMap) {
            const data = this.convertToVisualizationData(importMap, currentFile, isProjectMode);
            nodes = data.nodes;
            edges = data.edges;
        }
        
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Import Map Explorer</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        overflow: hidden;
                    }
                    
                    #container {
                        width: 100vw;
                        height: 100vh;
                        position: relative;
                    }
                    
                                            #canvas {
                            width: 100%;
                            height: 100%;
                            cursor: grab;
                            background: var(--vscode-editor-background);
                        }
                    
                    .controls {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        padding: 10px;
                        z-index: 1000;
                    }
                    
                    .controls button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 10px;
                        margin: 2px;
                        border-radius: 2px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    
                    .controls button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .info-panel {
                        position: absolute;
                        bottom: 10px;
                        left: 10px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        padding: 15px;
                        max-width: 350px;
                        z-index: 1000;
                        display: none;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    }
                    
                    .node-info h3 {
                        margin: 0 0 8px 0;
                        color: var(--vscode-textLink-foreground);
                        font-size: 14px;
                    }
                    
                    .node-info p {
                        margin: 4px 0;
                        font-size: 12px;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    
                    .import-list {
                        max-height: 120px;
                        overflow-y: auto;
                        margin-top: 8px;
                    }
                    
                    .import-item {
                        padding: 2px 0;
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .legend {
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        padding: 10px;
                        z-index: 1000;
                        font-size: 11px;
                    }
                    
                    .legend-item {
                        display: flex;
                        align-items: center;
                        margin: 2px 0;
                    }
                    
                    .legend-color {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        margin-right: 6px;
                    }
                </style>
            </head>
            <body>
                <div id="container">
                    <canvas id="canvas"></canvas>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #007ACC;"></div>
                            <span>Current File</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #888888;"></div>
                            <span>Project File</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #28a745;"></div>
                            <span>Imports Current File</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #6f42c1;"></div>
                            <span>Imported by Current File</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #FFA500;"></div>
                            <span>Node Module</span>
                        </div>
                    </div>
                    <div class="controls">
                        <button id="resetButton">Reset View</button>
                        <button id="centerButton">Center Current</button>
                        <button id="edgesButton">Show All Connections</button>
                        <button id="nodeModulesButton">Show Node Modules</button>
                        <button id="organizeButton">Organize Layout</button>
                        <button id="zoomInButton">Zoom In (+)</button>
                        <button id="zoomOutButton">Zoom Out (-)</button>
                    </div>
                    <div id="info-panel" class="info-panel">
                        <div id="node-info" class="node-info"></div>
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const canvas = document.getElementById('canvas');
                    const ctx = canvas.getContext('2d');
                    const infoPanel = document.getElementById('info-panel');
                    const nodeInfo = document.getElementById('node-info');
                    
                    // Graph data
                    const nodes = ${JSON.stringify(nodes)};
                    const edges = ${JSON.stringify(edges)};
                    const currentFile = ${JSON.stringify(currentFile || null)};
                    const hasData = ${JSON.stringify(nodes.length > 0)};
                    
                    // Canvas and interaction state
                    let canvasWidth, canvasHeight;
                    let offsetX = 0, offsetY = 0;
                    let scale = 1;
                    let isPanning = false;
                    let isDraggingNode = false;
                    let draggedNode = null;
                    let dragStartX, dragStartY;
                    let nodeStartX, nodeStartY;
                    let showLabels = true;
                    let showNodeModules = false; // Default hide node modules
                    let showAllEdges = false; // Default hide edges between non-current files
                    
                    // Graph layout constants
                    const MIN_NODE_WIDTH = 60;
                    const MIN_NODE_HEIGHT = 30;
                    const NODE_PADDING = 20; // Padding around text
                    const LABEL_FONT = '11px var(--vscode-font-family), sans-serif';
                    const EDGE_COLOR = 'var(--vscode-textSeparator-foreground)';
                    const NODE_COLORS = {
                        current: '#007ACC',        // Current file - blue
                        normal: '#888888',         // Regular project files - gray
                        nodeModule: '#FFA500',     // Node modules - orange
                        importsCurrent: '#28a745', // Files that import current file - green
                        importedByCurrent: '#6f42c1' // Files imported by current file - purple
                    };
                    
                    /**
                     * Calculate node size based on text width for dynamic node sizing.
                     * @param {string} text - The text content to measure
                     * @returns {object} Object with width and height properties
                     */
                    function calculateNodeSize(text) {
                        ctx.font = LABEL_FONT;
                        const textWidth = ctx.measureText(text).width;
                        const width = Math.max(MIN_NODE_WIDTH, textWidth + NODE_PADDING * 2);
                        const height = MIN_NODE_HEIGHT;
                        return { width, height };
                    }
                    
                    /**
                     * Get node size including drag state modifications.
                     * @param {object} node - The node object
                     * @returns {object} Current size (larger if being dragged)
                     */
                    function getNodeSize(node) {
                        const baseSize = node.size || calculateNodeSize(node.label);
                        if (draggedNode === node) {
                            return {
                                width: baseSize.width * 1.1,
                                height: baseSize.height * 1.1
                            };
                        }
                        return baseSize;
                    }
                    
                    function initCanvas() {
                        const rect = canvas.getBoundingClientRect();
                        canvasWidth = rect.width * window.devicePixelRatio;
                        canvasHeight = rect.height * window.devicePixelRatio;
                        canvas.width = canvasWidth;
                        canvas.height = canvasHeight;
                        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                        canvas.style.width = rect.width + 'px';
                        canvas.style.height = rect.height + 'px';
                        
                        // Calculate size for all nodes and determine their relationship colors
                        nodes.forEach(node => {
                            node.size = calculateNodeSize(node.label);
                            
                            // Determine node color based on relationship to current file
                            if (node.isCurrentFile) {
                                node.colorType = 'current';
                            } else if (node.isNodeModule) {
                                node.colorType = 'nodeModule';
                            } else if (currentFile) {
                                // Edge from A → B means B imports A
                                // Check if current file imports this node (edge: this node → current file)
                                const currentFileImportsThisNode = edges.some(edge => 
                                    edge.from === node.id && edge.to === currentFile
                                );
                                // Check if this node imports current file (edge: current file → this node)
                                const thisNodeImportsCurrentFile = edges.some(edge => 
                                    edge.from === currentFile && edge.to === node.id
                                );
                                
                                if (currentFileImportsThisNode) {
                                    // This node is imported by current file (current file depends on this node)
                                    node.colorType = 'importedByCurrent';
                                } else if (thisNodeImportsCurrentFile) {
                                    // This node imports current file (this node depends on current file)  
                                    node.colorType = 'importsCurrent';
                                } else {
                                    node.colorType = 'normal';
                                }
                            } else {
                                node.colorType = 'normal';
                            }
                        });
                        
                        // Only layout if nodes don't have positions yet
                        const hasPositions = nodes.length > 0 && nodes.every(node => node.x !== undefined && node.y !== undefined);
                        if (!hasPositions) {
                            layoutNodes();
                        }
                        draw();
                    }
                    
                    /**
                     * Check if two rectangular nodes overlap
                     * @param {object} node1 - First node
                     * @param {object} node2 - Second node
                     * @returns {boolean} True if nodes overlap
                     */
                    function nodesOverlap(node1, node2) {
                        const size1 = node1.size || calculateNodeSize(node1.label);
                        const size2 = node2.size || calculateNodeSize(node2.label);
                        
                        const halfWidth1 = size1.width / 2;
                        const halfHeight1 = size1.height / 2;
                        const halfWidth2 = size2.width / 2;
                        const halfHeight2 = size2.height / 2;
                        
                        const dx = Math.abs(node1.x - node2.x);
                        const dy = Math.abs(node1.y - node2.y);
                        
                        return dx < (halfWidth1 + halfWidth2 + 20) && dy < (halfHeight1 + halfHeight2 + 20);
                    }
                    
                    /**
                     * Layout nodes in the canvas. Tries to restore saved positions first,
                     * otherwise generates a new layout with better collision detection.
                     * @param {boolean} forceNew - If true, skip loading saved positions and generate new layout
                     */
                    function layoutNodes(forceNew = false) {
                        const centerX = canvasWidth / (2 * window.devicePixelRatio);
                        const centerY = canvasHeight / (2 * window.devicePixelRatio);
                        const margin = 100; // Margin from edge
                        
                        if (nodes.length === 0) return;
                        
                        // Try to restore saved positions first (unless forcing new layout)
                        if (!forceNew && loadNodePositions()) {
                            return; // Successfully restored, no need to generate new layout
                        }
                        
                        // Find current file node
                        const currentNode = nodes.find(n => n.isCurrentFile);
                        
                        if (currentNode) {
                            // Place current file at center
                            currentNode.x = centerX;
                            currentNode.y = centerY;
                            
                            // Arrange other nodes in a spiral pattern around center
                            const otherNodes = nodes.filter(n => !n.isCurrentFile);
                            const minDistance = 150; // Minimum distance from center
                            const spiralStep = 30; // How much to increase distance per layer
                            
                            otherNodes.forEach((node, index) => {
                                let attempts = 0;
                                let validPosition = false;
                                let layer = 0;
                                
                                while (!validPosition && attempts < 100) {
                                    // Calculate spiral position
                                    const angleStep = (2 * Math.PI) / Math.max(8, Math.ceil(8 + layer * 2)); // More positions per layer as we go out
                                    const angle = (index % Math.ceil(8 + layer * 2)) * angleStep + layer * 0.5; // Slight rotation per layer
                                    const distance = minDistance + layer * spiralStep;
                                    
                                    const x = centerX + Math.cos(angle) * distance;
                                    const y = centerY + Math.sin(angle) * distance;
                                    
                                    // Check bounds
                                    const nodeSize = node.size || calculateNodeSize(node.label);
                                    if (x - nodeSize.width/2 < margin || x + nodeSize.width/2 > centerX * 2 - margin ||
                                        y - nodeSize.height/2 < margin || y + nodeSize.height/2 > centerY * 2 - margin) {
                                        layer++;
                                        attempts++;
                                        continue;
                                    }
                                    
                                    // Check collision with existing nodes
                                    node.x = x;
                                    node.y = y;
                                    validPosition = true;
                                    
                                    // Check against current node
                                    if (nodesOverlap(node, currentNode)) {
                                        validPosition = false;
                                    }
                                    
                                    // Check against other placed nodes
                                    if (validPosition) {
                                        for (let i = 0; i < index; i++) {
                                            const otherNode = otherNodes[i];
                                            if (otherNode.x !== undefined && otherNode.y !== undefined) {
                                                if (nodesOverlap(node, otherNode)) {
                                                    validPosition = false;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    
                                    if (!validPosition) {
                                        if (attempts % 8 === 7) { // Move to next layer after trying all positions in current layer
                                            layer++;
                                        }
                                    }
                                    
                                    attempts++;
                                }
                                
                                // Fallback positioning if no valid position found
                                if (!validPosition) {
                                    const fallbackAngle = (index / otherNodes.length) * 2 * Math.PI;
                                    const fallbackDistance = minDistance + Math.floor(index / 8) * spiralStep;
                                    node.x = centerX + Math.cos(fallbackAngle) * fallbackDistance;
                                    node.y = centerY + Math.sin(fallbackAngle) * fallbackDistance;
                                }
                            });
                        } else {
                            // Grid layout if no current file
                            const maxX = centerX * 2 - margin;
                            const maxY = centerY * 2 - margin;
                            const cols = Math.floor((maxX - margin * 2) / 150); // 150px spacing
                            
                            nodes.forEach((node, index) => {
                                const col = index % cols;
                                const row = Math.floor(index / cols);
                                
                                node.x = margin + col * 150 + 75; // Center in grid cell
                                node.y = margin + row * 80 + 40;  // Center in grid cell
                                
                                // Ensure bounds
                                if (node.x > maxX) node.x = maxX - 50;
                                if (node.y > maxY) node.y = maxY - 30;
                            });
                        }
                    }
                    
                    function draw() {
                        // Avoid unnecessary clears and redraws
                        if (canvasWidth === 0 || canvasHeight === 0) return;
                        
                        ctx.clearRect(0, 0, canvasWidth / window.devicePixelRatio, canvasHeight / window.devicePixelRatio);
                        
                        // Show message if no data
                        if (!hasData) {
                            ctx.save();
                            ctx.fillStyle = 'var(--vscode-descriptionForeground)';
                            ctx.font = '16px var(--vscode-font-family), sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const centerX = canvasWidth / (2 * window.devicePixelRatio);
                            const centerY = canvasHeight / (2 * window.devicePixelRatio);
                            ctx.fillText('Use Cmd+Shift+M or "Import Map Explorer" commands to analyze imports', centerX, centerY);
                            ctx.restore();
                            return;
                        }
                        
                        ctx.save();
                        ctx.translate(offsetX, offsetY);
                        ctx.scale(scale, scale);
                        
                        // Filter nodes and edges based on settings
                        const visibleNodes = nodes.filter(node => {
                            if (node.isNodeModule && !showNodeModules) {
                                return false;
                            }
                            return true;
                        });
                        
                        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
                        const visibleEdges = edges.filter(edge => {
                            if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) {
                                return false;
                            }
                            
                            // Always show edges connected to current file
                            if (currentFile && (edge.from === currentFile || edge.to === currentFile)) {
                                return true;
                            }
                            
                            // Show edges between other files only if showAllEdges is true
                            return showAllEdges;
                        });
                        
                        // Draw edges
                        ctx.strokeStyle = '#666';
                        ctx.lineWidth = 1;
                        
                        visibleEdges.forEach((edge, index) => {
                            const fromNode = nodes.find(n => n.id === edge.from);
                            const toNode = nodes.find(n => n.id === edge.to);
                            
                            if (fromNode && toNode) {
                                drawEdge(fromNode, toNode, edge.type);
                            }
                        });
                        
                        // Draw nodes
                        visibleNodes.forEach(node => {
                            drawNode(node);
                        });
                        
                        ctx.restore();
                    }
                    
                    function drawNode(node) {
                        const isDragged = draggedNode === node;
                        const size = getNodeSize(node);
                        const halfWidth = size.width / 2;
                        const halfHeight = size.height / 2;
                        
                        // Node rectangle
                        ctx.fillStyle = NODE_COLORS[node.colorType] || NODE_COLORS.normal;
                        
                        // Add shadow for dragged node
                        if (isDragged) {
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                            ctx.shadowOffsetX = 3;
                            ctx.shadowOffsetY = 3;
                        }
                        
                        // Draw rounded rectangle (with fallback for older browsers)
                        const cornerRadius = 8;
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(
                                node.x - halfWidth, 
                                node.y - halfHeight, 
                                size.width, 
                                size.height, 
                                cornerRadius
                            );
                        } else {
                            // Fallback for browsers without roundRect support
                            ctx.rect(
                                node.x - halfWidth, 
                                node.y - halfHeight, 
                                size.width, 
                                size.height
                            );
                        }
                        ctx.fill();
                        
                        // Reset shadow
                        if (isDragged) {
                            ctx.shadowBlur = 0;
                            ctx.shadowColor = 'transparent';
                            ctx.shadowOffsetX = 0;
                            ctx.shadowOffsetY = 0;
                        }
                        
                        // Node border
                        ctx.strokeStyle = isDragged ? '#007ACC' : '#fff';
                        ctx.lineWidth = isDragged ? 3 : 2;
                        ctx.stroke();
                        
                        // Node label
                        if (showLabels) {
                            ctx.fillStyle = '#fff';
                            ctx.font = LABEL_FONT;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // Show full label since node auto-resizes
                            ctx.fillText(node.label, node.x, node.y);
                        }
                    }
                    
                    function drawEdge(fromNode, toNode, type) {
                        // Now fromNode is dependency, toNode is the file that imports it
                        const dx = toNode.x - fromNode.x;
                        const dy = toNode.y - fromNode.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance === 0) return;
                        
                        const unitX = dx / distance;
                        const unitY = dy / distance;
                        
                        // Calculate edge positions on rectangle boundaries
                        const fromSize = getNodeSize(fromNode);
                        const toSize = getNodeSize(toNode);
                        
                        // Calculate intersection points with rectangle edges
                        function getIntersectionPoint(nodeX, nodeY, nodeSize, directionX, directionY) {
                            const halfWidth = nodeSize.width / 2;
                            const halfHeight = nodeSize.height / 2;
                            
                            // Calculate which edge the line intersects
                            const t_top = directionY > 0 ? halfHeight / directionY : Infinity;
                            const t_bottom = directionY < 0 ? -halfHeight / directionY : Infinity;
                            const t_left = directionX < 0 ? -halfWidth / directionX : Infinity;
                            const t_right = directionX > 0 ? halfWidth / directionX : Infinity;
                            
                            const t = Math.min(t_top, t_bottom, t_left, t_right);
                            
                            return {
                                x: nodeX + directionX * t,
                                y: nodeY + directionY * t
                            };
                        }
                        
                        const startPoint = getIntersectionPoint(fromNode.x, fromNode.y, fromSize, unitX, unitY);
                        const endPoint = getIntersectionPoint(toNode.x, toNode.y, toSize, -unitX, -unitY);
                        
                        // Move arrow 5px away from the node for better spacing
                        const arrowGap = 5;
                        const arrowTipX = endPoint.x - unitX * arrowGap;
                        const arrowTipY = endPoint.y - unitY * arrowGap;
                        
                        // Draw line to arrow tip position (not to the node edge)
                        ctx.beginPath();
                        ctx.moveTo(startPoint.x, startPoint.y);
                        ctx.lineTo(arrowTipX, arrowTipY);
                        ctx.stroke();
                        
                        // Draw arrow pointing TO the importing file with enhanced visibility
                        const arrowLength = 10;
                        const arrowAngle = Math.PI / 5; // Slightly wider arrow
                        const angle = Math.atan2(dy, dx);
                        
                        // Save current stroke settings
                        const originalStrokeStyle = ctx.strokeStyle;
                        const originalLineWidth = ctx.lineWidth;
                        
                        // Make arrow more visible with darker color and thicker line
                        ctx.strokeStyle = '#333333'; // Darker gray for better visibility
                        ctx.fillStyle = '#333333';   // Same color for fill
                        ctx.lineWidth = 2.5;         // Thicker arrow lines
                        
                        // Draw filled arrow head for better visibility at the offset position
                        ctx.beginPath();
                        ctx.moveTo(arrowTipX, arrowTipY);
                        ctx.lineTo(
                            arrowTipX - arrowLength * Math.cos(angle - arrowAngle),
                            arrowTipY - arrowLength * Math.sin(angle - arrowAngle)
                        );
                        ctx.lineTo(
                            arrowTipX - arrowLength * Math.cos(angle + arrowAngle),
                            arrowTipY - arrowLength * Math.sin(angle + arrowAngle)
                        );
                        ctx.closePath();
                        ctx.fill(); // Fill the arrow for solid appearance
                        ctx.stroke(); // Also stroke for definition
                        
                        // Restore original stroke settings
                        ctx.strokeStyle = originalStrokeStyle;
                        ctx.lineWidth = originalLineWidth;
                        
                        // Label for import type (optional)
                        if (type === 'require') {
                            const midX = (startPoint.x + arrowTipX) / 2;
                            const midY = (startPoint.y + arrowTipY) / 2;
                            ctx.fillStyle = '#999';
                            ctx.font = '9px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('req', midX, midY - 5);
                        }
                    }
                    
                    function getMousePos(e) {
                        const rect = canvas.getBoundingClientRect();
                        return {
                            x: (e.clientX - rect.left - offsetX) / scale,
                            y: (e.clientY - rect.top - offsetY) / scale
                        };
                    }
                    
                    function getNodeAt(x, y) {
                        return nodes.find(node => {
                            // Skip hidden node modules
                            if (node.isNodeModule && !showNodeModules) {
                                return false;
                            }
                            
                            const size = getNodeSize(node);
                            const halfWidth = size.width / 2;
                            const halfHeight = size.height / 2;
                            
                            return x >= node.x - halfWidth && 
                                   x <= node.x + halfWidth && 
                                   y >= node.y - halfHeight && 
                                   y <= node.y + halfHeight;
                        });
                    }
                    
                    // Event handlers
                    canvas.addEventListener('mousedown', (e) => {
                        const pos = getMousePos(e);
                        const node = getNodeAt(pos.x, pos.y);
                        
                        if (node) {
                            // Start dragging node
                            isDraggingNode = true;
                            draggedNode = node;
                            dragStartX = e.clientX;
                            dragStartY = e.clientY;
                            nodeStartX = node.x;
                            nodeStartY = node.y;
                            canvas.style.cursor = 'grabbing';
                            showNodeInfo(node);
                        } else {
                            // Start panning view
                            isPanning = true;
                            dragStartX = e.clientX;
                            dragStartY = e.clientY;
                            canvas.style.cursor = 'grabbing';
                            hideNodeInfo();
                        }
                    });
                    
                    canvas.addEventListener('mousemove', (e) => {
                        if (isDraggingNode && draggedNode) {
                            // Update node position
                            const deltaX = (e.clientX - dragStartX) / scale;
                            const deltaY = (e.clientY - dragStartY) / scale;
                            
                            // Calculate new position
                            const newX = nodeStartX + deltaX;
                            const newY = nodeStartY + deltaY;
                            
                            // Apply bounds to keep node in reasonable area
                            const nodeSize = getNodeSize(draggedNode);
                            const marginX = nodeSize.width / 2 + 20;
                            const marginY = nodeSize.height / 2 + 20;
                            const minX = -offsetX / scale + marginX;
                            const maxX = (canvasWidth - offsetX) / scale - marginX;
                            const minY = -offsetY / scale + marginY;
                            const maxY = (canvasHeight - offsetY) / scale - marginY;
                            
                            draggedNode.x = Math.max(minX, Math.min(maxX, newX));
                            draggedNode.y = Math.max(minY, Math.min(maxY, newY));
                            draw();
                        } else if (isPanning) {
                            // Pan view
                            offsetX += e.clientX - dragStartX;
                            offsetY += e.clientY - dragStartY;
                            dragStartX = e.clientX;
                            dragStartY = e.clientY;
                            draw();
                        } else {
                            // Update cursor based on what's under mouse
                            const pos = getMousePos(e);
                            const node = getNodeAt(pos.x, pos.y);
                            canvas.style.cursor = node ? 'grab' : 'default';
                            
                            // Show tooltip for hovered node
                            if (node) {
                                canvas.title = node.isNodeModule ? node.path : 
                                              (node.path.startsWith('./') ? node.path.substring(2) : node.path);
                            } else {
                                canvas.title = '';
                            }
                        }
                    });
                    
                    canvas.addEventListener('mouseup', (e) => {
                        if (isDraggingNode) {
                            isDraggingNode = false;
                            draggedNode = null;
                            // Save positions after dragging
                            saveNodePositions();
                        }
                        if (isPanning) {
                            isPanning = false;
                        }
                        
                        // Reset cursor
                        const pos = getMousePos(e);
                        const node = getNodeAt(pos.x, pos.y);
                        canvas.style.cursor = node ? 'grab' : 'default';
                    });
                    
                    canvas.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const rect = canvas.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const mouseY = e.clientY - rect.top;
                        
                        // Slower zoom for better control (especially on touchpad)
                        const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
                        const newScale = Math.max(0.1, Math.min(5, scale * zoomFactor));
                        
                        offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
                        offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);
                        scale = newScale;
                        
                        draw();
                    });
                    
                    canvas.addEventListener('dblclick', (e) => {
                        const pos = getMousePos(e);
                        const node = getNodeAt(pos.x, pos.y);
                        
                        if (node && !node.isNodeModule) {
                            vscode.postMessage({
                                command: 'openFile',
                                filePath: node.path
                            });
                        }
                    });
                    
                    function showNodeInfo(node) {
                        const relatedEdges = edges.filter(e => e.from === node.id || e.to === node.id);
                        const imports = relatedEdges.filter(e => e.to === node.id).map(e => 
                            nodes.find(n => n.id === e.from)
                        ).filter(Boolean);
                        const importedBy = relatedEdges.filter(e => e.from === node.id).map(e => 
                            nodes.find(n => n.id === e.to)
                        ).filter(Boolean);
                        
                        // Show relative path for project files, full path for node modules
                        let displayPath;
                        if (node.isNodeModule) {
                            displayPath = node.path;
                        } else {
                            // For project files, show relative path
                            displayPath = node.path;
                            // Remove leading "./" if present
                            if (displayPath.startsWith('./')) {
                                displayPath = displayPath.substring(2);
                            }
                        }
                        
                        let html = \`
                            <h3>\${node.label}</h3>
                            <p><strong>Path:</strong> \${displayPath}</p>
                            <p><strong>Type:</strong> \${node.isNodeModule ? 'Node Module' : 'Project File'}</p>
                        \`;
                        
                        if (imports.length > 0) {
                            html += \`
                                <div class="import-list">
                                    <strong>This file imports (\${imports.length}):</strong>
                                    \${imports.map(n => \`<div class="import-item">→ \${n.label}</div>\`).join('')}
                                </div>
                            \`;
                        }
                        
                        if (importedBy.length > 0) {
                            html += \`
                                <div class="import-list">
                                    <strong>Imported by (\${importedBy.length}):</strong>
                                    \${importedBy.map(n => \`<div class="import-item">← \${n.label}</div>\`).join('')}
                                </div>
                            \`;
                        }
                        
                        // Add hint about connections visibility
                        if (!showAllEdges) {
                            const hasOtherConnections = edges.some(edge => 
                                edge.from !== currentFile && edge.to !== currentFile &&
                                (edge.from === node.id || edge.to === node.id)
                            );
                            
                            if (hasOtherConnections) {
                                html += \`
                                    <div style="margin-top: 8px; font-size: 10px; color: var(--vscode-descriptionForeground); font-style: italic;">
                                        💡 Click "Show All Connections" to see connections between other files
                                    </div>
                                \`;
                            }
                        }
                        
                        nodeInfo.innerHTML = html;
                        infoPanel.style.display = 'block';
                    }
                    
                    function hideNodeInfo() {
                        infoPanel.style.display = 'none';
                    }
                    
                    // Control functions
                    function resetZoom() {
                        offsetX = 0;
                        offsetY = 0;
                        scale = 1;
                        draw();
                    }
                    
                    function centerOnCurrent() {
                        const currentNode = nodes.find(n => n.isCurrentFile);
                        if (currentNode) {
                            const centerX = canvasWidth / (2 * window.devicePixelRatio);
                            const centerY = canvasHeight / (2 * window.devicePixelRatio);
                            offsetX = centerX - currentNode.x * scale;
                            offsetY = centerY - currentNode.y * scale;
                            draw();
                        }
                    }
                    
                    function toggleNodeModules() {
                        showNodeModules = !showNodeModules;
                        const button = document.getElementById('nodeModulesButton');
                        button.textContent = showNodeModules ? 'Hide Node Modules' : 'Show Node Modules';
                        draw();
                    }
                    
                    function toggleEdges() {
                        showAllEdges = !showAllEdges;
                        const button = document.getElementById('edgesButton');
                        button.textContent = showAllEdges ? 'Hide All Connections' : 'Show All Connections';
                        draw();
                    }
                    
                    function zoomIn() {
                        const centerX = canvasWidth / (2 * window.devicePixelRatio);
                        const centerY = canvasHeight / (2 * window.devicePixelRatio);
                        const newScale = Math.min(5, scale * 1.2);
                        
                        offsetX = centerX - (centerX - offsetX) * (newScale / scale);
                        offsetY = centerY - (centerY - offsetY) * (newScale / scale);
                        scale = newScale;
                        
                        draw();
                    }
                    
                    function zoomOut() {
                        const centerX = canvasWidth / (2 * window.devicePixelRatio);
                        const centerY = canvasHeight / (2 * window.devicePixelRatio);
                        const newScale = Math.max(0.1, scale * 0.8);
                        
                        offsetX = centerX - (centerX - offsetX) * (newScale / scale);
                        offsetY = centerY - (centerY - offsetY) * (newScale / scale);
                        scale = newScale;
                        
                        draw();
                    }
                    
                    function organizeLayout() {
                        layoutHierarchical();
                        draw();
                        // Save new organized positions
                        saveNodePositions();
                    }
                    
                    /**
                     * Layout nodes in multiple rows with max 8 nodes per row
                     * @param {array} nodes - Array of nodes to layout
                     * @param {number} centerX - Center X position for the group
                     * @param {number} startY - Starting Y position for the first row
                     * @param {number} horizontalSpacing - Horizontal spacing between nodes
                     * @param {number} verticalSpacing - Vertical spacing between rows
                     */
                    function layoutNodesInRows(nodes, centerX, startY, horizontalSpacing, verticalSpacing) {
                        const maxNodesPerRow = 8;
                        const numRows = Math.ceil(nodes.length / maxNodesPerRow);
                        
                        for (let row = 0; row < numRows; row++) {
                            const startIndex = row * maxNodesPerRow;
                            const endIndex = Math.min(startIndex + maxNodesPerRow, nodes.length);
                            const rowNodes = nodes.slice(startIndex, endIndex);
                            const rowY = startY + (row * verticalSpacing);
                            
                            // Center align nodes in this row
                            const rowWidth = (rowNodes.length - 1) * horizontalSpacing;
                            const rowStartX = centerX - rowWidth / 2;
                            
                            rowNodes.forEach((node, index) => {
                                node.x = rowStartX + index * horizontalSpacing;
                                node.y = rowY;
                            });
                        }
                    }
                    
                    /**
                     * Layout nodes in hierarchical structure:
                     * - Current file in center
                     * - Files that import current file above
                     * - Files imported by current file below
                     */
                    function layoutHierarchical() {
                        if (nodes.length === 0) return;
                        
                        const centerX = canvasWidth / (2 * window.devicePixelRatio);
                        const centerY = canvasHeight / (2 * window.devicePixelRatio);
                        const verticalSpacing = 100;
                        const horizontalSpacing = 160;
                        
                        // Find current file node
                        const currentNode = nodes.find(n => n.isCurrentFile);
                        
                        if (!currentNode) {
                            // Fallback to grid layout if no current file
                            layoutNodes(true);
                            return;
                        }
                        
                        // Place current file at center
                        currentNode.x = centerX;
                        currentNode.y = centerY;
                        
                        // Separate nodes into categories
                        const nodesImportingCurrent = []; // Files that import current file (go above)
                        const nodesImportedByCurrent = []; // Files imported by current file (go below)
                        const nodeModules = []; // Node modules
                        const otherNodes = []; // Other files
                        
                        nodes.forEach(node => {
                            if (node.isCurrentFile) return;
                            
                            if (node.isNodeModule) {
                                nodeModules.push(node);
                                return;
                            }
                            
                            // Check relationships with current file
                            // Edge from A → B means B imports A
                            const currentFileImportsThis = edges.some(edge => 
                                edge.from === node.id && edge.to === currentNode.id
                            );
                            const thisImportsCurrentFile = edges.some(edge => 
                                edge.from === currentNode.id && edge.to === node.id
                            );
                            
                            if (thisImportsCurrentFile) {
                                nodesImportingCurrent.push(node);
                            } else if (currentFileImportsThis) {
                                nodesImportedByCurrent.push(node);
                            } else {
                                otherNodes.push(node);
                            }
                        });
                        
                        // Layout nodes that import current file (above)
                        if (nodesImportingCurrent.length > 0) {
                            // Calculate how many rows we need and adjust starting position
                            const numRowsAbove = Math.ceil(nodesImportingCurrent.length / 8);
                            const aboveStartY = centerY - verticalSpacing * numRowsAbove;
                            layoutNodesInRows(nodesImportingCurrent, centerX, aboveStartY, horizontalSpacing, verticalSpacing);
                        }
                        
                        // Layout nodes imported by current file (below)
                        if (nodesImportedByCurrent.length > 0) {
                            layoutNodesInRows(nodesImportedByCurrent, centerX, centerY + verticalSpacing, horizontalSpacing, verticalSpacing);
                        }
                        
                        // Layout node modules (further below)
                        if (nodeModules.length > 0) {
                            // Calculate spacing based on how many rows the imported nodes take
                            const numRowsImported = nodesImportedByCurrent.length > 0 ? Math.ceil(nodesImportedByCurrent.length / 8) : 0;
                            const moduleStartY = centerY + verticalSpacing * (1 + numRowsImported);
                            layoutNodesInRows(nodeModules, centerX, moduleStartY, horizontalSpacing, verticalSpacing);
                        }
                        
                        // Layout other nodes (to the side)
                        if (otherNodes.length > 0) {
                            const cols = Math.ceil(Math.sqrt(otherNodes.length));
                            const startX = centerX + horizontalSpacing * 2;
                            const startY = centerY - ((Math.ceil(otherNodes.length / cols) - 1) * 80) / 2;
                            
                            otherNodes.forEach((node, index) => {
                                const col = index % cols;
                                const row = Math.floor(index / cols);
                                node.x = startX + col * 150;
                                node.y = startY + row * 80;
                            });
                        }
                    }
                    

                    
                    // Add event listeners for buttons
                    function setupEventListeners() {
                        document.getElementById('resetButton').addEventListener('click', resetZoom);
                        document.getElementById('centerButton').addEventListener('click', centerOnCurrent);
                        document.getElementById('edgesButton').addEventListener('click', toggleEdges);
                        document.getElementById('nodeModulesButton').addEventListener('click', toggleNodeModules);
                        document.getElementById('organizeButton').addEventListener('click', organizeLayout);
                        document.getElementById('zoomInButton').addEventListener('click', zoomIn);
                        document.getElementById('zoomOutButton').addEventListener('click', zoomOut);
                    }
                    
                    /**
                     * Save current node positions to localStorage for persistence across sessions.
                     * Uses a unique key based on current file path.
                     */
                    function saveNodePositions() {
                        if (!nodes.length) return;
                        
                        const positions = {};
                        nodes.forEach(node => {
                            positions[node.id] = { x: node.x, y: node.y };
                        });
                        
                        const storageKey = 'importMap_positions_' + (currentFile || 'project');
                        localStorage.setItem(storageKey, JSON.stringify(positions));
                        console.log('💾 Saved node positions for:', currentFile || 'project');
                    }
                    
                    /**
                     * Load saved node positions from localStorage.
                     * Performs intelligent checking to detect if the node set has changed significantly.
                     * @returns {boolean} True if positions were successfully restored
                     */
                    function loadNodePositions() {
                        const storageKey = 'importMap_positions_' + (currentFile || 'project');
                        const savedData = localStorage.getItem(storageKey);
                        
                        if (savedData) {
                            try {
                                const positions = JSON.parse(savedData);
                                const currentNodeIds = new Set(nodes.map(n => n.id));
                                const savedNodeIds = new Set(Object.keys(positions));
                                
                                // Check if node sets are significantly different
                                const intersection = [...currentNodeIds].filter(id => savedNodeIds.has(id));
                                const matchPercentage = intersection.length / Math.max(currentNodeIds.size, savedNodeIds.size);
                                
                                // If less than 70% overlap, consider it a different file/layout
                                if (matchPercentage < 0.7) {
                                    console.log(\`🔄 Node set changed (\${Math.round(matchPercentage * 100)}% match), clearing saved positions\`);
                                    clearSavedPositions();
                                    return false;
                                }
                                
                                let restored = 0;
                                nodes.forEach(node => {
                                    if (positions[node.id]) {
                                        node.x = positions[node.id].x;
                                        node.y = positions[node.id].y;
                                        restored++;
                                    }
                                });
                                
                                if (restored > 0) {
                                    console.log(\`🔄 Restored \${restored} node positions for:\`, currentFile || 'project');
                                    return true;
                                }
                            } catch (error) {
                                console.warn('Failed to load saved positions:', error);
                            }
                        }
                        return false;
                    }
                    
                    /**
                     * Clear saved positions from localStorage for the current file.
                     */
                    function clearSavedPositions() {
                        const storageKey = 'importMap_positions_' + (currentFile || 'project');
                        localStorage.removeItem(storageKey);
                        console.log('🗑️ Cleared saved positions for:', currentFile || 'project');
                    }

                    // Debounced resize handler to prevent flickering
                    let resizeTimeout;
                    function handleResize() {
                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            initCanvas();
                        }, 100); // 100ms debounce
                    }

                    // Initialize
                    window.addEventListener('resize', handleResize);
                    // Save positions when page unloads
                    window.addEventListener('beforeunload', saveNodePositions);
                    initCanvas();
                    setupEventListeners();
                </script>
            </body>
            </html>`;
    }

    /**
     * Converts the analyzed import map data into visualization-ready nodes and edges.
     * Handles filtering based on project mode vs current file mode.
     * 
     * @param importMap - The raw import analysis data
     * @param currentFile - Path of the currently focused file
     * @param isProjectMode - Whether to include all files or focus on current file relationships
     * @returns Object containing arrays of nodes and edges for visualization
     */
    private convertToVisualizationData(importMap: ImportMap, currentFile?: string, isProjectMode = false): { nodes: VisualizationNode[], edges: VisualizationEdge[] } {
        const nodes: VisualizationNode[] = [];
        const edges: VisualizationEdge[] = [];
        const nodeIds = new Set<string>();

        // Step 1: Convert only relevant files to nodes
        for (const [filePath, fileNode] of importMap.files) {
            const nodeId = filePath;
            const isCurrentFile = currentFile === filePath;
            
            nodes.push({
                id: nodeId,
                label: path.basename(fileNode.name),
                path: filePath,
                isNodeModule: false,
                isCurrentFile
            });
            nodeIds.add(nodeId);
        }

        // Step 2: Add edges (files) and node modules (ONLY from current file)
        for (const [filePath, fileNode] of importMap.files) {
            const nodeId = filePath;
            const isCurrentFile = currentFile === filePath;

            for (const importInfo of fileNode.imports) {
                if (importInfo.isNodeModule && (isProjectMode || isCurrentFile)) {
                    // Show node modules: in project mode (all), in current file mode (only current file)
                    const moduleId = `node_module:${importInfo.source}`;
                    if (!nodeIds.has(moduleId)) {
                        nodes.push({
                            id: moduleId,
                            label: importInfo.source,
                            path: importInfo.source,
                            isNodeModule: true
                        });
                        nodeIds.add(moduleId);
                    }

                    edges.push({
                        from: moduleId,
                        to: nodeId,
                        type: importInfo.type
                    });
                } else if (importInfo.resolvedPath && importMap.files.has(importInfo.resolvedPath)) {
                    // Always show edges between project files
                    edges.push({
                        from: importInfo.resolvedPath,
                        to: nodeId,
                        type: importInfo.type
                    });
                }
            }
        }

        return { nodes, edges };
    }

    /**
     * Generates a random nonce for Content Security Policy.
     * 
     * @returns A random 32-character string for CSP nonce
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Disposes the panel and cleans up resources.
     * Called when the panel is closed or the extension is deactivated.
     */
    public dispose() {
        ImportMapPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
} 