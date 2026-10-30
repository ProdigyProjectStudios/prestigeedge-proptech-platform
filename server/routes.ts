import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerDealRoomRoutes } from "./dealroom/routes";
import { enforcePublicClientRole } from "./public-registration-policy";
import { emailService } from "./services/email";
import {
  loginSchema,
  insertUserSchema,
  insertPropertySchema,
  insertInquirySchema,
  insertMessageSchema,
  insertPropertyViewingSchema,
  insertConsultationSchema,
  propertySearchSchema,
  type LoginCredentials,
} from "@shared/schema";
import {
  generateToken,
  hashPassword,
  verifyPassword,
  authenticateToken,
  requireAdmin,
  requireAgentOrAdmin,
  type AuthenticatedRequest,
} from "./auth";
import { uploadMultiple, uploadSingle, uploadPropertyFiles } from "./middleware/upload";
import { aiService } from "./services/ai";
import { subscriptionService, SUBSCRIPTION_TIERS } from "./services/subscription";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add performance headers middleware
  app.use((req, res, next) => {
    // Add cache control headers for static assets
    if (req.path.startsWith('/uploads') || req.path.match(/\.(jpg|jpeg|png|gif|svg|webp|css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Add compression hint
    res.setHeader('Accept-Encoding', 'gzip, deflate, br');
    next();
  });

  // Serve uploaded files with caching
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(process.cwd(), "uploads", req.path);
    if (fs.existsSync(filePath)) {
      // Set cache headers for images
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = enforcePublicClientRole(insertUserSchema.parse(req.body));
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(user);

      // Generate token
      const token = generateToken(user);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: "Registration failed", 
        error: error.message 
      });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password }: LoginCredentials = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate token
      const token = generateToken(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ 
        message: "Login failed", 
        error: error.message 
      });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });

  app.put("/api/auth/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      
      // Don't allow role changes through this endpoint
      delete updates.role;
      delete updates.password; // Password changes should be separate

      const updatedUser = await storage.updateUser(req.user!.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        message: "Profile updated successfully",
        user: userWithoutPassword,
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(400).json({ 
        message: "Profile update failed", 
        error: error.message 
      });
    }
  });

  // Property routes
  app.get("/api/properties", async (req: Request, res: Response) => {
    try {
      const searchParams = propertySearchSchema.parse({
        location: req.query.location,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        beds: req.query.beds ? Number(req.query.beds) : undefined,
        baths: req.query.baths ? Number(req.query.baths) : undefined,
        minSqft: req.query.minSqft ? Number(req.query.minSqft) : undefined,
        maxSqft: req.query.maxSqft ? Number(req.query.maxSqft) : undefined,
        propertyType: req.query.propertyType,
        status: req.query.status,
        featured: req.query.featured,
        features: req.query.features,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 9,
      });

      console.log("[PROPERTIES] Search params:", searchParams);
      const result = await storage.getProperties(searchParams);
      console.log("[PROPERTIES] Result:", { total: result.total, count: result.properties.length });
      res.json(result);
    } catch (error: any) {
      console.error("Properties fetch error:", error);
      res.status(400).json({ 
        message: "Failed to fetch properties", 
        error: error.message 
      });
    }
  });

  app.get("/api/properties/featured", async (req: Request, res: Response) => {
    try {
      const properties = await storage.getFeaturedProperties();
      res.json(properties);
    } catch (error: any) {
      console.error("Featured properties fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch featured properties", 
        error: error.message 
      });
    }
  });

  app.get("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      console.error("Property fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch property", 
        error: error.message 
      });
    }
  });

  app.post("/api/properties", authenticateToken, requireAgentOrAdmin, uploadPropertyFiles, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyData = insertPropertySchema.parse({
        ...req.body,
        price: Number(req.body.price),
        beds: Number(req.body.beds),
        baths: Number(req.body.baths),
        sqft: Number(req.body.sqft),
        isFeatured: req.body.isFeatured === 'true',
        agentId: req.user!.role === 'admin' ? req.body.agentId : req.user!.id,
      });

      // Handle uploaded images
      const images: string[] = [];
      const virtualTourImages: string[] = [];
      
      if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
        // Handle regular images
        if (req.files.images) {
          for (const file of req.files.images) {
            images.push(`/uploads/${file.filename}`);
          }
        }
        
        // Handle virtual tour images
        if (req.files.virtualTourImages) {
          for (const file of req.files.virtualTourImages) {
            virtualTourImages.push(`/uploads/${file.filename}`);
          }
        }
      }

      const property = await storage.createProperty({
        ...propertyData,
        images,
        virtualTourImages,
      });

      res.status(201).json({
        message: "Property created successfully",
        property,
      });
    } catch (error: any) {
      console.error("Property creation error:", error);
      res.status(400).json({ 
        message: "Failed to create property", 
        error: error.message 
      });
    }
  });

  app.put("/api/properties/:id", authenticateToken, requireAgentOrAdmin, uploadPropertyFiles, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingProperty = await storage.getProperty(req.params.id);
      if (!existingProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check if user owns the property (unless admin)
      if (req.user!.role !== 'admin' && existingProperty.agentId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this property" });
      }

      const updates: any = { ...req.body };
      if (updates.price) updates.price = Number(updates.price);
      if (updates.beds) updates.beds = Number(updates.beds);
      if (updates.baths) updates.baths = Number(updates.baths);
      if (updates.sqft) updates.sqft = Number(updates.sqft);
      if (updates.isFeatured !== undefined) updates.isFeatured = updates.isFeatured === 'true';

      // Handle new uploaded files
      if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
        // Handle regular images
        if (req.files.images) {
          const newImages: string[] = [];
          for (const file of req.files.images) {
            newImages.push(`/uploads/${file.filename}`);
          }
          updates.images = [...(existingProperty.images || []), ...newImages];
        }
        
        // Handle virtual tour images
        if (req.files.virtualTourImages) {
          const newVirtualTourImages: string[] = [];
          for (const file of req.files.virtualTourImages) {
            newVirtualTourImages.push(`/uploads/${file.filename}`);
          }
          updates.virtualTourImages = [...(existingProperty.virtualTourImages || []), ...newVirtualTourImages];
        }
      }

      const property = await storage.updateProperty(req.params.id, updates);
      res.json({
        message: "Property updated successfully",
        property,
      });
    } catch (error: any) {
      console.error("Property update error:", error);
      res.status(400).json({ 
        message: "Failed to update property", 
        error: error.message 
      });
    }
  });

  app.delete("/api/properties/:id", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check if user owns the property (unless admin)
      if (req.user!.role !== 'admin' && property.agentId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this property" });
      }

      const deleted = await storage.deleteProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json({ message: "Property deleted successfully" });
    } catch (error: any) {
      console.error("Property deletion error:", error);
      res.status(500).json({ 
        message: "Failed to delete property", 
        error: error.message 
      });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      console.error("Users fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch users", 
        error: error.message 
      });
    }
  });

  // Get users for messaging (available to all authenticated users)
  app.get("/api/users/messaging", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out the current user and only return basic info
      const messagingUsers = users
        .filter(user => user.id !== req.user!.id)
        .map(({ id, name, email, role, avatarUrl }) => ({ id, name, email, role, avatarUrl }));
      res.json(messagingUsers);
    } catch (error: any) {
      console.error("Users messaging fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch users for messaging", 
        error: error.message 
      });
    }
  });

  // Get agents for scheduling viewings
  app.get("/api/users/agents", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const agents = users
        .filter(u => u.role === 'agent' || u.role === 'admin')
        .map(({ password, ...user }) => user);
      res.json(agents);
    } catch (error: any) {
      console.error("Agents fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch agents", 
        error: error.message 
      });
    }
  });

  // Public endpoint for getting agents (for consultation booking)
  app.get("/api/agents", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const agents = users
        .filter(u => u.role === 'agent' || u.role === 'admin')
        .map(({ password, email, ...user }) => ({ 
          id: user.id, 
          name: user.name,
          role: user.role 
        }));
      res.json(agents);
    } catch (error: any) {
      console.error("Public agents fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch agents", 
        error: error.message 
      });
    }
  });

  // Consultation Routes (public - no authentication required for booking)
  app.post("/api/consultations", async (req: Request, res: Response) => {
    try {
      const validatedData = insertConsultationSchema.parse(req.body);
      
      // The consultationDate is already a string from validation
      const consultation = await storage.createConsultation(validatedData);
      
      // Send email notification to the client  
      // Note: We'll add email service for consultations later
      
      res.status(201).json({
        message: "Consultation scheduled successfully",
        data: consultation,
      });
    } catch (error: any) {
      console.error("Create consultation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid consultation data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: "Failed to schedule consultation", 
        error: error.message 
      });
    }
  });

  // Admin consultation management routes
  app.get("/api/admin/consultations", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const consultations = await storage.getAllConsultations();
      res.json(consultations);
    } catch (error: any) {
      console.error("Get consultations error:", error);
      res.status(500).json({ 
        message: "Failed to fetch consultations", 
        error: error.message 
      });
    }
  });

  app.put("/api/admin/consultations/:id/status", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      const consultation = await storage.updateConsultationStatus(req.params.id, status);
      if (!consultation) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      res.json(consultation);
    } catch (error: any) {
      console.error("Update consultation status error:", error);
      res.status(400).json({ 
        message: "Failed to update consultation status", 
        error: error.message 
      });
    }
  });

  app.delete("/api/admin/consultations/:id", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = await storage.deleteConsultation(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      res.json({ message: "Consultation deleted successfully" });
    } catch (error: any) {
      console.error("Delete consultation error:", error);
      res.status(400).json({ 
        message: "Failed to delete consultation", 
        error: error.message 
      });
    }
  });

  app.put("/api/users/:id/role", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { role } = req.body;
      if (!["client", "agent", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Prevent admin from changing their own role
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      
      // If changing from admin role, ensure there's at least one other admin
      const userToUpdate = await storage.getUser(req.params.id);
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (userToUpdate.role === 'admin' && role !== 'admin') {
        const allUsers = await storage.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Cannot remove the last admin. Assign another admin first." });
        }
      }

      const user = await storage.updateUser(req.params.id, { role });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({
        message: "User role updated successfully",
        user: userWithoutPassword,
      });
    } catch (error: any) {
      console.error("Role update error:", error);
      res.status(400).json({ 
        message: "Failed to update user role", 
        error: error.message 
      });
    }
  });

  // Inquiry routes
  app.post("/api/inquiries", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate user authentication
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const inquiryData = insertInquirySchema.parse({
        ...req.body,
        clientId: req.user.id, // Use authenticated user's ID
      });
      const inquiry = await storage.createInquiry(inquiryData);
      
      // Send email notification to agent
      if (inquiry.agentId) {
        const property = await storage.getProperty(inquiry.propertyId);
        const client = await storage.getUser(inquiry.clientId);
        const agent = await storage.getUser(inquiry.agentId);
        
        if (property && client && agent) {
          await emailService.sendNewInquiryEmail(inquiry, property, client, agent);
        }
      }
      
      res.status(201).json({
        message: "Inquiry submitted successfully",
        inquiry,
      });
    } catch (error: any) {
      console.error("Inquiry creation error:", error);
      res.status(400).json({ 
        message: "Failed to submit inquiry", 
        error: error.message 
      });
    }
  });

  app.get("/api/inquiries", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let inquiries;
      
      if (req.user!.role === 'admin') {
        inquiries = await storage.getInquiries();
      } else if (req.user!.role === 'agent') {
        inquiries = await storage.getInquiriesByAgent(req.user!.id);
      } else {
        inquiries = await storage.getInquiriesByClient(req.user!.id);
      }

      res.json(inquiries);
    } catch (error: any) {
      console.error("Inquiries fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch inquiries", 
        error: error.message 
      });
    }
  });

  app.put("/api/inquiries/:id", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      // Check if user owns the inquiry (unless admin)
      if (req.user!.role !== 'admin' && inquiry.agentId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this inquiry" });
      }

      const updatedInquiry = await storage.updateInquiry(req.params.id, req.body);
      res.json({
        message: "Inquiry updated successfully",
        inquiry: updatedInquiry,
      });
    } catch (error: any) {
      console.error("Inquiry update error:", error);
      res.status(400).json({ 
        message: "Failed to update inquiry", 
        error: error.message 
      });
    }
  });

  app.delete("/api/inquiries/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      // Only allow clients to delete their own pending inquiries
      if (req.user!.role === 'client') {
        if (inquiry.clientId !== req.user!.id) {
          return res.status(403).json({ message: "Not authorized to delete this inquiry" });
        }
        if (inquiry.status !== 'open') {
          return res.status(400).json({ message: "Can only delete pending inquiries" });
        }
      } else if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to delete inquiries" });
      }

      await storage.deleteInquiry(req.params.id);
      res.json({ message: "Inquiry deleted successfully" });
    } catch (error: any) {
      console.error("Inquiry delete error:", error);
      res.status(500).json({ 
        message: "Failed to delete inquiry", 
        error: error.message 
      });
    }
  });

  // Saved properties routes
  app.get("/api/saved-properties", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const properties = await storage.getSavedProperties(req.user!.id);
      res.json(properties);
    } catch (error: any) {
      console.error("Saved properties fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch saved properties", 
        error: error.message 
      });
    }
  });

  app.post("/api/saved-properties/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { propertyId } = req.params;
      
      // Check if already saved
      const isAlreadySaved = await storage.isPropertySaved(req.user!.id, propertyId);
      if (isAlreadySaved) {
        return res.status(400).json({ message: "Property already saved" });
      }

      const saved = await storage.saveProperty(req.user!.id, propertyId);
      res.status(201).json({
        message: "Property saved successfully",
        saved,
      });
    } catch (error: any) {
      console.error("Save property error:", error);
      res.status(400).json({ 
        message: "Failed to save property", 
        error: error.message 
      });
    }
  });

  app.delete("/api/saved-properties/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { propertyId } = req.params;
      const removed = await storage.unsaveProperty(req.user!.id, propertyId);
      
      if (!removed) {
        return res.status(404).json({ message: "Saved property not found" });
      }

      res.json({ message: "Property removed from saved list" });
    } catch (error: any) {
      console.error("Unsave property error:", error);
      res.status(500).json({ 
        message: "Failed to remove property from saved list", 
        error: error.message 
      });
    }
  });

  // Brand Settings Routes
  app.get("/api/brand-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBrandSettings();
      res.json(settings || {
        companyName: "PrestigeEdge",
        tagline: "Luxury Real Estate Excellence",
        primaryColor: "#FFD700",
        secondaryColor: "#000000",
        accentColor: "#F5F5DC",
        socialLinks: {},
        heroImages: [],
      });
    } catch (error: any) {
      console.error("Brand settings fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch brand settings", 
        error: error.message 
      });
    }
  });

  app.put("/api/brand-settings", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await storage.updateBrandSettings(req.body);
      res.json({
        message: "Brand settings updated successfully",
        settings,
      });
    } catch (error: any) {
      console.error("Brand settings update error:", error);
      res.status(400).json({ 
        message: "Failed to update brand settings", 
        error: error.message 
      });
    }
  });

  // Message Routes
  app.get("/api/messages", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type = 'all' } = req.query;
      const messages = await storage.getMessages(req.user!.id, type as 'sent' | 'received' | 'all');
      res.json(messages);
    } catch (error: any) {
      console.error("Fetch messages error:", error);
      res.status(500).json({ 
        message: "Failed to fetch messages", 
        error: error.message 
      });
    }
  });

  app.get("/api/messages/unread-count", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Fetch unread count error:", error);
      res.status(500).json({ 
        message: "Failed to fetch unread message count", 
        error: error.message 
      });
    }
  });

  app.get("/api/messages/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Check if user has access to this message
      if (message.senderId !== req.user!.id && message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(message);
    } catch (error: any) {
      console.error("Fetch message error:", error);
      res.status(500).json({ 
        message: "Failed to fetch message", 
        error: error.message 
      });
    }
  });

  app.post("/api/messages", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id,
      });

      const message = await storage.createMessage(validatedData);
      
      // Send email notification to receiver
      const sender = await storage.getUser(message.senderId);
      const receiver = await storage.getUser(message.receiverId);
      
      if (sender && receiver) {
        const preview = message.content.substring(0, 200);
        await emailService.sendNewMessageNotification(
          sender.name,
          receiver.email,
          message.subject,
          preview
        );
      }
      
      res.status(201).json({
        message: "Message sent successfully",
        data: message,
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid message data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: "Failed to send message", 
        error: error.message 
      });
    }
  });

  app.patch("/api/messages/:id/read", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only receiver can mark as read
      if (message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "Only receiver can mark message as read" });
      }

      const updatedMessage = await storage.markMessageAsRead(req.params.id);
      res.json({
        message: "Message marked as read",
        data: updatedMessage,
      });
    } catch (error: any) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ 
        message: "Failed to mark message as read", 
        error: error.message 
      });
    }
  });

  app.delete("/api/messages/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only sender or receiver can delete
      if (message.senderId !== req.user!.id && message.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteMessage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json({ message: "Message deleted successfully" });
    } catch (error: any) {
      console.error("Delete message error:", error);
      res.status(500).json({ 
        message: "Failed to delete message", 
        error: error.message 
      });
    }
  });

  // Property Viewing Routes
  app.get("/api/viewings", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      let viewings;

      if (user.role === 'client') {
        viewings = await storage.getPropertyViewingsByClient(user.id);
      } else if (user.role === 'agent') {
        viewings = await storage.getPropertyViewingsByAgent(user.id);
      } else if (user.role === 'admin') {
        // Admin can see all viewings by fetching from all properties
        const properties = await storage.getProperties({ page: 1, limit: 1000 });
        viewings = [];
        for (const property of properties.properties) {
          const propertyViewings = await storage.getPropertyViewingsByProperty(property.id);
          viewings.push(...propertyViewings);
        }
      }

      res.json(viewings || []);
    } catch (error: any) {
      console.error("Fetch viewings error:", error);
      res.status(500).json({ 
        message: "Failed to fetch viewings", 
        error: error.message 
      });
    }
  });

  app.get("/api/viewings/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const viewing = await storage.getPropertyViewing(req.params.id);
      
      if (!viewing) {
        return res.status(404).json({ message: "Viewing not found" });
      }

      // Check access
      const user = req.user!;
      if (user.role === 'client' && viewing.clientId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (user.role === 'agent' && viewing.agentId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(viewing);
    } catch (error: any) {
      console.error("Fetch viewing error:", error);
      res.status(500).json({ 
        message: "Failed to fetch viewing", 
        error: error.message 
      });
    }
  });

  app.post("/api/viewings", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertPropertyViewingSchema.parse({
        ...req.body,
        clientId: req.user!.id,
      });

      const viewing = await storage.createPropertyViewing(validatedData);
      
      // Send email notification to client
      const property = await storage.getProperty(viewing.propertyId);
      const client = await storage.getUser(viewing.clientId);
      
      if (property && client) {
        await emailService.sendViewingScheduledEmail(viewing, property, client);
      }
      
      res.status(201).json({
        message: "Property viewing scheduled successfully",
        data: viewing,
      });
    } catch (error: any) {
      console.error("Create viewing error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid viewing data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: "Failed to schedule viewing", 
        error: error.message 
      });
    }
  });

  app.patch("/api/viewings/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const viewing = await storage.getPropertyViewing(req.params.id);
      
      if (!viewing) {
        return res.status(404).json({ message: "Viewing not found" });
      }

      // Check permissions
      const user = req.user!;
      if (user.role === 'client' && viewing.clientId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (user.role === 'agent' && viewing.agentId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedViewing = await storage.updatePropertyViewing(req.params.id, req.body);
      res.json({
        message: "Viewing updated successfully",
        data: updatedViewing,
      });
    } catch (error: any) {
      console.error("Update viewing error:", error);
      res.status(400).json({ 
        message: "Failed to update viewing", 
        error: error.message 
      });
    }
  });

  app.delete("/api/viewings/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const viewing = await storage.getPropertyViewing(req.params.id);
      
      if (!viewing) {
        return res.status(404).json({ message: "Viewing not found" });
      }

      // Check permissions
      const user = req.user!;
      if (user.role === 'client' && viewing.clientId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (user.role === 'agent' && viewing.agentId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deletePropertyViewing(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Viewing not found" });
      }

      res.json({ message: "Viewing cancelled successfully" });
    } catch (error: any) {
      console.error("Delete viewing error:", error);
      res.status(500).json({ 
        message: "Failed to cancel viewing", 
        error: error.message 
      });
    }
  });

  // Dashboard Statistics Routes
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      let stats: any = {};
      
      if (user.role === 'client') {
        // Client stats
        const savedProperties = await storage.getSavedProperties(user.id);
        const inquiries = await storage.getInquiriesByUser(user.id);
        const propertiesData = await storage.getProperties({ limit: 1000, page: 1 });
        
        stats = {
          totalProperties: propertiesData.total,
          savedProperties: savedProperties.length,
          totalInquiries: inquiries.length,
          activeListings: propertiesData.properties.filter(p => p.status === 'available').length,
        };
      } else if (user.role === 'agent') {
        // Agent stats
        const agentProperties = await storage.getPropertiesByAgent(user.id);
        const inquiries = await storage.getInquiriesByAgent(user.id);
        
        stats = {
          totalProperties: agentProperties.length,
          activeListings: agentProperties.filter(p => p.status === 'available').length,
          totalInquiries: inquiries.length,
          pendingInquiries: inquiries.filter(i => i.status === 'open').length,
        };
      } else if (user.role === 'admin') {
        // Admin stats - already implemented below
      }
      
      res.json(stats);
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ 
        message: "Failed to fetch dashboard statistics", 
        error: error.message 
      });
    }
  });

  // Analytics and Statistics Routes
  app.get("/api/analytics/dashboard", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      let stats: any = {};

      if (user.role === 'admin') {
        // Admin sees all system statistics
        const totalProperties = await storage.getProperties({ page: 1, limit: 1 });
        const totalUsers = await storage.getAllUsers();
        const totalInquiries = await storage.getInquiries();
        const featuredProperties = await storage.getFeaturedProperties();

        stats = {
          totalProperties: totalProperties.total,
          totalUsers: totalUsers.length,
          totalInquiries: totalInquiries.length,
          featuredProperties: featuredProperties.length,
          usersByRole: {
            admin: totalUsers.filter(u => u.role === 'admin').length,
            agent: totalUsers.filter(u => u.role === 'agent').length,
            client: totalUsers.filter(u => u.role === 'client').length,
          },
          recentInquiries: totalInquiries.slice(0, 5),
        };
      } else if (user.role === 'agent') {
        // Agent sees their property and inquiry statistics
        const agentProperties = await storage.getPropertiesByAgent(user.id);
        const agentInquiries = await storage.getInquiriesByAgent(user.id);

        stats = {
          totalProperties: agentProperties.length,
          totalInquiries: agentInquiries.length,
          propertiesByStatus: {
            available: agentProperties.filter(p => p.status === 'available').length,
            pending: agentProperties.filter(p => p.status === 'pending').length,
            sold: agentProperties.filter(p => p.status === 'sold').length,
          },
          featuredProperties: agentProperties.filter(p => p.isFeatured).length,
          recentInquiries: agentInquiries.slice(0, 5),
        };
      } else {
        // Client sees their saved properties and inquiries
        const savedProperties = await storage.getSavedProperties(user.id);
        const clientInquiries = await storage.getInquiriesByClient(user.id);

        stats = {
          savedProperties: savedProperties.length,
          totalInquiries: clientInquiries.length,
          recentInquiries: clientInquiries.slice(0, 5),
        };
      }

      res.json(stats);
    } catch (error: any) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch analytics", 
        error: error.message 
      });
    }
  });

  // Property price analytics
  app.get("/api/analytics/properties/price-range", async (req: Request, res: Response) => {
    try {
      const allProperties = await storage.getProperties({ page: 1, limit: 1000 });
      const properties = allProperties.properties;

      const priceRanges = {
        'Under $5M': properties.filter(p => p.price < 5000000).length,
        '$5M - $10M': properties.filter(p => p.price >= 5000000 && p.price < 10000000).length,
        '$10M - $20M': properties.filter(p => p.price >= 10000000 && p.price < 20000000).length,
        '$20M+': properties.filter(p => p.price >= 20000000).length,
      };

      const locationStats = properties.reduce((acc: any, property) => {
        const location = property.location.split(',')[0].trim(); // Get city/state
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      const typeStats = properties.reduce((acc: any, property) => {
        acc[property.propertyType] = (acc[property.propertyType] || 0) + 1;
        return acc;
      }, {});

      res.json({
        priceRanges,
        locationStats,
        typeStats,
        averagePrice: properties.reduce((sum, p) => sum + p.price, 0) / properties.length,
        totalListings: properties.length,
      });
    } catch (error: any) {
      console.error("Price analytics error:", error);
      res.status(500).json({ 
        message: "Failed to fetch price analytics", 
        error: error.message 
      });
    }
  });

  // Search suggestions endpoint
  app.get("/api/search/suggestions", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json({ locations: [], propertyTypes: [] });
      }

      const allProperties = await storage.getProperties({ page: 1, limit: 1000 });
      const properties = allProperties.properties;

      // Get unique locations that match the query
      const locations = Array.from(new Set(properties.map(p => p.location)))
        .filter(location => location.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);

      // Get unique property types that match the query
      const propertyTypes = Array.from(new Set(properties.map(p => p.propertyType)))
        .filter(type => type.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      res.json({ locations, propertyTypes });
    } catch (error: any) {
      console.error("Search suggestions error:", error);
      res.status(500).json({ 
        message: "Failed to fetch search suggestions", 
        error: error.message 
      });
    }
  });

  // File upload route
  app.post("/api/upload", authenticateToken, uploadSingle, (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      res.json({
        message: "File uploaded successfully",
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ 
        message: "File upload failed", 
        error: error.message 
      });
    }
  });

  // Email Settings Routes (Admin only)
  app.get("/api/settings/email", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Return current email configuration status (without sensitive data)
      const isConfigured = !!process.env.SMTP_HOST;
      res.json({
        isConfigured,
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: process.env.SMTP_PORT || '587',
        smtpUser: process.env.SMTP_USER || '',
        smtpFrom: process.env.SMTP_FROM || '',
        smtpSecure: process.env.SMTP_SECURE === 'true',
        // Don't send password
      });
    } catch (error: any) {
      console.error("Email settings fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch email settings", 
        error: error.message 
      });
    }
  });

  app.post("/api/settings/email/test", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const testSuccessful = await emailService.testEmailConfiguration();
      
      if (!testSuccessful) {
        return res.status(400).json({ 
          message: "Email configuration test failed. Please check your settings." 
        });
      }

      // Send test email to the admin
      const admin = req.user!;
      const testEmail = {
        to: admin.email,
        subject: 'PrestigeEdge - Test Email',
        html: `
          <h2>Test Email Successful</h2>
          <p>Hi ${admin.name},</p>
          <p>This is a test email from your PrestigeEdge platform. If you're receiving this, your email configuration is working correctly!</p>
          <p>Email notifications will be sent for:</p>
          <ul>
            <li>New property inquiries</li>
            <li>Property viewing schedules</li>
            <li>Messages between clients and agents</li>
            <li>Welcome emails for new users</li>
          </ul>
          <p>Best regards,<br>PrestigeEdge Team</p>
        `,
      };

      const sent = await emailService.sendEmail(testEmail);
      
      if (sent) {
        res.json({ message: "Test email sent successfully! Check your inbox." });
      } else {
        res.status(400).json({ message: "Failed to send test email" });
      }
    } catch (error: any) {
      console.error("Email test error:", error);
      res.status(500).json({ 
        message: "Failed to test email configuration", 
        error: error.message 
      });
    }
  });

  // Enhanced Analytics endpoints with user behavior tracking
  app.get("/api/analytics/price-ranges", async (req: Request, res: Response) => {
    try {
      const priceRanges = [
        { label: "$1M - $5M", min: 1000000, max: 5000000 },
        { label: "$5M - $10M", min: 5000000, max: 10000000 },
        { label: "$10M - $25M", min: 10000000, max: 25000000 },
        { label: "$25M+", min: 25000000, max: 100000000 }
      ];
      res.json(priceRanges);
    } catch (error) {
      console.error("Error fetching price ranges:", error);
      res.status(500).json({ message: "Failed to fetch price ranges" });
    }
  });

  // Track user events for analytics
  app.post("/api/analytics/track", async (req: Request, res: Response) => {
    try {
      const { event, data, userId } = req.body;
      
      // Log analytics event (in production, this would go to analytics service)
      console.log(`Analytics Event: ${event}`, {
        userId,
        data,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Analytics tracking error:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // Get comprehensive analytics summary
  app.get("/api/analytics/summary", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const properties = await storage.getProperties({ page: 1, limit: 1000 });
      const users = await storage.getAllUsers();
      const inquiries = await storage.getInquiries();
      
      const summary = {
        totalProperties: properties.total,
        activeListings: properties.properties.filter(p => p.status === 'available').length,
        totalUsers: users.length,
        totalInquiries: inquiries.length,
        averagePropertyPrice: properties.properties.reduce((sum, p) => sum + p.price, 0) / properties.properties.length,
        priceDistribution: {
          'Under $5M': properties.properties.filter(p => p.price < 5000000).length,
          '$5M - $10M': properties.properties.filter(p => p.price >= 5000000 && p.price < 10000000).length,
          '$10M - $25M': properties.properties.filter(p => p.price >= 10000000 && p.price < 25000000).length,
          '$25M+': properties.properties.filter(p => p.price >= 25000000).length,
        },
        usersByRole: {
          clients: users.filter(u => u.role === 'client').length,
          agents: users.filter(u => u.role === 'agent').length,
          admins: users.filter(u => u.role === 'admin').length,
        },
        inquiryStatus: {
          open: inquiries.filter(i => i.status === 'open').length,
          in_progress: inquiries.filter(i => i.status === 'in_progress').length,
          closed: inquiries.filter(i => i.status === 'closed').length,
        }
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Analytics summary error:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  // Marketing endpoints
  app.get("/api/marketing/campaigns", async (req: Request, res: Response) => {
    try {
      // Mock campaign data for now
      const campaigns = [
        {
          id: "1",
          name: "Luxury Mansion Campaign",
          type: "social",
          status: "active",
          budget: 10000,
          spent: 7500,
          clicks: 1250,
          impressions: 45000,
          conversions: 12,
          createdAt: new Date().toISOString()
        }
      ];
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/marketing/analytics", async (req: Request, res: Response) => {
    try {
      const analytics = {
        totalViews: 12500,
        totalLeads: 340,
        conversionRate: 2.7
      };
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching marketing analytics:", error);
      res.status(500).json({ message: "Failed to fetch marketing analytics" });
    }
  });

  app.post("/api/marketing/social-content/:propertyId", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { propertyId } = req.params;
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const socialContent = {
        title: `🏡 Luxury ${property.propertyType} Available in ${property.location}`,
        description: `Experience unparalleled luxury in this stunning ${property.beds}-bedroom, ${property.baths}-bathroom ${property.propertyType} featuring ${property.sqft.toLocaleString()} sq ft of elegant living space. Priced at ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(property.price)}. Contact us today for an exclusive viewing.`,
        hashtags: "#LuxuryRealEstate #DreamHome #PrestigeEdge #LuxuryProperty #RealEstate",
        image: property.images[0] || ""
      };
      
      res.json(socialContent);
    } catch (error) {
      console.error("Error generating social content:", error);
      res.status(500).json({ message: "Failed to generate social content" });
    }
  });

  // AI-powered routes
  app.post("/api/ai/chat", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message } = req.body;
      const user = req.user;
      
      const response = await aiService.processChatMessage(message, {
        propertyCount: await storage.getPropertyCount(),
        userRole: user?.role || 'client'
      });
      
      res.json({ message: response });
    } catch (error) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ message: "AI service temporarily unavailable" });
    }
  });

  app.post("/api/ai/recommendations", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { preferences, properties } = req.body;
      
      const recommendations = await aiService.getPropertyRecommendations(preferences, properties);
      
      res.json({ recommendations });
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      res.status(500).json({ message: "Recommendation service temporarily unavailable" });
    }
  });

  app.post("/api/ai/generate-description", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { property } = req.body;
      
      const description = await aiService.generatePropertyDescription(property);
      
      res.json({ description });
    } catch (error) {
      console.error('AI Description Error:', error);
      res.status(500).json({ message: "Description generation temporarily unavailable" });
    }
  });

  app.post("/api/ai/market-analysis", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { properties, location } = req.body;
      
      const analysis = await aiService.generateMarketAnalysis(properties, location);
      
      res.json({ analysis });
    } catch (error) {
      console.error('AI Market Analysis Error:', error);
      res.status(500).json({ message: "Market analysis temporarily unavailable" });
    }
  });

  app.post("/api/ai/qualify-lead", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const leadData = req.body;
      
      const qualification = await aiService.qualifyLead(leadData);
      
      res.json({ qualification });
    } catch (error) {
      console.error('AI Lead Qualification Error:', error);
      res.status(500).json({ message: "Lead qualification temporarily unavailable" });
    }
  });

  app.post("/api/ai/marketing-content", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { property, contentType } = req.body;
      
      const content = await aiService.generateMarketingContent(property, contentType);
      
      res.json({ content });
    } catch (error) {
      console.error('AI Marketing Content Error:', error);
      res.status(500).json({ message: "Marketing content generation temporarily unavailable" });
    }
  });

  // AI Property Valuation
  app.post("/api/ai/valuation", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { address } = req.body;
      
      const valuation = await aiService.generatePropertyValuation(address);
      
      res.json({ valuation });
    } catch (error) {
      console.error('AI Valuation Error:', error);
      res.status(500).json({ message: "Property valuation temporarily unavailable" });
    }
  });

  // Virtual Staging
  app.post("/api/ai/virtual-staging", authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { propertyId, style } = req.body;
      
      const staging = await aiService.generateVirtualStaging(propertyId, style);
      
      res.json({ staging });
    } catch (error) {
      console.error('AI Virtual Staging Error:', error);
      res.status(500).json({ message: "Virtual staging temporarily unavailable" });
    }
  });

  // Google Maps API key endpoint
  app.get("/api/config/maps-key", (req: Request, res: Response) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      res.send(apiKey);
    } else {
      res.status(404).send('');
    }
  });

  // Subscription routes
  app.get("/api/subscription/tiers", async (req: Request, res: Response) => {
    res.json({ tiers: SUBSCRIPTION_TIERS });
  });

  app.get("/api/subscription/current", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const subscription = await subscriptionService.getUserSubscription(req.user!.id);
      res.json(subscription);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription/create", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tierId } = req.body;
      
      if (!tierId) {
        return res.status(400).json({ message: "Subscription tier is required" });
      }

      const result = await subscriptionService.createSubscription(req.user!.id, tierId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Confidential Deal Room routes (in-memory, no DB migration needed)
  registerDealRoomRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
