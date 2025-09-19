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
    let targetAddress = Address.parse('EQAqbV2UFOGLCQtdUzvp3a0PbXWSSJGGsTcBOwwGdQp5yDxE');
    // let stonfiV2PoolAddress = Address.parse('EQAlNk4VwBlVV-sQr0UYe5souU_xbTof54Fd9qewwN1N7pXL')
    let dedustPoolAddress = Address.parse('EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r');
    // ======================= send jetton ================================

    const jettonRoot = tonClient.open(JettonRoot.createFromAddress(tokenAddress));
    let jettonWallet: OpenedContract<JettonWallet>;
    // jettonWallet = tonClient.open((await jettonRoot.getWallet(targetAddress)));

    const GAS_STON_FI_TON_JETTON = 215000000;
    const GAS_STON_FI_JETTON_TON = 260000000;
    const GAS_DEDUST_IO_TON_JETTON = 25000000;

    // if you want to use stonfi v2 then you have to calculate jettonw wallet address of stonfi router 's target jetton 
    // const targetJettonWalletAddressV2 = (await jettonRoot.getWallet(stonfiV2PoolAddress)).address
    // const targetJettonWalletAddressV1 = (await jettonRoot.getWallet(STON_FI_ADDRESS)).address
    const messageBody = beginCell()
        .storeUint(0xfa0614af, 32) // opcode for jetton transfer
        .storeUint(0, 64) // query id
        .storeAddress(tokenAddress) //token address CA
        .storeAddress(Address.parse("UQAyolll8oMgeAbV3NGmfEhL-anJLXFDurpFioms9aLYjMt7")) // smart contract jetton wallet address
        .storeRef(
            //stonfi v1 -> dedust
            beginCell()
                .storeCoins(100000000 + GAS_STON_FI_TON_JETTON) // input_TON_amount + fee
                .storeCoins(1000000) // min_ask_amount
                .storeAddress(Address.parse("EQBO7JIbnU1WoNlGdgFtScJrObHXkBp-FT5mAz8UagiG9KQR")) // stonfi to_jetton_vault_address
                .storeUint(1, 32) // 1: stonfi buy
                // ------------------------------------------------- //
                .storeUint(0, 32) // 0: dedust sell
                .storeRef(
                    beginCell()
                        .storeAddress(Address.parse("EQAYqo4u7VF0fa4DPAebk4g9lBytj2VFny7pzXR0trjtXQaO")) // Dedust vault address for this token
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
        //         .storeAddress(Address.parse("kQCumVA8El9mjZL6MYOEjWEi4ctS6y9i1g--kIa02_9ZjijP")) // dedust pool
        //         .storeUint(0, 32) // 0: dedust buy
        //         // ------------------------------------------------- //
        //         .storeUint(0, 32) // 0: dedust sell
        //         .storeRef(
        //             beginCell()
        //                 .storeAddress(Address.parse("kQA2exota_7Turb2UKrt6MgDgkn2pFdC0yWmWDoEZJp0b_MA")) // Dedust vault address for this token
        //                 .storeAddress(Address.parse("kQCumVA8El9mjZL6MYOEjWEi4ctS6y9i1g--kIa02_9ZjijP")) // Dedust pool address
        //                 .storeAddress(receiverAddress) // receiver Address
        //                 .storeCoins(0) // min_ask_amount
        //                 // .storeRef(
        //                 //     beginCell()
        //                 //         .storeAddress('router_address') // router_address for stonfi v2 address
        //                 //         .endCell()
        //                 // )
        //                 .endCell()
        //         )
        //         .endCell()
        // )

        // .storeRef(
        //     beginCell()
        //         .storeCoins(40000000 + GAS_STON_FI_TON_JETTON) //  input_TON_amount + fee
        //         .storeCoins(100000000000000000000000)// min_ask_amount
        //         .storeAddress(Address.parse('EQAEfVGA4DRRml_z_MtEK8W8TaPLPwjRdNsSLJJLMOw0muo0')) // to_ston_fi_jetton_vault_address so jetton vault address of pool
        //         .storeUint(2, 32) // 2: stonfi v2
        //         .storeAddress(stonfiV2PoolAddress)
        //         .storeAddress(Address.parse("EQACuz151snlY46PKdUOkyiCf0zzcxMsN6XmKQkSKZjkvyFH")) // pTON vault address of pool 
        //         .storeUint(2, 32) // number of distributeing targets
        //         .storeRef(
        //             beginCell()
        //                 .storeAddress(jettonWallet.address) // jetton wallet address of contract
        //                 .storeAddress(Address.parse("EQACuz151snlY46PKdUOkyiCf0zzcxMsN6XmKQkSKZjkvyFH")) // to_ston_fi_jetton_vault_address pTON wallet address so jetton vault address of pool
        //                 .storeAddress(receiverAddress) // receiver Address
        //                 .storeCoins(0) // min_ask_amount
        //                 .storeRef(
        //                     beginCell()
        //                         .storeAddress(Address.parse("0:031053133270be82ee6fd94d1963c0186868403a4f537040a0d533aab805b7af")) // router_address for stonfi v2 address
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
    const provider = tonClient.provider(targetAddress);
    provider.internal(sender, {
        value: BigInt(totalTonAmount), //min 0.04 TON for gas
        bounce: true,
        body: messageBody
    });

}

async function drainContractTon() {
    const tonClient = new TonClient({
        endpoint: `https://toncenter.com/api/v2/jsonRPC`,
        apiKey: 'cfab8cceb2bfd94020b3f6e485194fd67818812558006af2f27a6d000e18f5e3'
    });
    let mnemonic =
        'cousin practice sorry elevator carbon model swift raven crowd snack situate glory tone pole rapid country erode glue pumpkin debate wealth meadow metal cool';

    let targetAddress = Address.parse('EQAnQBowG0JIV_qMvbBk9OlFgiR0I9Fda6EEDLoBLTesrCxT');
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
                .storeCoins(470000000)             // ton amount to send. type in contract balance to drain
                .storeUint(1, 107)
                .storeRef(
                    beginCell().endCell()
                )
                .endCell()
        )
        .endCell();

    const totalTonAmount = 100000000
    const provider = tonClient.provider(targetAddress);
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
        'spray myth congress index enough gadget topple forward cancel nose remind bird below setup knife cliff sea inflict coast prize dinner purity horror sun';

    let tokenAddress = Address.parse('kQBig-ypUlf0m1GUzzuJOSM1JU4Gq1IgNbT9Spsw3EQ5ivO7');
    let targetAddress = Address.parse('EQCbEw_i6TNKzARRYsBIsMIcLHvBDrpcA5AxVyEQs9Ux_qbO');
    const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });
    const walletContract = tonClient.open(wallet);
    let sender = await walletContract.sender(keyPair.secretKey);

    // ======================= send jetton ================================


    const jettonRoot = tonClient.open(JettonRoot.createFromAddress(tokenAddress));
    let jettonWallet: OpenedContract<JettonWallet>;
    jettonWallet = tonClient.open(await jettonRoot.getWallet(targetAddress));


    const messageBody = beginCell()
        .storeUint(0xfa1992af, 32) // opcode for jetton transfer
        .storeUint(0, 64) // query id
        .storeRef(
            beginCell()
                .storeUint(0x10, 6)           // ihr_disabled = true
                .storeAddress(jettonWallet.address)     // destination
                .storeCoins(200000000)          // sending jetton amount from contract
                .storeUint(1, 107)           // no body
                .storeRef(
                    beginCell()
                        .storeUint(0xf8a7ea5, 32)
                        .storeUint(0, 64)
                        .storeCoins(4093) // jetton amount to send to me, input jetton balance here to drain
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

    const totalTonAmount = 500000000
    const provider = tonClient.provider(targetAddress);
    provider.internal(sender, {
        value: BigInt(totalTonAmount), //min 0.04 TON for gas
        bounce: true,
        body: messageBody
    });
}
(async () => {
    await runContract();
    // await drainContractTon();
    // console.log(Cell.fromHex("b5ee9c720101010100240000438008519ee154a36f98863d5ce0f85f60195a1339e8f9a2b5f3ca0b51e8847a890670").asSlice().loadAddress().toString())
})();
