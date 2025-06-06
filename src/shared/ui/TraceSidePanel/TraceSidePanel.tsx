import React from "react"

import type {StackElement} from "ton-assembly/dist/logs"

import Button from "@shared/ui/Button"
import StackViewer from "@shared/ui/StackViewer"
import StepInstructionBlock, {
  type InstructionDetail,
} from "@features/txTrace/ui/StepInstructionBlock"

import styles from "./TraceSidePanel.module.css"

export interface TraceSidePanelProps {
  readonly selectedStep?: number
  readonly totalSteps?: number
  readonly currentStep?: {
    instructionName: string
    gasCost?: number
    gasUsed?: number
  }
  readonly currentStack?: readonly StackElement[]

  readonly canGoPrev?: boolean
  readonly canGoNext?: boolean
  readonly onPrev?: () => void
  readonly onNext?: () => void
  readonly onFirst?: () => void
  readonly onLast?: () => void

  readonly instructionDetails?: InstructionDetail[]
  readonly cumulativeGas?: number
  readonly showGas?: boolean

  readonly placeholderMessage?: string
  readonly statusMessage?: string
}

const TraceSidePanel: React.FC<TraceSidePanelProps> = ({
  selectedStep = 0,
  totalSteps = 0,
  currentStep,
  currentStack = [],
  canGoPrev = false,
  canGoNext = false,
  onPrev = () => {},
  onNext = () => {},
  onFirst = () => {},
  onLast = () => {},
  instructionDetails = [],
  cumulativeGas,
  showGas = false,
  placeholderMessage,
  statusMessage,
}) => {
  const hasData = totalSteps > 0 && currentStep

  return (
    <div className={styles.sidePanel}>
      <div className={styles.stepDetails}>
        <div className={styles.stepHeader}>
          <div className={styles.stepHeaderTop}>
            <span className={styles.stepCounter}>
              {hasData
                ? `Step ${selectedStep + 1} of ${totalSteps}`
                : placeholderMessage || "Ready"}
            </span>
            {showGas && cumulativeGas !== undefined && (
              <span className={styles.cumulativeGasCounter}>Used gas: {cumulativeGas}</span>
            )}
            {statusMessage && <span className={styles.statusMessage}>{statusMessage}</span>}
          </div>

          {/* StepInstructionBlock for TracePage */}
          {instructionDetails.length > 0 && (
            <StepInstructionBlock
              steps={instructionDetails}
              currentIndex={selectedStep}
              itemHeight={32}
            />
          )}

          {/* Simple instruction block */}
          {instructionDetails.length === 0 && (
            <div className={styles.stepInstructionBlock}>
              <span className={styles.stepInstruction}>
                {currentStep?.instructionName ||
                  placeholderMessage ||
                  "Click Execute to run assembly code"}
              </span>
              {currentStep?.gasCost && showGas && (
                <span className={styles.stepGas}>{currentStep.gasCost} gas</span>
              )}
              {currentStep?.gasUsed && currentStep.gasUsed > 0 && !showGas && (
                <span className={styles.stepGas}>{currentStep.gasUsed} gas</span>
              )}
            </div>
          )}

          <div className={styles.navigationControls}>
            <Button
              variant="ghost"
              onClick={onFirst}
              className={styles.navButton}
              disabled={!canGoPrev || totalSteps === 0}
              title="Go to First Step"
            >
              First
            </Button>
            <Button
              variant="ghost"
              onClick={onPrev}
              className={styles.navButton}
              disabled={!canGoPrev || totalSteps === 0}
              title="Previous Step"
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              onClick={onNext}
              className={styles.navButton}
              disabled={!canGoNext || totalSteps === 0}
              title="Next Step"
            >
              Next
            </Button>
            <Button
              variant="ghost"
              onClick={onLast}
              className={styles.navButton}
              disabled={!canGoNext || totalSteps === 0}
              title="Go to Last Step"
            >
              Last
            </Button>
          </div>
        </div>
        <div className={styles.stackViewerContainer}>
          <StackViewer stack={currentStack} title="Stack" />
        </div>
      </div>
    </div>
  )
}

export default TraceSidePanel
