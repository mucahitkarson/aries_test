import {getAgent} from "./agent"
import QRCode from "qrcode"
import {Agent, ConnectionEventTypes, ConnectionStateChangedEvent} from "@aries-framework/core";

const run = async () => {
    const agent = await getAgent()
    const schema = await agent.ledger.registerSchema({attributes: ['name', 'age'], name: 'Identity47', version: '1.0'})
    const credentialDefinition = await agent.ledger.registerCredentialDefinition({
        schema,
        supportRevocation: false,
        tag: 'default'
    })
    const outOfBandRecord = await agent.oob.createInvitation()
    const url = outOfBandRecord.outOfBandInvitation.toUrl({domain: 'https://example.org'})
    // @ts-ignore
    QRCode.toString(url, {
        margin: 0,
        width: 500,
        maskPattern: 0,
        type: "terminal",
        errorCorrectionLevel: 'L',
        small: true,
        scale: 1
    }, function (err, url) {
        console.log(url)
    })


    const connectionId = await connectionListener(agent, outOfBandRecord.id)
    await agent.credentials.offerCredential({
        connectionId,
        protocolVersion: 'v1',
        credentialFormats: {
            indy: {
                credentialDefinitionId: credentialDefinition.id,
                attributes: [
                    {name: 'name', value: 'Jane Doe'},
                    {name: 'age', value: '23'},
                ],
            },
        },
    })
}
const connectionListener = (agent: Agent, id: string): Promise<string> => {
    return new Promise((resolve) => {
        agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, ({payload}) => {
            if (payload.connectionRecord.outOfBandId !== id) return
            if (payload.connectionRecord.isReady) {
                resolve(payload.connectionRecord.id)
            }
        })
    })
}
void run()
