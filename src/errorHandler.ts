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