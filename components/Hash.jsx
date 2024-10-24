export function HashComponent({ hashMessage, mint }) {
  function ok() {}

  return (
    <>
      <div className="hash-div">
        <div>
          <div className="hash-message-div">
            Txn Hash:<span className="hash-message">{hashMessage}</span>
          </div>
          <div className="hash-message-div">
            Token Mint Address:<span className="hash-message">{mint}</span>
          </div>
        </div>
      </div>
    </>
  );
}
