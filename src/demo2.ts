import {
    InitConfig,
    Agent,
    WsOutboundTransport,
    HttpOutboundTransport,
    ConnectionEventTypes,
    ConnectionStateChangedEvent,
    DidExchangeState,
    AutoAcceptCredential,
    CredentialEventTypes,
    CredentialState,
    CredentialStateChangedEvent,
    OutOfBandRecord,
    V1CredentialPreview,
    ProofAttributeInfo,
    AttributeFilter,
    ProofEventTypes,
    ProofStateChangedEvent,
    ProofState,
    RequestedCredentials,
    AutoAcceptProof,
    CredentialExchangeRecord,
} from "@aries-framework/core";
import {agentDependencies, HttpInboundTransport} from "@aries-framework/node";
import {Schema} from "indy-sdk";
import fetch from "node-fetch";
import {faker} from "@faker-js/faker";
import inquirer from "inquirer";
import {clear} from "console";

//=========== START AGENT ===========

const getGenesisTransaction = async (url: string) => {
    const response = await fetch(url);

    return await response.text();
};

const initializeHolderAgent = async () => {
    const genesisTransactionsBCovrinTestNet = await getGenesisTransaction("http://test.bcovrin.vonx.io/genesis");
    // Simple agent configuration. This sets some basic fields like the wallet
    // configuration and the label. It also sets the mediator invitation url,
    // because this is most likely required in a mobile environment.
    const config: InitConfig = {
        label: 'demo-agent-holder',
        walletConfig: {
            id: "demo-agent-holder",
            key: "demoagentholder00000000000000000",
        },
        // publicDidSeed: '000000000000000000000000Trustee9',
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
        endpoints: ['http://localhost:3002'],
    }

    // A new instance of an agent is created here
    const agent = new Agent({config, dependencies: agentDependencies})

    // Register a simple `WebSocket` outbound transport
    agent.registerOutboundTransport(new WsOutboundTransport());

    // Register a simple `Http` outbound transport
    agent.registerOutboundTransport(new HttpOutboundTransport());

    // Register a simple `Http` inbound transport
    agent.registerInboundTransport(new HttpInboundTransport({port: 3002}));

    // Initialize the agent
    await agent.initialize();

    return agent;
};

const initializeIssuerAgent = async () => {
    const genesisTransactionsBCovrinTestNet = await getGenesisTransaction("http://test.bcovrin.vonx.io/genesis");
    // Simple agent configuration. This sets some basic fields like the wallet
    // configuration and the label.
    const config: InitConfig = {
        label: "demo-agent-issuer",
        walletConfig: {
            id: "demo-agent-issuer",
            key: "demoagentissuer00000000000000000",
        },
        publicDidSeed: "000000000000000000000000Trustee9",

        indyLedgers: [
            {
                id: "bcovrin-test-net",
                isProduction: false,
                indyNamespace: 'bcovrin:test',
                genesisTransactions: genesisTransactionsBCovrinTestNet,
            },
        ],
        autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
        autoAcceptConnections: true,
        endpoints: ["http://localhost:3001"],
    };

    // A new instance of an agent is created here
    const agent = new Agent({config, dependencies: agentDependencies})

    // Register a simple `WebSocket` outbound transport
    agent.registerOutboundTransport(new WsOutboundTransport());

    // Register a simple `Http` outbound transport
    agent.registerOutboundTransport(new HttpOutboundTransport());

    // Register a simple `Http` inbound transport
    agent.registerInboundTransport(new HttpInboundTransport({port: 3001}));

    // Initialize the agent
    await agent.initialize();

    return agent;
};

// =========== END AGENT ===========

// =========== START CREDENTIAL ===========

const registerSchema1 = async (issuer: Agent) => {
    const schemaTemplate = {
        name: "Schema Identity " + faker.datatype.uuid(),
        version: "1.0.0",
        attributes: ["name", "degree", "date"],
    };

    printSchema(schemaTemplate);

    return await issuer.ledger.registerSchema(schemaTemplate);
};

const registerSchema2 = async (issuer: Agent) => {
    const schemaTemplate = {
        name: "Schema Identity 2 " + faker.datatype.uuid(),
        version: "2.0.0",
        attributes: ["name", "degree", "date"],
    };

    printSchema(schemaTemplate);

    return await issuer.ledger.registerSchema(schemaTemplate);
};

const registerCredentialDefinition = async (issuer: Agent, schema: Schema) => {
    const credentialDefinition = await issuer.ledger.registerCredentialDefinition({
        schema,
        supportRevocation: false,
        tag: schema.version,
    });

    console.log(redText("\tSchema Id: ") + greenText(schema.id, true));
    console.log(redText("\tCredential Definition Id: ") + greenText(credentialDefinition.id, true));
    return credentialDefinition.id;
};

