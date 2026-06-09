import { useEffect, useState } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Building2, Edit2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getOrganization, updateOrganization, uploadLogo, deleteOrgLogo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/utils/rbacConfig";

export interface OrganizationData {
    id: string;
    name: string;
    kinde_organization_id: string;
    logo_url?: string;
    email?: string;
    contact_number?: string;
    billing_address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    is_active: boolean;
}

interface OrganizationProfileDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function OrganizationProfileDrawer({
    open,
    onOpenChange,
}: OrganizationProfileDrawerProps) {
    const { getToken } = useKindeAuth();
    const { hasPermission } = usePermissions();
    const canEditOrg = hasPermission(PERMISSIONS.ORG_EDIT);
    const [orgData, setOrgData] = useState<OrganizationData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        email: "",
        contact_number: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
    });

    const resetForm = () => {
        if (orgData) {
            setFormData({
                email: orgData.email || "",
                contact_number: orgData.contact_number || "",
                line1: orgData.billing_address?.line1 || "",
                line2: orgData.billing_address?.line2 || "",
                city: orgData.billing_address?.city || "",
                state: orgData.billing_address?.state || "",
                postal_code: orgData.billing_address?.postal_code || "",
                country: orgData.billing_address?.country || "",
            });
        }
        setLogoFile(null);
        setLogoPreview(orgData?.logo_url || null);
    };

    // Load organization data
    useEffect(() => {
        if (!open) {
            setIsLoading(false);
            return;
        }

        const loadOrganization = async () => {
            try {
                setIsLoading(true);
                // Get the stored user profile which has organization_id
                const stored = sessionStorage.getItem("navigator_user_profile");
                let orgId: string | null = null;

                if (stored) {
                    try {
                        const profile = JSON.parse(stored);
                        orgId = profile.organization_id;
                    } catch (e) {
                        console.error("Failed to parse stored profile", e);
                    }
                }

                if (!orgId) {
                    toast.error("No organization ID found");
                    setIsLoading(false);
                    return;
                }

                const token = await getToken();
                if (!token) {
                    toast.error("Authentication failed");
                    setIsLoading(false);
                    return;
                }

                const data = await getOrganization(orgId, token);
                setOrgData(data);
                setLogoPreview(data.logo_url || null);

                // Initialize form data
                setFormData({
                    email: data.email || "",
                    contact_number: data.contact_number || "",
                    line1: data.billing_address?.line1 || "",
                    line2: data.billing_address?.line2 || "",
                    city: data.billing_address?.city || "",
                    state: data.billing_address?.state || "",
                    postal_code: data.billing_address?.postal_code || "",
                    country: data.billing_address?.country || "",
                });
                setIsLoading(false);
            } catch (error: any) {
                console.error("Failed to load organization:", error);
                toast.error(error?.message || "Failed to load organization details");
                setIsLoading(false);
            }
        };

        loadOrganization();
    }, [open, getToken]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Logo size must be less than 5MB");
                return;
            }

            // Validate file type
            if (
                ![
                    "image/jpeg",
                    "image/png",
                    "image/gif",
                    "image/webp",
                ].includes(file.type)
            ) {
                toast.error(
                    "Logo must be a valid image format (JPEG, PNG, GIF, WEBP)"
                );
                return;
            }

            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setLogoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!orgData) return;

        setIsSaving(true);
        try {
            const token = await getToken();
            if (!token) return;

            let logoUrl = orgData.logo_url;

            // Upload logo if changed
            if (logoFile) {
                const uploadResponse = await uploadLogo(logoFile, token);
                logoUrl = uploadResponse.logo_url;
            }

            // Prepare update payload
            const updatePayload: any = {
                email: formData.email || undefined,
                contact_number: formData.contact_number || undefined,
            };

            if (logoUrl) {
                updatePayload.logo_url = logoUrl;
            }

            // Add billing address if any field is filled
            if (
                formData.line1 ||
                formData.city ||
                formData.state ||
                formData.postal_code ||
                formData.country
            ) {
                updatePayload.billing_address = {
                    line1: formData.line1,
                    line2: formData.line2 || undefined,
                    city: formData.city,
                    state: formData.state,
                    postal_code: formData.postal_code,
                    country: formData.country,
                };
            }

            // Call update API
            await updateOrganization(orgData.id, updatePayload, token);

            // Update local state
            setOrgData({
                ...orgData,
                ...updatePayload,
                logo_url: logoUrl,
            });

            setIsEditing(false);
            setLogoFile(null);
            toast.success("Organization details updated successfully");
        } catch (error: any) {
            console.error("Failed to update organization:", error);
            toast.error(error?.message || "Failed to update organization");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        resetForm();
    };

    const handleDeleteLogo = async () => {
        if (!orgData) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            if (token) {
                await deleteOrgLogo(orgData.id, token);
                setOrgData({
                    ...orgData,
                    logo_url: undefined,
                });
                setLogoPreview(null);
                setConfirmDeleteLogo(false);
                toast.success("Logo deleted successfully");
            }
        } catch (error: any) {
            console.error("Failed to delete logo:", error);
            toast.error(error?.message || "Failed to delete logo");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setIsEditing(false);
        resetForm();
        onOpenChange(false);
    };

    if (isLoading) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    hideClose
                    className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
                >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SheetTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            Organization Details
                        </SheetTitle>
                        <div className="w-5" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    if (!orgData) return null;

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    hideClose
                    className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Organization Details
                        </SheetTitle>
                        {!isEditing && canEditOrg && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-3 py-1.5 h-auto text-sm rounded-lg transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                        {/* Organization Logo Section */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Organization Logo
                            </label>
                            <div className="relative w-fit">
                                <div className="h-24 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Organization logo"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="h-8 w-8 text-zinc-400" />
                                    )}
                                </div>
                                {isEditing && logoPreview && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteLogo(true)}
                                        className="absolute top-0 right-0 rounded-full bg-red-500 hover:bg-red-600 text-white p-1 transition-colors shadow-md border border-white dark:border-zinc-900"
                                        aria-label="Delete logo"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            {isEditing && (
                                <div className="space-y-2 pt-2">
                                    <label
                                        htmlFor="logo-input"
                                        className="block px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer text-center transition-colors w-fit"
                                    >
                                        Choose File
                                    </label>
                                    <input
                                        id="logo-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Allowed: jpeg, jpg, png, gif, webp. Max 5MB.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Organization Name (Read-only) */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Organization Name
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={orgData.name}
                                    disabled
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100 text-sm cursor-not-allowed opacity-75"
                                />
                            ) : (
                                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                    {orgData.name}
                                </p>
                            )}
                        </div>

                        {/* Organization Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Organization Email
                            </label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="contact@organization.com"
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                    {formData.email || "—"}
                                </p>
                            )}
                        </div>

                        {/* Contact Number */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Contact Number
                            </label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    name="contact_number"
                                    value={formData.contact_number}
                                    onChange={handleInputChange}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                    {formData.contact_number || "—"}
                                </p>
                            )}
                        </div>

                        {/* Billing Address Section */}
                        <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Billing Address
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Line 1 */}
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        Address Line 1
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="line1"
                                            value={formData.line1}
                                            onChange={handleInputChange}
                                            placeholder="123 Main St"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {formData.line1 || "—"}
                                        </p>
                                    )}
                                </div>

                                {/* Line 2 */}
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        Address Line 2
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="line2"
                                            value={formData.line2}
                                            onChange={handleInputChange}
                                            placeholder="Suite 100 (optional)"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {formData.line2 || "—"}
                                        </p>
                                    )}
                                </div>

                                {/* City */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        City
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            placeholder="San Francisco"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {formData.city || "—"}
                                        </p>
                                    )}
                                </div>

                                {/* State */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        State/Province
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            placeholder="California"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {formData.state || "—"}
                                        </p>
                                    )}
                                </div>

                                {/* Postal Code */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        Postal Code
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="postal_code"
                                            value={formData.postal_code}
                                            onChange={handleInputChange}
                                            placeholder="94105"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {formData.postal_code || "—"}
                                        </p>
                                    )}
                                </div>

                                {/* Country */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        Country
                                    </label>
                                    {isEditing ? (
                                        <select
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Country</option>
                                            <option value="US">United States</option>
                                            <option value="IN">India</option>
                                            <option value="CA">Canada</option>
                                            <option value="GB">United Kingdom</option>
                                            <option value="AU">Australia</option>
                                            <option value="DE">Germany</option>
                                            <option value="FR">France</option>
                                            <option value="IT">Italy</option>
                                            <option value="ES">Spain</option>
                                        </select>
                                    ) : (
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {formData.country || "—"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    {isEditing && (
                        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Saving…</span>
                                    </>
                                ) : (
                                    "Save"
                                )}
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Logo Confirmation Dialog */}
            <Dialog open={confirmDeleteLogo} onOpenChange={setConfirmDeleteLogo}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-150 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">
                            Delete Logo
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to delete the organization logo? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDeleteLogo(false)}
                            disabled={isDeleting}
                            className="rounded-lg text-zinc-700 dark:text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteLogo}
                            disabled={isDeleting}
                            className="bg-red-650 hover:bg-red-700 text-white rounded-lg"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting…
                                </>
                            ) : (
                                "Delete Logo"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
