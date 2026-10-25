import { LoginForm } from "@/components/auth/login-form";
import { SEOHead } from "@/components/seo/seo-head";

export default function LoginPage() {
  return (
    <>
      <SEOHead
        title="Login - PrestigeEdge Luxury Real Estate"
        description="Access your PrestigeEdge account to manage luxury properties, view saved listings, and connect with premium real estate agents."
        type="website"
      />
      <LoginForm />
    </>
  );
}
