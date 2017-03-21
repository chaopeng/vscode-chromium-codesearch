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
