# PrestigeEdge · Advanced capabilities

The platform's intelligence layer is organised around the buyer, the agent, and the transaction lifecycle. This matrix distinguishes established capabilities from their next development phase without treating architectural foundations as completed external integrations.

## AI capability matrix

| Capability | Input and current output | Interface / implementation | Development direction |
| --- | --- | --- | --- |
| ARIA concierge | Message and property-count context → short concierge response | [Chat interface](../client/src/components/ai/ai-chatbot.tsx), `processChatMessage` | Verified listing-level retrieval and conversation grounding |
| Property recommendations | Preferences and candidate properties → scored suggestions and reasons | [Recommendation panel](../client/src/components/ai/property-recommendations.tsx), `getPropertyRecommendations` | Stable ID grounding, output validation, broader candidate ranking |
| Portfolio market intelligence | Supplied listings and optional location → averages, trend narrative, insights, recommendations | [Market panel](../client/src/components/ai/market-analysis.tsx), `generateMarketAnalysis` | Verified external market feeds and deterministic financial calculations |
| Lead qualification | Prospect details → qualification score, interpretation, follow-up priority | [Agent tools](../client/src/components/admin/ai-tools.tsx), `qualifyLead` | Outcome tracking and score calibration |
| Listing narrative | Listing attributes and selected features → draft property description | [Description tool](../client/src/components/ai/ai-description-generator.tsx), `generatePropertyDescription` | Editorial approval and version history |
| Marketing content | Property details and content format → copy draft | [Agent tools](../client/src/components/admin/ai-tools.tsx), `generateMarketingContent` | Brand constraints, approval, and distribution integrations |
| Valuation intelligence | Address → indicative value, range, factors, comparable-property suggestions | [Agent tools](../client/src/components/admin/ai-tools.tsx), `generatePropertyValuation` | Verified comparable-sales retrieval and provenance-backed methodology |
| Staging advisory | Property identifier and style → written plan, room suggestions, palette, furnishings, cost and timeline | [Agent tools](../client/src/components/admin/ai-tools.tsx), `generateVirtualStaging` | Property-image context and generated staging imagery |

All service methods live in [server/services/ai.ts](../server/services/ai.ts).

## What reviewers should inspect

### Buyer intelligence

The buyer dashboard composes recommendations and portfolio analysis with operational features. Recommendations consider up to six supplied candidates. The current prompt lists candidate titles and attributes but does not include their actual IDs, so matching generated `propertyId` values back to inventory needs additional grounding.

ARIA receives a property count, not full listing retrieval. Its prompt also contains a fixed price range. It is a concierge interaction foundation, not an authoritative source of listing availability or current market facts.

### Agent advisory workspace

The **AI Business Tools** interface exposes qualification, marketing, valuation, and staging. Description generation is a separate component used for listing copy. Protected AI endpoints require an active authenticated agent or administrator.

Valuation currently requests model-generated estimates from an address; no verified comparable-sales source is queried. Suggested comparables and values require professional verification. Staging currently supplies a written planning output; property photographs are not sent to the model by this method.

### AI service continuity

Task-specific exception handling provides continuity responses for provider or parsing failures. This is an initial availability mechanism, with explicit response provenance and operator visibility identified for the next phase. Current responses should not be used as evidence that a particular request reached the provider.

Some continuity outputs contain fixed scores or figures. A uniform status envelope, schema validation, and trusted-data calculations should precede consequential use.

## Platform operations

- **Property administration:** agent/admin creation, editing, deletion, and media submission.
- **Relationship workflows:** inquiries, saved properties, messages, viewings, consultations.
- **Brand configuration:** administrative brand settings and email configuration.
- **Dashboard measurement:** agency statistics and analytics responses; selected marketing endpoints return illustrative figures.
- **Subscription infrastructure:** tier and subscription service code is included. End-to-end payment settlement is not established by this documentation.

## Confidential transaction capability

The Deal Room introduces explicit session, envelope, grant, and audit concepts. Its current implementation can be inspected independently from the agency's JWT identity model.

Key engineering evidence:

1. Buyer/admin role checks occur in server routes.
2. A buyer cannot complete another session's envelope.
3. An NDA request reuses an existing envelope for the same session and listing.
4. Confidential record and CIM requests independently check an access grant.
5. The administrator's response removes buyer session-token fields from envelope and grant records.
6. Named events record requests, signing completion, grant issuance, and protected reads.

[Full lifecycle and infrastructure stages →](deal-room.md)

## Evidence standard

Source links identify implementation, not proof of deployment, commercial outcomes, appraisal accuracy, or provider availability. The verification record separately identifies checks performed during repository preparation.
