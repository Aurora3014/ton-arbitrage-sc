import { Address, toNano } from '@ton/core';
import { Exchange } from '../wrappers/Exchange';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const senderAddress = provider.sender()?.address;
    const exchange = provider.open(
        Exchange.createFromConfig(
            {
                owner_address: senderAddress!,
            },
            await compile('Exchange')
        )
    );

    await exchange.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(exchange.address);

}