const getCredentialPreview = async (count: number) => {
    const credentialPreview = V1CredentialPreview.fromRecord({
        name: faker.name.fullName(),
        degree: "Computer Science",
        date: new Date().toDateString(),
    });
    return credentialPreview;
};

const sendOfferCredential = async (
    issuer: Agent,
    credentialDefinitionId: string,
    connectionId: string,
    count: number
) => {
    const credentialPreview = await getCredentialPreview(count);

    return await issuer.credentials.offerCredential({
        protocolVersion: "v1",
        connectionId,
        credentialFormats: {
            indy: {
                credentialDefinitionId,
                attributes: credentialPreview.attributes,
            },
        },
    });
};
// =========== END CREDENTIAL ===========

// =========== START PRENSENT PROOF ===========

const sendProofRequest = async (issuer: Agent, credentialDefinitionId: any, connectionId: any) => {
    const proofAttribute = {
        name: new ProofAttributeInfo({
            name: "name",
            restrictions: [
                new AttributeFilter({
                    credentialDefinitionId: credentialDefinitionId,
                }),
            ],
        }),
        degree: new ProofAttributeInfo({
            name: "degree",
            restrictions: [
                new AttributeFilter({
                    credentialDefinitionId: credentialDefinitionId,
                }),
            ],
        }),
    };

    await issuer.proofs.requestProof({
        protocolVersion: 'v1',
        connectionId: connectionId,
        proofFormats: {
            indy: {
                name: 'proof-request',
                version: '1.0',
                nonce: "1298236324864",
                requestedAttributes: proofAttribute
            },
        },
    })
};

const acceptProofRequest = async (holder: Agent, proofRecordId: string) => {
    const retrievedCredentials = await holder.proofs.getRequestedCredentialsForProofRequest({
        proofRecordId: proofRecordId,
        config: {filterByPresentationPreview: true}
    });

    //hard code
    const credentials = <any>retrievedCredentials.proofFormats.indy?.requestedAttributes.name;

    printRetrievedCredentials(credentials);

    const questions = [
        {
            type: "input",
            message: "Choise credential:",
            name: "input",
        },
    ];
    const choise = await inquirer.prompt(questions);
    const index = +choise.input;

    // const requestedCredentials = holder.proofs.autoSelectCredentialsForProofRequest(retrievedCredentials);

    const requestedCredentials = new RequestedCredentials({});

    let requestedAttributes = <any>retrievedCredentials.proofFormats.indy?.requestedAttributes;
    Object.keys(requestedAttributes).forEach((attributeName) => {
        const attributeArray = requestedAttributes[attributeName];
        requestedCredentials.requestedAttributes[attributeName] = attributeArray[index - 1];
    });

    await holder.proofs.acceptRequest({
        proofRecordId: proofRecordId,
        proofFormats: {
            indy: requestedCredentials
        }
    })
};

// =========== END PRENSENT PROOF ===========

// =========== START EVENT ===========
//Isseur: Connection established!"
const setupCredentialListenerForHolder = (holder: Agent) => {
    holder.events.on<CredentialStateChangedEvent>(
        CredentialEventTypes.CredentialStateChanged,

        async ({payload}) => {
            switch (payload.credentialRecord.state) {
                case CredentialState.OfferReceived:
                    console.log("Holde received offer...");
                    const credentialRecordId = payload.credentialRecord.id;
                    const {offerAttributes} = await holder.credentials.getFormatData(credentialRecordId);

                    printOfferReceived(offerAttributes);
                    console.log("Holder accpet offer...");
                    await holder.credentials.acceptOffer({credentialRecordId});
                    break;

                case CredentialState.RequestSent:
                    console.log("Holder sent request... ");
                    break;

                case CredentialState.CredentialReceived:
                    console.log("\nHolder received credential !!!");
                    console.log(purpleText(Output.Line, true));
                    break;
            }
        }
    );
};

const setupCredentialListenerForIssuer = (issuer: Agent) => {
    issuer.events.on<CredentialStateChangedEvent>(
        CredentialEventTypes.CredentialStateChanged,

        async ({payload}) => {
            switch (payload.credentialRecord.state) {
                case CredentialState.OfferSent:
                    console.log(purpleText(Output.IssuingCredential, true));
                    console.log(`Issuer sent offer...`);
                    break;

                case CredentialState.RequestReceived:
                    console.log(`Issuer received request...`);
                    break;

                case CredentialState.CredentialIssued:
                    console.log(`Issuer issued crendential...`);
                    break;
            }
        }
    );
};

