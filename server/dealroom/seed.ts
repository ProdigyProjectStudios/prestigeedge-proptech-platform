// SERVER-ONLY: Confidential deal room seed data.
// The CONFIDENTIAL_RECORD below must NEVER be sent in a public API response.

export const LISTING_ID = "MNA-2047";

// Safe to return publicly — blind teaser only
export const PUBLIC_TEASER = {
  listingId: LISTING_ID,
  title: "Confidential Specialty Logistics Business",
  industry: "Specialty Freight & Logistics",
  region: "Mid-Atlantic, United States",
  revenueRange: "$18M – $24M",
  ebitdaRange: "$3.2M – $4.1M",
  askingPriceRange: "$22M – $28M",
  established: "Founded 2008",
  employees: "85 – 100 FTEs",
  summary:
    "A well-established, asset-light specialty logistics operator providing time-sensitive freight services to regulated industries. The business carries long-term contracts with Fortune 500 clients, recurring revenue exceeding 70% of annual billings, and strong EBITDA margins supported by a proprietary routing platform. Ownership is pursuing a full exit. Strategic and financial buyers welcome.",
  highlights: [
    "Long-term Fortune 500 contracts",
    "Proprietary dispatch & routing technology",
    ">70% recurring revenue",
    "Asset-light operating model",
    "Scalable to adjacent corridors",
  ],
};

// NEVER exported to client. Only accessible via protected server routes.
export const CONFIDENTIAL_RECORD = {
  listingId: LISTING_ID,
  companyName: "Meridian Freight Solutions LLC",
  legalName: "Meridian Freight Solutions LLC (DE)",
  address: "2847 Commerce Park Drive, Wilmington, Delaware 19801",
  website: "meridianfreightsolutions.example",
  yearFounded: 2008,
  revenue: 21_400_000,
  ebitda: 3_720_000,
  ebitdaMargin: "17.4%",
  netIncome: 2_890_000,
  askingPrice: 24_500_000,
  evEbitdaMultiple: "6.6×",
  sellerNotes:
    "Principal is retiring after 16 years. No key-man dependency — two senior managers are willing to stay through transition. A 24-month earnout on the proprietary routing platform is negotiable. Seller will not consider asset-only offers. Preferred close Q3 of current fiscal year.",
  cimContent: {
    sections: [
      {
        heading: "Executive Summary",
        body: "Meridian Freight Solutions LLC is a Delaware-incorporated specialty logistics company with 16 years of uninterrupted operations serving pharmaceutical, aerospace-component, and temperature-sensitive food manufacturers across the Mid-Atlantic corridor.",
      },
      {
        heading: "Financial Highlights (TTM)",
        body: "Revenue $21.4M | EBITDA $3.72M (17.4%) | Net Income $2.89M | D/E ratio 0.22× | Operating cash conversion 94%.",
      },
      {
        heading: "Technology & Competitive Moat",
        body: "The proprietary RouteSense™ dispatch platform (built 2019, updated 2023) reduces fuel cost per mile by ~12% versus industry average. Platform is licensed, not open-source, and fully owned by the entity.",
      },
      {
        heading: "Customer Concentration",
        body: "Top 3 clients represent 48% of revenue; all hold multi-year service agreements expiring no earlier than 2027. NDA-protected names disclosed at LOI stage.",
      },
      {
        heading: "Transaction Structure",
        body: "Stock sale preferred. Seller will entertain asset-sale discussion at a 0.8× revenue floor. Earnout on RouteSense™ platform performance available for motivated strategic buyers.",
      },
    ],
  },
};
