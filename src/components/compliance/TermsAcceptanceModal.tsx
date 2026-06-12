import { useState } from "react";
import { Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { acceptTerms } from "@/lib/api";
import { toast } from "sonner";

interface TermsAcceptanceModalProps {
    onAccepted: () => void;
}

export function TermsAcceptanceModal({ onAccepted }: TermsAcceptanceModalProps) {
    const { getToken, logout } = useKindeAuth();
    const [tosChecked, setTosChecked] = useState(false);
    const [privacyChecked, setPrivacyChecked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canProceed = tosChecked && privacyChecked;

    const handleAccept = async () => {
        if (!canProceed) return;
        setIsSubmitting(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");
            await acceptTerms(token);
            window.dispatchEvent(new Event("navigator_terms_accepted"));
            onAccepted();
        } catch {
            toast.error("Failed to record acceptance. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
                            <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Before you continue
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Please review and accept our agreements
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Navigator requires you to agree to our Terms of Service and Privacy Policy
                        before using the platform.
                    </p>

                    {/* ToS checkbox */}
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                        <Checkbox
                            id="tos"
                            checked={tosChecked}
                            onCheckedChange={(v) => setTosChecked(Boolean(v))}
                            className="mt-0.5 shrink-0"
                        />
                        <Label htmlFor="tos" className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed cursor-pointer">
                            I have read and agree to the{" "}
                            <a
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Terms of Service
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </Label>
                    </div>

                    {/* Privacy Policy checkbox */}
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                        <Checkbox
                            id="privacy"
                            checked={privacyChecked}
                            onCheckedChange={(v) => setPrivacyChecked(Boolean(v))}
                            className="mt-0.5 shrink-0"
                        />
                        <Label htmlFor="privacy" className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed cursor-pointer">
                            I have read and agree to the{" "}
                            <a
                                href="/privacy-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Privacy Policy
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </Label>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        By accepting, you confirm that you are at least 18 years of age and have the authority to
                        bind your organization to these terms.
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex flex-col gap-2.5">
                    <Button
                        onClick={handleAccept}
                        disabled={!canProceed || isSubmitting}
                        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                        {isSubmitting ? "Saving..." : "Accept & Continue"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => logout()}
                        className="w-full h-9 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm"
                    >
                        Decline & Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
