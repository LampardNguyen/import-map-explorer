import * as vscode from 'vscode';
import { ImportMapPanel } from './importMapPanel';
import { ImportAnalyzer } from './importAnalyzer';

export function activate(context: vscode.ExtensionContext) {
    console.log('Import Map Explorer extension is now active!');

    const analyzer = new ImportAnalyzer();

    // Command to show import map for current file
    const showCurrentFileMapCommand = vscode.commands.registerCommand(
        'importMapExplorer.showCurrentFileMap',
        async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            const currentFilePath = activeEditor.document.uri.fsPath;
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
            
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            console.log('Analyzing file:', currentFilePath);
            console.log('Workspace folder:', workspaceFolder.uri.fsPath);

            try {
                const importMap = await analyzer.analyzeFile(currentFilePath, workspaceFolder.uri.fsPath);
                console.log('Import map result:', {
                    filesCount: importMap.files.size,
                    entryFile: importMap.entryFile,
                    files: Array.from(importMap.files.keys())
                });
                
                ImportMapPanel.createOrShow(context.extensionUri, importMap, currentFilePath, false);
            } catch (error) {
                console.error('Error analyzing imports:', error);
                vscode.window.showErrorMessage(`Error analyzing imports: ${error}`);
            }
        }
    );

    // Command to show import map for entire project
    const showMapCommand = vscode.commands.registerCommand(
        'importMapExplorer.showMap',
        async (uri?: vscode.Uri) => {
            const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
            if (!targetUri) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            try {
                const importMap = await analyzer.analyzeProject(workspaceFolder.uri.fsPath);
                ImportMapPanel.createOrShow(context.extensionUri, importMap, targetUri.fsPath, true);
            } catch (error) {
                vscode.window.showErrorMessage(`Error analyzing project: ${error}`);
            }
        }
    );

    context.subscriptions.push(showCurrentFileMapCommand, showMapCommand);
}

export function deactivate() {} 