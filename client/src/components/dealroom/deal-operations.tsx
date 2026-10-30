import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, ClipboardList, Link2, Loader2, Plus, RefreshCcw, ShieldCheck } from "lucide-react";

type DealStage = "qualified" | "nda_requested" | "nda_signed" | "due_diligence" | "offer" | "won" | "lost";
type Deal = {
  id:string; listingId:string; buyerId:string; ownerId:string; stage:DealStage;
  crmObjectId:string | null; notes:string; updatedAt:string;
};
type Task = {
  id:string; dealId:string; title:string; description:string; status:"open"|"done"|"canceled";
  dueAt:string | null; assignedTo:string;
};
type OutboxEvent = {
  id:string; dealId:string; status:string; eventType:string; attempts:number;
  externalObjectId:string | null; lastError:string | null; createdAt:string;
};
const transitions: Record<DealStage, DealStage[]> = {
  qualified:["nda_requested","lost"],
  nda_requested:["nda_signed","lost"],
  nda_signed:["due_diligence","lost"],
  due_diligence:["offer","lost"],
  offer:["won","lost","due_diligence"],
  won:[],lost:[],
};
const stageLabel: Record<DealStage,string> = {
  qualified:"Qualified", nda_requested:"NDA requested", nda_signed:"NDA verified",
  due_diligence:"Due diligence", offer:"Offer", won:"Won", lost:"Closed lost",
};
function headers(): Record<string,string> {
  const session=sessionStorage.getItem("dr_session_token");
  const token=localStorage.getItem("token");
  return {
    "Content-Type":"application/json",
    ...(session?{"X-DR-Session":session}:{}),
    ...(token?{Authorization:"Bearer "+token}:{}),
  };
}
async function request(path:string,init:RequestInit={}) {
  const response=await fetch(path,{...init,headers:{...headers(),...init.headers},cache:"no-store"});
  const body=await response.json().catch(()=>({})) as any;
  if(!response.ok) throw Error(typeof body.error==="string"?body.error:"Operation failed");
  return body;
}

