curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

apt-get install -y nodejs

npm install --global yarn

sudo apt-get install libsodium-dev

sudo apt-get install libzmq3-dev

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

git clone https://github.com/hyperledger/indy-sdk

cd indy-sdk/libindy

sudo apt-get install pkg-config libssl-dev

sudo apt install build-essential

cargo update

cargo build --release

sudo mv target/release/libindy.so /usr/lib/libindy.so

npx -p @aries-framework/node is-indy-installed
