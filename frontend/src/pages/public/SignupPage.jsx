import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  ArrowRight,
  ArrowLeft,
  Building2,
  Phone,
  Globe,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordField } from "../../components/auth/PasswordField";
import { StrengthMeter } from "../../components/auth/StrengthMeter";
import { RequirementList } from "../../components/auth/RequirementList";
import { Stepper } from "../../components/auth/Stepper";
import { FormAlert } from "../../components/auth/FormAlert";
import { validatePassword, isEmailRegistered } from "../../utils/validators";
import { setAuthSession } from "../../api/client";

export function SignupPage() {
  const navigate = useNavigate();

  // 3-Step Stepper State (Account → Business → Done)
  const [currentStep, setCurrentStep] = useState(1);

  // --- Step 1: Account State ---
  const [fullName, setFullName] = useState("");
  // Pre-filled with an existing account to showcase the requested inline error example
  const [email, setEmail] = useState("arjun@hyperscale.io");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // --- Step 2: Business State ---
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState("SaaS & Software");
  const [country, setCountry] = useState("India");
  const [stateName, setStateName] = useState("Karnataka");
  const [gstin, setGstin] = useState("");

  // Error States
  const [formError, setFormError] = useState("");

  // Live Password Validation & Email Registration Check
  const pwdChecks = validatePassword(password);
  const isRegistered = isEmailRegistered(email);

  // --- Handle Step 1 -> Step 2 ---
  const handleAccountSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setFormError("Please enter your work email.");
      return;
    }

    if (isRegistered) {
      setFormError("This email is already registered. Please log in instead.");
      return;
    }

    if (!pwdChecks.isValid) {
      setFormError("Please satisfy all password security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (!agreedToTerms) {
      setFormError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    // Advance to Step 2: Business
    setCurrentStep(2);
  };

  // --- Handle Step 2 -> Step 3 (Done) ---
  const handleBusinessSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!companyName.trim()) {
      setFormError("Please enter your company or business name.");
      return;
    }

    if (!phone.trim()) {
      setFormError("Please enter your phone number.");
      return;
    }

    // Role-based customer isolation: Signup always creates a customer
    setAuthSession("paydoo_customer_token", {
      id: "cust_" + Date.now(),
      email: email.trim(),
      name: fullName.trim(),
      role: "customer",
      company: companyName.trim(),
    });

    // Advance to Step 3: Done
    setCurrentStep(3);
  };

  // --- Handle Step 3: Go to Dashboard ---
  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <AuthLayout mode="signup">
      <div className="space-y-6">
        
        {/* Stepper Header: Account → Business → Done */}
        <Stepper currentStep={currentStep} steps={["Account", "Business", "Done"]} />

        {/* Global Form Alert */}
        {formError && <FormAlert message={formError} />}

        {/* ======================================================== */}
        {/* STEP 1: ACCOUNT DETAILS                                  */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-forest">
                Create your account
              </h1>
              <p className="text-xs sm:text-sm text-body-muted">
                Step 1 of 3: Provide your personal account credentials.
              </p>
            </div>

            {/* 1. Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-xs font-semibold text-forest">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Arjun Mehta"
                  autoComplete="name"
                  className="w-full h-12 pl-10 pr-4 bg-white border border-input-border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
            </div>

            {/* 2. Work Email with Live Registered Error Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="email" className="block text-xs font-semibold text-forest">
                  Work email
                </label>
                {isRegistered && (
                  <button
                    type="button"
                    onClick={() => setEmail("alex@newventure.io")}
                    className="text-[11px] text-teal hover:underline font-medium transition-colors duration-150 cursor-pointer"
                  >
                    Try unregistered email
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className={`w-4 h-4 ${isRegistered ? "text-error-red" : "text-body-muted"}`} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  aria-invalid={isRegistered}
                  aria-describedby={isRegistered ? "email-registered-error" : undefined}
                  className={`w-full h-12 pl-10 pr-10 bg-white border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none ${
                    isRegistered
                      ? "border-error-red bg-error-red/5 focus:ring-2 focus:ring-error-red/20"
                      : "border-input-border focus:border-teal focus:ring-2 focus:ring-teal/20"
                  }`}
                />
                {isRegistered && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-error-red">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Inline Error Message in Red with Teal 'Log in instead' Link */}
              {isRegistered && (
                <div id="email-registered-error" aria-live="polite" className="flex items-center justify-between pt-0.5 text-error-red">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium">This email is already registered</span>
                  </div>
                  <Link
                    to="/login"
                    className="text-xs font-bold text-teal hover:underline transition-colors duration-150"
                  >
                    Log in instead
                  </Link>
                </div>
              )}
            </div>

            {/* 3. Password Field */}
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create strong password"
              required
              autoComplete="new-password"
            />

            {/* 4-Segment Strength Meter */}
            <StrengthMeter password={password} checks={pwdChecks} />

            {/* 2x2 Password Requirement List */}
            <RequirementList checks={pwdChecks} />

            {/* 4. Confirm Password Field */}
            <PasswordField
              id="confirmPassword"
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              error={confirmPassword && password !== confirmPassword ? "Passwords do not match." : ""}
            />

            {/* 5. Terms & Privacy Consent */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-input-border text-forest accent-forest focus:ring-teal cursor-pointer"
                />
                <span className="text-xs text-body-muted leading-relaxed">
                  I agree to the{" "}
                  <a href="#terms" className="text-teal font-semibold hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#privacy" className="text-teal font-semibold hover:underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            {/* Primary Button: Forest Green full-width pill with Arrow */}
            <button
              type="submit"
              className="w-full h-12 mt-2 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 shadow-sm transition-colors duration-150 cursor-pointer"
            >
              <span>Continue to Business Details</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 2: BUSINESS DETAILS                                 */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <form onSubmit={handleBusinessSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-forest">
                Tell us about your business
              </h2>
              <p className="text-xs sm:text-sm text-body-muted">
                Step 2 of 3: Configure your billing identity and region.
              </p>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label htmlFor="companyName" className="block text-xs font-semibold text-forest">
                Company name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Technologies Pvt Ltd"
                  className="w-full h-12 pl-10 pr-4 bg-white border border-input-border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-semibold text-forest">
                Phone number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-12 pl-10 pr-4 bg-white border border-input-border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
            </div>

            {/* Business Type */}
            <div className="space-y-1.5">
              <label htmlFor="businessType" className="block text-xs font-semibold text-forest">
                Business type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                  <Globe className="w-4 h-4" />
                </div>
                <select
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-white border border-input-border rounded-xl text-sm text-forest transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 cursor-pointer"
                >
                  <option value="SaaS & Software">SaaS & Software Subscriptions</option>
                  <option value="E-Commerce & Retail">E-Commerce & Box Subscriptions</option>
                  <option value="Agency & Professional Services">Agency & Retainers</option>
                  <option value="Enterprise IT & Cloud">Enterprise IT & Cloud Infrastructure</option>
                  <option value="Other">Other Business</option>
                </select>
              </div>
            </div>

            {/* Country and State Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="country" className="block text-xs font-semibold text-forest">
                  Country
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    id="country"
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="w-full h-12 pl-10 pr-3 bg-white border border-input-border rounded-xl text-sm text-forest transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="stateName" className="block text-xs font-semibold text-forest">
                  State
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="stateName"
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Karnataka"
                    className="w-full h-12 pl-10 pr-3 bg-white border border-input-border rounded-xl text-sm text-forest transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  />
                </div>
              </div>
            </div>

            {/* Optional GSTIN */}
            <div className="space-y-1.5">
              <label htmlFor="gstin" className="block text-xs font-semibold text-forest">
                GSTIN / Tax ID <span className="text-body-muted font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  id="gstin"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AAAAA0000A1Z5"
                  className="w-full h-12 pl-10 pr-4 bg-white border border-input-border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 uppercase"
                />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-12 px-6 border border-input-border hover:bg-mint/40 text-forest font-semibold text-sm rounded-full flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="flex-1 h-12 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 shadow-sm transition-colors duration-150 cursor-pointer"
              >
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 3: DONE (SUCCESS)                                   */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 text-center py-2">
            {/* Green Check Icon Badge in Success-Green */}
            <div className="w-16 h-16 rounded-full bg-success-green/15 text-success-green flex items-center justify-center mx-auto border border-success-green/30">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>

            {/* Welcome Text */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-forest">
                Welcome to PayDoo, {fullName.split(" ")[0] || "Partner"}!
              </h2>
              <p className="text-sm text-body-muted max-w-sm mx-auto">
                Your subscription billing account for <span className="font-semibold text-forest">{companyName || "your workspace"}</span> is ready.
              </p>
            </div>

            {/* Next Steps Card */}
            <div className="bg-mint/30 border border-input-border rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest">
                <Sparkles className="w-4 h-4 text-teal" />
                <span>Next recommended actions</span>
              </div>
              <ul className="space-y-2.5 text-xs text-body-muted">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Explore your live billing overview and financial telemetry dashboard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Configure recurring billing intervals (monthly/annual) and product pricing plans.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Issue your first subscription quotation and test customer portal payment isolation.</span>
                </li>
              </ul>
            </div>

            {/* Go to Dashboard Full-Width Pill Button */}
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full h-12 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 shadow-sm transition-colors duration-150 cursor-pointer"
            >
              <span>Go to dashboard</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        )}

        {/* Footer: Already have an account? Log in */}
        {currentStep !== 3 && (
          <div className="pt-4 text-center">
            <p className="text-xs sm:text-sm text-body-muted">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-teal hover:underline font-bold transition-colors duration-150"
              >
                Log in instead
              </Link>
            </p>
          </div>
        )}

      </div>
    </AuthLayout>
  );
}

export default SignupPage;
