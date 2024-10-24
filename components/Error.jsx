export function ErrorComponent({ errorMessage }) {
  return (
    <>
      <div className="error-div">
        <div className="error-message">{errorMessage}</div>
      </div>
    </>
  );
}
