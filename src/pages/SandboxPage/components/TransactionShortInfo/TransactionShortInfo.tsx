import {Address, type ExternalAddress} from "@ton/core"

import React from "react"
import type {Maybe} from "@ton/core/dist/utils/maybe"

import {ContractChip, OpcodeChip} from "@app/pages/SandboxPage/components"
import {formatCurrency} from "@shared/lib/format"
import {findOpcodeABI, type TransactionInfo} from "@features/sandbox/lib/transaction.ts"
import type {ContractData} from "@features/sandbox/lib/contract.ts"
import {type ParsedObjectByABI, parseSliceWithAbiType} from "@features/sandbox/lib/abi/parser.ts"
import {ParsedDataView} from "@features/sandbox/ui/abi"

import styles from "./TransactionShortInfo.module.css"

const formatAddress = (
  address: Address | Maybe<ExternalAddress> | undefined,
  contracts: Map<string, ContractData>,
  onContractClick?: (address: string) => void,
): React.ReactNode => {
  if (!address) {
    return (
      <ContractChip address={undefined} contracts={contracts} onContractClick={onContractClick} />
    )
  }

  return (
    <ContractChip
      address={address.toString()}
      contracts={contracts}
      onContractClick={onContractClick}
    />
  )
}

export interface TransactionShortInfoProps {
  readonly tx: TransactionInfo
  readonly contracts: Map<string, ContractData>
  readonly onContractClick?: (address: string) => void
}

export function TransactionShortInfo({tx, contracts, onContractClick}: TransactionShortInfoProps) {
  if (tx.transaction.description.type !== "generic") {
    throw new Error(
      "TxTracer doesn't support non-generic transaction. Given type: " +
        tx.transaction.description.type,
    )
  }

  const computeInfo = tx.computeInfo
  const abiType = findOpcodeABI(tx, contracts)

  let inMsgBodyParsed: ParsedObjectByABI | undefined = undefined
  const contract = contracts.get(tx.address?.toString() ?? "")
  const slice = tx.transaction.inMessage?.body?.asSlice()
  if (slice && abiType) {
    if (slice.remainingBits >= 32) {
      slice.loadUint(32) // skip opcode
    }
    inMsgBodyParsed = parseSliceWithAbiType(slice, abiType, contract?.meta?.abi?.types ?? [])
  }

  const formatBoolean = (v: boolean) => (
    <span className={v ? styles.booleanTrue : styles.booleanFalse}>{v ? "Yes" : "No"}</span>
  )

  return (
    <div className={styles.transactionDetailsContainer}>
      <div className={styles.detailRow}>
        <div className={styles.detailLabel}>Message Route</div>
        <div className={styles.detailValue}>
          {formatAddress(tx.transaction.inMessage?.info?.src, contracts, onContractClick)}
          {" → "}
          {formatAddress(tx.transaction.inMessage?.info?.dest, contracts, onContractClick)}
        </div>
      </div>

      {tx.amount && (
        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Value</div>
          <div className={styles.detailValue}>{formatCurrency(tx.amount)}</div>
        </div>
      )}

      <div className={styles.detailRow}>
        <div className={styles.detailLabel}>Out Messages</div>
        <div className={styles.detailValue}>
          <span className={styles.numberValue}>{tx.transaction.outMessagesCount}</span>
        </div>
      </div>

      <div className={styles.labeledSectionRow}>
        <div className={styles.labeledSectionTitle}>Message Data</div>
        <div className={styles.labeledSectionContent}>
          <div className={styles.multiColumnRow}>
            <div className={styles.multiColumnItem}>
              <div className={styles.multiColumnItemTitle}>Opcode</div>
              <div className={styles.multiColumnItemValue}>
                <OpcodeChip opcode={tx.opcode} abiName={abiType?.name} />
              </div>
            </div>
          </div>
          {inMsgBodyParsed && (
            <div className={styles.multiColumnItemValue}>
              <div className={styles.multiColumnItemTitle}>Parsed Data:</div>
              <div className={styles.parsedDataContent}>
                <ParsedDataView data={inMsgBodyParsed} contracts={contracts} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.labeledSectionRow}>
        <div className={styles.labeledSectionTitle}>Compute Phase</div>
        <div className={styles.labeledSectionContent}>
          {computeInfo === "skipped" ? (
            <div className={styles.multiColumnItemValue}>Skipped</div>
          ) : (
            <div className={styles.multiColumnRow}>
              <div className={styles.multiColumnItem}>
                <div className={styles.multiColumnItemTitle}>Success</div>
                <div className={styles.multiColumnItemValue}>
                  {formatBoolean(computeInfo?.success ?? false)}
                </div>
              </div>
              <div className={styles.multiColumnItem}>
                <div className={styles.multiColumnItemTitle}>Exit Code</div>
                <div className={`${styles.multiColumnItemValue} ${styles.numberValue}`}>
                  {computeInfo?.exitCode}
                </div>
              </div>
              <div className={styles.multiColumnItem}>
                <div className={styles.multiColumnItemTitle}>VM Steps</div>
                <div className={`${styles.multiColumnItemValue} ${styles.numberValue}`}>
                  {computeInfo?.vmSteps}
                </div>
              </div>
              <div className={styles.multiColumnItem}>
                <div className={styles.multiColumnItemTitle}>Gas Used</div>
                <div className={`${styles.multiColumnItemValue} ${styles.gasValue}`}>
                  {computeInfo?.gasUsed}
                </div>
              </div>
              <div className={styles.multiColumnItem}>
                <div className={styles.multiColumnItemTitle}>Gas Fees</div>
                <div className={`${styles.multiColumnItemValue} ${styles.gasValue}`}>
                  {formatCurrency(computeInfo?.gasFees)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
