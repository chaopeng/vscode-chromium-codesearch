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

import {CancellationToken, ReferenceProvider, ReferenceContext, TextDocument, Position, Location, Uri, workspace} from 'vscode';
import {refs, getSymbolAtPosition, toLocation} from './codesearchApi';

export default class CsReferenceProvider implements ReferenceProvider {
  provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Thenable<Location[]> {
    const path: string = workspace.asRelativePath(document.uri.path);
    const symbol: string = getSymbolAtPosition(document, position);

    return refs(path, symbol).then(xrefs => {
      let references: Location[] = [];

      for (let file of xrefs.calls) {
        for (let caller of file.list)
          references.push(toLocation(caller));
      }

      for (let ref of xrefs.references)
        references.push(toLocation(ref));

      return references;
    });
  }
}
