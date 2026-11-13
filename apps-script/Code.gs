/** Pedison unified CRM - internal Google Workspace deployment only. */
const TABS={
 Leads:['id','createdAt','updatedAt','company','contact','email','phone','track','stage','owner','source','notes'],
 Applications:['id','createdAt','updatedAt','leadId','track','company','status','dataJson','submittedBy'],
 Activities:['id','createdAt','leadId','type','description','actor'],
 Tasks:['id','createdAt','leadId','dueDate','description','status','owner'],
 Documents:['id','createdAt','leadId','description','driveFileId','actor'],
 Audit:['at','actor','action','recordId','details'],
 Settings:['key','value']
};
const STAGES=['New','Contacted','Qualified','Application Started','Application Received','Documents Pending','Under Review','Lender Matching','Approved','Funded','Declined','Closed'];
const TRACKS=['Business Loan','NCCB Credit Builder'];
function config_(){
 const p=PropertiesService.getScriptProperties();
 const id=p.getProperty('SPREADSHEET_ID');
 if(!id) throw Error('SPREADSHEET_ID is not configured');
 return {id, admins:(p.getProperty('ADMIN_EMAILS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean),domain:(p.getProperty('ALLOWED_DOMAIN')||'').toLowerCase()};
}
function actor_(){
 const c=config_(),email=Session.getActiveUser().getEmail().toLowerCase();
 if(!email) throw Error('Sign in using an authorized Google Workspace account.');
 if(!(c.admins.includes(email)||(c.domain && email.endsWith('@'+c.domain)))) throw Error('Not authorized.');
 return email;
}
function book_(){return SpreadsheetApp.openById(config_().id)}
function sheet_(name){const s=book_().getSheetByName(name);if(!s)throw Error('CRM not initialized: '+name);return s}
function initializeCRM(){
 actor_();const b=book_();
 Object.entries(TABS).forEach(([name,cols])=>{let s=b.getSheetByName(name)||b.insertSheet(name);if(s.getLastRow()===0){s.appendRow(cols);s.setFrozenRows(1);s.getRange(1,1,1,cols.length).setBackground('#1b3655').setFontColor('#ffffff').setFontWeight('bold');}});
 return 'Initialized '+Object.keys(TABS).join(', ');
}
function safe_(v,max=2000){return String(v==null?'':v).slice(0,max).replace(/[\x00-\x1f]/g,'').trim()}
function cell_(v,max){let s=safe_(v,max);return /^[=+@\-]/.test(s)?"'"+s:s}
function uid_(prefix){return prefix+'-'+Utilities.getUuid().slice(0,12).toUpperCase()}
function rows_(tab){const a=sheet_(tab).getDataRange().getValues(),h=a.shift();return a.filter(r=>r[0]).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))}
function log_(actor,action,id,detail){sheet_('Audit').appendRow([new Date(),actor,action,id,safe_(detail,300)])}
function doGet(){actor_();return HtmlService.createHtmlOutputFromFile('Index').setTitle('Pedison | Funding & Credit Builder CRM').addMetaTag('viewport','width=device-width, initial-scale=1')}
function getDashboard(){
 actor_();const leads=rows_('Leads'),apps=rows_('Applications'),tasks=rows_('Tasks');
 return {leads:leads.slice(-250).reverse(),applications:apps.slice(-250).reverse().map(a=>({...a,dataJson:undefined})),tasks:tasks.slice(-150).reverse(),stages:STAGES,tracks:TRACKS,summary:{leads:leads.length,applications:apps.length,openTasks:tasks.filter(t=>t.status!=='Done').length,funded:leads.filter(x=>x.stage==='Funded').length}};
}
function addLead(d){
 const actor=actor_();if(!d||!TRACKS.includes(d.track))throw Error('Invalid track');
 const company=safe_(d.company,160),contact=safe_(d.contact,120),email=safe_(d.email,160);
 if(!company||!contact||!/^\S+@\S+\.\S+$/.test(email))throw Error('Company, contact and valid email required');
 const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  const duplicate=rows_('Leads').find(x=>String(x.email).toLowerCase()===email.toLowerCase()&&String(x.company).toLowerCase()===company.toLowerCase());
  if(duplicate)throw Error('Potential duplicate: '+duplicate.id);
  const id=uid_('LEAD'),now=new Date();
  sheet_('Leads').appendRow([id,now,now,cell_(company,160),cell_(contact,120),cell_(email,160),cell_(d.phone,40),d.track,'New',actor,cell_(d.source,120),cell_(d.notes,1000)]);
  log_(actor,'ADD_LEAD',id,company);return {id};
 }finally{lock.releaseLock()}
}
function updateStage(id,stage){
 const actor=actor_();if(!STAGES.includes(stage))throw Error('Invalid stage');
 const s=sheet_('Leads'),data=s.getDataRange().getValues(),index=data.findIndex((r,i)=>i>0&&r[0]===id);
 if(index<0)throw Error('Lead not found');
 s.getRange(index+1,7).setValue(data[index][6]); // preserve track
 s.getRange(index+1,9).setValue(stage);s.getRange(index+1,3).setValue(new Date());
 log_(actor,'STAGE',id,stage);return {ok:true};
}
function submitApplication(d){
 const actor=actor_();if(!d||!TRACKS.includes(d.track)||!d.fields||typeof d.fields!=='object'||Array.isArray(d.fields))throw Error('Invalid application');
 const lead=rows_('Leads').find(x=>x.id===d.leadId);if(!lead||lead.track!==d.track)throw Error('Lead/track mismatch');
 const allowed=d.track==='Business Loan'?LOAN_FIELDS:NCCB_FIELDS;
 const fields={};
 Object.keys(d.fields).forEach(k=>{if(!allowed.includes(k))throw Error('Unexpected field: '+k);fields[k]=safe_(d.fields[k],2000)});
 if(!fields.certification||fields.certification!=='yes')throw Error('Applicant certification required');
 if(JSON.stringify(fields).length>40000)throw Error('Application too large');
 const id=uid_('APP'),now=new Date();
 sheet_('Applications').appendRow([id,now,now,d.leadId,d.track,cell_(lead.company,160),'Received',JSON.stringify(fields),actor]);
 updateStage(d.leadId,'Application Received');log_(actor,'APPLICATION',id,d.track);
 return {id};
}
const LOAN_FIELDS=["partnerId","intendedUseOfFunds","applicationDate","creditApplicationType","legalCompanyName","dba","legalEntity","legalEntityOther","stateOfIncorporation","businessInceptionDate","taxIdLast4","companyType","companyIndustry","companyPhone","companyEmail","physicalAddress","city","state","zip","rentOrOwn","landlordName","landlordPhone","outstandingMca","outstandingMcaDetails","separateBusinessBankAccount","acceptedCardsThreeMonths","annualBusinessRevenue","averageBankBalance","monthlyCreditCardVolume","loanAmountRequested","desiredLoanAmount","owner1Name","owner1Phone","owner1Email","owner1Address","owner1AnnualIncome","owner1OwnershipPercent","owner1LicenseState","owner2Name","owner2Phone","owner2Email","owner2Address","owner2AnnualIncome","owner2OwnershipPercent","owner2LicenseState","certification"];
const NCCB_FIELDS=['dba','website','startDate','employees','streetAddress','mailingAddress','businessDescription','paymentTerms','salesTerritory','customerTypes','entityType','incorporationDate','incorporationState','tradeStyleRegistered','revenueCurrent','revenuePrior','revenueProjected','owner1Name','owner1Title','owner1Ownership','owner1Education','owner1Experience','owner1OtherBusinesses','owner2Name','owner2Title','owner2Ownership','owner2Education','owner2Experience','owner2OtherBusinesses','owner3Name','owner3Title','owner3Ownership','owner3Education','owner3Experience','owner3OtherBusinesses','certification',...Array.from({length:16},(_,i)=>['vendor'+(i+1)+'Name','vendor'+(i+1)+'Contact','vendor'+(i+1)+'Phone','vendor'+(i+1)+'Email','vendor'+(i+1)+'AccountRef','vendor'+(i+1)+'Bureau','vendor'+(i+1)+'Address','vendor'+(i+1)+'Product','vendor'+(i+1)+'Limit']).flat()];
function addActivity(d){const actor=actor_();if(!rows_('Leads').some(x=>x.id===d.leadId))throw Error('Unknown lead');const id=uid_('ACT');sheet_('Activities').appendRow([id,new Date(),d.leadId,cell_(d.type,50),cell_(d.description,1200),actor]);log_(actor,'ACTIVITY',id,d.leadId);return {id}}
function addTask(d){const actor=actor_();if(!rows_('Leads').some(x=>x.id===d.leadId))throw Error('Unknown lead');const id=uid_('TASK');sheet_('Tasks').appendRow([id,new Date(),d.leadId,cell_(d.dueDate,30),cell_(d.description,500),'Open',actor]);log_(actor,'TASK',id,d.leadId);return {id}}
function selfTest(){actor_();return {sheets:Object.keys(TABS).every(k=>!!book_().getSheetByName(k)),tracks:TRACKS.length,stages:STAGES.length,loanFields:LOAN_FIELDS.length,nccbFields:NCCB_FIELDS.length}}
