import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode } from '@ton/core';

const PREFIX_SIZE = 64;
export type ExchangeConfig = {
    owner_address: Address,
};

export function exchangeConfigToCell(config: ExchangeConfig): Cell {
    const dict = Dictionary.empty(Dictionary.Keys.Buffer(PREFIX_SIZE / 8), Dictionary.Values.Cell());
    return beginCell()
        .storeAddress(config.owner_address)
        .storeDict(dict)
        .endCell()
}

export const Opcodes = {
    increase: 0x7e8764ef,
};

export class Exchange implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Exchange(address);
    }

    static createFromConfig(config: ExchangeConfig, code: Cell, workchain = 0) {
        const data = exchangeConfigToCell(config);
        const init = { code, data };
        return new Exchange(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            increaseBy: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async getCounter(provider: ContractProvider) {
        const result = await provider.get('get_counter', []);
        return result.stack.readNumber();
    }

    async getID(provider: ContractProvider) {
        const result = await provider.get('get_id', []);
        return result.stack.readNumber();
    }
}
