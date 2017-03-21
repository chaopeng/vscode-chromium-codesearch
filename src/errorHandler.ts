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

import { window, OutputChannel } from 'vscode';

let output: OutputChannel = window.createOutputChannel(`chromium-codesearch`);

export function errorMessage(message: string, ...item: string[]): Thenable<string> {
  return window.showErrorMessage(message, ...item);
}

export function outputAppend(message: string): void {
  output.appendLine(message);
}

export function outputShow(): void {
  output.show();
}

export function error(detail: string, simpleMessage: string): void {
  outputAppend(`ERROR: ${simpleMessage}`);
  outputAppend(`ERROR: ${detail}`);

  errorMessage(simpleMessage, `Show Details`)
    .then(() => outputShow());
}