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

import * as Cache from 'lru-cache';
import * as rp from 'request-promise-native';
import { workspace, TextDocument, Position, Range, Location, Uri } from 'vscode';
import { error, errorMessage } from './errorHandler';

let cache = Cache({ max: 1000, maxAge: 1000 * 60 * 5 });

export class Ref {
  filename: string;
  line: number;
  signature: string;
  text: string;
  method: string;
  display: string;
  range: Range;
}

export class FileRef {
  filename: string;
  list: Ref[] = [];
}

export class XRefs {
  signature: string;
  definition: Ref;
  declaration: Ref;
  overrides: Ref[] = [];
  references: Ref[] = [];
  calls: FileRef[] = [];
};

function filePath(ref: Ref) {
  let basePath: string = `file://` + workspace.rootPath + `/`;
  return basePath + ref.filename + `#L` + ref.line;
}

function renderRef(ref: Ref): string {
  return `<div class='filename'>${ref.filename}:${ref.line}</div>
<a class='location' href='${filePath(ref)}'>${ref.text}</a>`
}

function render(xrefs: XRefs): string {
  let html: string = `<!DOCTYPE html>`;

  html += `
  <style>
  body {
    color: #bbb;
    background-color: #1e1e1e;
    font-family: "Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace;
  }
  h2 {
    border-bottom: 1px solid #bbb;
  }
  a:link, a:visited, a:hover, a:active {
    color: rgba(220, 220, 170, 1);
    text-decoration: none; 
  }
  </style>
  `

  if (xrefs.definition) {
    html += `<h2>Definition:</h2>`;
    html += renderRef(xrefs.definition);
  }

  if (xrefs.declaration) {
    html += `<h2>Declaration:</h2>`;
    html += renderRef(xrefs.declaration);
  }

  if (xrefs.overrides.length > 0) {
    html += `<h2>Overrides:</h2>`;
    for (let override of xrefs.overrides) {
      html += renderRef(override);
    }
  }

  if (xrefs.references.length > 0) {
    html += `<h2>References:</h2>`;
    for (let reference of xrefs.references) {
      html += renderRef(reference);
    }
  }

  if (xrefs.calls.length > 0) {
    html += `<h2>Call:</h2>`;
    for (let file of xrefs.calls) {
      html += `<div class='filename'>${file.filename}</div><ul>`
      for (let call of file.list)
        html += `<li><a class='location' href='${filePath(call)}'>${call.text}</a></li>`;
      html += `</ul>`;
    }
  }

  return html;
}

function retrieve(url: string): Thenable<any> {
  if (cache.has(url))
    return Promise.resolve(cache.get(url));

  let optionals = {
    uri: url,
    json: true
  }

  return rp(optionals)
    .then(result => {
      cache.set(url, result)
      return result;
    }, err => {
      error(err, `retrieve ${url} failed.`);
    })
    .catch(err => {
      error(err, `retrieve ${url} failed.`);
    });
}

function getCallGraphFor(xrefs: XRefs): Thenable<XRefs> {
  let signature: string = encodeURIComponent(xrefs.signature);

  let url: string = `https://cs.chromium.org/codesearch/json`
    + `?call_graph_request=b`
    + `&signature=${signature}`
    + `&file_spec=b`
    + `&package_name=chromium`
    + `&name=.`
    + `&file_spec=e`
    + `&max_num_results=500`
    + `&call_graph_request=e`;

  return retrieve(url).then(result => {
    let node = result.call_graph_response[0].node;

    if (!node.hasOwnProperty(`children`))
      return xrefs;

    let lastSignature: string = ``;
    for (let child of node.children) {
      if (child.signature == lastSignature)
        continue;
      if (!child.hasOwnProperty(`snippet_file_path`))
        continue;

      let caller: Ref = new Ref();

      caller.filename = child.snippet_file_path;
      if (caller.filename.startsWith("src/"))
        caller.filename = caller.filename.substr(4);

      caller.range = new Range(
        new Position(child.call_site_range.start_line - 1, child.call_site_range.start_column - 1), 
        new Position(child.call_site_range.end_line - 1, child.call_site_range.end_column));

      caller.line = child.call_site_range.start_line;
      caller.text = child.snippet.text.text;
      caller.method = child.identifier;
      caller.signature = child.signature;
      caller.display = child.display_name;
      lastSignature = child.signature;

      let fileRef: FileRef = xrefs.calls.find(item => {
        return item.filename == caller.filename;
      });

      if (fileRef == undefined) {
        fileRef = new FileRef();
        fileRef.filename = caller.filename;
        xrefs.calls.push(fileRef);
      }

      fileRef.list.push(caller);
    }

    return xrefs;
  });
}

