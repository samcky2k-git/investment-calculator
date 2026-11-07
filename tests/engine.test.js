const fs=require('fs'),vm=require('vm');
const path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8');
const src=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const ctx={Math,Object,Array,Float64Array,Number,JSON};vm.createContext(ctx);
vm.runInContext(src+';this.DEFAULTS=DEFAULTS;this.project=project;this.simulate=simulate;this.solveGoal=solveGoal;this.effectiveRate=effectiveRate;',ctx);
const {DEFAULTS,project,simulate,solveGoal,effectiveRate}=ctx;
const P=o=>Object.assign({},DEFAULTS,o);
let fail=0;
const chk=(name,got,exp,tol=0.005)=>{const ok=Math.abs(got-exp)<=tol;if(!ok)fail++;console.log((ok?'PASS ':'FAIL ')+name.padEnd(46)+' got '+got.toFixed(4)+'  expected '+exp.toFixed(4));};
const fvLump=(a,r,n)=>a*Math.pow(1+r,n);
const fvAnn=(c,r,n)=>r===0?c*n:c*(Math.pow(1+r,n)-1)/r;
// Closed forms, independent of the period loop
chk('annual, end of year',project(P({start:10000,annual:6000,rate:7,years:10})).final,fvLump(10000,.07,10)+fvAnn(6000,.07,10));
chk('annual, start of year (annuity due)',project(P({start:10000,annual:6000,rate:7,years:10,timing:'begin'})).final,fvLump(10000,.07,10)+fvAnn(6000,.07,10)*1.07);
const gm=Math.pow(1.07,1/12)-1;
chk('monthly deposits, APY rate',project(P({start:0,annual:12000,rate:7,years:20,freq:12})).final,fvAnn(1000,gm,240));
chk('stated 6% compounded monthly, lump',project(P({start:1000,annual:0,rate:6,years:10,comp:'12'})).final,1000*Math.pow(1.005,120));
chk('1% fee, annual',project(P({start:10000,annual:0,rate:7,years:30,fee:1})).final,10000*Math.pow(1.07*.99,30));
chk('0% return, contributions only',project(P({start:500,annual:100,rate:0,years:7})).final,1200);
const gs=[];let a=0;for(let y=0;y<5;y++){a=a*1.05+1000*Math.pow(1.03,y);}
chk('3% contribution step-up',project(P({start:0,annual:1000,rate:5,years:5,stepUp:3})).final,a);
chk('stop contributing after yr 3',project(P({start:0,annual:1000,rate:10,years:5,stopAfter:3})).final,fvAnn(1000,.1,3)*1.21);
const b=fvLump(10000,.07,20)+fvAnn(1000,.07,20),pr=10000+20000;
const dt=project(P({start:10000,annual:1000,rate:7,years:20,taxRate:15}));
chk('deferred tax: after-tax balance',dt.afterTax,b-(b-pr)*.15);
chk('annual tax = rate x (1-t), yr-end flows',project(P({start:10000,annual:1000,rate:8,years:15,taxRate:25,taxMode:'annual'})).final,fvLump(10000,.06,15)+fvAnn(1000,.06,15));
const ru=project(P({start:100000,annual:0,rate:0,years:20,wdAmount:10000,inflation:0,wdIndex:false}));
chk('runs out in yr 10 (0% return)',ru.ruinYear,10);chk('  balance is zero',ru.final,0);chk('  withdrawn total',ru.totalWithdrawn,100000);
const perp=project(P({start:100000,annual:0,rate:5,years:30,wdAmount:5000,inflation:0,wdIndex:false}));
chk('5% withdrawal at 5% keeps principal',perp.final,100000);
const ix=project(P({start:1e6,annual:0,rate:0,years:3,wdAmount:1000,inflation:10,wdIndex:true}));
chk('indexed withdrawals',ix.totalWithdrawn,1000+1100+1210);
const dw=project(P({start:100,annual:0,rate:0,years:1,wdAmount:50,taxRate:20,inflation:0}));
chk('no gain: no tax on withdrawal',dw.totalTax,0);
const tw=project(P({start:100,annual:0,rate:100,years:2,wdAmount:100,wdStart:2,taxRate:10,inflation:0,wdIndex:false}));
// yr1: 200 (prin 100). yr2 growth to 400; withdraw 100 at end: gain 300, share .25 -> tax 7.5; left 300, prin 75, gain 225 -> end tax 22.5
chk('pro-rata tax on withdrawn gain',tw.totalTax,30);
// Real values
const re=project(P({start:1000,annual:0,rate:0,years:10,inflation:3}));
chk('deflator',re.rows[10].deflator,Math.pow(1.03,10),1e-9);
chk('real principal, end-of-yr deposit',project(P({start:0,annual:100,rate:0,years:2,inflation:10})).rows[2].realPrincipal,100/1.1+100/1.21);
// Simulation
const s0=simulate(P({start:10000,annual:0,rate:7,years:20,vol:0.0001,mcOn:true}),200);
chk('sim with ~0 vol = deterministic',s0.p50[20],fvLump(10000,.07,20),1);
const s=simulate(P({start:10000,annual:0,rate:7,years:1,vol:15,mcOn:true}),200000);
const fin=Array.from(s.finals).map(v=>v/10000-1),mean=fin.reduce((x,y)=>x+y)/fin.length,sd=Math.sqrt(fin.reduce((x,y)=>x+(y-mean)*(y-mean),0)/fin.length);
chk('sim: 1-yr std dev matches input 15%',sd,.15,.002);
chk('sim: median year matches input 7%',s.p50[1]/10000-1,.07,.002);
const s30=simulate(P({start:10000,annual:0,rate:7,years:30,vol:15,mcOn:true}));
chk('sim: 30-yr median ~ deterministic (within 5%)',s30.p50[30]/fvLump(10000,.07,30),1,.05);
const s2=simulate(P({start:10000,annual:0,rate:7,years:30,vol:15,mcOn:true}));
chk('sim: repeatable (same seed)',s2.p10[30],s30.p10[30],0);
// Goal round trip
const gp=P({start:10000,annual:6000,rate:7,years:25,goal:1000000});
const g=solveGoal(gp);
chk('goal: solved contribution reaches target',project(P(Object.assign({},gp,{annual:g.neededAnnual}))).final,1e6,.01);
chk('goal: solved return reaches target',project(P(Object.assign({},gp,{rate:g.neededRate}))).final,1e6,.01);
const gr=solveGoal(P({start:10000,annual:6000,rate:7,years:25,goal:1000,goalReal:true}));
chk('goal: already there at yr 0',gr.reachedYear,0);
console.log(fail?`\n${fail} FAILED`:'\nALL PASSED');
const t=Date.now();simulate(P({years:60,freq:52,mcOn:true}));console.log('worst-case sim (60 yr, weekly, 2000 paths):',Date.now()-t,'ms');
console.log('default result:',project(P({})).final.toFixed(2));
process.exit(fail?1:0);
