"use client";

import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Lock, Phone, ChevronLeft } from "lucide-react";
import { useLogin, useRegister } from "@/hooks/useAuth";
import { loginSchema, insertUserSchema } from "@shared/schema";
import type { LoginCredentials, InsertUser } from "@shared/schema";

const LUXE_INPUT =
  "h-11 pl-11 bg-luxe-bg border border-luxe-border/50 rounded-none text-luxe-text placeholder:text-luxe-text-muted/50 focus:border-luxe-bronze focus-visible:ring-0 focus-visible:ring-offset-0 text-sm";

const LUXE_LABEL =
  "text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted font-normal";

const LUXE_SUBMIT_BTN =
  "w-full h-11 bg-luxe-bronze text-luxe-bg hover:bg-luxe-bronze-light transition-colors rounded-none text-xs uppercase tracking-[0.25em] font-medium disabled:opacity-50 disabled:cursor-not-allowed";

export function LoginForm() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const demoCredentials: Array<{ email: string; password: string; role: string }> = [];

  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "client",
      phone: "",
    },
  });

  const onLogin = (data: LoginCredentials) => loginMutation.mutate(data);
  const onRegister = (data: InsertUser) => registerMutation.mutate(data);

  return (
    <div className="min-h-screen bg-luxe-bg relative flex flex-col">
      {/* Subtle bronze grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(184,134,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(184,134,11,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Sticky LUXE nav */}
      <nav className="sticky top-0 z-50 w-full bg-luxe-bg/95 backdrop-blur-sm border-b border-luxe-border/30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 md:h-14">
            <Link href="/">
              <span className="font-serif text-lg md:text-xl tracking-wide text-luxe-text cursor-pointer">
                PRESTIGE<span className="text-luxe-bronze">EDGE</span>
              </span>
            </Link>
            <Link href="/">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-luxe-text-muted hover:text-luxe-bronze transition-colors cursor-pointer">
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted mb-3">
              Members Portal
            </div>
            <h1 className="font-serif italic text-3xl md:text-4xl text-luxe-text leading-tight">
              {activeTab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-luxe-text-muted text-xs md:text-sm mt-3 tracking-wide">
              Access curated listings, saved properties, and your concierge.
            </p>
          </div>

          {/* Square bordered panel */}
          <div className="bg-luxe-surface border border-luxe-border/50">
            {/* Underline tabs */}
            <div
              role="tablist"
              aria-label="Account access"
              className="grid grid-cols-2 border-b border-luxe-border/40"
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  setActiveTab(activeTab === "login" ? "register" : "login");
                }
              }}
            >
              <button
                type="button"
                role="tab"
                id="login-tab"
                aria-selected={activeTab === "login"}
                aria-controls="login-panel"
                tabIndex={activeTab === "login" ? 0 : -1}
                onClick={() => setActiveTab("login")}
                className={`h-12 text-[11px] uppercase tracking-[0.25em] transition-colors border-b-2 focus-visible:outline-none focus-visible:bg-luxe-bg/40 ${
                  activeTab === "login"
                    ? "text-luxe-bronze border-luxe-bronze"
                    : "text-luxe-text-muted border-transparent hover:text-luxe-text"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                id="register-tab"
                aria-selected={activeTab === "register"}
                aria-controls="register-panel"
                tabIndex={activeTab === "register" ? 0 : -1}
                onClick={() => setActiveTab("register")}
                className={`h-12 text-[11px] uppercase tracking-[0.25em] transition-colors border-b-2 focus-visible:outline-none focus-visible:bg-luxe-bg/40 ${
                  activeTab === "register"
                    ? "text-luxe-bronze border-luxe-bronze"
                    : "text-luxe-text-muted border-transparent hover:text-luxe-text"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div
              className="p-6 md:p-7"
              role="tabpanel"
              id={activeTab === "login" ? "login-panel" : "register-panel"}
              aria-labelledby={activeTab === "login" ? "login-tab" : "register-tab"}
            >
              {activeTab === "login" ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                              <Input
                                {...field}
                                type="email"
                                placeholder="you@example.com"
                                className={LUXE_INPUT}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                              <Input
                                {...field}
                                type="password"
                                placeholder="Enter your password"
                                className={LUXE_INPUT}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className={LUXE_SUBMIT_BTN}
                    >
                      {loginMutation.isPending ? "Signing In…" : "Sign In"}
                    </button>

                    {/* Demo Access */}
                    <div className="mt-6 pt-6 border-t border-luxe-border/40">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted">
                          Demo Access
                        </span>
                        <span className="text-[10px] tracking-wide text-luxe-text-muted/60">
                          One-tap sign in
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {demoCredentials.map((cred) => (
                          <button
                            key={cred.email}
                            type="button"
                            disabled={loginMutation.isPending}
                            onClick={() =>
                              loginMutation.mutate({ email: cred.email, password: cred.password })
                            }
                            className="h-10 border border-luxe-border/50 text-[10px] uppercase tracking-[0.25em] text-luxe-text hover:bg-luxe-bronze hover:text-luxe-bg hover:border-luxe-bronze transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cred.role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                              <Input
                                {...field}
                                placeholder="Enter your full name"
                                className={LUXE_INPUT}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                              <Input
                                {...field}
                                type="email"
                                placeholder="you@example.com"
                                className={LUXE_INPUT}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Phone (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="+1 (555) 555-5555"
                                className={LUXE_INPUT}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Account Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="h-11 bg-luxe-bg border border-luxe-border/50 rounded-none text-luxe-text focus:border-luxe-bronze focus:ring-0 focus:ring-offset-0 text-sm">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                              <SelectContent className="bg-luxe-surface border border-luxe-border/50 rounded-none">
                                <SelectItem
                                  value="client"
                                  className="text-luxe-text rounded-none focus:bg-luxe-bronze/10 focus:text-luxe-bronze"
                                >
                                  Property Buyer
                                </SelectItem>
                                <SelectItem
                                  value="agent"
                                  className="text-luxe-text rounded-none focus:bg-luxe-bronze/10 focus:text-luxe-bronze"
                                >
                                  Real Estate Agent
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className={LUXE_LABEL}>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe-bronze" strokeWidth={1.5} />
                              <Input
                                {...field}
                                type="password"
                                placeholder="Create a secure password"
                                className={LUXE_INPUT}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-rose-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={registerMutation.isPending}
                      className={LUXE_SUBMIT_BTN}
                    >
                      {registerMutation.isPending ? "Creating Account…" : "Create Account"}
                    </button>
                  </form>
                </Form>
              )}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-luxe-text-muted/70 mt-6">
            By continuing you agree to the PrestigeEdge terms
          </p>
        </div>
      </div>
    </div>
  );
}