const setupProofListenerHolder = (holder: Agent) => {
    holder.events.on<ProofStateChangedEvent>(ProofEventTypes.ProofStateChanged, async ({payload}) => {
        switch (payload.proofRecord.state) {
            case ProofState.RequestReceived:
                console.log("Holder received proof request...");
                const proofRecordId = payload.proofRecord.id;
                await acceptProofRequest(holder, proofRecordId);
                break;

            case ProofState.PresentationSent:
                console.log("Holder sent presention...");
                break;

            case ProofState.Done:
                console.log("Holder received ask");
                break;
        }
    });
};

const setupProofListenerIssuer = (issuer: Agent) => {
    issuer.events.on<ProofStateChangedEvent>(ProofEventTypes.ProofStateChanged, async ({payload}) => {
        switch (payload.proofRecord.state) {
            case ProofState.RequestSent:
                console.log("Issuer sent proof request...");
                break;
            case ProofState.PresentationReceived:
                console.log("Issuer received presentation !!!");
                const proofRecordId = payload.proofRecord.id;
                const presentationMessage = await issuer.proofs.findPresentationMessage(proofRecordId)

                const presentationAttachments = (await presentationMessage)?.appendedAttachments;
                presentationAttachments?.forEach((attachment) => {
                    console.log(attachment.getDataAsJson<any>().requested_proof.revealed_attrs);
                });

                await issuer.proofs.acceptPresentation(proofRecordId);
                break;

            case ProofState.Done:
                console.log("Issuer accept presentation !!!");
                break;
        }
    });
};
// =========== END EVENT ===========

// =========== START CONNECTIONLESS ===========
const IssueCredentialConnectionless = async (
    issuer: Agent,
    holder: Agent,
    credentialDefinitionId: string
) => {
    const credentialPreview = await getCredentialPreview(1);
    const {credentialRecord: issuerCredentialRecord, message} = await issuer.credentials.createOffer({
        protocolVersion: "v1",
        credentialFormats: {
            indy: {
                credentialDefinitionId,
                attributes: credentialPreview.attributes,
            },
        },
    });

    const {message: offerMessage} = await issuer.oob.createLegacyConnectionlessInvitation({
        recordId: issuerCredentialRecord.id,
        domain: "http://localhost",
        message,
    });

    await holder.receiveMessage(offerMessage.toJSON());

    return credentialDefinitionId;
};

const PrensentProofConnectionless = async (issuer: Agent, holder: Agent, credentialDefinitionId: string) => {
    const proofAttribute = {
        name: new ProofAttributeInfo({
            name: "name",
            restrictions: [
                new AttributeFilter({
                    credentialDefinitionId: credentialDefinitionId,
                }),
            ],
        }),
        degree: new ProofAttributeInfo({
            name: "degree",
            restrictions: [
                new AttributeFilter({
                    credentialDefinitionId: credentialDefinitionId,
                }),
            ],
        }),
    };

    const {message, proofRecord} = await issuer.proofs.createRequest({
        protocolVersion: 'v1',
        proofFormats: {
            indy: {
                requestedAttributes: proofAttribute,
            },
        },
    })

    const {
        invitationUrl,
        message: messageWithServiceDecorator
    } = await holder.oob.createLegacyConnectionlessInvitation({
        recordId: proofRecord.id,
        domain: "http://localhost",
        message,
    })

    await holder.receiveMessage(message.toJSON());
};

// =========== END CONNECTIONLESS ===========

const schemas: Schema[] = [];
const credentialDefinitionIds: string[] = [];
let event = false;
const menu = async (issuer: Agent, holder: Agent) => {
    if (event) return;
    const questions = [
        {
            type: "list",
            name: "options",
            message: "Choise option: ",
            choices: [
                "Register schema",
                "Register credential defination",
                "Issue credential",
                "Request proof",
                "Holder's Credentials",
                "Exit",
            ],
        },
    ];
    const choise = await inquirer.prompt(questions);

    switch (choise.options) {
        case "Register schema": {
            const questions = [
                {
                    type: "input",
                    message: "Choise schema 1 or 2: ",
                    name: "input",
                },
            ];
            const choise = await inquirer.prompt(questions);
            let schema: Schema;
            if (choise.input == 1) schema = await registerSchema1(issuer);
            else schema = await registerSchema2(issuer);
            schemas.push(schema);
            break;
        }

        case "Register credential defination": {
            const credentialDefinitionId = await registerCredentialDefinition(issuer, schemas.pop() || schemas[0]);
            credentialDefinitionIds.push(credentialDefinitionId);
            break;
        }

        case "Issue credential": {
            credentialDefinitionIds.forEach((cre, index) => console.log(index + 1 + ": " + greenText(cre, true)));
            const questions = [
                {
                    type: "input",
                    message: "Choise credential def: ",
                    name: "input",
                },
            ];
            const choise = await inquirer.prompt(questions);
            const index = +choise.input;

            await IssueCredentialConnectionless(issuer, holder, credentialDefinitionIds[index - 1]);
            await sleep(3000);
            break;
        }

        case "Request proof": {
            credentialDefinitionIds.forEach((cre, index) => console.log(index + 1 + ": " + greenText(cre, true)));
            const questions = [
                {
                    type: "input",
                    message: "Choise credential def: ",
                    name: "input",
                },
            ];
            const choise = await inquirer.prompt(questions);
            const index = +choise.input;
            await PrensentProofConnectionless(issuer, holder, credentialDefinitionIds[index - 1]);
            await sleep(5000);
            break;
        }

        case "Holder's Credentials": {
            const credentials = await holder.credentials.getAll();
            printCredentials(credentials);
            break;
        }

        case "Exit": {
            console.log("Delete wallet of isssuer...");
            await issuer.wallet.delete();

            console.log("Delete wallet of holder...");
            await holder.wallet.delete();

            process.exit(0);
            break;
        }
    }

    await menu(issuer, holder);
};

