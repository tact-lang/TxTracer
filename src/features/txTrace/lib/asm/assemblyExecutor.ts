import {runtime as i, text} from "ton-assembly/dist"
import type {Address, Contract, ContractProvider, Sender, StateInit, TupleReader} from "@ton/core"
import {Cell, contractAddress, toNano, TupleBuilder} from "@ton/core"
import {GetMethodError, type SandboxContract, type TreasuryContract} from "@ton/sandbox"
import {Blockchain} from "@ton/sandbox"
import {createMappingInfo, type MappingInfo} from "ton-assembly/dist/trace/mapping"

export const executeInstructions = async (
  codeCell: Cell,
  id: number = 0,
): Promise<[TupleReader, string]> => {
  class TestContract implements Contract {
    public readonly address: Address
    public readonly init?: StateInit

    public constructor(address: Address, init?: StateInit) {
      this.address = address
      this.init = init
    }

    public async send(
      provider: ContractProvider,
      via: Sender,
      args: {value: bigint; bounce?: boolean | null | undefined},
      body: Cell,
    ) {
      await provider.internal(via, {...args, body: body})
    }

    public async getAny(provider: ContractProvider, id: number): Promise<[TupleReader, string]> {
      const builder = new TupleBuilder()
      const res = await provider.get(id, builder.build())

      // @ts-expect-error TS2551
      return [res.stack, res.vmLogs]
    }
  }

  const blockchain: Blockchain = await Blockchain.create()
  blockchain.verbosity.print = false
  blockchain.verbosity.vmLogs = "vm_logs_verbose"
  const treasure: SandboxContract<TreasuryContract> = await blockchain.treasury("treasure")

  const init: StateInit = {
    code: codeCell,
    data: new Cell(),
  }

  const address = contractAddress(0, init)
  const contract = new TestContract(address, init)

  const openContract = blockchain.openContract(contract)

  // Deploy
  await openContract.send(
    treasure.getSender(),
    {
      value: toNano("10"),
    },
    new Cell(),
  )

  const [stack, vmLogs] = await openContract.getAny(id)
  return [stack, vmLogs]
}

export interface AssemblyExecutionResult {
  readonly stack: TupleReader
  readonly vmLogs: string
  readonly instructions: i.Instr[]
  readonly code: string
  readonly success: boolean
  readonly error?: string
  readonly mappingInfo: MappingInfo | null
}

export const executeAssemblyCode = async (
  assemblyCode: string,
): Promise<AssemblyExecutionResult> => {
  const parseResult = text.parse("playground.tasm", assemblyCode)

  if (parseResult.$ === "ParseFailure") {
    return {
      stack: {items: [], remaining: 0} as unknown as TupleReader,
      vmLogs: "",
      instructions: [],
      code: assemblyCode,
      success: false,
      error: `Parse error: ${parseResult.error.message}`,
      mappingInfo: null,
    }
  }

  const [codeCell, mapping] = i.compileCellWithMapping(parseResult.instructions)
  const mappingInfo = createMappingInfo(mapping)

  try {
    const [stack, vmLogs] = await executeInstructions(codeCell)

    return {
      stack,
      vmLogs,
      instructions: parseResult.instructions,
      code: assemblyCode,
      success: true,
      mappingInfo,
    }
  } catch (error: unknown) {
    if (error instanceof GetMethodError) {
      return {
        stack: {items: [], remaining: 0} as unknown as TupleReader,
        vmLogs: error.vmLogs,
        instructions: parseResult.instructions,
        code: assemblyCode,
        success: true,
        mappingInfo,
        error: undefined,
      }
    }

    throw error
  }
}