export function DealOperationsPanel() {
  const [enabled,setEnabled]=useState(false);
  const [crmEnabled,setCrmEnabled]=useState(false);
  const [deals,setDeals]=useState<Deal[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [outbox,setOutbox]=useState<OutboxEvent[]>([]);
  const [buyerId,setBuyerId]=useState("");
  const [notes,setNotes]=useState("");
  const [taskTitles,setTaskTitles]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const refresh=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const cap=await request("/api/dealroom/ops/capabilities");
      setEnabled(cap.enabled===true);
      if(!cap.enabled)return;
      const data=await request("/api/dealroom/ops");
      setDeals(data.deals??[]);setTasks(data.tasks??[]);setOutbox(data.outbox??[]);
      setCrmEnabled(data.crmConfigured===true);
    } catch(error) {
      setError(error instanceof Error?error.message:"Could not fetch pipeline");
    } finally {setLoading(false);}
  },[]);

  useEffect(()=>{void refresh()},[refresh]);

  async function action(promise:Promise<unknown>,success:string) {
    setLoading(true);setError("");setNotice("");
    try {
      await promise;
      setNotice(success);
      await refresh();
    } catch(error) {
      setError(error instanceof Error?error.message:"Update failed");
    } finally {setLoading(false);}
  }

  function createDeal(event:FormEvent) {
    event.preventDefault();
    void action(
      request("/api/dealroom/ops/deals",{method:"POST",
        body:JSON.stringify({listingId:"MNA-2047",buyerId:buyerId.trim(),notes:notes.trim()})}),
      "A new synthetic pipeline opportunity is available."
    );
    setBuyerId("");setNotes("");
  }

  const taskCount=tasks.filter(t=>t.status==="open").length;
  const pending=outbox.filter(e=>e.status==="pending").length;
  if(!enabled && !error)return null;

  return (
    <section className="max-w-5xl mx-auto px-4 pb-16">
      <div className="border border-luxe-border/40 bg-luxe-surface">
        <div className="px-6 py-6 border-b border-luxe-border/30 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[9px] uppercase tracking-[0.35em] text-luxe-bronze mb-2">
              Agency operations · Synthetic case
            </div>
            <h2 className="font-serif italic text-2xl text-luxe-text">Deal Command Center</h2>
            <p className="text-xs text-luxe-text-muted mt-2">
              Follow-ups, deal progression and auditable CRM delivery, all tied to MNA-2047.
            </p>
          </div>
          <button onClick={()=>void refresh()} disabled={loading}
            className="h-9 px-3 text-[10px] uppercase tracking-widest flex gap-2 items-center border border-luxe-border/40 text-luxe-text hover:border-luxe-bronze/70">
            {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCcw className="h-4 w-4"/>} Refresh
          </button>
        </div>
        {(error||notice) && (
          <div className="px-6 pt-4">
            {error&&<p className="text-xs text-rose-400">{error}</p>}
            {notice&&<p className="text-xs text-emerald-400">{notice}</p>}
          </div>
        )}
        <div className="grid grid-cols-3 gap-px bg-luxe-border/20 border-b border-luxe-border/30">
          {[
            ["Open deals",deals.filter(d=>d.stage!=="won"&&d.stage!=="lost").length],
            ["Pending tasks",taskCount],
            ["CRM queue",pending],
          ].map(([label,value])=>(
            <div key={label} className="bg-luxe-surface px-5 py-5">
              <div className="text-[9px] uppercase tracking-widest text-luxe-text-muted">{label}</div>
              <div className="font-serif text-2xl mt-2 text-luxe-text">{value}</div>
            </div>
          ))}
        </div>
        {enabled && (
          <>
            <form onSubmit={createDeal} className="px-6 py-5 border-b border-luxe-border/30 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <label className="text-[10px] text-luxe-text-muted uppercase tracking-widest">
                Test buyer account UUID
                <input value={buyerId} onChange={e=>setBuyerId(e.target.value)} required
                  placeholder="Existing fictional client account ID"
                  className="block mt-2 h-10 w-full bg-luxe-bg border border-luxe-border/50 px-3 text-xs normal-case tracking-normal text-luxe-text"/>
              </label>
              <label className="text-[10px] text-luxe-text-muted uppercase tracking-widest">
                Internal note
                <input value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000}
                  placeholder="Scope and next steps"
                  className="block mt-2 h-10 w-full bg-luxe-bg border border-luxe-border/50 px-3 text-xs normal-case tracking-normal text-luxe-text"/>
              </label>
              <button disabled={loading||!buyerId.trim()} type="submit"
                className="h-10 px-4 bg-luxe-bronze text-luxe-bg flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-50">
                <Plus className="h-4 w-4"/> Create
              </button>
            </form>
            <div className="divide-y divide-luxe-border/20">
              {deals.map(deal=>{
                const dealTasks=tasks.filter(t=>t.dealId===deal.id);
                return (
                  <div key={deal.id} className="p-6">
                    <div className="flex justify-between gap-3 flex-wrap items-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.25em] text-luxe-bronze">{stageLabel[deal.stage]}</div>
                        <div className="text-sm text-luxe-text mt-1">{deal.id.slice(0,8)} · {deal.notes||"Confidential buyer workflow"}</div>
                        <div className="text-[10px] text-luxe-text-muted mt-2 font-mono">
                          Buyer ID: {deal.buyerId.slice(0,8)}… | CRM: {deal.crmObjectId??"Not synced"}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        {transitions[deal.stage].map(stage=>(
                          <button key={stage} type="button" disabled={loading}
                            onClick={()=>void action(request("/api/dealroom/ops/deals/"+deal.id+"/stage",{
                              method:"PATCH",body:JSON.stringify({stage}),
                            }),"Stage updated to "+stageLabel[stage])}
                            className="px-3 py-2 text-[9px] uppercase tracking-widest border border-luxe-border/50 text-luxe-text-muted hover:text-luxe-bronze hover:border-luxe-bronze/50 disabled:opacity-50">
                            <ArrowRight className="h-3 w-3 inline mr-1"/> {stageLabel[stage]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      {dealTasks.map(task=>(
                        <div key={task.id} className="flex items-center justify-between gap-3 py-2 border-b border-luxe-border/10">
                          <div className="flex gap-2 items-center">
                            <ClipboardList className="h-3.5 w-3.5 text-luxe-bronze"/>
                            <span className={"text-xs "+(task.status==="done"?"line-through text-luxe-text-muted":"text-luxe-text")}>{task.title}</span>
                          </div>
                          <button disabled={loading} type="button"
                            onClick={()=>void action(request("/api/dealroom/ops/tasks/"+task.id,{
                              method:"PATCH",body:JSON.stringify({status:task.status==="done"?"open":"done"}),
                            }),"Follow-up updated")}
                            className="text-[9px] uppercase tracking-widest text-luxe-bronze border border-luxe-border/30 px-2 py-1">
                            {task.status==="done"?"Reopen":<><Check className="h-3 w-3 inline mr-1"/> Complete</>}
                          </button>
                        </div>
                      ))}
                      <div className="pt-2 flex gap-2">
                        <input value={taskTitles[deal.id]??""}
                          onChange={e=>setTaskTitles(v=>({...v,[deal.id]:e.target.value}))}
                          placeholder="Add next action or follow-up…"
                          className="h-9 flex-1 bg-luxe-bg border border-luxe-border/40 text-xs text-luxe-text px-3"/>
                        <button type="button" disabled={loading||!taskTitles[deal.id]?.trim()}
                          onClick={()=>{ void action(request("/api/dealroom/ops/deals/"+deal.id+"/tasks",{
                            method:"POST",body:JSON.stringify({title:taskTitles[deal.id]}),
                          }),"Task added"); setTaskTitles(v=>({...v,[deal.id]:""})); }}
                          className="h-9 px-3 border border-luxe-bronze/40 text-luxe-bronze text-[10px] uppercase tracking-widest">
                          Add task
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!deals.length&&<p className="px-6 py-8 text-xs text-luxe-text-muted">Create a fictional buyer deal to start the workflow.</p>}
            </div>
            <div className="border-t border-luxe-border/30 px-6 py-5">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <div className="flex gap-2 items-center text-luxe-bronze text-[10px] uppercase tracking-widest">
                    <Link2 className="h-4 w-4"/> CRM Handoff
                  </div>
                  <p className="text-xs text-luxe-text-muted mt-2">
                    HubSpot sync is opt-in, sends fictional deal metadata only, and retains an auditable delivery queue.
                  </p>
                </div>
                <button type="button" disabled={!crmEnabled||loading||pending===0}
                  onClick={()=>void action(request("/api/dealroom/ops/crm/dispatch",{
                    method:"POST",body:JSON.stringify({confirm:"sync-synthetic"}),
                  }),"CRM delivery attempt recorded")}
                  className="h-9 px-4 border border-luxe-bronze/50 text-luxe-bronze text-[10px] uppercase tracking-widest disabled:opacity-40">
                  <ShieldCheck className="h-4 w-4 inline mr-2"/> Sync next event
                </button>
              </div>
              {outbox.slice(0,8).map(event=>(
                <div key={event.id} className="mt-3 py-2 flex justify-between gap-4 border-b border-luxe-border/10 text-[10px] text-luxe-text-muted">
                  <span className="font-mono">{event.dealId.slice(0,8)} · {event.eventType}</span>
                  <span>{event.status==="review_required"?"Manual review required":event.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
