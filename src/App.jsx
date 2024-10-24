import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { TokenLaunchpad } from "../components/TokenLaunchpad";
import "./App.css";
import {
  WalletDisconnectButton,
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Footer } from "../components/Footer";

function App() {
  return (
    <>
      <ConnectionProvider endpoint="https://api.devnet.solana.com">
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>
            <div className="connect-div">
              <div className="connect">
                <WalletDisconnectButton />
                <WalletMultiButton />
              </div>
            </div>
            <TokenLaunchpad />
            <Footer />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </>
  );
}

export default App;
