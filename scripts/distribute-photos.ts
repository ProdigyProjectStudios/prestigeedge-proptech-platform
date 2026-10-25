import { db } from "../server/db";
import { properties } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Get all available interior photos (excluding existing property photos)
const getInteriorPhotos = () => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const allFiles = fs.readdirSync(uploadsDir);
  
  // Filter to get only the new interior photos (numbered 01-100)
  const interiorPhotos = allFiles.filter(file => 
    /^(0[1-9]|[1-9][0-9]|100)_.*\.jpg$/.test(file)
  );
  
  // Categorize photos by type
  const categories = {
    living: interiorPhotos.filter(f => f.includes('Living_Room')),
    bedroom: interiorPhotos.filter(f => f.includes('Bedroom') || f.includes('Master_Suite')),
    kitchen: interiorPhotos.filter(f => f.includes('Kitchen')),
    bathroom: interiorPhotos.filter(f => f.includes('Bathroom')),
    dining: interiorPhotos.filter(f => f.includes('Dining')),
    office: interiorPhotos.filter(f => f.includes('Office') || f.includes('Study')),
    other: interiorPhotos.filter(f => 
      !f.includes('Living_Room') && 
      !f.includes('Bedroom') && 
      !f.includes('Master_Suite') &&
      !f.includes('Kitchen') && 
      !f.includes('Bathroom') && 
      !f.includes('Dining') && 
      !f.includes('Office') && 
      !f.includes('Study')
    )
  };
  
  return { categories, total: interiorPhotos.length };
};

// Distribute photos evenly across properties
const distributePhotos = async () => {
  try {
    console.log("🏠 Starting photo distribution...");
    
    // Get all properties
    const allProperties = await db.select().from(properties);
    console.log(`📊 Found ${allProperties.length} properties`);
    
    // Get interior photos
    const { categories, total } = getInteriorPhotos();
    console.log(`📸 Found ${total} interior photos to distribute`);
    console.log("📂 Categories:", {
      living: categories.living.length,
      bedroom: categories.bedroom.length,
      kitchen: categories.kitchen.length,
      bathroom: categories.bathroom.length,
      dining: categories.dining.length,
      office: categories.office.length,
      other: categories.other.length
    });
    
    // Create photo pool for distribution
    const photoPool = [
      ...categories.living,
      ...categories.bedroom,
      ...categories.kitchen,
      ...categories.bathroom,
      ...categories.dining,
      ...categories.office,
      ...categories.other
    ];
    
    // Shuffle the photo pool for random distribution
    for (let i = photoPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photoPool[i], photoPool[j]] = [photoPool[j], photoPool[i]];
    }
    
    // Distribute photos (4-5 photos per property)
    const photosPerProperty = Math.floor(total / allProperties.length);
    console.log(`🎯 Distributing ${photosPerProperty} photos per property`);
    
    let photoIndex = 0;
    
    for (const property of allProperties) {
      const currentImages = property.images || [];
      const newPhotos = [];
      
      // Add 4-5 interior photos per property
      for (let i = 0; i < photosPerProperty && photoIndex < photoPool.length; i++) {
        newPhotos.push(`/uploads/${photoPool[photoIndex]}`);
        photoIndex++;
      }
      
      // Combine existing images with new photos
      const updatedImages = [...currentImages, ...newPhotos];
      
      // Update property in database
      await db
        .update(properties)
        .set({ images: updatedImages })
        .where(eq(properties.id, property.id));
      
      console.log(`✅ Updated ${property.title}: ${currentImages.length} -> ${updatedImages.length} photos`);
    }
    
    console.log("🎉 Photo distribution completed successfully!");
    console.log(`📊 Total photos distributed: ${photoIndex}`);
    
  } catch (error) {
    console.error("❌ Error distributing photos:", error);
    throw error;
  }
};

export { distributePhotos };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  distributePhotos()
    .then(() => {
      console.log("✨ Distribution script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Distribution script failed:", error);
      process.exit(1);
    });
}