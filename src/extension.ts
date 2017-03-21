'use strict';

import { workspace, languages, window, commands, ExtensionContext, Disposable, TextDocument, Selection, Range, ViewColumn, Uri } from 'vscode';
import commandLine = require('spawn-command');
import CsTextProvider, { encodeLocation } from './textProvider';
import { outputAppend, error } from './errorHandler';
import { getSymbolAtPosition } from './codesearchApi';
import CsReferenceProvider from './referenceProvider';
import CsDefinitionProvider from './definitionProvider';


function run(cmd: string) {
  return new Promise((accept, reject) => {
    let proc = commandLine(cmd);
    proc.stdout.on('data', outputAppend);
    proc.stderr.on('data', outputAppend);
    proc.on('close', (status) => {
      if (status) {
        reject(`Command \`${cmd}\` exited with status code ${status}.`);
      } else {
        accept();
      }
    });
  });
}

export function activate(context: ExtensionContext) {

  const providerRegistrations = Disposable.from(
    workspace.registerTextDocumentContentProvider(CsTextProvider.scheme, new CsTextProvider()),
    languages.registerDefinitionProvider({ language: 'cpp', scheme: 'file' }, new CsDefinitionProvider()),
    languages.registerReferenceProvider({ language: 'cpp', scheme: 'file' }, new CsReferenceProvider())
  );

  // open codesearch on chrome
  const opencs = commands.registerTextEditorCommand('cs.open', editor => {
    const path: string = workspace.asRelativePath(editor.document.uri.path);
    const line: number = editor.selection.active.line;

    let cmd: string = '';
    if (process.platform == 'darwin') {
      cmd = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --profile-directory=Default';
    } else if (process.platform == 'linux') {
      cmd = 'google-chrome --profile-directory=Default';
    } else {
      window.showInformationMessage('Only support Linux and MacOS at this time.');
      return;
    }

    cmd += ' https://cs.chromium.org/chromium/src/' + path + '?l=' + (line + 1);

    run(cmd).catch((reason) => {
      error(reason, `CodeSearchOpen failed.`);
    });
  });

  // open the references document, and shows it in the next editor
  const openref = commands.registerTextEditorCommand('cs.refs', editor => {
    const path: string = workspace.asRelativePath(editor.document.uri.path);
    const word: string = getWord(editor.document, editor.selection);
    const uri = encodeLocation(word, path, word);

    return commands.executeCommand('vscode.previewHtml', uri, ViewColumn.Two);
  });

  context.subscriptions.push(
    opencs,
    openref,
    providerRegistrations
  );
}

const WORD_SPLITTER: string = ' ()+-*/%<>.,;';

function getWord(document: TextDocument, selection: Selection): string {
  // return selection string if already selection exist.
  if (!selection.isEmpty) {
    if (selection.isSingleLine)
      return document.getText(new Range(selection.start, selection.end));
    // TODO(chaopeng) I don't have good idea for multi line at this time.
    return null;
  }

  return getSymbolAtPosition(document, selection.active);
}