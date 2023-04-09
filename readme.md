curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install --global yarn
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sudo apt-get update && apt-get install -y software-properties-common apt-transport-https libsodium-dev libzmq3-dev pkg-config libssl-dev build-essential
git clone https://github.com/hyperledger/indy-sdk
cd indy-sdk/libindy
cargo update && cargo build --release
sudo mv target/release/libindy.so /usr/lib/libindy.so
npx -p @aries-framework/node is-indy-installed

###POSTGRESQL
# Get postgres docker image
docker pull postgres

# Run postgres in docker
docker run --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

###NETWORK
# Build indy pool
docker build -f network/indy-pool.dockerfile -t indy-pool . --platform linux/amd64

# NOTE: If you are on an ARM (M1) mac use the `network/indy-pool-arm.dockerfile` instead
# docker build -f network/indy-pool-arm.dockerfile -t indy-pool . --platform linux/arm64/v8

# Start indy pool
docker run -d --rm --name indy-pool -p 9701-9708:9701-9708 indy-pool

# Setup CLI. This creates a wallet, connects to the ledger and sets the Transaction Author Agreement
docker exec indy-pool indy-cli-setup

#  DID and Verkey from seed. Set 'Trustee' role in order to be able to register public DIDs
docker exec indy-pool add-did-from-seed 000000000000000000000000Trustee9 TRUSTEE

# If you want to register using the DID/Verkey you can use
# docker exec indy-pool add-did "NkGXDEPgpFGjQKMYmz6SyF" "CrSA1WbYYWLJoHm16Xw1VEeWxFvXtWjtsfEzMsjB5vDT"

