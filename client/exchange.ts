/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { mnemonicToWalletKey } from '@ton/crypto';
import {
    Address,
    JettonWallet,
    OpenedContract,
    TonClient,
    WalletContractV4,
    WalletContractV5R1,
    beginCell,
} from '@ton/ton';
import { JettonRoot } from '@dedust/sdk';
import { Asset, PoolType } from '@dedust/sdk';

export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol';

const STON_FI_ADDRESS = Address.parse("EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt");
const TON_VAULT_ADDRESS_STON_FI_V1 = Address.parse("EQARULUYsmJq1RiZ-YiH-IJLcAZUVkVff-KBPwEmmaQGH6aC");
const TON_VAULT_ADDRESS_DEDUST = Address.parse("EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_");

async function runContract() {
    const tonClient = new TonClient({
        endpoint: `https://toncenter.com/api/v2/jsonRPC`,
        apiKey: 'cfab8cceb2bfd94020b3f6e485194fd67818812558006af2f27a6d000e18f5e3'
    });
    let mnemonic =
        'cousin practice sorry elevator carbon model swift raven crowd snack situate glory tone pole rapid country erode glue pumpkin debate wealth meadow metal cool';
    const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });
    console.log(wallet.address)
    const walletContract = tonClient.open(wallet);
    let sender = await walletContract.sender(keyPair.secretKey);

    let tokenAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
    let receiverAddress = wallet.address;
    let CONTRACT_ADDRESS = Address.parse('EQAqbV2UFOGLCQtdUzvp3a0PbXWSSJGGsTcBOwwGdQp5yDxE');
    let stonfiV2PoolAddress = Address.parse('EQAlNk4VwBlVV-sQr0UYe5souU_xbTof54Fd9qewwN1N7pXL')
    let dedustPoolAddress = Address.parse('kQCumVA8El9mjZL6MYOEjWEi4ctS6y9i1g--kIa02_9ZjijP');
    // ======================= send jetton ================================

    const jettonRoot = tonClient.open(JettonRoot.createFromAddress(tokenAddress));
    let jettonWallet: OpenedContract<JettonWallet>;
    jettonWallet = tonClient.open((await jettonRoot.getWallet(CONTRACT_ADDRESS)));

    const GAS_STON_FI_TON_JETTON = 215000000;
    const GAS_STON_FI_JETTON_TON = 260000000;
    const GAS_DEDUST_IO_TON_JETTON = 25000000;

    // dedust jetton vault address calculation
    const tokenVaultAddress = Asset.jetton(tokenAddress);

    // if you want to use stonfi v2 then you have to calculate jettonw wallet address of stonfi router 's target jetton 
    const targetJettonWalletAddressV1 = (await jettonRoot.getWallet(STON_FI_ADDRESS)).address

    const targetJettonWalletAddressV2 = (await jettonRoot.getWallet(stonfiV2PoolAddress)).address
    const ptonAddressV2 = Address.parse('EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S');
    const ptonRootV2 = tonClient.open(JettonRoot.createFromAddress(ptonAddressV2));
    const pTONVaultAddressV2 = (await ptonRootV2.getWallet(stonfiV2PoolAddress)).address;
    const routerAddress = await getRouterFromStonFiV2(stonfiV2PoolAddress, tonClient);

    const messageBody = beginCell()
        .storeUint(0xfa0614af, 32) // opcode for jetton transfer
        .storeUint(0, 64) // query id
        .storeAddress(tokenAddress) //token address CA
        .storeAddress(jettonWallet.address) // smart contract jetton wallet address
        .storeRef(
            //stonfi v1 -> dedust
            beginCell()
                .storeCoins(100000000 + GAS_STON_FI_TON_JETTON) // input_TON_amount + fee
                .storeCoins(1000000) // min_ask_amount
                .storeAddress(targetJettonWalletAddressV1) // stonfi to_jetton_vault_address
                .storeUint(1, 32) // 1: stonfi buy
                // ------------------------------------------------- //
                .storeUint(0, 32) // 0: dedust sell
                .storeRef(
                    beginCell()
                        .storeAddress(tokenVaultAddress.address) // Dedust vault address for this token
                        .storeAddress(dedustPoolAddress) // Dedust pool address
                        .storeAddress(receiverAddress) // receiver Address
                        .storeCoins(0) // min_ask_amount
                        .endCell()
                )
                .endCell()
        ) 

        // .storeRef(
        //     //stonfi v1 example
        //     beginCell()
        //         .storeCoins(100000000 + GAS_STON_FI_TON_JETTON) // input_TON_amount + fee
        //         .storeCoins(44000) // min_ask_amount
        //         .storeAddress(targetJettonWalletAddressV1) // stonfi to_jetton_vault_address
        //         .storeUint(1, 32) // 1: stonfi buy
        //         // ------------------------------------------------- //
        //         .storeUint(1, 32) // 1: stonfi sell
        //         .storeRef(
        //             beginCell()
        //                 .storeAddress(jettonWallet.address) // smart contract jetton wallet address
        //                 .storeAddress(TON_VAULT_ADDRESS_STON_FI_V1) // stonfi to_jetton_vault_address
        //                 .storeAddress(receiverAddress) // receiver Address
        //                 .storeCoins(0) // min_ask_amount
        //                 .endCell()
        //         )
        //         .endCell()
        // )

        // .storeRef(
        //     //dedust example
        //     beginCell()
        //         .storeCoins(100000000 + GAS_STON_FI_TON_JETTON) // input_TON_amount + fee
        //         .storeCoins(0) // min_ask_amount
        //         .storeAddress(dedustPoolAddress) // dedust pool
        //         .storeUint(0, 32) // 0: dedust buy
        //         // ------------------------------------------------- //
        //         .storeUint(0, 32) // 0: dedust sell
        //         .storeRef(
        //             beginCell()
        //                 .storeAddress(tokenVaultAddress.address) // Dedust vault address for this token
        //                 .storeAddress(dedustPoolAddress) // Dedust pool address
        //                 .storeAddress(receiverAddress) // receiver Address
        //                 .storeCoins(0) // min_ask_amount
        //                 .endCell()
        //         )
        //         .endCell()
        // )

        // .storeRef(
        //     beginCell()
        //         .storeCoins(40000000 + GAS_STON_FI_TON_JETTON) //  input_TON_amount + fee
        //         .storeCoins(100000000000000000000000)// min_ask_amount
        //         .storeAddress(targetJettonWalletAddressV2) // to_ston_fi_jetton_vault_address so jetton vault address of pool
        //         .storeUint(2, 32) // 2: stonfi v2
        //         .storeAddress(stonfiV2PoolAddress)
        //         .storeAddress(pTONVaultAddressV2) // pTON vault address of pool 
        //         .storeUint(2, 32) // number of distributeing targets
        //         .storeRef(
        //             beginCell()
        //                 .storeAddress(jettonWallet.address) // jetton wallet address of contract
        //                 .storeAddress(pTONVaultAddressV2) // to_ston_fi_jetton_vault_address pTON wallet address so jetton vault address of pool
        //                 .storeAddress(receiverAddress) // receiver Address
        //                 .storeCoins(0) // min_ask_amount
        //                 .storeRef(
        //                     beginCell()
        //                         .storeAddress(routerAddress) // router_address for stonfi v2 address
        //                         .endCell()
        //                 )
        //                 .endCell()
        //         )
        //         .endCell()
        // )

        .endCell();

    const totalTonAmount = GAS_STON_FI_TON_JETTON + GAS_STON_FI_JETTON_TON + 200000000 + 100000000
    console.log(totalTonAmount / 1000000000);
    // const totalTonAmount = 500000000
    const provider = tonClient.provider(CONTRACT_ADDRESS);
    provider.internal(sender, {
        value: BigInt(totalTonAmount), //min 0.04 TON for gas
        bounce: true,
        body: messageBody
    });

}

