import axios from "axios";

export const sendMetadataToIPFS = async (metadata) => {
  if (metadata) {
    try {
      const resFile = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        data: metadata,
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          "Content-Type": "application/json",
        },
      });

      // console.log(resFile.data);
      const IpfsHash = resFile.data.IpfsHash;
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
      //Take a look at your Pinata Pinned section, you will see a new file added to you list.
      return metadataUri;
    } catch (error) {
      console.log("Error sending File to IPFS ");
      console.log(error);
    }
  }
};
