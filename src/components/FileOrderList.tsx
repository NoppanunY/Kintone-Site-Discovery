import type { FileOrderItem } from "../types";

interface FileOrderListProps {
  files: FileOrderItem[];
}

export function FileOrderList({ files }: FileOrderListProps) {
  return (
    <ol className="file-order" aria-label="Customization files in execution order">
      {files.map((file) => (
        <li key={file.name} className="file-order__row">
          <span className="file-order__index">{file.index}</span>
          <span className="grow">{file.name}</span>
          <span className="muted2">
            {file.orderSource} · confidence: {file.confidence}
          </span>
        </li>
      ))}
    </ol>
  );
}
