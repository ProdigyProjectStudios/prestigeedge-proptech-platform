# PrestigeEdge · API guide

This is a source-oriented guide to representative routes, not an exhaustive generated OpenAPI contract. The authoritative handlers are [agency routes](../server/routes.ts) and [Deal Room routes](../server/dealroom/routes.ts).

## Authentication conventions

- Agency protected routes: `Authorization: Bearer <JWT>`.
- Agent/admin routes additionally use `requireAgentOrAdmin`; administrator routes use `requireAdmin`.
- Deal Room routes use a separate `X-DR-Session` token from the demonstration session endpoint.
- Access is route-specific. Public catalogue and public AI endpoints should not be assumed to require JWTs.

## Agency endpoints

| Area | Representative endpoints | Boundary |
| --- | --- | --- |
| Identity | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Registration/login public; current user requires JWT |
| Catalogue | `GET /api/properties`, `/featured`, `/:id` | Public |
| Listing writes | `POST /api/properties`, `PUT/DELETE /api/properties/:id` | Agent/admin |
| Saved collections | `GET /api/saved-properties`, `POST/DELETE /api/saved-properties/:propertyId` | Authenticated |
| Inquiries | `GET/POST /api/inquiries`, `PUT/DELETE /api/inquiries/:id` | Authenticated; updates require agent/admin; inspect route ownership checks |
| Messages | `GET/POST /api/messages`, `PATCH /api/messages/:id/read` | Authenticated |
| Viewings | `GET/POST /api/viewings`, `PATCH/DELETE /api/viewings/:id` | Authenticated; route-specific checks |
| Consultations | `POST /api/consultations`, `GET /api/admin/consultations` | Intake public; management agent/admin |
| Brand | `GET/PUT /api/brand-settings` | Public read; admin write |
| Upload | `POST /api/upload` | Authenticated |
| Health | `GET /health` | Public; process health response |

## AI routes

All accept JSON. Values below describe request shapes, not runnable fixtures or complete validation schemas.

| Endpoint (`POST`) | Request body | Response key | Boundary |
| --- | --- | --- | --- |
| `/api/ai/chat` | `{ message }` | `message` | Public |
| `/api/ai/recommendations` | `{ preferences, properties }` | `recommendations` | Public |
| `/api/ai/market-analysis` | `{ properties, location }` | `analysis` | Public |
| `/api/ai/generate-description` | `{ property }` | `description` | Agent/admin |
| `/api/ai/qualify-lead` | Lead fields directly in the request object | `qualification` | Agent/admin |
| `/api/ai/marketing-content` | `{ property, contentType }` | `content` | Agent/admin |
| `/api/ai/valuation` | `{ address }` | `valuation` | Agent/admin |
| `/api/ai/virtual-staging` | `{ propertyId, style }` | `staging` | Agent/admin |

Supply property arrays to recommendations and market analysis. These endpoints currently use request-supplied inventory rather than automatically loading an authoritative market dataset.

Responses do not yet carry a shared provenance/error envelope. A successful HTTP response can contain a continuity response rather than live provider output. Output validation and explicit provenance are next-stage API work.

## Deal Room routes

| Method | Endpoint | Boundary |
| --- | --- | --- |
| POST | `/api/dealroom/session` | Public demo role selection: `{ role: "buyer" \| "admin" }` |
| GET | `/api/dealroom/session` | Valid Deal Room session |
| GET | `/api/dealroom/listings/:id` | Public teaser |
| GET | `/api/dealroom/listings/:id/status` | Buyer session |
| POST | `/api/dealroom/listings/:id/nda` | Buyer session; create/reuse envelope |
| POST | `/api/dealroom/envelopes/:envelopeId/sign` | Buyer session; envelope ownership |
| GET | `/api/dealroom/listings/:id/confidential` | Buyer session and listing grant |
| GET | `/api/dealroom/listings/:id/cim` | Buyer session and listing grant |
| GET | `/api/dealroom/admin/listings/:id` | Admin demo session |

Missing sessions return `401`; role/ownership/grant denials use `403`; unknown records use `404` where resolved by the route.

## Integration boundaries

SMTP, maps configuration, marketing, subscription, and billing-related routes also exist. Their presence is not an assertion of configured external credentials or end-to-end commercial processing. Review these handlers before connecting production services or exposing them to client data.
