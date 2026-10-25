import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  integer,
  bigint,
  boolean,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "client", "agent"]);
export const propertyStatusEnum = pgEnum("property_status", ["available", "sold", "pending"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["open", "in_progress", "closed"]);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);



// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("client"),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Subscription fields
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("inactive"), // active, inactive, past_due, canceled
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"), // free, basic, premium, enterprise
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
});

// Properties table
export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: bigint("price", { mode: "number" }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  beds: integer("beds").notNull(),
  baths: integer("baths").notNull(),
  sqft: integer("sqft").notNull(),
  propertyType: varchar("property_type", { length: 100 }).notNull(),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  virtualTourImages: text("virtual_tour_images").array().notNull().default(sql`ARRAY[]::text[]`),
  features: text("features").array().notNull().default(sql`ARRAY[]::text[]`),
  status: propertyStatusEnum("status").notNull().default("available"),
  isFeatured: boolean("is_featured").notNull().default(false),
  agentId: uuid("agent_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Inquiries table
export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull(),
  clientId: uuid("client_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  message: text("message").notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  status: inquiryStatusEnum("status").notNull().default("open"),
  response: text("response"),
  agentNotes: text("agent_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Saved properties table (for clients to save properties)
export const savedProperties = pgTable("saved_properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  propertyId: uuid("property_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messages table for communication between users
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  parentMessageId: uuid("parent_message_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Property viewings table for booking system
export const propertyViewings = pgTable("property_viewings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").notNull(),
  clientId: uuid("client_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  viewingDate: timestamp("viewing_date").notNull(),
  duration: integer("duration").notNull().default(60), // in minutes
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, confirmed, cancelled, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Consultations table for general consultation booking (not property-specific)
export const consultations = pgTable("consultations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  agentId: uuid("agent_id").notNull(),
  consultationType: varchar("consultation_type", { length: 100 }).notNull(), // Investment Strategy, Property Acquisition, etc.
  consultationDate: timestamp("consultation_date").notNull(),
  timeSlot: varchar("time_slot", { length: 20 }).notNull(), // e.g., "09:00 AM"
  duration: integer("duration").notNull().default(60), // in minutes
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, confirmed, cancelled, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Brand settings table for customization
export const brandSettings = pgTable("brand_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Basic branding
  companyName: varchar("company_name", { length: 255 }).notNull().default("PrestigeEdge"),
  tagline: varchar("tagline", { length: 500 }).default("Luxury Real Estate Excellence"),
  logoUrl: varchar("logo_url", { length: 500 }),
  faviconUrl: varchar("favicon_url", { length: 500 }),
  
  // Colors
  primaryColor: varchar("primary_color", { length: 50 }).notNull().default("#FFD700"), // Gold
  secondaryColor: varchar("secondary_color", { length: 50 }).notNull().default("#000000"), // Black
  accentColor: varchar("accent_color", { length: 50 }).notNull().default("#F5F5DC"), // Platinum
  
  // Contact Info
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactAddress: text("contact_address"),
  
  // Social Media
  socialLinks: jsonb("social_links").default({}), // { facebook: "", instagram: "", linkedin: "", twitter: "", youtube: "" }
  
  // Content
  heroImages: text("hero_images").array().notNull().default(sql`ARRAY[]::text[]`),
  aboutText: text("about_text"),
  footerText: text("footer_text"),
  
  // SEO
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  googleAnalyticsId: varchar("google_analytics_id", { length: 50 }),
  
  // Legal
  termsUrl: varchar("terms_url", { length: 500 }),
  privacyUrl: varchar("privacy_url", { length: 500 }),
  
  // Advanced Customization
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  
  // Email Templates
  emailTemplates: jsonb("email_templates").default({
    welcome: true,
    inquiryNotification: true,
    viewingConfirmation: true,
    messageNotification: true
  }),
  
  // Feature Toggles
  features: jsonb("features").default({
    virtualTours: true,
    propertyAlerts: true,
    messaging: true,
    viewingScheduler: true,
    socialSharing: true
  }),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  inquiries: many(inquiries),
  savedProperties: many(savedProperties),
  sentMessages: many(messages),
  receivedMessages: many(messages),
  propertyViewings: many(propertyViewings),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
  }),
  inquiries: many(inquiries),
  savedByUsers: many(savedProperties),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
  }),
  client: one(users, {
    fields: [inquiries.clientId],
    references: [users.id],
  }),
  agent: one(users, {
    fields: [inquiries.agentId],
    references: [users.id],
  }),
}));

export const savedPropertiesRelations = relations(savedProperties, ({ one }) => ({
  user: one(users, {
    fields: [savedProperties.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [savedProperties.propertyId],
    references: [properties.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
  }),
}));

export const propertyViewingsRelations = relations(propertyViewings, ({ one }) => ({
  property: one(properties, {
    fields: [propertyViewings.propertyId],
    references: [properties.id],
  }),
  client: one(users, {
    fields: [propertyViewings.clientId],
    references: [users.id],
  }),
  agent: one(users, {
    fields: [propertyViewings.agentId],
    references: [users.id],
  }),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().optional(), // Allow name field for display purposes
});

export const insertSavedPropertySchema = createInsertSchema(savedProperties).omit({
  id: true,
  createdAt: true,
});

export const insertBrandSettingsSchema = createInsertSchema(brandSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyViewingSchema = createInsertSchema(propertyViewings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Property search schema
export const propertySearchSchema = z.object({
  location: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  beds: z.number().optional(),
  baths: z.number().optional(),
  minSqft: z.number().optional(),
  maxSqft: z.number().optional(),
  propertyType: z.string().optional(),
  status: z.string().optional(),
  featured: z.string().optional(), // "true" or undefined
  features: z.string().optional(), // comma-separated features
  page: z.number().default(1),
  limit: z.number().default(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type SavedProperty = typeof savedProperties.$inferSelect;
export type InsertSavedProperty = z.infer<typeof insertSavedPropertySchema>;
export type BrandSettings = typeof brandSettings.$inferSelect;
export type InsertBrandSettings = z.infer<typeof insertBrandSettingsSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type PropertyViewing = typeof propertyViewings.$inferSelect;
export type InsertPropertyViewing = z.infer<typeof insertPropertyViewingSchema>;

// Consultation schema  
export const insertConsultationSchema = createInsertSchema(consultations, {
  consultationDate: z.string().datetime(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type PropertySearchParams = z.infer<typeof propertySearchSchema>;
