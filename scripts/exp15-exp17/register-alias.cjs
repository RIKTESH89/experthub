/* eslint-disable @typescript-eslint/no-require-imports -- Node --require bootstrap runs before TypeScript imports are available. */
process.env.TS_NODE_COMPILER_OPTIONS=JSON.stringify({module:'CommonJS',moduleResolution:'node',target:'ES2020'});
const Module=require('module'),path=require('path');
const original=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return original.call(this,request.startsWith('@/')?path.resolve(__dirname,'../../src',request.slice(2)):request,parent,...rest);};
