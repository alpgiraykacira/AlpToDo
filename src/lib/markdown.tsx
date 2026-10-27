import type { ReactNode } from "react";

/** **kalın** ve `kod` biçimlerini React öğelerine çevirir. HTML üretmez, bu yüzden XSS'e kapalıdır. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, k) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={k}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/** Küçük bir markdown alt kümesi: # ve ## başlık, ### alt başlık, - madde, paragraf. */
export function Markdown({ source }: { source: string }) {
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const closeList = () => {
    if (list.length) out.push(<ul key={`ul${out.length}`}>{list}</ul>);
    list = [];
  };
  source.split("\n").forEach((line, k) => {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^[-*] (.*)/))) {
      list.push(<li key={k}>{inline(m[1])}</li>);
      return;
    }
    closeList();
    if ((m = line.match(/^### (.*)/))) out.push(<h3 key={k}>{inline(m[1])}</h3>);
    else if ((m = line.match(/^#{1,2} (.*)/))) out.push(<h2 key={k}>{inline(m[1])}</h2>);
    else if (line.trim()) out.push(<p key={k}>{inline(line)}</p>);
  });
  closeList();
  return <>{out}</>;
}
