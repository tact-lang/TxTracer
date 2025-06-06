import {retrace, retraceBaseTx} from "@tonstudio/txtracer-core"
import type {TraceResult} from "@tonstudio/txtracer-core/dist/types"
import {decompileCell, compileCellWithMapping} from "ton-assembly/dist/runtime/instr"
import {
  createMappingInfo,
  type MappingInfo,
  type InstructionInfo,
} from "ton-assembly/dist/trace/mapping"
import {type Step} from "ton-assembly/dist/trace"
import {createTraceInfoPerTransaction, findInstructionInfo} from "ton-assembly/dist/trace/trace"
import {print, parse} from "ton-assembly/dist/text"
import * as l from "ton-assembly/dist/logs"

import type {RetraceResultAndCode, NetworkType} from "@features/txTrace/ui"

import {
  type ExtractionResult,
  extractTxInfoFromLink,
  SingleHash,
} from "@features/txTrace/lib/links.ts"

import {
  TxNotFoundError,
  NetworkError,
  TxTraceError,
  TooManyRequests,
  TxHashInvalidError,
} from "./errors"

export type ExitCode = {
  readonly num: number
  readonly description: string
  readonly info: undefined | InstructionInfo
}

async function retraceAny(info: ExtractionResult): Promise<TraceResult> {
  if (info.$ === "BaseInfo") {
    return retraceBaseTx(info.testnet, info.info)
  }
  if (info.$ === "SingleHash") {
    return retrace(info.testnet, info.hash)
  }

  throw new Error("Invalid extraction result")
}

async function maybeTestnet(link: string): Promise<{result: TraceResult; network: NetworkType}> {
  const txLinkInfo = extractTxInfoFromLink(link)
  if (txLinkInfo === undefined && link.startsWith("https://")) {
    throw new Error("Unsupported link format: " + link)
  }

  try {
    await wait(500) // rate limit
    const result = await retraceAny(txLinkInfo ?? SingleHash(link, false))
    return {result, network: "mainnet"}
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Cannot find transaction info")) {
      console.log("Cannot find in mainnet, trying to find in testnet")
      await wait(500) // rate limit
      const result = await retraceAny(txLinkInfo ?? SingleHash(link, true))
      return {result, network: "testnet"}
    }
    throw error
  }
}

async function doTrace(link: string) {
  try {
    return await maybeTestnet(link)
  } catch (e: unknown) {
    let message = "An unknown error occurred."
    if (e instanceof Error) {
      message = e.message
    } else if (e !== null && e !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      message = String(e)
    }

    if (/status code 429/i.test(message)) {
      throw new TooManyRequests(undefined, e)
    }

    if (/status code 422/i.test(message)) {
      throw new TxHashInvalidError(undefined, e)
    }

    if (/not found/i.test(message)) {
      throw new TxNotFoundError(undefined, e)
    }

    if (/network|fetch|timeout/i.test(message)) {
      throw new NetworkError(undefined, e)
    }

    throw new TxTraceError(message, e)
  }
}

export function findException(reversedEntries: l.VmLine[]) {
  const mapped = reversedEntries.map(it => {
    if (it.$ === "VmExceptionHandler") {
      return {
        text: ``, // default case, no further explanations
        num: it.errno,
      }
    }
    if (it.$ === "VmUnknown") {
      if (it.text.includes("unhandled out-of-gas exception")) {
        return {text: it.text, num: -14}
      }
    }
    return undefined
  })
  return mapped.find(it => it !== undefined)
}

export function findExitCode(vmLogs: string, mappingInfo: MappingInfo) {
  const res = l.parse(vmLogs)
  const reversedEntries = [...res].reverse()
  const description = findException(reversedEntries)
  if (description === undefined) {
    return undefined // no exception found
  }

  // find the last position before exception
  const loc = reversedEntries.find(it => it.$ === "VmLoc")
  const info = findInstructionInfo(mappingInfo, {
    hash: loc?.hash?.toLowerCase() ?? "",
    offset: loc?.offset ?? 0,
    stack: [],
    gas: 0,
    gasCost: 0,
  })

  if (info === undefined) {
    return undefined
  }

  const [instructionsInfo, index] = info

  const exitCode: ExitCode = {
    info: instructionsInfo[index],
    description: description.text,
    num: description.num,
  }

  return exitCode
}

function extractCodeAndTrace(result: TraceResult) {
  if (!result.codeCell) {
    return {code: "// No executable code found", traceInfo: {steps: []}}
  }

  const instructions = decompileCell(result.codeCell)
  const code = print(instructions)

  const instructionsWithPositions = parse("out.tasm", code)
  if (instructionsWithPositions.$ === "ParseFailure") {
    return {code: code, traceInfo: {steps: []}, exitCode: undefined}
  }

  const vmLogs = result.emulatedTx.vmLogs
  const [, mapping] = compileCellWithMapping(instructionsWithPositions.instructions)
  const mappingInfo = createMappingInfo(mapping)
  const traceInfo = createTraceInfoPerTransaction(vmLogs, mappingInfo, undefined)[0]

  const exitCode = findExitCode(vmLogs, mappingInfo)
  if (exitCode === undefined) {
    return {code, exitCode: undefined, traceInfo}
  }

  return {code, exitCode, traceInfo}
}

export async function traceTx(link: string): Promise<RetraceResultAndCode> {
  const {result, network} = await doTrace(link)
  const {code, traceInfo, exitCode} = extractCodeAndTrace(result)
  return {result, code, trace: traceInfo, exitCode, network}
}

export function normalizeGas(step: Step) {
  if (step.gasCost > 5000) {
    return 26
  }
  return step.gasCost
}

async function wait(delay: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, delay))
}
