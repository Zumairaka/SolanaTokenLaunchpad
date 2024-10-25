import axios from "axios";

export const sendImageToIPFS = async (fileImg) => {
  if (fileImg) {
    try {
      const formData = new FormData();
      formData.append("file", fileImg);

      const request = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          },
          body: formData,
        }
      );
      const response = await request.json();
      // console.log(response);

      // console.log(resFile.data.data.cid);
      const IpfsHash = response.IpfsHash;
      const imageUri = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
      //Take a look at your Pinata Pinned section, you will see a new file added to you list.
      return imageUri;
    } catch (error) {
      console.log("Error sending File to IPFS ");
      console.log(error);
    }
  }
};
