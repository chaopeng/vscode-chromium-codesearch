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


