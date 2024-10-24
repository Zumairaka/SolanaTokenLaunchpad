import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { ErrorComponent } from "./Error";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import {
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  createInitializeInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  ExtensionType,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createUpdateAuthorityInstruction,
  createUpdateFieldInstruction,
  pack,
} from "@solana/spl-token-metadata";
import { HashComponent } from "./Hash";
import { SuccessComponent } from "./Success";
import { Loader } from "./Loader";
import "dotenv/config";
import { sendImageToIPFS } from "../pinata/uploadLogo";
import { sendMetadataToIPFS } from "../pinata/uploadJson";

export function TokenLaunchpad() {
  const [revokeFreeze, setRevokeFreeze] = useState(false);
  const [revokeMint, setRevokeMint] = useState(false);
  const [revokeUpdate, setRevokeUpdate] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState("");
  const [mint, setMint] = useState("");
  const [logoImage, setLogoImage] = useState("");

  const wallet = useWallet();
  const { connection } = useConnection();

  const name = useRef("");
  const symbol = useRef("");
  const decimals = useRef(0);
  const supply = useRef(0);
  const description = useRef("");

  useEffect(() => {
    setTimeout(() => {
      setError("");
    }, 10000);
  }, [error]);

  // check box handler
  function checkBoxHandler(e) {
    e.preventDefault();
    if (e.target.checked) {
      const value = e.target.value;
      if (value == "freeze") {
        setRevokeFreeze(true);
      }
      if (value == "mint") {
        setRevokeMint(true);
      }
      if (value == "update") {
        setRevokeUpdate(true);
      }
    } else {
      const value = e.target.value;
      if (value == "freeze") {
        setRevokeFreeze(false);
      }
      if (value == "mint") {
        setRevokeMint(false);
      }
      if (value == "update") {
        setRevokeUpdate(false);
      }
    }
  }

  // create token handler
  async function createTokenHandler() {
    setError("");
    setLoading("");
    setHash("");
    setSuccess(false);
    let isError = false;
    // check for wallets
    if (wallet.publicKey == null) {
      setError("Please connect wallet!");
      isError = true;
    } else {
      // check token details
      if (name.current.value == "") {
        setError("Please mention a Name for your Token!");
        isError = true;
      } else if (symbol.current.value == "") {
        setError("Please mention a Symbol for your Token!");
        isError = true;
      } else if (decimals.current.value == 0) {
        setError("Please mention the Decimals for your Token!");
        isError = true;
      } else if (supply.current.value == 0) {
        setError("Please enter the Supply of your Token!");
        isError = true;
      } else if (logoImage == "") {
        setError("Please upload a Logo for your Token!");
        isError = true;
      } else if (description.current.value == "") {
        setError("Please enter a Description for your Token!");
        isError = true;
      }

      // no error then proceed with creating token
      if (!isError) {
        // upload logo image to ipfs
        setLoading("uploading the logo to ipfs...");
        const imageURI = await sendImageToIPFS(logoImage);
        // console.log(imageURI);

        let metadataURI;

        // check if logo pinned
        if (imageURI.length > 0) {
          // upload metadata to ipfs
          setLoading("uploading the metadata to ipfs...");
          const metadataIpfs = JSON.stringify({
            name: name.current.value,
            symbol: symbol.current.value,
            decimals: decimals.current.value,
            description: description.current.value,
            image: imageURI,
          });

          metadataURI = await sendMetadataToIPFS(metadataIpfs);
          // console.log(metadataURI);
        } else {
          setError("Error uploading logo to ipfs!");
        }

        // check if metadata pinned
        if (metadataURI.length > 0) {
          // generate mint key pair
          const mintKeypair = Keypair.generate();
          setMint(mintKeypair.publicKey.toBase58());

          const freezeAuthority = revokeFreeze ? null : wallet.publicKey;

          // setting the metadata
          setLoading("deploying the token with metadata...");
          const metadata = {
            mint: mintKeypair.publicKey,
            name: name.current.value,
            symbol: symbol.current.value,
            uri: metadataURI,
            additionalMetadata: [["description", description.current.value]],
          };
          const mintLen = getMintLen([ExtensionType.MetadataPointer]);
          const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

          const lamports = await connection.getMinimumBalanceForRentExemption(
            mintLen + metadataLen
          );

          const transaction = new Transaction().add(
            SystemProgram.createAccount({
              fromPubkey: wallet.publicKey,
              newAccountPubkey: mintKeypair.publicKey,
              space: mintLen,
              lamports,
              programId: TOKEN_2022_PROGRAM_ID,
            }),
            createInitializeMetadataPointerInstruction(
              mintKeypair.publicKey,
              wallet.publicKey,
              mintKeypair.publicKey,
              TOKEN_2022_PROGRAM_ID
            ),
            createInitializeMintInstruction(
              mintKeypair.publicKey,
              decimals.current.value,
              wallet.publicKey,
              freezeAuthority,
              TOKEN_2022_PROGRAM_ID
            ),
            createInitializeInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              mint: mintKeypair.publicKey,
              metadata: mintKeypair.publicKey,
              name: metadata.name,
              symbol: metadata.symbol,
              uri: metadata.uri,
              mintAuthority: wallet.publicKey,
              updateAuthority: wallet.publicKey,
            }),
            createUpdateFieldInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              metadata: mintKeypair.publicKey,
              updateAuthority: wallet.publicKey,
              field: metadata.additionalMetadata[0][0],
              value: metadata.additionalMetadata[0][1],
            })
          );

          transaction.feePayer = wallet.publicKey;
          transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          transaction.partialSign(mintKeypair);

          const txhash = await wallet.sendTransaction(transaction, connection);
          if (txhash != "") {
            setError("");

            setLoading(
              `minting tokens ${
                revokeFreeze || revokeMint || revokeUpdate
                  ? "and revoking authorities..."
                  : "and setting authorities..."
              } `
            );

            // creating associated token account for the owner
            const associatedToken = getAssociatedTokenAddressSync(
              mintKeypair.publicKey,
              wallet.publicKey,
              false,
              TOKEN_2022_PROGRAM_ID
            );

            // console.log(associatedToken.toBase58());
            const mintAmount = BigInt(
              supply.current.value * 10 ** decimals.current.value
            );
            // console.log(mintAmount);

            // mint and revoke instructions
            const mintAndRevokeTransactions = new Transaction().add(
              createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                associatedToken,
                wallet.publicKey,
                mintKeypair.publicKey,
                TOKEN_2022_PROGRAM_ID
              ),
              createMintToInstruction(
                mintKeypair.publicKey,
                associatedToken,
                wallet.publicKey,
                mintAmount,
                [],
                TOKEN_2022_PROGRAM_ID
              )
            );

            // revoke mint authority?
            if (revokeMint) {
              mintAndRevokeTransactions.add(
                createSetAuthorityInstruction(
                  mintKeypair.publicKey,
                  wallet.publicKey,
                  AuthorityType.MintTokens,
                  null,
                  [],
                  TOKEN_2022_PROGRAM_ID
                )
              );
            }

            // revoke update authority
            if (revokeUpdate) {
              mintAndRevokeTransactions.add(
                createUpdateAuthorityInstruction({
                  programId: TOKEN_2022_PROGRAM_ID,
                  metadata: mintKeypair.publicKey,
                  oldAuthority: wallet.publicKey,
                  newAuthority: null,
                })
              );
            }

            const mintHash = await wallet.sendTransaction(
              mintAndRevokeTransactions,
              connection
            );

            // mint successful
            if (mintHash) {
              setHash(mintHash);
              setLoading("");
              setSuccess(true);

              // empty input fields
              name.current.value = "";
              symbol.current.value = "";
              decimals.current.value = "";
              description.current.value = "";
              supply.current.value = "";
              setLogoImage("");
            }
          } else {
            setError("Error Creating the Token!");

            // empty input fields
            name.current.value = "";
            symbol.current.value = "";
            decimals.current.value = "";
            description.current.value = "";
            supply.current.value = "";
            setLogoImage("");
          }
        } else {
          setError("Error uploading metadata to ipfs!");
        }
      }
    }
  }

  return (
    <>
      {error ? <ErrorComponent errorMessage={error} /> : ""}

      <div className="main-div">
        {wallet.publicKey ? (
          <div className="wallet">
            Connected wallet:{" "}
            <span className="wallet-address">
              {wallet.publicKey?.toBase58()}
            </span>
          </div>
        ) : (
          ""
        )}
        <h3 className="heading">Solana Token Creator</h3>
        <p className="sub-heading text-grey">
          Easily create your own Solana SPL-Token in few steps without coding.
        </p>
        {/* name */}
        <div className="input-div">
          <div className="input-child-div">
            <label>
              <span>*</span>Name:
            </label>
            <input
              type="text"
              className="input-box"
              placeholder="Enter the name of your Token"
              ref={name}
            />
          </div>
          <div className="input-child-div">
            <label>
              <span>*</span>Symbol:
            </label>
            <input
              type="text"
              className="input-box"
              placeholder="Enter the symbol of your Token"
              ref={symbol}
            />
          </div>
        </div>
        {/* decimals */}
        <div className="input-div">
          <div className="input-child-div">
            <label>
              <span>*</span>Decimals:
            </label>
            <input
              type="text"
              className="input-box"
              placeholder="Enter the decimals of your Token"
              ref={decimals}
            />
          </div>
          <div className="input-child-div">
            <label>
              <span>*</span>Supply:
            </label>
            <input
              type="text"
              className="input-box"
              placeholder="Enter the supply of our Token"
              ref={supply}
            />
          </div>
        </div>
        {/* image */}
        <div className="input-div">
          <div className="input-child-div">
            <label>
              <span>*</span>Image:
            </label>
            <div className="text-box">
              <input
                type="file"
                className="upload-image"
                onChange={(e) => setLogoImage(e.target.files[0])}
              />
              {/* <img src="./fileUpload.png" className="file-logo" alt="" /> */}
              {/* <p className="file-text">Upload Image</p> */}
            </div>
          </div>
          <div className="input-child-div">
            <label>
              <span>*</span>Decscription:
            </label>
            <textarea
              ref={description}
              className="text-box description"
            ></textarea>
          </div>
        </div>
        {/* revokes */}
        <div className="revoke-div">
          <h4 className="revoke-heading">Revoke any Authority?</h4>
          <p className="text-grey revoke-sub-heading">
            Solana Token Program has 3 authorities; Freeze, Mint and Update
            authorities. Revoke them for attracting more investors.
          </p>
        </div>
        <div className="input-div">
          <div>
            <input
              type="checkbox"
              className="checkbox"
              onChange={checkBoxHandler}
              id="freeze"
              value={"freeze"}
            />
            <label className="label text-grey" htmlFor="freeze">
              Freeze Authority
            </label>
          </div>
          <div>
            <input
              type="checkbox"
              className="checkbox"
              onChange={checkBoxHandler}
              id="mint"
              value={"mint"}
            />
            <label className="label text-grey" htmlFor="mint">
              Mint Authority
            </label>
          </div>
          <div>
            <input
              type="checkbox"
              className="checkbox"
              onChange={checkBoxHandler}
              id="update"
              value={"update"}
            />
            <label className="label text-grey" htmlFor="update">
              Update Authority
            </label>
          </div>
        </div>
        {/* submit */}
        <div className="submit-main">
          <div className="submit-btn" onClick={createTokenHandler}>
            Create Token
          </div>
        </div>

        {/* loader */}
        {loading != "" ? <Loader message={loading} /> : ""}
      </div>

      {/* success  */}
      {success ? <SuccessComponent /> : ""}
      {hash ? <HashComponent hashMessage={hash} mint={mint} /> : ""}
    </>
  );
}
