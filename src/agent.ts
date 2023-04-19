import {
    Agent,
    AutoAcceptCredential,
    HttpOutboundTransport,
    InitConfig,
    WsOutboundTransport
} from "@aries-framework/core";
import {agentDependencies, HttpInboundTransport} from "@aries-framework/node";
import fetch from "node-fetch";

const getGenesisTransaction = async (url: string) => {
    // Legacy code has a small issue with the call-signature from node-fetch
    // @ts-ignore
    const response = await fetch(url)

    return await response.text()
}

export const getAgent = async () => {
    const genesisTransactionsBCovrinTestNet = await getGenesisTransaction('http://161.97.126.23:9000/genesis')
    // Simple agent configuration. This sets some basic fields like the wallet
    // configuration and the label.
    const config: InitConfig = {
        label: 'demo-agent-issuer',
        walletConfig: {
            id: 'agent1',
            key: 'pagent1',
        },
        publicDidSeed: '000000000000000000000000Trustee9',
        indyLedgers: [
            {
                id: 'bcovrin-test-net',
                isProduction: false,
                indyNamespace: 'bcovrin:test',
                genesisTransactions: genesisTransactionsBCovrinTestNet,
            },
        ],
        autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
        autoAcceptConnections: true,
        endpoints: ['http://localhost:3001'],
    }

    // A new instance of an agent is created here
    const agent = new Agent({config, dependencies: agentDependencies})

    // Register a simple `WebSocket` outbound transport
    agent.registerOutboundTransport(new WsOutboundTransport())

    // Register a simple `Http` outbound transport
    agent.registerOutboundTransport(new HttpOutboundTransport())

    // Register a simple `Http` inbound transport
    agent.registerInboundTransport(new HttpInboundTransport({port: 3001}))

    // Initialize the agent
    await agent.initialize()

    return agent
}
