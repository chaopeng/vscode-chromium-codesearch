//    Copyright 2017 chaopeng
// 
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
// 
//        http://www.apache.org/licenses/LICENSE-2.0
// 
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

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