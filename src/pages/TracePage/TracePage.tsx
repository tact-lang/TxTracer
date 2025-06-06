import React, {useState, useEffect, Suspense, useCallback} from "react"
import {FiGithub, FiClock, FiX, FiCode} from "react-icons/fi"
import {Link} from "react-router-dom"

import {RetraceResultView} from "@features/txTrace/ui"
import type {RetraceResultAndCode} from "@features/txTrace/ui"
import TraceSidePanel from "@shared/ui/TraceSidePanel"
import {traceTx, normalizeGas} from "@features/txTrace/lib/traceTx"
import {useGasMap, useTraceStepper, useExecutionsMap} from "@features/txTrace/hooks"
import SearchInput from "@shared/ui/SearchInput"
import InlineLoader from "@shared/ui/InlineLoader"
import {useGlobalError} from "@shared/lib/errorContext"
import {type InstructionDetail} from "@features/txTrace/ui/StepInstructionBlock"
import {useTxHistory, type TxHistoryEntry} from "@shared/lib/useTxHistory"
import {shortenHash} from "@shared/lib/format"
import StatusBadge, {type StatusType} from "@shared/ui/StatusBadge"

import {TooltipHint} from "@shared/ui/TooltipHint"

import TracePageHeader from "./TracePageHeader"

import styles from "./TracePage.module.css"

const CodeEditor = React.lazy(() => import("@shared/ui/CodeEditor"))

