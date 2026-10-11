/** Conservative release envelope, independent of the semantic adapter's verdict.
 * This is not a semantic entailment classifier. Other faithful paraphrases remain
 * unreleased until independently evaluated; general explanations use their own gate. */
type LiteralRow = { text: string; predicate?: string; object?: string };
const sentence = (text: string) => text.trim().replace(/[.!]$/, "");

/** Reject obvious category contradictions before consulting model classification.
 * This bounded surface guard cannot extract every indirect/unnamed person claim. */
export function obviousPersonAssertion(text: string): boolean {
    if (/^I(?:['’]m| am) an AI (?:representation|assistant)(?:, not the actual person)?[.!]?$/i.test(text.trim())) return false;
    const normalized = text.replace(/\b(don['’]t|doesn['’]t|didn['’]t)\b/gi, token => /^does/i.test(token) ? 'does not' : /^did/i.test(token) ? 'did not' : 'do not');
    const subject = /\b(?:the expert|the represented person|this person|that person|they|he|she)\s+(?:(?:currently|always|never|secretly|previously)\s+)*(?:does?|did|is|was|has|had|believes?|prefers?|recommends?|supports?|opposes?|wants?|fears?|feels?|experienced|treated|led|worked|learned|studied|earned|holds?)\b/i;
    const possessive = /\b(?:the expert['’]s|the represented person['’]s|their)\s+(?:belief|motive|experience|credentials?|preference|position|reason|opinion)\s+(?:is|was|are|were)\b/i;
    const firstPerson = /\bI(?:['’]m|\s+(?:am|was|have|had|believe|prefer|recommend|support|oppose|want|fear|feel|experienced|treated|led|worked|learned|earned))\b/i;
    const negativeFirstPerson = /\bI\s+(?:do|did)\s+not\s+(?:believe|prefer|recommend|support|oppose|want|fear|feel|experience|treat|lead|work|learn|earn)\b/i;
    return subject.test(normalized) || possessive.test(normalized) || firstPerson.test(normalized) || negativeFirstPerson.test(normalized) || representationCareerAssertion(normalized);
}

/** A representation/avatar/twin may be discussed as an interface. Reject its
 * obvious career/credential claims without treating formatting or tone as biography. */
function representationCareerAssertion(text: string): boolean {
    const subjects = Array.from(text.matchAll(/\b(?:this|that|the|our|your)\s+(?:AI\s+)?(?:representation|avatar|(?:digital|AI)\s+twin|twin)\b/gi));
    return subjects.some(subject => {
        const clause = text.slice(subject.index! + subject[0].length).split(/[.!?\n]/, 1)[0].slice(0, 240);
        const negativeCredentials = /^\s+(?:has|holds|possesses)\s+no\s+(?:(?:medical|professional|clinical|legal|academic)\s+)?(?:degree|doctorate|licen[cs]e|credentials)(?:\s+and\s+(?:cannot|can not|does not)\s+(?:replace|substitute for|act as)\s+an?\s+(?:(?:licensed|qualified|actual|real)\s+)?(?:doctor|physician|clinician|lawyer|professional))?\s*$/i;
        if (negativeCredentials.test(clause)) return false;
        const role = /^\s+(?:is|was|has been|trained as|qualified as|worked as|practiced as|practised as)\s+(?:an?\s+)?(?:(?:licensed|qualified|experienced|professional|board[- ]certified)\s+)*(?:doctor|surgeon|physician|clinician|cardiologist|lawyer|attorney|optometrist|therapist|broker|financial advis[oe]r)\b/i;
        const career = /\b(?:(?:professional|clinical|medical|legal|courtroom|research|teaching|industry)\s+(?:practice|experience|training|credentials)|doctorate|degree(?!\s+of\b)|licen[cs]e|credentials|career|years?\s+in\s+(?:cardiology|medicine|surgery|law|optometry|therapy|clinical practice|legal practice)|years?\s+(?:of\s+)?(?:\w+\s+){0,3}(?:practice|experience|training))\b/i;
        const attribution = /^\s+(?:speaks?|answers?|draws?|works?|has|had|brings?|holds?|earned|possesses|trained|practiced|practised|worked|qualified)\b/i;
        return role.test(clause) || (attribution.test(clause) && career.test(clause));
    });
}

export function literalPersonSupport(text: string, rows: LiteralRow[]): boolean {
    const claim = sentence(text);
    return rows.some(row => {
        const quotes = [JSON.stringify(row.text), `“${row.text}”`, `‘${row.text}’`, `'${row.text}'`];
        if (quotes.some(quote => [quote, `The recorded source states ${quote}`, `The source says ${quote}`, `The author stated ${quote}`].includes(claim))) return true;
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
    // Prefer the complete outer single quotation: internal contractions and plural
    // possessives cannot terminate it early. Multiple separate single quotations
    // on one line may conservatively refuse; double quotations remain unambiguous.
    const quotes = text.match(/"(?:\\.|[^"\\])*"|“[^”]*”|‘[^\n]+’(?=$|[\s.,;:)])/g) || [];
    const singleMatches = Array.from(text.matchAll(/(?:^|[\s(:,])'([^\n]+)'(?=$|[\s.,;:)])/g));
    const remainder = [...quotes, ...singleMatches.map(match => match[0])].reduce((rest, quote) => rest.replace(quote, ""), text);
    if (/["“”‘]/.test(remainder) || /(?:^|[\s(:,])'(?=\S)/.test(remainder) || (text.includes('‘') && /’(?=$|[\s.,;:)])/.test(remainder)) || (singleMatches.length > 0 && /'(?=$|[\s.,;:)])/.test(remainder))) return false;
    const supported = (value: string) => !!value && rows.some(row => row.text.includes(value));
    const straightSingle = singleMatches.map(match => match[1]);
    return straightSingle.every(supported) && quotes.every(quote => {
        let value: string;
        try { value = quote.startsWith('"') ? JSON.parse(quote) : quote.slice(1, -1); }
        catch { return false; }
        return supported(value);
    });
}
