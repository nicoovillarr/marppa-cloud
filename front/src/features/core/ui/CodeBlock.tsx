const ActionButton = ({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) => (
  <button
    className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-2 py-1 rounded cursor-pointer"
    onClick={onClick}
  >
    {text}
  </button>
);

export function CodeBlock({
  code,
  fileName,
  mimeType = "application/octet-stream",
}: {
  code: string;
  fileName?: string;
  mimeType?: string;
}) {
  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <pre className="group min-h-20 relative bg-gray-700 text-white p-4 rounded-lg overflow-x-auto">
      <aside className="group-hover:visible invisible absolute top-2 right-2 flex gap-x-2">
        {fileName && <ActionButton text="Download" onClick={handleDownload} />}
        <ActionButton
          text="Copy"
          onClick={() => navigator.clipboard.writeText(code)}
        />
      </aside>
      <code>{code}</code>
    </pre>
  );
}