function TracePage() {
  const [inputText, setInputText] = useState("")
  const [headerInputText, setHeaderInputText] = useState("")
  const [result, setResult] = useState<RetraceResultAndCode | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const {setError} = useGlobalError()
  const [instructionDetails, setInstructionDetails] = useState<InstructionDetail[]>([])
  const [cumulativeGasSinceBegin, setCumulativeGasSinceBegin] = useState<number>(0)
  const {history, addToHistory, removeFromHistory} = useTxHistory()
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const gasMap = useGasMap(result?.trace)
  const executionsMap = useExecutionsMap(result?.trace)
  const {
    selectedStep,
    highlightLine,
    currentStep,
    currentStack,
    handlePrev,
    handleNext,
    goToFirstStep,
    goToLastStep,
    canGoPrev,
    canGoNext,
    findStepByLine,
    transitionType,
    totalSteps,
  } = useTraceStepper(result?.trace)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tx = params.get("tx") ?? ""
    setInputText(tx)
    setHeaderInputText(tx)
  }, [])

  useEffect(() => {
    if (result?.trace) {
      setInstructionDetails(
        result.trace.steps.map(step => ({
          name: step.instructionName,
          gasCost: normalizeGas(step),
        })),
      )
    } else {
      setInstructionDetails([])
    }
  }, [result])

  useEffect(() => {
    if (result?.trace?.steps && selectedStep > 0) {
      let totalGas = 0
      for (let i = 0; i < selectedStep; i++) {
        const step = result.trace.steps[i]
        if (step) {
          const gasNum = normalizeGas(step)
          if (!isNaN(gasNum)) {
            totalGas += gasNum
          }
        }
      }
      setCumulativeGasSinceBegin(totalGas)
    } else {
      setCumulativeGasSinceBegin(0)
    }
  }, [selectedStep, result?.trace?.steps])

  const handleSubmit = useCallback(
    async (fromHeader: boolean = false, initialTx?: string) => {
      const textToSubmit = initialTx ?? (fromHeader ? headerInputText : inputText)
      if (!textToSubmit.trim()) return
      setLoading(true)
      try {
        const rr = await traceTx(textToSubmit)
        setResult(rr)
        if (!fromHeader) {
          const computeInfo = rr?.result?.emulatedTx?.computeInfo
          const exitCode = computeInfo !== "skipped" ? computeInfo?.exitCode : undefined
          addToHistory({hash: textToSubmit, exitCode})
        }
        setShowHistoryDropdown(false)
        window.history.pushState({}, "", `?tx=${textToSubmit}`)
      } catch (e) {
        console.error(e)
        if (e instanceof Error) {
          setError(`Failed to trace transaction: ${e.message}`)
        } else {
          setError("Failed to trace transaction")
        }
      } finally {
        setLoading(false)
      }
    },
    [headerInputText, inputText, setError, addToHistory],
  )

  const handleHeaderSubmit = useCallback(() => {
    void handleSubmit(true)
  }, [handleSubmit])

  const toggleDetails = useCallback(() => setDetailsExpanded(prev => !prev), [])

  const handleDetailsKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        toggleDetails()
      }
    },
    [toggleDetails],
  )

  const exitCode =
    result?.result?.emulatedTx?.computeInfo !== "skipped"
      ? result?.result?.emulatedTx?.computeInfo?.exitCode
      : undefined
  const txStatus =
    result?.result?.emulatedTx?.computeInfo !== "skipped"
      ? result?.result?.emulatedTx?.computeInfo?.success
        ? "success"
        : "failed"
      : "success"

  const stateUpdateHashOk = result?.result?.stateUpdateHashOk
  const shouldShowStatusContainer = txStatus !== undefined || stateUpdateHashOk === false
  const txStatusText = `Exit code: ${exitCode?.toString() ?? "unknown"}`

  return (
    <>
      {!result && (
        <div className={styles.inputPage}>
          <div className={styles.externalLinksContainer}>
            <Link to="/play" title="TVM Assembly Playground" className={styles.iconLink}>
              <FiCode size={24} />
            </Link>
            <a
              href="https://github.com/tact-lang/txtracer"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub Repository"
              className={styles.iconLink}
            >
              <FiGithub size={24} />
            </a>
          </div>

          <div className={styles.centeredInputContainer}>
            <div className={styles.txtracerLogo}>
              <div className={styles.logoDiamond}></div>
              <h1 data-testid="app-title" className={styles.txtracerLogoH1}>
                <span>TxTracer</span>
                <span className={styles.titleTon}>The Open Network</span>
              </h1>
            </div>
            <div className={styles.inputCard}>
              <SearchInput
                value={inputText}
                onChange={setInputText}
                onSubmit={() => {
                  void handleSubmit(false)
                }}
                placeholder="Search by transaction hash or explorer link"
                loading={loading}
                autoFocus={true}
                onFocus={() => {
                  setIsInputFocused(true)
                }}
                onBlur={() => {
                  setIsInputFocused(false)
                  setTimeout(() => setShowHistoryDropdown(false), 100)
                }}
                onInputClick={() => {
                  if (isInputFocused) {
                    setShowHistoryDropdown(true)
                  }
                }}
              />
              {showHistoryDropdown && history.length > 0 && (
                <ul
                  className={styles.historyDropdown}
                  onMouseDown={e => e.preventDefault()}
                  role="listbox"
                  aria-label="Transaction history"
                >
                  {history.slice(0, Math.min(4, history.length)).map((entry: TxHistoryEntry) => {
                    const statusType: StatusType =
                      entry.exitCode === undefined || entry.exitCode === 0 ? "success" : "failed"
                    return (
                      <li
                        key={entry.hash}
                        onClick={() => {
                          setInputText(entry.hash)
                          setShowHistoryDropdown(false)
                          void handleSubmit(false, entry.hash)
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setInputText(entry.hash)
                            setShowHistoryDropdown(false)
                            void handleSubmit(false, entry.hash)
                          }
                        }}
                        className={styles.historyItem}
                        role="option"
                        tabIndex={0}
                        aria-selected={false}
                      >
                        <FiClock size={16} className={styles.historyItemIcon} />
                        <span className={styles.historyItemText}>
                          {shortenHash(entry.hash, 16, 16)}
                        </span>
                        {entry.exitCode !== undefined && (
                          <StatusBadge type={statusType} text={`Exit code: ${entry.exitCode}`} />
                        )}
                        <button
                          className={styles.historyItemDeleteButton}
                          onClick={e => {
                            e.stopPropagation()
                            removeFromHistory(entry.hash)
                          }}
                          title="Remove from history"
                        >
                          <FiX size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <InlineLoader
              message="Tracing transaction"
              subtext="This may take a few moments"
              loading={loading}
            />
          </div>

          <span className={styles.createBy}>
            Created by{" "}
            <a href="https://tonstudio.io" target="_blank" rel="noreferrer">
              TON Studio
            </a>
          </span>
        </div>
      )}

      {loading && !result && (
        <div className={styles.inputPage}>
          <InlineLoader
            message="Tracing transaction"
            subtext="This may take a few moments"
            loading={true}
          />
        </div>
      )}

      {result && (
        <div className={styles.traceViewWrapper}>
          <TracePageHeader pageTitle={""} network={result?.network ?? "mainnet"}>
            <div className={styles.searchInputContainer}>
              <SearchInput
                value={headerInputText}
                onChange={setHeaderInputText}
                onSubmit={handleHeaderSubmit}
                placeholder="Trace another transaction hash"
                loading={loading}
                autoFocus={false}
                compact={true}
              />
            </div>

            {shouldShowStatusContainer && (
              <div className={styles.txStatusContainer}>
                {txStatus && <StatusBadge type={txStatus} text={txStatusText} />}
                {stateUpdateHashOk === false && (
                  <TooltipHint
                    tooltipText={
                      "Because the transaction runs in a local sandbox, we can't always reproduce it exactly. Sandbox replay was incomplete, and some values may differ from those on the real blockchain."
                    }
                    placement="bottom"
                  >
                    <StatusBadge type="warning" text="Trace Incomplete" />
                  </TooltipHint>
                )}
              </div>
            )}
          </TracePageHeader>
          <div className={styles.appContainer}>
            <div
              className={`${styles.mainContent} ${detailsExpanded ? styles.mainContentMinimized : ""}`}
            >
              <div data-testid="code-editor-container" style={{flex: "1", position: "relative"}}>
                <Suspense fallback={<InlineLoader message="Loading Editor..." loading={true} />}>
                  <CodeEditor
                    code={result.code}
                    highlightLine={highlightLine}
                    lineGas={gasMap}
                    lineExecutions={executionsMap}
                    onLineClick={findStepByLine}
                    shouldCenter={transitionType === "button"}
                    exitCode={result.exitCode}
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
                placeholderMessage="No trace steps available."
                instructionDetails={instructionDetails}
                cumulativeGas={cumulativeGasSinceBegin}
              />
            </div>
            <div
              className={`${styles.detailsSection} ${detailsExpanded ? styles.detailsSectionExpanded : ""}`}
            >
              <div
                data-testid="details-header"
                className={styles.detailsHeader}
                onClick={toggleDetails}
                onKeyDown={handleDetailsKeyDown}
                role="button"
                tabIndex={0}
              >
                <div className={styles.detailsTitle}>
                  <span>TRANSACTION DETAILS</span>
                </div>
              </div>
              {detailsExpanded && (
                <div data-testid="details-content" className={styles.detailsContent}>
                  <div className={styles.transactionDetailsPanelInTracePage}>
                    <RetraceResultView result={result} />
                  </div>
                </div>
              )}
            </div>
          </div>
          {loading && result && (
            <div className={styles.loadingOverlay}>
              <InlineLoader
                message="Tracing new transaction..."
                subtext="This may take a few moments"
                loading={true}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default TracePage
