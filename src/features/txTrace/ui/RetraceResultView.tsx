import React, {useState} from "react"

import {type TraceInfo} from "ton-assembly/dist/trace"

import type {TraceResult} from "@tonstudio/txtracer-core/dist/types"

import type {OutAction} from "@entities/transaction"

import {VMLogsView} from "@features/txTrace/ui/index.ts"

import type {ExitCode} from "@features/txTrace/lib/traceTx.ts"

import TransactionDetailsTable from "./TransactionDetailsTable"
import ActionsList from "./ActionsList"
import ActionModal from "./ActionModal"

export type NetworkType = "mainnet" | "testnet"

export interface RetraceResultAndCode {
  readonly result: TraceResult
  readonly code: string
  readonly trace: TraceInfo
  readonly exitCode: ExitCode | undefined
  readonly network: NetworkType
}

interface RetraceResultViewProps {
  readonly result: RetraceResultAndCode
}

const RetraceResultViewFc: React.FC<RetraceResultViewProps> = ({result}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const handleSelect = (idx: number) => setSelectedIdx(idx)
  const closeModal = () => setSelectedIdx(null)

  const selectedAction: OutAction | null =
    selectedIdx !== null ? result.result.emulatedTx.actions[selectedIdx] : null

  return (
    <div className="retrace-result-container">
      {/* details table */}
      <TransactionDetailsTable data={result} />

      <div className="actions-section">
        <h3 className="actions-heading">Out Actions ({result.result.emulatedTx.actions.length})</h3>
        <ActionsList actions={result.result.emulatedTx.actions} onSelect={handleSelect} />
      </div>

      {/* modal */}
      <ActionModal
        action={selectedAction}
        index={selectedIdx ?? 0}
        contractAddress={result.result.inMsg.contract}
        onClose={closeModal}
      />

      {result.result.emulatedTx.vmLogs && (
        <VMLogsView
          title="VM Logs"
          logs={result.result.emulatedTx.vmLogs}
          isExpandable={true}
          defaultExpanded={false}
        />
      )}

      {result.result.emulatedTx.executorLogs && (
        <VMLogsView
          title="Executor Logs"
          logs={result.result.emulatedTx.executorLogs}
          isExpandable={true}
          defaultExpanded={false}
        />
      )}
    </div>
  )
}

export const RetraceResultView = React.memo(RetraceResultViewFc)
RetraceResultView.displayName = "RetraceResultView"
