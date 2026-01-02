import { hashPassword, validatePasswordStrength } from "../auth/password";
import { createEmailVerificationToken, sendVerificationEmail } from "../auth/email";
import { db } from "../../index";
import { usersTable } from "../../DB/schema";
import { eq } from "drizzle-orm";

export const registerRoute = {
  async POST(req: Request) {
    try {
      const { email, password, name } = await req.json() as {
        email: string;
        password: string;
        name: string;
      };
      
      // Validate input
      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "Email, password, and name are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      if (!validatePasswordStrength(password)) {
        return new Response(
          JSON.stringify({ 
            error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number" 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
        
      if (existingUser.length > 0) {
        return new Response(
          JSON.stringify({ error: "User with this email already exists" }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const newUser = await db
        .insert(usersTable)
        .values({
          name,
          email,
          passwordHash,
          age: 0, // Default age since it's required in the schema
        })
        .returning({ id: usersTable.id, email: usersTable.email });
        
      // Create and send verification email
      const verificationToken = await createEmailVerificationToken(newUser[0]!.id);
      sendVerificationEmail(newUser[0]!.email, verificationToken);
      
      return new Response(
        JSON.stringify({ 
          message: "User registered successfully. Please check your email to verify your account." 
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Registration error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};