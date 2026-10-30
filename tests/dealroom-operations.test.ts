import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allowedOperationsListing, canTransition, normalizeTask, operationsEnabled, validStage } from "../server/dealroom/operations-policy";
import { hubspotConfig, hubspotProperties, HubSpotClient, type HubSpotConfig } from "../server/dealroom/hubspot-crm";

const map={
  qualified:"appointmentscheduled",nda_requested:"qualifiedtobuy",
  nda_signed:"presentationscheduled",due_diligence:"decisionmakerboughtin",
  offer:"contractsent",won:"closedwon",lost:"closedlost",
};
const config: HubSpotConfig={
  token:"test-token",pipelineId:"default",stages:map,apiVersion:"v3",
};
const deal={id:"00000000-0000-4000-8000-000000000012",listingId:"MNA-2047",stage:"qualified" as const};

describe("Deal Room operations and CRM",()=>{
  it("permits only fictional inventory",()=>{
    assert.equal(allowedOperationsListing("MNA-2047"),true);
    assert.equal(allowedOperationsListing("existing-property"),false);
    assert.equal(operationsEnabled({DEALROOM_STORAGE:"postgres",DEALROOM_OPERATIONS_ENABLED:"true"}),true);
    assert.equal(operationsEnabled({DEALROOM_OPERATIONS_ENABLED:"true"}),false);
  });
  it("enforces allowed deal stages and externally-verified NDA gates",()=>{
    assert.equal(validStage("unknown"),false);
    assert.equal(canTransition("qualified","nda_requested",false),true);
    assert.equal(canTransition("qualified","nda_signed",true),false);
    assert.equal(canTransition("nda_requested","nda_signed",false),false);
    assert.equal(canTransition("nda_requested","nda_signed",true),true);
    assert.equal(canTransition("nda_signed","due_diligence",true),true);
    assert.equal(canTransition("offer","won",true),true);
    assert.equal(canTransition("won","qualified",true),false);
    assert.equal(canTransition("offer","lost",false),true);
  });
  it("validates staff task titles, details and due dates",()=>{
    assert.equal(normalizeTask({title:" Call buyer  "}).title,"Call buyer");
    assert.throws(()=>normalizeTask({title:""}));
    assert.throws(()=>normalizeTask({title:"a".repeat(201)}));
    assert.throws(()=>normalizeTask({title:"Review",dueAt:"broken"}));
    assert.throws(()=>normalizeTask({title:"Review",dueAt:"2020-01-01"}));
  });
  it("keeps HubSpot disabled without opt-in, token, pipeline and stage mapping",()=>{
    assert.equal(hubspotConfig({}),null);
    assert.equal(hubspotConfig({DEALROOM_CRM_PROVIDER:"hubspot",DEALROOM_CRM_SYNC_ENABLED:"true"}),null);
    const env={
      DEALROOM_OPERATIONS_ENABLED:"true",DEALROOM_CRM_PROVIDER:"hubspot",
      DEALROOM_CRM_SYNC_ENABLED:"true",HUBSPOT_ACCESS_TOKEN:"token",
      HUBSPOT_DEAL_PIPELINE_ID:"default",
      ...Object.fromEntries(Object.entries(map).map(([k,v])=>["HUBSPOT_STAGE_"+k.toUpperCase(),v])),
    };
    assert.equal(hubspotConfig(env)?.pipelineId,"default");
    assert.equal(hubspotConfig({...env,HUBSPOT_STAGE_OFFER:""}),null);
  });
  it("does not export any buyer identifiers or private document content",()=>{
    const body=hubspotProperties(deal,config);
    assert.equal(body.dealname,"PRESTIGE EDGE DEMO | "+deal.id);
    assert.equal(body.dealstage,map.qualified);
    assert.ok(!JSON.stringify(body).includes("buyer"));
    assert.throws(()=>hubspotProperties({...deal,listingId:"REAL-RECORD"},config));
  });
  it("creates a synthetic HubSpot deal once with expected POST payload",async()=>{
    let method="",url="",json:any;
    const fake: typeof fetch=async(target,init)=>{
      url=String(target);method=String(init?.method);json=JSON.parse(String(init?.body));
      return new Response(JSON.stringify({id:"123456789"}),{status:201});
    };
    const id=await new HubSpotClient(config,fake).upsertSyntheticDeal(deal);
    assert.equal(id,"123456789");
    assert.equal(method,"POST");
    assert.equal(url,"https://api.hubapi.com/crm/v3/objects/deals");
    assert.equal(json.properties.dealname,"PRESTIGE EDGE DEMO | "+deal.id);
  });
  it("updates an existing HubSpot ID with PATCH, not a duplicate POST",async()=>{
    let method="",url="";
    const fake: typeof fetch=async(target,init)=>{
      url=String(target);method=String(init?.method);
      return new Response(JSON.stringify({id:"123456789"}),{status:200});
    };
    await new HubSpotClient(config,fake).upsertSyntheticDeal({...deal,crmObjectId:"123456789"});
    assert.equal(method,"PATCH");
    assert.ok(url.endsWith("/123456789"));
    await assert.rejects(()=>new HubSpotClient(config,fake).upsertSyntheticDeal({...deal,crmObjectId:"../wrong"}));
  });
  it("fails closed on provider faults and mismatched IDs",async()=>{
    const failure=new HubSpotClient(config,async()=>new Response("remote-data", {status:503}));
    await assert.rejects(()=>failure.upsertSyntheticDeal(deal),/HTTP 503/);
    const wrong=new HubSpotClient(config,async()=>new Response(JSON.stringify({id:"999"}),{status:200}));
    await assert.rejects(()=>wrong.upsertSyntheticDeal({...deal,crmObjectId:"123456789"}),/conflicting/);
  });
});
