import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { verifyInviteToken, checkInviteUser, acceptInvite } from "@/lib/api";

type Step = "verify" | "set-password" | "join" | "success";

interface TokenData {
    email?: string;
    organization_id?: string;
    first_name?: string;
    last_name?: string;
}

export default function InviteAcceptancePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");
    const [step, setStep] = useState<Step>("verify");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenData, setTokenData] = useState<TokenData | null>(null);

    // Password form state
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // User data for success screen
    const [userData, setUserData] = useState<any>(null);

    // ── Step 1: Verify Token then check if user exists in Kinde ──────────────
    useEffect(() => {
        if (!token) {
            setError("Invalid invitation link. Token is missing.");
            return;
        }

        const verifyToken = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await verifyInviteToken(token);
                if (!response.valid) {
                    setError(response.message || "Invalid invitation token");
                    return;
                }

                const tokenInfo: TokenData = {
                    email: response.email,
                    first_name: response.first_name,
                    last_name: response.last_name,
                };
                setTokenData(tokenInfo);

                // Check if user already has a Kinde account with a password
                const userCheck = await checkInviteUser(token);
                if (userCheck.requires_password) {
                    setStep("set-password");
                } else {
                    setStep("join");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to verify invitation");
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    // ── Step 2a: Existing Kinde user — accept without password ───────────────
    const handleJoinOrganization = async () => {
        setError(null);
        setLoading(true);

        try {
            const response = await acceptInvite({ token: token || "" });
            setUserData({
                email: response.email,
                user_id: response.user_id,
                organization_id: response.organization_id,
            });
            setStep("success");
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to join organization";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2b: New user — validate & submit password ────────────────────────
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!password || !confirmPassword) {
            setError("Please enter and confirm your password");
            return;
        }

        if (password.length < 12) {
            setError("Password must be at least 12 characters");
            return;
        }

        if (!/[A-Z]/.test(password)) {
            setError("Password must contain at least one uppercase letter");
            return;
        }

        if (!/[0-9]/.test(password)) {
            setError("Password must contain at least one number");
            return;
        }

        if (!/[!@#$%^&*]/.test(password)) {
            setError("Password must contain at least one special character (!@#$%^&*)");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const response = await acceptInvite({
                token: token || "",
                password,
            });

            setUserData({
                email: response.email,
                user_id: response.user_id,
                organization_id: response.organization_id,
            });
            setStep("success");
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to set password";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Helper to evaluate checklist item states
    const isMinLength = password.length >= 12;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const passwordsMatch = password === confirmPassword && password.length > 0;

    // ── Main Page Layout ──────────────────────────────────────────────────────
    return (
        <div className="flex min-h-screen w-full flex-col bg-surface-page dark:bg-zinc-950">
            <main className="flex flex-1 items-center justify-center p-6">
                {/* ── Verifying ── */}
                {loading && step === "verify" && (
                    <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-zinc-600 dark:text-zinc-300 font-medium text-sm">Verifying your invitation...</p>
                    </div>
                )}

                {/* ── Error on verify ── */}
                {error && step === "verify" && (
                    <div className="w-full max-w-[400px] flex flex-col items-center gap-4 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Invalid Invitation</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-450">{error}</p>
                        <Button
                            onClick={() => navigate("/")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg"
                        >
                            Return to Home
                        </Button>
                    </div>
                )}

                {/* ── Existing Kinde user: Join without password ── */}
                {step === "join" && (
                    <div className="w-full max-w-[360px] space-y-6">
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-center">
                            Accept Invitation
                        </h1>

                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-[#60646B1A] dark:bg-zinc-800/40 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
                                {tokenData?.email}
                            </span>
                        </div>

                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            You already have an account. Click below to join the organization using your existing credentials.
                        </p>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-lg flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        <Button
                            onClick={handleJoinOrganization}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-lg shadow-sm transition-all cursor-pointer text-[14px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                                    Joining...
                                </>
                            ) : (
                                "Join Organization"
                            )}
                        </Button>
                    </div>
                )}

                {/* ── New user: Set Password ── */}
                {step === "set-password" && (
                    <div className="w-full max-w-[360px] space-y-6">
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-center">
                            Set Password
                        </h1>

                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-[#60646B1A] dark:bg-zinc-800/40 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
                                {tokenData?.email}
                            </span>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-lg flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-[13px] font-medium text-zinc-650 dark:text-zinc-300">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your new password"
                                        className="pr-10 h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg w-full text-zinc-800 dark:text-zinc-200 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4.5 h-4.5" />
                                        ) : (
                                            <Eye className="w-4.5 h-4.5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-zinc-650 dark:text-zinc-300">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        className="pr-10 h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg w-full text-zinc-800 dark:text-zinc-200 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer"
                                        aria-label={showConfirm ? "Hide password" : "Show password"}
                                    >
                                        {showConfirm ? (
                                            <EyeOff className="w-4.5 h-4.5" />
                                        ) : (
                                            <Eye className="w-4.5 h-4.5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-lg shadow-sm transition-all cursor-pointer text-[14px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                                        Setting Password...
                                    </>
                                ) : (
                                    "Set Password"
                                )}
                            </Button>

                            <ul className="text-[13px] space-y-2.5 text-zinc-550 dark:text-zinc-450 pt-2">
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle
                                        className={`w-5 h-5 shrink-0 transition-colors ${isMinLength ? "text-green-600 dark:text-green-500" : "text-zinc-300 dark:text-zinc-700"}`}
                                    />
                                    <span>Minimum 12 characters</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle
                                        className={`w-5 h-5 shrink-0 transition-colors ${hasUppercase ? "text-green-600 dark:text-green-500" : "text-zinc-300 dark:text-zinc-700"}`}
                                    />
                                    <span>At least one uppercase letter</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle
                                        className={`w-5 h-5 shrink-0 transition-colors ${hasNumber ? "text-green-600 dark:text-green-500" : "text-zinc-300 dark:text-zinc-700"}`}
                                    />
                                    <span>At least one number</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle
                                        className={`w-5 h-5 shrink-0 transition-colors ${hasSpecial ? "text-green-600 dark:text-green-500" : "text-zinc-300 dark:text-zinc-700"}`}
                                    />
                                    <span>At least one special character (!@#$%^&*)</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle
                                        className={`w-5 h-5 shrink-0 transition-colors ${passwordsMatch ? "text-green-600 dark:text-green-500" : "text-zinc-300 dark:text-zinc-700"}`}
                                    />
                                    <span>Passwords match</span>
                                </li>
                            </ul>
                        </form>
                    </div>
                )}

                {/* ── Success ── */}
                {step === "success" && userData && (
                    <div className="w-full max-w-[400px] flex flex-col items-center text-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-600 dark:text-green-400">
                            <CheckCircle className="w-12 h-12" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                            You're In!
                        </h1>

                        <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                            You have successfully joined the organization. Sign in to get started.
                        </p>

                        <Button
                            onClick={() => navigate("/")}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all cursor-pointer text-sm"
                        >
                            Back to Sign In
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
