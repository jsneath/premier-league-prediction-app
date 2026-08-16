import { useEffect, useState } from "react";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

function Typewriter({ text }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, reduced]);

  return (
    <>
      {shown.split("\n").filter(Boolean).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
      {shown.length < (text || "").length ? <span className="type-caret" /> : null}
    </>
  );
}

export default Typewriter;
