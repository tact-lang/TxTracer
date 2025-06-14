import {useEffect, type RefObject} from "react"
import type * as monacoTypes from "monaco-editor"

import type {ExitCode} from "@features/txTrace/lib/traceTx"

import {TASM_LANGUAGE_ID} from "../languages"

interface UseTasmCodeLensProviderOptions {
  readonly monaco: typeof monacoTypes | null
  readonly editorRef: RefObject<monacoTypes.editor.IStandaloneCodeEditor | null>
  readonly exitCode?: ExitCode
  readonly editorReady: boolean
  readonly enabled?: boolean
}

export const useTasmCodeLensProvider = ({
  monaco,
  editorRef,
  exitCode,
  editorReady,
  enabled,
}: UseTasmCodeLensProviderOptions): void => {
  useEffect(() => {
    if (!monaco || !editorRef.current || !editorReady || !enabled) return

    const provider = monaco.languages.registerCodeLensProvider(TASM_LANGUAGE_ID, {
      provideCodeLenses: model => {
        if (!exitCode?.info?.loc?.line && exitCode?.info?.loc?.line !== 0) {
          return {
            lenses: [],
            dispose: () => {},
          }
        }

        const line = exitCode.info.loc.line + 1
        if (line <= 0 || line > model.getLineCount()) {
          return {
            lenses: [],
            dispose: () => {},
          }
        }

        const description = exitCode.description ? `: ${exitCode.description}` : ``
        const lenses: monacoTypes.languages.CodeLens[] = [
          {
            range: new monaco.Range(line, 1, line, 1),
            id: `exitCode-${line}`,
            command: {
              id: "noop",
              title: `⚡ Exit Code: ${exitCode.num}${description}`,
              tooltip: `Transaction failed with exit code ${exitCode.num}${description}`,
            },
          },
        ]

        return {
          lenses: lenses,
          dispose: () => {},
        }
      },
      resolveCodeLens: (_model, codeLens) => {
        return codeLens
      },
    })

    return () => {
      provider.dispose()
    }
  }, [monaco, exitCode, editorRef, editorReady, enabled])
}
