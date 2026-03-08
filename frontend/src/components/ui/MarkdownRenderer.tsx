interface MarkdownRendererProps {
  content: string;
}

/**
 * Simple markdown renderer — handles headings, bold, bullets, and paragraphs.
 * No dangerouslySetInnerHTML — parses into React elements.
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} style={{ margin: "8px 0", paddingLeft: 20 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.7, marginBottom: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={key++} style={{ margin: "16px 0 6px", fontSize: 12, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em" }}>
          {renderInline(trimmed.slice(4))}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={key++} style={{ margin: "18px 0 8px", fontSize: 13, fontWeight: 700, color: "#e5e7eb", letterSpacing: "0.03em" }}>
          {renderInline(trimmed.slice(3))}
        </h3>,
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} style={{ margin: "8px 0", color: "#d1d5db", fontSize: 13, lineHeight: 1.7 }}>
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <div>{elements}</div>;
}

/** Render inline markdown: **bold** */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} style={{ color: "#f3f4f6", fontWeight: 600 }}>
        {match[1]}
      </strong>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
