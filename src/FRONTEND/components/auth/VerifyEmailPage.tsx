import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { authApi } from "../../services/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  
  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing");
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } catch (err: any) {
        setStatus("error");
        // Provide more specific error messages based on the error type
        if (err.status === 400) {
          if (err.data?.error?.includes("expired")) {
            setMessage("Verification link has expired. Please request a new one.");
          } else {
            setMessage("Invalid verification link. Please check your email and try again.");
          }
        } else {
          setMessage(err.message || "Failed to verify email. Please try again later.");
        }
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            {status === "loading" && "Please wait while we verify your email address."}
            {status === "success" && "Your email has been verified successfully!"}
            {status === "error" && "There was an issue verifying your email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            {status === "loading" && (
              <>
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
                <h2 className="text-xl font-semibold">Verifying your email...</h2>
              </>
            )}
            
            {status === "success" && (
              <>
                <div className="mb-4 text-green-600">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button
                  onClick={() => navigate("/login")}
                  className="mt-4"
                >
                  Go to Login
                </Button>
              </>
            )}
            
            {status === "error" && (
              <>
                <div className="mb-4 text-destructive">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                  >
                    <Link to="/register">
                      Create New Account
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};