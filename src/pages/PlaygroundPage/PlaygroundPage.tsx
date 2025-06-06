import React, {useState, useCallback, Suspense, useMemo, useEffect} from "react"

import {FiPlay} from "react-icons/fi"

import InlineLoader from "@shared/ui/InlineLoader"
import ErrorBanner from "@shared/ui/ErrorBanner/ErrorBanner"
import TraceSidePanel from "@shared/ui/TraceSidePanel"
import {
  executeAssemblyCode,
  type AssemblyExecutionResult,
} from "@features/txTrace/lib/asm/assemblyExecutor.ts"
import {usePlaygroundTrace} from "@features/txTrace/hooks/usePlaygroundTrace"
import {useGlobalError} from "@shared/lib/errorContext"
import StatusBadge, {type StatusType} from "@shared/ui/StatusBadge"
import {useExecutionsMap, useTraceStepper, useGasMap} from "@features/txTrace/hooks"
import {normalizeGas} from "@features/txTrace/lib/traceTx"
import type {InstructionDetail} from "@features/txTrace/ui/StepInstructionBlock"

import TracePageHeader from "@app/pages/TracePage/TracePageHeader"
import Button from "@shared/ui/Button"
import ButtonLoader from "@shared/ui/ButtonLoader/ButtonLoader.tsx"

import styles from "./PlaygroundPage.module.css"

const CodeEditor = React.lazy(() => import("@shared/ui/CodeEditor"))

const DEFAULT_ASSEMBLY_CODE = `SETCP 0
PUSHINT_8 42
PUSHINT_8 100
ADD
PUSHINT_16 200
SUB
ACCEPT`

const LOCAL_STORAGE_KEY = "txtracer-playground-assembly-code"

function PlaygroundPage() {
  const [assemblyCode, setAssemblyCode] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY) ?? DEFAULT_ASSEMBLY_CODE
  })
  const [result, setResult] = useState<AssemblyExecutionResult | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const {setError: setGlobalError} = useGlobalError()

  const {trace, exitCode} = usePlaygroundTrace(result)

  const {
    selectedStep,
    currentStep,
    currentStack,
    totalSteps,
    canGoPrev,
    canGoNext,
    handlePrev,
    handleNext,
    goToFirstStep,
    goToLastStep,
    findStepByLine,
    highlightLine,
    transitionType,
  } = useTraceStepper(trace)

  const executionsMap = useExecutionsMap(trace)
  const gasMap = useGasMap(trace)

  const instructionDetails: InstructionDetail[] = useMemo(() => {
    if (!trace) return []
    return trace.steps.map(step => ({
      name: step.instructionName,
      gasCost: normalizeGas(step),
    }))
  }, [trace])

  const cumulativeGas = useMemo(() => {
    if (!trace) return 0
    let totalGas = 0
    for (let i = 0; i < selectedStep; i++) {
      const step = trace.steps[i]
      if (step) {
        totalGas += normalizeGas(step)
      }
    }
    return totalGas
  }, [trace, selectedStep])

  const handleExecute = useCallback(async () => {
    if (!assemblyCode.trim()) {
      return
    }

    setLoading(true)
    setError("")
    setResult(undefined)

    try {
      const result = await executeAssemblyCode(assemblyCode)
      setResult(result)

      if (!result.success && result.error) {
        setError(result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setError(errorMessage)
      setGlobalError(`Failed to execute assembly code: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [assemblyCode, setGlobalError])

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, assemblyCode)
  }, [assemblyCode])

  const handleCodeChange = useCallback((newCode: string) => {
    setAssemblyCode(newCode)
    setResult(undefined)
    setError("")
  }, [])

  const clearError = useCallback(() => {
    setError("")
  }, [])

  const txStatus: StatusType | undefined = useMemo(() => {
    if (!result) return undefined

    if (exitCode && exitCode.num !== 0) {
      return "failed"
    }
    if (result.success) {
      return "success"
    }
    return undefined
  }, [result, exitCode])

  const shouldShowStatusContainer = txStatus !== undefined
  const txStatusText = `Exit code: ${exitCode?.num ?? 0}`

  return (
    <div className={styles.traceViewWrapper}>
      <TracePageHeader pageTitle="playground">
        {shouldShowStatusContainer && (
          <div className={styles.txStatusContainer}>
            {txStatus && <StatusBadge type={txStatus} text={txStatusText} />}
          </div>
        )}
        <div className={styles.mainActionContainer}>
          <Button
            onClick={() => void handleExecute()}
            disabled={loading}
            className={styles.executeButton}
            title="Execute Assembly Code"
          >
            {loading ? (
              <ButtonLoader>Execute</ButtonLoader>
            ) : (
              <>
                <FiPlay size={16} />
                Execute
              </>
            )}
          </Button>
        </div>
      </TracePageHeader>

      {error && <ErrorBanner message={error} onClose={clearError} />}

      <div className={styles.appContainer}>
        <div className={styles.mainContent}>
          <div style={{flex: "1", position: "relative"}}>
            <Suspense fallback={<InlineLoader message="Loading Editor..." loading={true} />}>
              <CodeEditor
                code={assemblyCode}
                onChange={handleCodeChange}
                readOnly={false}
                highlightLine={highlightLine}
                lineExecutions={executionsMap}
                lineGas={gasMap}
                shouldCenter={transitionType === "button"}
                exitCode={exitCode?.info ? exitCode : undefined}
                onLineClick={findStepByLine}
              />
            </Suspense>
          </div>
          <TraceSidePanel
            selectedStep={selectedStep}
            totalSteps={totalSteps}
            currentStep={currentStep}
            currentStack={currentStack}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={handlePrev}
            onNext={handleNext}
            onFirst={goToFirstStep}
            onLast={goToLastStep}
            placeholderMessage="Ready to execute"
            instructionDetails={instructionDetails}
            cumulativeGas={cumulativeGas}
            showGas={true}
          />
        </div>
      </div>
    </div>
  )
}

export default PlaygroundPage
