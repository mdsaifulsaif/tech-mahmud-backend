import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

async function seedAdmin() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is missing from .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully to DB.");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("DB connection instance not found");
    }

    const usersCollection = db.collection("users");

    const email = "admin@gmail.com";
    const plainPassword = "admin123";

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      console.log("User already exists. Updating to admin with new password...");
      await usersCollection.updateOne(
        { email },
        {
          $set: {
            role: "admin",
            password: hashedPassword,
            isVerified: true,
            status: "active",
            firstName: "Admin",
            lastName: "Mahmud",
            fullName: "Admin Mahmud",
            authProvider: "local",
            updatedAt: new Date(),
          },
        }
      );
      console.log("✅ Admin user updated successfully:", email);
    } else {
      console.log("Creating new admin user...");
      await usersCollection.insertOne({
        firstName: "Admin",
        lastName: "Mahmud",
        fullName: "Admin Mahmud",
        email: email,
        password: hashedPassword,
        role: "admin",
        phoneNumber: "01700000000",
        status: "active",
        avatar: {
          url: "https://example.com/default-avatar.png",
        },
        shippingAddress: {
          addressLine: "Tech Mahmud HQ",
          city: "Barisal",
          state: "Barisal",
          postalCode: "8200",
          country: "Bangladesh",
        },
        isVerified: true,
        authProvider: "local",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Admin user inserted successfully:", email);
    }

    await mongoose.disconnect();
    console.log("Disconnected from DB.");
    process.exit(0);
  } catch (error) {
    console.error("Error inserting admin:", error);
    process.exit(1);
  }
}

seedAdmin();

