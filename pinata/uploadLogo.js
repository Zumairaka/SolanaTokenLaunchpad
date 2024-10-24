import axios from "axios";

export const sendImageToIPFS = async (fileImg) => {
  if (fileImg) {
    try {
      const formData = new FormData();
      formData.append("file", fileImg);

      const resFile = await axios({
        method: "post",
        url: "https://uploads.pinata.cloud/v3/files",
        data: formData,
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // console.log(resFile.data.data.cid);
      const cid = resFile.data.data.cid;
      const imageUri = `https://gateway.pinata.cloud/ipfs/${cid}`;
      //Take a look at your Pinata Pinned section, you will see a new file added to you list.
      return imageUri;
    } catch (error) {
      console.log("Error sending File to IPFS ");
      console.log(error);
    }
  }
};