async function getRouterFromStonFiV2(stonfiV2PoolAddress: Address, tonClient: TonClient): Promise<Address | undefined>  {
    return tonClient.runMethod(stonfiV2PoolAddress, 'get_pool_data', []).then((res) => {
        const reader = res.stack;
        const routerAddress = reader.skip(1).readAddress();
        return routerAddress;
    });
}

async function drainContractTon() {
    const tonClient = new TonClient({
        endpoint: `https://toncenter.com/api/v2/jsonRPC`,
        apiKey: 'cfab8cceb2bfd94020b3f6e485194fd67818812558006af2f27a6d000e18f5e3'
    });
    let mnemonic =
        'cousin practice sorry elevator carbon model swift raven crowd snack situate glory tone pole rapid country erode glue pumpkin debate wealth meadow metal cool';

    let CONTRACT_ADDRESS = Address.parse('EQAqbV2UFOGLCQtdUzvp3a0PbXWSSJGGsTcBOwwGdQp5yDxE');
    const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });
    const walletContract = tonClient.open(wallet);
    let sender = await walletContract.sender(keyPair.secretKey);
    console.log(sender.address?.toString());
    // ======================= send jetton ================================

    const messageBody = beginCell()
        .storeUint(0xfa1992af, 32) // opcode for jetton transfer
        .storeUint(0, 64) // query id
        .storeRef(
            beginCell()
                .storeUint(0x18, 6)           // ihr_disabled = true
                .storeAddress(wallet.address)     // destination
                .storeCoins(786000000)             // ton amount to send. type in contract balance to drain
                .storeUint(1, 107)
                .storeRef(
                    beginCell().endCell()
                )
                .endCell()
        )
        .endCell();

    const totalTonAmount = 100000000
    const provider = tonClient.provider(CONTRACT_ADDRESS);
    provider.internal(sender, {
        value: BigInt(totalTonAmount), //min 0.04 TON for gas
        bounce: true,
        body: messageBody
    });
}

