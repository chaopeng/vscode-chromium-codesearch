'use strict';

import * as vscode from 'vscode';
import {refsHTML} from './codesearchApi';

export default class CsTextProvider implements vscode.TextDocumentContentProvider {

  static scheme = 'cs';

  provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    const [path, word] = decodeLocation(uri);
    return refsHTML(path, word);
  }
}

let seq = 0;

export function encodeLocation(title: string, path: string, word: string): vscode.Uri {
  const query = JSON.stringify([path, word]);
  return vscode.Uri.parse(`${CsTextProvider.scheme}:Ref:${title}?${query}#${seq++}`);
}

export function decodeLocation(uri: vscode.Uri): [string, string] {
  return <[string, string]>JSON.parse(uri.query);
}