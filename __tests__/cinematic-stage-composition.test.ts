import fs from 'fs';
import path from 'path';
import ts from 'typescript';
const source=fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/stage-composition.js'),'utf8');
const exportsObject:Record<string,any>={};
new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exportsObject);
test.each([{x:502,y:112,width:551,height:657,fullWidth:1470,fullHeight:801},{x:8,y:184,width:344,height:303,fullWidth:360,fullHeight:640}])('expanded frustum retains focal pixels and extends past logical rectangle', rect=>{
  const matrix=new Array(16).fill(0);matrix[0]=2;matrix[5]=3;matrix[8]=.2;matrix[9]=.045;
  exportsObject.expandProjection(matrix,rect,rect.fullWidth,rect.fullHeight);
  for(const [x,y]of [[0,0],[.4,.3],[-.5,-.2]]){
    const logicalX=2*x-.2,logicalY=3*y-.045;
    const fullX=matrix[0]*x-matrix[8],fullY=matrix[5]*y-matrix[9];
    expect((fullX+1)*rect.fullWidth/2).toBeCloseTo(rect.x+(logicalX+1)*rect.width/2,6);
    expect((1-fullY)*rect.fullHeight/2).toBeCloseTo(rect.y+(1-logicalY)*rect.height/2,6);
  }
  expect(matrix[0]).toBeLessThan(2);expect(matrix[5]).toBeLessThan(3);
});
test('closing stage resolves before story end and reverses without a timer',()=>{
  expect(exportsObject.artExitOpacity(.82)).toBe(1);
  expect(exportsObject.artExitOpacity(.98)).toBe(0);
  expect(exportsObject.artExitOpacity(.9)).toBeCloseTo(.5,8);
  const forward=[.82,.86,.9,.94,.98].map(phase=>exportsObject.artExitOpacity(phase) as number);
  const reverse=[.98,.94,.9,.86,.82].map(phase=>exportsObject.artExitOpacity(phase) as number);
  expect(reverse).toEqual(forward.slice().reverse());
  expect(forward.every((v:number,i:number)=>!i||v<=forward[i-1])).toBe(true);
});
