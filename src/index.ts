import {getAgent} from "./agent"
import QRCode from "qrcode"
import {Agent, ConnectionEventTypes, ConnectionStateChangedEvent} from "@aries-framework/core";

const run = async () => {
    const agent = await getAgent()
    const schema = await agent.ledger.registerSchema({attributes: ['name', 'age'], name: 'Identity17', version: '1.0'})
    const credentialDefinition = await agent.ledger.registerCredentialDefinition({
        schema,
        supportRevocation: false,
        tag: 'default'
    })
    const outOfBandRecord = await agent.oob.createInvitation()
    // const {outOfBandRecord,invitation} = await agent.oob.createLegacyInvitation()
    const url = outOfBandRecord.outOfBandInvitation.toUrl({domain: 'https://example.org'})

    QRCode.toString(url, {height: 1020}, function (err, base64image) {
        console.log(base64image)
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
