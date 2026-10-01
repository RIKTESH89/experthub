import {extractLiteralAssertions,overlappingChunks,hashEvidence} from "@/lib/graph/evidence-extractor";
test("owner-authored literal preference has exact offsets and explicit attribution",()=>{
 const text="Title\n\nI prefer a monolith because operations cost matters.";
 const [a]=extractLiteralAssertions(text,"owner","owner");expect(a).toMatchObject({subject:"owner",kind:"explicit",speakerRole:"author",endorsedByOwner:true});expect(text.slice(a.start,a.end)).toBe(a.text);
});
test("quoted speaker never becomes uploading owner's endorsement",()=>{
 expect(extractLiteralAssertions('Ben said: "I prefer services."',"owner","owner")[0]).toMatchObject({subject:"quoted:Ben",speakerRole:"quoted",kind:"explicit",endorsedByOwner:false});
});
test("unattributed upload records unknown speaker rather than inventing owner belief",()=>{
 expect(extractLiteralAssertions("I prefer services.",null,"owner")[0]).toMatchObject({subject:"unknown-speaker",kind:"unknown",endorsedByOwner:false});
});
test("third-party author and uploader remain different identities",()=>{
 expect(extractLiteralAssertions("I recommend a trial.","third-party","owner")[0]).toMatchObject({subject:"third-party",endorsedByOwner:false});
});
test("ambiguous quotes and unsupported syntax abstain without inference",()=>{
 expect(extractLiteralAssertions('I prefer "services".\nMaybe she likes a monolith.\n"I prefer services."',"owner","owner")).toEqual([]);
});
test("replay is deterministic, including Unicode UTF16 spans",()=>{
 const text="😀\nI prefer services.";const a=extractLiteralAssertions(text,"owner","owner");expect(a).toEqual(extractLiteralAssertions(text,"owner","owner"));expect(hashEvidence(a)).toBe(hashEvidence(extractLiteralAssertions(text,"owner","owner")));expect(text.slice(a[0].start,a[0].end)).toBe(a[0].text);
});
test("chunk links match overlapping 1000/200 index windows",()=>{
 expect(overlappingChunks("e","i",2,850,950,1900)).toEqual(["e:i:v2:chunk_0","e:i:v2:chunk_1"]);expect(overlappingChunks("e","i",2,1000,1050,1900)).toEqual(["e:i:v2:chunk_1"]);
});

test("evidence prompt explicitly forbids converting quotes/uploads/unknown speakers into owner endorsement",()=>{
 const {evidencePrompt}=require("@/lib/graph/evidence-store");expect(evidencePrompt([])).toEqual([]);
 const prompt=evidencePrompt([{assertionId:"a",revisionId:"r",start:0,end:1,kind:"unknown",speakerId:null,speakerRole:"unknown",endorsedByOwner:false,text:"I prefer services."}]);expect(prompt[0]).toContain("Uploading does not establish authorship or endorsement");expect(prompt[0]).toContain("Unknown speakers are not the expert");expect(prompt[1]).toContain("owner endorsement false");
});
