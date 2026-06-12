import { useState, useRef, type JSX, type KeyboardEvent, type ClipboardEvent } from "react";
import { Eye, EyeOff, X, AlertCircle, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { requestPasswordOtp, changePassword } from "@/lib/api";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChangePasswordDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Step = "request" | "verify";

type PasswordForm = {
    newPassword: string;
    confirmPassword: string;
};

type ShowState = { new: boolean; confirm: boolean };
type TouchedState = { newPassword?: boolean; confirmPassword?: boolean };

// ─── Password requirements ────────────────────────────────────────────────────

const requirements = [
    { label: "Minimum 12 characters",                              test: (v: string) => v.length >= 12 },
    { label: "At least one lowercase letter",                     test: (v: string) => /[a-z]/.test(v) },
    { label: "At least one uppercase letter",                     test: (v: string) => /[A-Z]/.test(v) },
    { label: "At least one number",                               test: (v: string) => /[0-9]/.test(v) },
    { label: "At least one special character (!, @, #, $, ...)",  test: (v: string) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(v) },
];

const initialForm: PasswordForm = { newPassword: "", confirmPassword: "" };
const initialShow: ShowState    = { new: false, confirm: false };

// ─── OTP digit input ──────────────────────────────────────────────────────────

function OtpInput({
    value,
    onChange,
}: {
    value: string[];
    onChange: (v: string[]) => void;
}) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const focus = (idx: number) => refs.current[idx]?.focus();

    const handleKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (value[idx]) {
                const next = [...value];
                next[idx] = "";
                onChange(next);
            } else if (idx > 0) {
                focus(idx - 1);
            }
        } else if (e.key === "ArrowLeft" && idx > 0) {
            focus(idx - 1);
        } else if (e.key === "ArrowRight" && idx < 5) {
            focus(idx + 1);
        }
    };

    const handleChange = (idx: number, raw: string) => {
        const digit = raw.replace(/\D/g, "").slice(-1);
        if (!digit) return;
        const next = [...value];
        next[idx] = digit;
        onChange(next);
        if (idx < 5) focus(idx + 1);
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
        if (!digits.length) return;
        const next = [...value];
        digits.forEach((d, i) => { if (i < 6) next[i] = d; });
        onChange(next);
        focus(Math.min(digits.length, 5));
    };

    return (
        <div className="flex items-center justify-center gap-2.5">
            {value.map((digit, idx) => (
                <input
                    key={idx}
                    ref={(el) => { refs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKey(idx, e)}
                    onPaste={handlePaste}
                    className={`h-12 w-11 rounded-lg border text-center text-lg font-semibold outline-none transition-all
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800
                        ${digit
                            ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
                        }`}
                    aria-label={`OTP digit ${idx + 1}`}
                />
            ))}
        </div>
    );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export default function ChangePasswordDrawer({
    open,
    onOpenChange,
}: ChangePasswordDrawerProps): JSX.Element {
    const { getToken, user } = useKindeAuth();

    // Step state
    const [step, setStep]             = useState<Step>("request");
    const [sentEmail, setSentEmail]   = useState("");
    const [otpDigits, setOtpDigits]   = useState<string[]>(Array(6).fill(""));
    const [otpError, setOtpError]     = useState("");

    // Password form state
    const [form, setForm]       = useState<PasswordForm>(initialForm);
    const [touched, setTouched] = useState<TouchedState>({});
    const [show, setShow]       = useState<ShowState>(initialShow);

    // Loading
    const [sendingOtp, setSendingOtp]     = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const reset = () => {
        setStep("request");
        setSentEmail("");
        setOtpDigits(Array(6).fill(""));
        setOtpError("");
        setForm(initialForm);
        setTouched({});
        setShow(initialShow);
        setSendingOtp(false);
        setIsSubmitting(false);
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) reset();
        onOpenChange(next);
    };

    const updateField = (key: keyof PasswordForm, v: string) => {
        setForm((p) => ({ ...p, [key]: v }));
        setTouched((p) => ({ ...p, [key]: true }));
    };

    const toggleShow = (key: keyof ShowState) =>
        setShow((p) => ({ ...p, [key]: !p[key] }));

    // Derived
    const allReqsMet = requirements.every((r) => r.test(form.newPassword));
    const confirmMismatch =
        touched.confirmPassword &&
        form.confirmPassword.length > 0 &&
        form.newPassword !== form.confirmPassword;

    const otp = otpDigits.join("");

    const canSubmit =
        otp.length === 6 &&
        allReqsMet &&
        form.confirmPassword.length > 0 &&
        form.newPassword === form.confirmPassword &&
        !isSubmitting;

    // ── Step 1: Request OTP ───────────────────────────────────────────────────

    const handleSendOtp = async () => {
        setSendingOtp(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");
            const res = await requestPasswordOtp(token);
            setSentEmail(res.email);
            setStep("verify");
            toast.success(`Verification code sent to ${res.email}`);
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to send verification code. Please try again.";
            toast.error(msg);
        } finally {
            setSendingOtp(false);
        }
    };

    // ── Step 2: Verify OTP + Change Password ──────────────────────────────────

    const handleSubmit = async (): Promise<void> => {
        setOtpError("");
        setTouched({ newPassword: true, confirmPassword: true });
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");

            await changePassword(
                { otp, new_password: form.newPassword, confirm_password: form.confirmPassword },
                token
            );
            handleOpenChange(false);
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to update password.";
            // OTP errors come back from the backend
            if (
                msg.toLowerCase().includes("otp") ||
                msg.toLowerCase().includes("code") ||
                msg.toLowerCase().includes("expired") ||
                msg.toLowerCase().includes("attempt")
            ) {
                setOtpError(msg);
            } else {
                toast.error(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
                data-testid="change-password-drawer"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        data-testid="close-change-password-btn"
                        tabIndex={-1}
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Change Password
                    </SheetTitle>
                </div>

                {/* ── STEP 1: Request OTP ─────────────────────────────────── */}
                {step === "request" && (
                    <div className="flex flex-1 flex-col gap-0 bg-background">
                        <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 text-center space-y-6">
                            {/* Security Illustration/Icon */}
                            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm">
                                <div className="absolute inset-0 rounded-full bg-blue-500/5" />
                                <Mail className="h-9 w-9 text-blue-600 dark:text-blue-400" />
                            </div>

                            {/* Heading & description */}
                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                    Security Verification
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    To keep your account secure, we need to verify your identity before changing your password.
                                </p>
                            </div>

                            {/* Email Display Card */}
                            <div className="w-full max-w-sm rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 flex items-center gap-3.5 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                        Verification Email
                                    </p>
                                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                                        {user?.email ?? "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleOpenChange(false)}
                                className="rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={sendingOtp}
                                data-testid="send-otp-btn"
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                            >
                                {sendingOtp ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Sending…</span>
                                    </>
                                ) : (
                                    "Send Verification Code"
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Verify OTP + New Password ──────────────────── */}
                {step === "verify" && (
                    <div className="flex flex-1 flex-col gap-0 bg-background">
                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                            {/* Sent confirmation banner */}
                            <div className="rounded-xl border border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-500/10 dark:bg-emerald-500/5 p-3 flex items-center gap-2.5">
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <p className="text-xs text-emerald-800 dark:text-emerald-400">
                                    Code sent to&nbsp;
                                    <span className="font-semibold">{sentEmail}</span>.
                                    Check your inbox (and spam folder).
                                </p>
                            </div>

                            {/* OTP input */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Verification Code <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <OtpInput value={otpDigits} onChange={setOtpDigits} />
                                {otpError && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1 justify-center">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        <span>{otpError}</span>
                                    </div>
                                )}
                                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                    Didn't receive it?{" "}
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp}
                                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline disabled:opacity-50 transition-colors"
                                    >
                                        {sendingOtp ? "Sending…" : "Resend code"}
                                    </button>
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="cp-new"
                                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    New Password <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="cp-new"
                                        type={show.new ? "text" : "password"}
                                        placeholder="Enter your new password"
                                        maxLength={128}
                                        value={form.newPassword}
                                        autoComplete="new-password"
                                        onChange={(e) => updateField("newPassword", e.target.value)}
                                        onBlur={() => setTouched((p) => ({ ...p, newPassword: true }))}
                                        className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 pr-10 focus-visible:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleShow("new")}
                                        tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                        aria-label={show.new ? "Hide password" : "Show password"}
                                    >
                                        {show.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="cp-confirm"
                                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    Confirm Password <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="cp-confirm"
                                        type={show.confirm ? "text" : "password"}
                                        placeholder="Confirm your new password"
                                        maxLength={128}
                                        value={form.confirmPassword}
                                        autoComplete="new-password"
                                        onChange={(e) => updateField("confirmPassword", e.target.value)}
                                        onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                                        className={`h-11 rounded-lg pr-10 focus-visible:ring-blue-500 ${
                                            confirmMismatch
                                                ? "border-red-400 dark:border-red-600 focus-visible:ring-red-500"
                                                : "border-zinc-200 dark:border-zinc-700"
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleShow("confirm")}
                                        tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                        aria-label={show.confirm ? "Hide password" : "Show password"}
                                    >
                                        {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmMismatch && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>Passwords do not match</span>
                                    </div>
                                )}
                            </div>

                            {/* Requirements checklist */}
                            <div className="space-y-2 pt-2 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl p-3.5 border border-zinc-100 dark:border-zinc-800/60">
                                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                                    Password Requirements
                                </p>
                                {requirements.map((req) => {
                                    const met = req.test(form.newPassword);
                                    const showReq = touched.newPassword || form.newPassword.length > 0;
                                    return (
                                        <div key={req.label} className="flex items-center gap-2.5">
                                            <div
                                                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                                                    showReq && met
                                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                        : "border-zinc-300 dark:border-zinc-600 bg-transparent text-transparent"
                                                }`}
                                            >
                                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
                                                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                                                </svg>
                                            </div>
                                            <span className={`text-xs transition-colors duration-200 ${showReq && met ? "text-zinc-700 dark:text-zinc-200 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
                                                {req.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleOpenChange(false)}
                                className="rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                data-testid="change-password-submit-btn"
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors px-5 h-10 min-w-[140px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Updating…</span>
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
