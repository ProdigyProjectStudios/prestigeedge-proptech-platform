import {
  users,
  properties,
  inquiries,
  savedProperties,
  brandSettings,
  messages,
  propertyViewings,
  consultations,
  type User,
  type InsertUser,
  type Property,
  type InsertProperty,
  type Inquiry,
  type InsertInquiry,
  type SavedProperty,
  type InsertSavedProperty,
  type BrandSettings,
  type InsertBrandSettings,
  type PropertySearchParams,
  type Message,
  type InsertMessage,
  type PropertyViewing,
  type InsertPropertyViewing,
  type Consultation,
  type InsertConsultation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, ilike, desc, asc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserStripeInfo(id: string, info: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Property operations
  getProperty(id: string): Promise<Property | undefined>;
  getProperties(params: PropertySearchParams): Promise<{
    properties: Property[];
    total: number;
    totalPages: number;
    currentPage: number;
  }>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  getPropertiesByAgent(agentId: string): Promise<Property[]>;
  getFeaturedProperties(): Promise<Property[]>;

  // Inquiry operations
  getInquiry(id: string): Promise<Inquiry | undefined>;
  getInquiries(): Promise<Inquiry[]>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  updateInquiry(id: string, inquiry: Partial<InsertInquiry>): Promise<Inquiry | undefined>;
  deleteInquiry(id: string): Promise<boolean>;
  getInquiriesByAgent(agentId: string): Promise<Inquiry[]>;
  getInquiriesByClient(clientId: string): Promise<Inquiry[]>;

  // Saved properties operations
  getSavedProperties(userId: string): Promise<Property[]>;
  saveProperty(userId: string, propertyId: string): Promise<SavedProperty>;
  unsaveProperty(userId: string, propertyId: string): Promise<boolean>;
  isPropertySaved(userId: string, propertyId: string): Promise<boolean>;

  // Brand settings operations
  getBrandSettings(): Promise<BrandSettings | undefined>;
  updateBrandSettings(settings: Partial<InsertBrandSettings>): Promise<BrandSettings>;

  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  getMessages(userId: string, type: 'sent' | 'received' | 'all'): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Property viewing operations
  getPropertyViewing(id: string): Promise<PropertyViewing | undefined>;
  getPropertyViewingsByClient(clientId: string): Promise<PropertyViewing[]>;
  getPropertyViewingsByAgent(agentId: string): Promise<PropertyViewing[]>;
  getPropertyViewingsByProperty(propertyId: string): Promise<PropertyViewing[]>;
  createPropertyViewing(viewing: InsertPropertyViewing): Promise<PropertyViewing>;
  updatePropertyViewing(id: string, viewing: Partial<InsertPropertyViewing>): Promise<PropertyViewing | undefined>;
  deletePropertyViewing(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, info: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...info, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Property operations
  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    if (property) {
      // Ensure virtualTourImages is included
      return {
        ...property,
        virtualTourImages: property.virtualTourImages || []
      };
    }
    return property;
  }

  async getProperties(params: PropertySearchParams): Promise<{
    properties: Property[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { 
      location, 
      minPrice, 
      maxPrice, 
      beds, 
      baths, 
      minSqft,
      maxSqft,
      propertyType, 
      status,
      featured,
      features,
      page, 
      limit 
    } = params;
    
    let whereConditions: any[] = [];

    // Default to available status unless specified otherwise
    if (status) {
      whereConditions.push(eq(properties.status, status.toLowerCase() as any));
    } else {
      whereConditions.push(eq(properties.status, "available"));
    }

    if (location) {
      whereConditions.push(
        or(
          ilike(properties.location, `%${location}%`),
          ilike(properties.address, `%${location}%`)
        )
      );
    }

    if (minPrice !== undefined) {
      whereConditions.push(gte(properties.price, minPrice));
    }

    if (maxPrice !== undefined) {
      whereConditions.push(lte(properties.price, maxPrice));
    }

    if (beds !== undefined) {
      whereConditions.push(gte(properties.beds, beds));
    }

    if (baths !== undefined) {
      whereConditions.push(gte(properties.baths, baths));
    }

    if (minSqft !== undefined) {
      whereConditions.push(gte(properties.sqft, minSqft));
    }

    if (maxSqft !== undefined) {
      whereConditions.push(lte(properties.sqft, maxSqft));
    }

    if (propertyType) {
      whereConditions.push(ilike(properties.propertyType, `%${propertyType}%`));
    }

    if (featured === "true") {
      whereConditions.push(eq(properties.isFeatured, true));
    }

    // Handle features filter (comma-separated list)
    if (features) {
      const featureList = features.split(',').map(f => f.trim());
      // Check if property has any of the requested features
      const featureConditions = featureList.map(feature => 
        sql`${properties.features} @> ARRAY[${feature}]`
      );
      if (featureConditions.length > 0) {
        whereConditions.push(or(...featureConditions));
      }
    }

    const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(properties)
      .where(whereClause);

    // Get properties
    const offset = (page - 1) * limit;
    const propertyList = await db
      .select()
      .from(properties)
      .where(whereClause)
      .orderBy(desc(properties.isFeatured), desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      properties: propertyList,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: string, propertyData: Partial<InsertProperty>): Promise<Property | undefined> {
    const [property] = await db
      .update(properties)
      .set({ ...propertyData, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPropertiesByAgent(agentId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.agentId, agentId))
      .orderBy(desc(properties.createdAt));
  }

  async getFeaturedProperties(): Promise<Property[]> {
    const results = await db
      .select()
      .from(properties)
      .where(and(eq(properties.isFeatured, true), eq(properties.status, "available")))
      .orderBy(desc(properties.createdAt))
      .limit(6);
    
    // Ensure virtualTourImages is included
    return results.map(property => ({
      ...property,
      virtualTourImages: property.virtualTourImages || []
    }));
  }

  // Inquiry operations
  async getInquiry(id: string): Promise<Inquiry | undefined> {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    return inquiry;
  }

  async getInquiries(): Promise<Inquiry[]> {
    return await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  }

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }

  async updateInquiry(id: string, inquiryData: Partial<InsertInquiry>): Promise<Inquiry | undefined> {
    const [inquiry] = await db
      .update(inquiries)
      .set({ ...inquiryData, updatedAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning();
    return inquiry;
  }

  async deleteInquiry(id: string): Promise<boolean> {
    const result = await db.delete(inquiries).where(eq(inquiries.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getInquiriesByAgent(agentId: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.agentId, agentId))
      .orderBy(desc(inquiries.createdAt));
  }

  async getInquiriesByClient(clientId: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.clientId, clientId))
      .orderBy(desc(inquiries.createdAt));
  }
  
  async getInquiriesByUser(userId: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.clientId, userId))
      .orderBy(desc(inquiries.createdAt));
  }

  // Saved properties operations
  async getSavedProperties(userId: string): Promise<Property[]> {
    const saved = await db
      .select({
        id: properties.id,
        title: properties.title,
        description: properties.description,
        price: properties.price,
        location: properties.location,
        address: properties.address,
        latitude: properties.latitude,
        longitude: properties.longitude,
        beds: properties.beds,
        baths: properties.baths,
        sqft: properties.sqft,
        propertyType: properties.propertyType,
        images: properties.images,
        virtualTourImages: properties.virtualTourImages,
        features: properties.features,
        status: properties.status,
        isFeatured: properties.isFeatured,
        agentId: properties.agentId,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
      })
      .from(savedProperties)
      .innerJoin(properties, eq(savedProperties.propertyId, properties.id))
      .where(eq(savedProperties.userId, userId))
      .orderBy(desc(savedProperties.createdAt));

    return saved;
  }

  async saveProperty(userId: string, propertyId: string): Promise<SavedProperty> {
    const [saved] = await db
      .insert(savedProperties)
      .values({ userId, propertyId })
      .returning();
    return saved;
  }

  async unsaveProperty(userId: string, propertyId: string): Promise<boolean> {
    const result = await db
      .delete(savedProperties)
      .where(and(eq(savedProperties.userId, userId), eq(savedProperties.propertyId, propertyId)));
    return (result.rowCount || 0) > 0;
  }

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedProperties)
      .where(and(eq(savedProperties.userId, userId), eq(savedProperties.propertyId, propertyId)));
    return !!saved;
  }

  // Brand settings operations
  async getBrandSettings(): Promise<BrandSettings | undefined> {
    const [settings] = await db.select().from(brandSettings).limit(1);
    return settings;
  }

  async updateBrandSettings(settingsData: Partial<InsertBrandSettings>): Promise<BrandSettings> {
    // Get existing settings or create if none exist
    const existing = await this.getBrandSettings();
    
    if (existing) {
      const [updated] = await db
        .update(brandSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(brandSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create initial settings
      const [created] = await db
        .insert(brandSettings)
        .values(settingsData)
        .returning();
      return created;
    }
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessages(userId: string, type: 'sent' | 'received' | 'all'): Promise<Message[]> {
    let whereClause;
    if (type === 'sent') {
      whereClause = eq(messages.senderId, userId);
    } else if (type === 'received') {
      whereClause = eq(messages.receiverId, userId);
    } else {
      whereClause = or(eq(messages.senderId, userId), eq(messages.receiverId, userId));
    }

    return await db
      .select()
      .from(messages)
      .where(whereClause)
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
    return result?.count || 0;
  }

  // Property viewing operations
  async getPropertyViewing(id: string): Promise<PropertyViewing | undefined> {
    const [viewing] = await db.select().from(propertyViewings).where(eq(propertyViewings.id, id));
    return viewing;
  }

  async getPropertyViewingsByClient(clientId: string): Promise<PropertyViewing[]> {
    return await db
      .select()
      .from(propertyViewings)
      .where(eq(propertyViewings.clientId, clientId))
      .orderBy(desc(propertyViewings.viewingDate));
  }

  async getPropertyViewingsByAgent(agentId: string): Promise<PropertyViewing[]> {
    return await db
      .select()
      .from(propertyViewings)
      .where(eq(propertyViewings.agentId, agentId))
      .orderBy(desc(propertyViewings.viewingDate));
  }

  async getPropertyViewingsByProperty(propertyId: string): Promise<PropertyViewing[]> {
    return await db
      .select()
      .from(propertyViewings)
      .where(eq(propertyViewings.propertyId, propertyId))
      .orderBy(desc(propertyViewings.viewingDate));
  }

  async createPropertyViewing(viewing: InsertPropertyViewing): Promise<PropertyViewing> {
    const [newViewing] = await db.insert(propertyViewings).values(viewing).returning();
    return newViewing;
  }

  async updatePropertyViewing(id: string, viewingData: Partial<InsertPropertyViewing>): Promise<PropertyViewing | undefined> {
    const [viewing] = await db
      .update(propertyViewings)
      .set({ ...viewingData, updatedAt: new Date() })
      .where(eq(propertyViewings.id, id))
      .returning();
    return viewing;
  }

  async deletePropertyViewing(id: string): Promise<boolean> {
    const result = await db.delete(propertyViewings).where(eq(propertyViewings.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Consultation operations
  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [newConsultation] = await db.insert(consultations).values(consultation).returning();
    return newConsultation;
  }

  async getConsultation(id: string): Promise<Consultation | undefined> {
    const [consultation] = await db.select().from(consultations).where(eq(consultations.id, id));
    return consultation;
  }

  async getConsultationsByAgent(agentId: string): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(eq(consultations.agentId, agentId))
      .orderBy(desc(consultations.consultationDate));
  }

  async getAllConsultations(): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .orderBy(desc(consultations.consultationDate));
  }

  async updateConsultation(id: string, consultationData: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const [consultation] = await db
      .update(consultations)
      .set({ ...consultationData, updatedAt: new Date() })
      .where(eq(consultations.id, id))
      .returning();
    return consultation;
  }

  async updateConsultationStatus(id: string, status: string): Promise<Consultation | undefined> {
    const [consultation] = await db
      .update(consultations)
      .set({ status, updatedAt: new Date() })
      .where(eq(consultations.id, id))
      .returning();
    return consultation;
  }

  async deleteConsultation(id: string): Promise<boolean> {
    const result = await db.delete(consultations).where(eq(consultations.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPropertyCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(properties);
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();
