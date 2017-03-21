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

import {CancellationToken, DefinitionProvider, TextDocument, Position, Location, Uri, workspace} from 'vscode';
import {refs, getSymbolAtPosition, toLocation} from './codesearchApi';

export default class CsDefinitionProvider implements DefinitionProvider {
  provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Thenable<Location> {
    const path: string = workspace.asRelativePath(document.uri.path);
    const symbol: string = getSymbolAtPosition(document, position);

    return refs(path, symbol).then(xrefs => {
      // If call at definition, first = declaration.
      if (xrefs.definition && xrefs.declaration && xrefs.definition.line == position.line + 1)
        return toLocation(xrefs.declaration);

      if (xrefs.definition)
        toLocation(xrefs.definition);

      return undefined;
    });
  }
}