function getRefForMatch(filename, match): Ref {
  let ref: Ref = new Ref();
  ref.filename = filename;
  ref.line = parseInt(match.line_number);
  ref.signature = match.signature;
  if (match.hasOwnProperty(`line_text`))
    ref.text = match.line_text;

  return ref;
}

function getXrefsFor(xrefs: XRefs): Thenable<XRefs> {
  let signature: string = encodeURIComponent(xrefs.signature);

  let url: string = `https://cs.chromium.org/codesearch/json`
    + `?xref_search_request=b`
    + `&query=${signature}`
    + `&file_spec=b`
    + `&name=.`
    + `&package_name=chromium`
    + `&file_spec=e`
    + `&max_num_results=500`
    + `&xref_search_request=e`;

  return retrieve(url).then(result => {
    result = result.xref_search_response[0];

    if (!result.hasOwnProperty(`search_result`))
      return xrefs;

    for (let fileResult of result.search_result) {
      let filename: string = fileResult.file.name;
      if (filename.startsWith("src/"))
        filename = filename.substr(4);

      for (let match of fileResult.match) {
        if (match.type == `HAS_DEFINITION`) {
          xrefs.definition = getRefForMatch(filename, match);
        } else if (match.type == `HAS_DECLARATION`) {
          xrefs.declaration = getRefForMatch(filename, match);
        } else if (match.type == `OVERRIDDEN_BY`) {
          xrefs.overrides.push(getRefForMatch(filename, match));
        } else if (match.type == `REFERENCED_AT`) {
          xrefs.references.push(getRefForMatch(filename, match));
        }
      }
    }
    return xrefs;
  });
}

function getSignatureFor(path: string, word: string): Thenable<string> {
  path = encodeURIComponent(path);

  let url: string = `https://cs.chromium.org/codesearch/json`
    + `?annotation_request=b`
    + `&file_spec=b`
    + `&package_name=chromium`
    + `&name=src/${path}`
    + `&file_spec=e`
    + `&type=b`
    + `&id=1`
    + `&type=e`
    + `&label=`
    + `&follow_branches=false`
    + `&annotation_request=e`;

  return retrieve(url).then(result => {
    for (let snippet of result.annotation_response[0].annotation) {
      if (!snippet.hasOwnProperty(`type`))
        continue;
      if (snippet.hasOwnProperty(`xref_signature`)) {
        let signature: string = snippet.xref_signature.signature;
        if (signature.includes(`${word}(`))
          return signature;
      }
      if (snippet.hasOwnProperty(`internal_link`)) {
        let signature: string = snippet.internal_link.signature;
        if (signature.includes(`class-${word}`) ||
            signature.includes(`::${word}@`) ||
            signature.includes(`::${word}(`))
          return signature;
      }
    }
    errorMessage(`${word} in ${path} not found.`);
  });
}

export function refs(path: string, word: string): Thenable<XRefs> {
  if (cache.has(path + "++" + word))
    return Promise.resolve(cache.get(path + "++" + word));

  return getSignatureFor(path, word).then(signature => {
    let xrefs: XRefs = new XRefs();
    xrefs.signature = signature;
    return getXrefsFor(xrefs);
  }).then(xrefs => {
    return getCallGraphFor(xrefs);
  }).then(xrefs => {
    cache.set(path + "++" + word, xrefs);
    return xrefs;
  });
}

export function refsHTML(path: string, word: string): Thenable<string> {
  return refs(path, word).then(xrefs => {
    return render(xrefs);
  });
}

const WORD_SPLITTER: string = ' ()+-*/%<>.,;';

export function getSymbolAtPosition(document: TextDocument, position: Position): string {
  const line: string = document.lineAt(position).text;
  const wordRange: Range = document.getWordRangeAtPosition(position);
  let start: number = wordRange.start.character;
  let end: number = wordRange.end.character;

  // add className if start behind "::".
  if (start > 2) {
    let index: number = start - 2;
    if (line.substr(index, 2) == "::") {
      index--;
      while (index >= 0) {
        let ch: string = line.charAt(index);
        if (WORD_SPLITTER.includes(ch)) {
          index++;
          break;
        }
        index--;
      }
      start = index;
    }
  }

  // add method if end before "::".
  if (line.length - end > 2) {
    let index: number = end;
    if (line.substr(index, 2) == "::") {
      while (index < line.length) {
        let ch: string = line.charAt(index);
        if (WORD_SPLITTER.includes(ch)) {
          index--;
          break;
        }
      }
      end = index;
    }
  }
  return line.substring(start, end);
}

export function toLocation(ref: Ref): Location {
  let uri: Uri = Uri.parse(`file://` + workspace.rootPath + `/` + ref.filename);
  if (ref.range) {
    return new Location(uri, ref.range);
  } else {
    return new Location(uri, new Position(ref.line - 1, 0));
  }
}