const run = async () => {
    clear();
    console.log("Initializing the holder...");
    const holder = await initializeHolderAgent();
    console.log("Initializing the issuer...");
    const issuer = await initializeIssuerAgent();

    //Listenning Events
    setupCredentialListenerForHolder(holder);
    setupCredentialListenerForIssuer(issuer);
    setupProofListenerHolder(holder);
    setupProofListenerIssuer(issuer);

    await menu(issuer, holder);
};

void run();

// =========== START UTILS ===========

const sleep = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const printSchema = (schemaTemplate: any) => {
    console.log(`The credential definition will look like this:`);
    console.log(redText(`\tName: ${Color.Green}${schemaTemplate.name}`));
    console.log(redText(`\tVersion: ${Color.Green}${schemaTemplate.version}`));
    let string = "";
    schemaTemplate.attributes.forEach((attribute: any) => {
        string += ` ${attribute},`;
    });
    console.log(redText(`\tAttributes: ${Color.Green}${string}`));

    console.log(`${Color.Reset}`);
};

const printOfferReceived = (offerAttributes: any) => {
    console.log("\tCredential Offer: ");
    offerAttributes.forEach((att: any) => {
        console.log(redText("\t\t" + att.name + ": " + Color.Green + att.value, true));
    });
};

const printRetrievedCredentials = (credentials: any[]) => {
    credentials.forEach((credential, index) => {
        const id = credential.credentialInfo.referent;
        const attributes = credential.credentialInfo.attributes;
        console.log(Output.Line);
        console.log(greenText("\nCredential Number " + (index + 1) + ":", true));
        console.log("Id: ", greenText(id, true));
        console.log("Attributes: ", attributes);
        console.log(Output.Line);
    });
};

const printCredentials = (credentials: any[]) => {
    credentials.forEach((credential, index) => {
        const id = credential.id;
        const attributes = credential.credentialAttributes;
        console.log(Output.Line);
        console.log(greenText("\nCredential Number " + (index + 1) + ":", true));
        console.log("Id: ", greenText(id, true));
        console.log("Attributes: ", attributes);
        console.log(Output.Line);
    });
};

// =========== END UTILS ===========

enum Color {
    Green = `\x1b[32m`,
    Red = `\x1b[31m`,
    Purple = `\x1b[35m`,
    Reset = `\x1b[0m`,
}

enum Output {
    IssuingCredential = "\n\nISSUING CREDENTIAL  ===========================================",
    NoConnectionRecordFromOutOfBand = `\nNo connectionRecord has been created from invitation\n`,
    ConnectionEstablished = `\nConnection established!`,
    MissingConnectionRecord = `\nNo connectionRecord ID has been set yet\n`,
    ConnectionLink = `\nRun 'Receive connection invitation' in Alice and paste this invitation link:\n\n`,
    Exit = "Shutting down agent...\nExiting...",
    Line = "==============================================================",
}

enum Title {
    OptionsTitle = "\nOptions:",
    InvitationTitle = "\n\nPaste the invitation url here:",
    MessageTitle = "\n\nWrite your message here:\n(Press enter to send or press q to exit)\n",
    ConfirmTitle = "\n\nAre you sure?",
    CredentialOfferTitle = "\n\nCredential offer received, do you want to accept it?",
    ProofRequestTitle = "\n\nProof request received, do you want to accept it?",
}

const greenText = (text: string, reset?: boolean) => {
    if (reset) return Color.Green + text + Color.Reset;

    return Color.Green + text;
};

const purpleText = (text: string, reset?: boolean) => {
    if (reset) return Color.Purple + text + Color.Reset;
    return Color.Purple + text;
};

const redText = (text: string, reset?: boolean) => {
    if (reset) return Color.Red + text + Color.Reset;

    return Color.Red + text;
};
