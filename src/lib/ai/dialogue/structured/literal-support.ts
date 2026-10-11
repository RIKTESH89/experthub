/** Conservative release envelope, independent of the semantic adapter's verdict.
 * This is not a semantic entailment classifier. Other faithful paraphrases remain
 * unreleased until independently evaluated; general explanations use their own gate. */
type LiteralRow = { text: string; predicate?: string; object?: string };
const sentence = (text: string) => text.trim().replace(/[.!]$/, "");

export function literalPersonSupport(text: string, rows: LiteralRow[]): boolean {
    const claim = sentence(text);
    return rows.some(row => {
        const quote = JSON.stringify(row.text);
        if ([quote, `The recorded source states ${quote}`, `The author stated ${quote}`].includes(claim)) return true;
        if (!["prefer", "recommend"].includes(row.predicate || "") || !row.object) return false;
        // The extracted object cannot launder an attributed quote, negative, inference,
        // time modifier or invented assertion into a new positive person statement.
        const literal = sentence(row.text).match(/^I (prefer|recommend) (.+)$/);
        if (!literal || literal[1] !== row.predicate || literal[2] !== row.object) return false;
        const object = row.object;
        const verb = row.predicate === "prefer" ? "prefers" : "recommends";
        const forms = [`The recorded source says the author ${verb} ${object}`, `The expert ${verb} ${object}`, `The expert currently ${verb} ${object}`];
        if (row.predicate === "prefer") forms.push(`The recorded note favours ${object}`, `The recorded source favours ${object}`, `The note favours ${object}`, `In that historical record, the stated preference was ${object}`);
        return forms.includes(claim);
    });
}

/** Quotation marks claim exact words, even when the surrounding prose is a paraphrase.
 * Compare each quotation against a single adjacent cited span; never concatenate
 * unrelated evidence into an invented quote. Apostrophes in prose are not quotation marks. */
export function quotationsSupported(text: string, rows: LiteralRow[]): boolean {
    const quotes = text.match(/"(?:\\.|[^"\\])*"|“[^”]*”|‘[^’]*’/g) || [];
    const remainder = quotes.reduce((rest, quote) => rest.replace(quote, ""), text);
    if (/["“”]/.test(remainder)) return false;
    const supported = (value: string) => !!value && rows.some(row => row.text.includes(value));
    const straightSingle = Array.from(text.matchAll(/(?:^|[\s(:,])'([^\n]+?)'(?=$|[\s.,;:)])/g), match => match[1]);
    return straightSingle.every(supported) && quotes.every(quote => {
        let value: string;
        try { value = quote.startsWith('"') ? JSON.parse(quote) : quote.slice(1, -1); }
        catch { return false; }
        return supported(value);
    });
}
