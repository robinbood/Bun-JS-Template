import { createPasswordResetToken, sendPasswordResetEmail } from "../auth/email";

export const forgotPasswordRoute = {
  async POST(req: Request) {
    try {
      const { email } = await req.json() as { email: string };
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const resetToken = await createPasswordResetToken(email);
      
      if (resetToken) {
        sendPasswordResetEmail(email, resetToken);
      }
      
      // Always return success to prevent email enumeration attacks
      return new Response(
        JSON.stringify({ message: "If an account with this email exists, a password reset link has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};