async function drainContractJetton() {
    const tonClient = new TonClient({
        endpoint: `https://testnet.toncenter.com/api/v2/jsonRPC`,
        apiKey: 'cfab8cceb2bfd94020b3f6e485194fd67818812558006af2f27a6d000e18f5e3'
    });
    let mnemonic =
        'cousin practice sorry elevator carbon model swift raven crowd snack situate glory tone pole rapid country erode glue pumpkin debate wealth meadow metal cool';

    let tokenAddress = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
    let CONTRACT_ADDRESS = Address.parse('EQAqbV2UFOGLCQtdUzvp3a0PbXWSSJGGsTcBOwwGdQp5yDxE');
    const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });
    const walletContract = tonClient.open(wallet);
    let sender = await walletContract.sender(keyPair.secretKey);

    // ======================= send jetton ================================


    // const jettonRoot = tonClient.open(JettonRoot.createFromAddress(tokenAddress));
    // let jettonWallet: OpenedContract<JettonWallet>;
    // jettonWallet = tonClient.open(await jettonRoot.getWallet(CONTRACT_ADDRESS));


    const messageBody = beginCell()
        .storeUint(0xfa1992af, 32) // opcode for jetton transfer
        .storeUint(0, 64) // query id
        .storeRef(
            beginCell()
                .storeUint(0x10, 6)           // ihr_disabled = true
                .storeAddress(Address.parse("EQAyolll8oMgeAbV3NGmfEhL-anJLXFDurpFioms9aLYjJa-"))     // destination
                .storeCoins(1)          // sending jetton amount from contract
                .storeUint(1, 107)           // no body
                .storeRef(
                    beginCell()
                        .storeUint(0xf8a7ea5, 32)
                        .storeUint(0, 64)
                        .storeCoins(1162370) // jetton amount to send to me, input jetton balance here to drain
                        .storeAddress(wallet.address)
                        .storeAddress(wallet.address)
                        .storeUint(0, 1)
                        .storeCoins(1)
                        .storeUint(1, 1)
                        .storeRef(
                            beginCell()
                                .storeUint(0, 32)
                                .storeStringTail('ABC') // comment so memo
                                .endCell()
                        )
                        .storeUint(0, 32)
                        .endCell()
                )
                .endCell()
        )
        .endCell();

    const totalTonAmount = 100000000
    const provider = tonClient.provider(CONTRACT_ADDRESS);
    provider.internal(sender, {
        value: BigInt(totalTonAmount), //min 0.04 TON for gas
        bounce: true,
        body: messageBody
    });
}
(async () => {
    // await runContract();
    await drainContractJetton();
    // console.log(Cell.fromHex("b5ee9c720101010100240000438008519ee154a36f98863d5ce0f85f60195a1339e8f9a2b5f3ca0b51e8847a890670").asSlice().loadAddress().toString())
})();
