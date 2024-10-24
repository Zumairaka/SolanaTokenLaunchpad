export function Loader({ message }) {
  return (
    <>
      <div className="loader-div">
        <div className="loader"></div>
      </div>
      <p className="loader-text">{message}</p>
    </>
  );
}
