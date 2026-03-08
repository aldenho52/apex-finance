import { colors, fontSizes } from "../../lib/theme";

interface MarkdownRendererProps {
  content: string;
}

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
            <li key={i} style={{ color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 1.7, marginBottom: 4 }}>
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

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={key++} style={{ margin: "16px 0 6px", fontSize: fontSizes.small, fontWeight: 700, color: colors.info, letterSpacing: "0.05em" }}>
          {renderInline(trimmed.slice(4))}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={key++} style={{ margin: "18px 0 8px", fontSize: fontSizes.body, fontWeight: 700, color: colors.textPrimary, letterSpacing: "0.03em" }}>
          {renderInline(trimmed.slice(3))}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    flushList();
    elements.push(
      <p key={key++} style={{ margin: "8px 0", color: colors.textSecondary, fontSize: fontSizes.body, lineHeight: 1.7 }}>
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <div>{elements}</div>;
}

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
      <strong key={match.index} style={{ color: colors.textPrimary, fontWeight: 600 }}>
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
