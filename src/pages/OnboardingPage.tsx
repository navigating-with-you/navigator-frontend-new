import { useState, useRef } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { createOrganization, uploadLogo } from "@/lib/api";
import { toast } from "sonner";
import { Building, Loader2, Sun, Moon, Image as ImageIcon, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { organizationCreateSchema } from "@/schemas/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import CountryList from "country-list-with-dial-code-and-flag";

type OnboardingPageProps = {
    onComplete: (orgId: string) => void;
};

const countries = (() => {
    const instance = (CountryList as any).default || CountryList;
    if (instance && typeof instance.getAll === "function") {
        return instance.getAll();
    }
    return [];
})();



export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const { getToken, user, logout } = useKindeAuth();
    const { theme, toggleTheme } = useTheme();

    const fullName = user?.givenName ? `${user.givenName} ${user.familyName || ""}`.trim() : "User";
    const initials = fullName
        ? fullName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "U";

    const currentStep = 1;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // ── STEP 1: Company Setup Data ──────────────────────────────────────────
    const [orgName, setOrgName] = useState("");
    const [orgEmail, setOrgEmail] = useState("");
    const [selectedPhoneCountry, setSelectedPhoneCountry] = useState("US");
    const currentPhoneCountry = countries.find(c => c.code === selectedPhoneCountry) || countries.find(c => c.code === "US");
    const dialCode = currentPhoneCountry ? currentPhoneCountry.dial_code : "+1";
    const [contactNumber, setContactNumber] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [stateProvince, setStateProvince] = useState("");
    const [country, setCountry] = useState("US");
    const [postalCode, setPostalCode] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const formPayload = {
        name: orgName,
        email: orgEmail,
        contactNumber,
        address,
        city,
        stateProvince,
        country,
        postalCode,
    };

    const validation = organizationCreateSchema.safeParse(formPayload);
    const fieldErrors = !validation.success
        ? validation.error.flatten().fieldErrors
        : {};

    // Handle file selection for logo
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            if (!fileExt || !["jpeg", "jpg", "png"].includes(fileExt)) {
                toast.error("Invalid file format. Only JPEG, JPG, and PNG are allowed.");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size exceeds 5MB limit");
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleCountryChange = (val: string) => {
        setCountry(val);
        const match = countries.find((c) => c.code === val);
        if (match) {
            setSelectedPhoneCountry(val);
        }
    };

    // ── Step 1 Submit: Create Organization ──────────────────────────────────
    const handleCreateOrg = async () => {
        setTouched({
            name: true,
            email: true,
            contactNumber: true,
            address: true,
            city: true,
            stateProvince: true,
            postalCode: true,
        });

        if (!validation.success) {
            const firstError = validation.error.errors[0]?.message || "Invalid organization details";
            toast.error(firstError);
            return;
        }

        setSubmitError(null);
        setIsSubmitting(true);
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Session authentication error");
                return;
            }

            let uploadedLogoUrl: string | undefined = undefined;
            if (logoFile) {
                try {
                    const uploadRes = await uploadLogo(logoFile, token);
                    uploadedLogoUrl = uploadRes.s3_key;
                } catch (uploadErr: any) {
                    console.error("Logo upload failed:", uploadErr);
                    toast.error("Failed to upload organization logo, but continuing creation...");
                }
            }

            const response = await createOrganization({
                name: orgName,
                logo_url: uploadedLogoUrl,
                email: orgEmail.trim() || undefined,
                contact_number: contactNumber.trim() ? `${dialCode}${contactNumber.trim()}` : undefined,
                billing_address: {
                    line1: address,
                    city: city,
                    state: stateProvince,
                    postal_code: postalCode,
                    country: country,
                }
            }, token);

            toast.success("Organization created successfully!");
            onComplete(response.id);
        } catch (err: any) {
            console.error(err);
            const errMsg = err.message || "Failed to create organization. Check details and retry.";
            setSubmitError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = [
        { id: 1, label: "Company Setup", icon: Building },
    ];

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#FEFFFA] dark:bg-zinc-950 transition-colors duration-300 relative select-none">
            {/* Header / Top Bar */}
            <header className="w-full border-b border-zinc-100 dark:border-zinc-800/80 bg-[#FEFFFA] dark:bg-zinc-950 px-4 sm:px-6 md:px-12 py-4 shrink-0">
                <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center">
                        <img
                            src="/navigator-logo.svg"
                            alt="Navigator"
                            className="h-8 md:h-9 w-auto object-contain block dark:brightness-110"
                        />
                    </div>

                    {/* Controls & Profile */}
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <Button
                            onClick={toggleTheme}
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
                            aria-label="Toggle theme"
                        >
                            {theme === "light" ? (
                                <Moon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                            ) : (
                                <Sun className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                            )}
                        </Button>

                        {/* User Profile dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-2.5 outline-none hover:opacity-85 transition-opacity rounded-full p-0.5 cursor-pointer"
                                    data-testid="user-profile"
                                >
                                    <Avatar className="h-8 w-8">
                                        {user?.picture ? (
                                            <AvatarImage
                                                src={user.picture}
                                                alt={fullName}
                                            />
                                        ) : null}
                                        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden sm:inline text-sm font-medium text-zinc-900 dark:text-zinc-100 max-w-[120px] truncate">
                                        {fullName}
                                    </span>
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                sideOffset={2}
                                className="w-56 rounded-[10px] p-[10px] border border-zinc-200 dark:border-zinc-800 bg-[#60646B1A] dark:bg-zinc-900 shadow-lg text-zinc-900 dark:text-zinc-100 focus:outline-none backdrop-blur-md"
                            >
                                <DropdownMenuLabel className="font-normal px-2.5 py-2">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none text-zinc-900 dark:text-zinc-100">
                                            {fullName}
                                        </p>
                                        <p className="text-xs leading-none text-zinc-500 dark:text-zinc-400 truncate">
                                            {user?.email || ""}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1.5" />

                                <DropdownMenuItem
                                    onClick={() => logout()}
                                    className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50/50 dark:focus:bg-red-950/20 rounded-lg cursor-pointer px-2.5 py-2 text-sm flex items-center"
                                >
                                    <svg
                                        className="mr-2 h-4 w-4 inline-block"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Sign out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Main Form Container */}
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-6 sm:py-10 md:py-12 transition-all">

                {/* Steps Horizontal Progress Indicator */}
                <div className="w-full mb-10">
                    {/* Progress Bar Line */}
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-3">
                        <div
                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: "100%" }}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider">
                            Step 1 of 1
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                            {steps[currentStep - 1].label}
                        </span>
                    </div>
                </div>

                {/* STEP 1: Let's Get Your Company Set Up */}
                {currentStep === 1 && (
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-[32px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                Let's Get Your Company Set Up
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                                Tell us about your organization to initialize your secure AI workspace.
                            </p>
                        </div>

                        {/* Logo Upload Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                Company Logo
                            </label>
                            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900">
                                <div className="h-24 w-24 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-250/60 dark:border-zinc-700 shadow-inner">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <ImageIcon className="h-10 w-10 text-zinc-400" />
                                    )}
                                </div>
                                <div className="space-y-3 text-center sm:text-left">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Allowed only .jpeg, .jpg, .png. Maximum size of 5 MB.
                                    </p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleLogoChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm cursor-pointer"
                                    >
                                        Choose File
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Organization Name */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    Organization Name <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value.slice(0, 255))}
                                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                                    maxLength={255}
                                    placeholder="Enter organization name"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                />
                                {touched.name && fieldErrors.name && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.name[0]}</span>
                                     </div>
                                 )}
                            </div>

                            {/* Contact Email */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    Contact Email
                                </label>
                                <Input
                                    type="email"
                                    value={orgEmail}
                                    onChange={(e) => setOrgEmail(e.target.value.slice(0, 255))}
                                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                    maxLength={255}
                                    placeholder="contact@company.com"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                />
                                {touched.email && fieldErrors.email && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.email[0]}</span>
                                     </div>
                                 )}
                            </div>

                            {/* Contact Phone Number */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    Contact Phone Number
                                </label>
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedPhoneCountry}
                                        onValueChange={setSelectedPhoneCountry}
                                    >
                                        <SelectTrigger className="w-[100px] h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium">
                                            <SelectValue>
                                                {currentPhoneCountry ? `${currentPhoneCountry.flag} ${currentPhoneCountry.dial_code}` : "+1"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
                                            {countries.map((c) => (
                                                <SelectItem key={`${c.code}-dial`} value={c.code} textValue={c.name} className="cursor-pointer text-sm">
                                                    {c.flag} {c.dial_code} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="tel"
                                        value={contactNumber}
                                        onChange={(e) => setContactNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 15))}
                                        onBlur={() => setTouched(prev => ({ ...prev, contactNumber: true }))}
                                        placeholder="Phone number"
                                        maxLength={15}
                                        className="flex-1 h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                                {touched.contactNumber && fieldErrors.contactNumber && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.contactNumber[0]}</span>
                                     </div>
                                 )}
                            </div>

                            {/* Address Line 1 */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    Address Line 1 <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value.slice(0, 255))}
                                    onBlur={() => setTouched(prev => ({ ...prev, address: true }))}
                                    maxLength={255}
                                    placeholder="Enter address line 1"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                />
                                {touched.address && fieldErrors.address && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.address[0]}</span>
                                     </div>
                                 )}
                            </div>

                            {/* City */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    City <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value.slice(0, 100))}
                                    onBlur={() => setTouched(prev => ({ ...prev, city: true }))}
                                    maxLength={100}
                                    placeholder="Enter city"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                />
                                {touched.city && fieldErrors.city && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.city[0]}</span>
                                     </div>
                                 )}
                            </div>

                            {/* State or Province */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    State or Province <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={stateProvince}
                                    onChange={(e) => setStateProvince(e.target.value.slice(0, 100))}
                                    onBlur={() => setTouched(prev => ({ ...prev, stateProvince: true }))}
                                    maxLength={100}
                                    placeholder="Enter state or province"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                />
                                {touched.stateProvince && fieldErrors.stateProvince && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.stateProvince[0]}</span>
                                     </div>
                                 )}
                            </div>

                            {/* Country */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    Country
                                </label>
                                <Select
                                    value={country}
                                    onValueChange={handleCountryChange}
                                >
                                    <SelectTrigger className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
                                        {countries.map((c) => (
                                            <SelectItem key={c.code} value={c.code} textValue={c.name} className="cursor-pointer text-sm">
                                                {c.flag} {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Postal Code */}
                            <div className="space-y-1.5 font-medium">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    Postal Code <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value.slice(0, 20))}
                                    onBlur={() => setTouched(prev => ({ ...prev, postalCode: true }))}
                                    maxLength={20}
                                    placeholder="Enter postal code"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                />
                                {touched.postalCode && fieldErrors.postalCode && (
                                     <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                         <AlertCircle className="h-3.5 w-3.5" />
                                         <span>{fieldErrors.postalCode[0]}</span>
                                     </div>
                                 )}
                            </div>
                        </div>


                        {/* Navigation Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex-1">
                                {submitError && (
                                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-650 dark:text-red-400 text-xs flex items-center gap-2.5 font-medium">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                                        <span>{submitError}</span>
                                    </div>
                                )}
                            </div>
                            <Button
                                type="button"
                                onClick={handleCreateOrg}
                                disabled={isSubmitting}
                                className="h-11 px-10 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-w-[120px] self-end sm:self-auto"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    "Save & Continue"
                                )}
                            </Button>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
