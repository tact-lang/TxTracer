import {useEffect, useState} from "react"
import {createTraceInfoPerTransaction, type TraceInfo} from "ton-assembly/dist/trace"

import type {AssemblyExecutionResult} from "@features/txTrace/lib/asm/assemblyExecutor.ts"
import type {ExitCode} from "@features/txTrace/lib/traceTx"
import {findExitCode} from "@features/txTrace/lib/traceTx"

export const usePlaygroundTrace = (executionResult: AssemblyExecutionResult | undefined) => {
  const [trace, setTrace] = useState<TraceInfo | undefined>(undefined)
  const [exitCode, setExitCode] = useState<ExitCode | undefined>(undefined)

  useEffect(() => {
    if (!executionResult || !executionResult.success || !executionResult.mappingInfo) {
      setTrace(undefined)
      setExitCode(undefined)
      return
    }

    try {
      const traceInfo = createTraceInfoPerTransaction(
        executionResult.vmLogs,
        executionResult.mappingInfo,
        undefined,
      )[0]

      const exitCode = findExitCode(executionResult.vmLogs, executionResult.mappingInfo)

      setTrace(traceInfo)
      setExitCode(exitCode)
    } catch (error) {
      console.error("Failed to create playground trace:", error)
      setTrace(undefined)
      setExitCode(undefined)
    }
  }, [executionResult])

  return {
    trace,
    exitCode,
  }
}
