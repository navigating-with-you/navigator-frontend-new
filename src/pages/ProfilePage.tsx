import { useState, useRef, useEffect } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useNavigate } from "react-router-dom";
import { uploadAvatar, deleteAvatar, updateProfile, syncUser } from "@/lib/api";
import { useUserProfile } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
    X,
    Loader2,
    Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateEmployeeCode, getEmployeeCodeConstraintsText } from "@/utils/employeeCodeValidation";

export default function ProfilePage({ onClose }: { onClose?: () => void }) {
    const { getToken, user } = useKindeAuth();
    const navigate = useNavigate();
    const { userProfile: contextProfile, setUserProfile } = useUserProfile();
    const [profile, setProfile] = useState<any>(contextProfile);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAvatarDeleted, setIsAvatarDeleted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // States for editable name fields
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editEmployeeCode, setEditEmployeeCode] = useState("");
    const [employeeCodeError, setEmployeeCodeError] = useState("");

    // Sync from context; if context is empty, fetch from backend
    useEffect(() => {
        if (contextProfile) {
            setProfile(contextProfile);
        } else {
            const fetchProfile = async () => {
                try {
                    const token = await getToken();
                    if (token) {
                        const syncRes = await syncUser(token);
                        setUserProfile(syncRes);
                        setProfile(syncRes);
                    }
                } catch (err) {
                    console.error("Failed to sync user profile on mount", err);
                }
            };
            fetchProfile();
        }
    }, [contextProfile, getToken, setUserProfile]);

    const fullName = profile?.display_name || (user?.givenName ? `${user.givenName} ${user.familyName || ""}`.trim() : "User");
    const email = profile?.email || user?.email || "-";
    const roleName = profile?.role?.name
        ? profile.role.name === "super_admin"
            ? "Super Admin"
            : profile.role.name.charAt(0).toUpperCase() + profile.role.name.slice(1)
        : "Member";

    // Split full name into first and last names for display and sync
    useEffect(() => {
        const nameParts = fullName.trim().split(/\s+/);
        setEditFirstName(nameParts[0] || "");
        setEditLastName(nameParts.slice(1).join(" ") || "");
        setEditEmployeeCode(profile?.employee_code || "");
    }, [profile, user, fullName]);

    const initials = fullName
        ? fullName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "U";

    const joinedDate = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "-";

    const organizationName = profile?.organization_name || profile?.organization?.name || "Connected Organization";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // Validation: File size must be under 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds 5MB limit");
            return;
        }

        // Validation: File type must be JPEG, JPG, or PNG
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Only JPG, JPEG, and PNG formats are allowed");
            return;
        }

        setTempFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setIsAvatarDeleted(false);
    };

    const handleDeleteAvatarClick = () => {
        setTempFile(null);
        setPreviewUrl(null);
        setIsAvatarDeleted(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Validate employee code if provided
            if (editEmployeeCode) {
                const validation = validateEmployeeCode(editEmployeeCode);
                if (!validation.isValid) {
                    setEmployeeCodeError(validation.error || "Invalid employee code");
                    setIsSaving(false);
                    return;
                }
            }
            setEmployeeCodeError("");

            const token = await getToken();
            if (!token) {
                toast.error("Authentication session expired. Please sign in again.");
                return;
            }

            let profileUpdated = false;

            // Extract original first name and last name
            const nameParts = fullName.trim().split(/\s+/);
            const origFirstName = nameParts[0] || "";
            const origLastName = nameParts.slice(1).join(" ") || "";

            // 1. Save updated first/last name if changed
            if (editFirstName.trim() !== origFirstName || editLastName.trim() !== origLastName || editEmployeeCode !== (profile?.employee_code || "")) {
                await updateProfile(
                    {
                        first_name: editFirstName.trim(),
                        last_name: editLastName.trim(),
                        employee_code: editEmployeeCode || null,
                    },
                    token
                );
                profileUpdated = true;
            }

            // 2. Save avatar deletion
            if (isAvatarDeleted) {
                await deleteAvatar(token);
                profileUpdated = true;
            } 
            // 3. Save new avatar upload
            else if (tempFile) {
                await uploadAvatar(tempFile, token);
                profileUpdated = true;
            }

            if (profileUpdated) {
                // Force a user profile sync from backend to get updated data
                const syncRes = await syncUser(token);
                setUserProfile(syncRes);
                setProfile(syncRes);
                toast.success("Profile details updated successfully!");
            }

            // Reset temp states and exit edit mode
            setTempFile(null);
            setPreviewUrl(null);
            setIsAvatarDeleted(false);
            setIsEditing(false);
        } catch (error: any) {
            console.error("Profile update error:", error);
            toast.error(error.message || "Failed to update profile details");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setTempFile(null);
        setPreviewUrl(null);
        setIsAvatarDeleted(false);
        setIsEditing(false);
    };

    const handleClose = () => {
        if (isEditing) {
            handleCancel();
        } else {
            if (onClose) {
                onClose();
            } else {
                navigate(-1);
            }
        }
    };

    // Determine current avatar source URL
    const currentAvatarUrl = isAvatarDeleted
        ? null
        : previewUrl || profile?.avatar_url;

    // Split full name to display first and last name values in View Mode
    const nameParts = fullName.trim().split(/\s+/);
    const firstNameVal = nameParts[0] || "";
    const lastNameVal = nameParts.slice(1).join(" ") || "";
    const employeeCode = profile?.employee_code || "-";

    return (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="profile-drawer">
            {/* Backdrop Overlay */}
            <div 
                className="fixed inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
                onClick={handleClose}
            />

            {/* Drawer Body Container */}
            <div className="relative w-full sm:max-w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-250">
                {/* Loader Overlay when saving */}
                {isSaving && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 z-50 flex flex-col items-center justify-center gap-3 rounded-l-[28px]">
                        <Loader2 className="h-9 w-9 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Saving profile...</span>
                    </div>
                )}

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                            tabIndex={-1}
                        aria-label="Close"
                            disabled={isSaving}
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
                            {isEditing ? "Edit My Profile" : "My Profile"}
                        </h2>
                    </div>

                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 bg-[#1A56DB] hover:bg-blue-750 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                        </button>
                    )}
                </div>

                {/* Drawer Contents Scroll Area */}
                <div className="flex-1 space-y-6 overflow-y-auto px-8 py-2">
                    {/* Employee Avatar Section */}
                    <div className="flex flex-col gap-2.5">
                        <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">
                            Employee Avatar
                        </label>
                        <div className="flex items-center gap-6">
                            <div className="relative w-28 h-28 shrink-0">
                                <div className="w-full h-full rounded-[24px] overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shadow-xs">
                                    {currentAvatarUrl ? (
                                        <img
                                            src={currentAvatarUrl}
                                            alt={fullName}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-zinc-50 to-zinc-150 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-zinc-650 dark:text-zinc-300 font-bold text-2xl">
                                            {initials}
                                        </div>
                                    )}
                                </div>

                                {isEditing && currentAvatarUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteAvatarClick}
                                        className="z-10 absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF5A1F] hover:bg-[#E04F1A] border border-white dark:border-zinc-900 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer font-bold text-[10px]"
                                        aria-label="Remove photo"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {isEditing && (
                                <div className="flex flex-col justify-center">
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold leading-relaxed">
                                        Allowed only .jpeg, .jpg, .png.
                                    </span>
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold leading-relaxed">
                                        Maximum size of 5 mb.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-2 self-start bg-[#1A56DB] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                    >
                                        Choose File
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/jpeg,image/png,image/jpg"
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile Fields */}
                    {!isEditing ? (
                        /* VIEW MODE FIELDS (2-Column Grid) */
                        <div className="grid grid-cols-2 gap-x-6 gap-y-5 pt-2">
                            {/* First Name */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    First Name
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {firstNameVal || "-"}
                                </span>
                            </div>

                            {/* Last Name */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Last Name
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {lastNameVal || "-"}
                                </span>
                            </div>

                            {/* Employee Code */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Employee Code
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {employeeCode}
                                </span>
                            </div>

                            {/* Workspace Role */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Workspace Role
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {roleName}
                                </span>
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-1 break-all">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Email
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {email}
                                </span>
                            </div>

                            {/* Organization */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Organization
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {organizationName}
                                </span>
                            </div>

                            {/* Member Since */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    Member Since
                                </span>
                                <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200">
                                    {joinedDate}
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* EDIT MODE FIELDS (Vertical Stack) */
                        <div className="flex flex-col gap-5">
                            {/* First Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    First Name
                                </label>
                                <Input
                                    value={editFirstName}
                                    onChange={(e) => setEditFirstName(e.target.value)}
                                    maxLength={50}
                                    className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl h-11 px-3.5 shadow-none focus-visible:ring-1 focus-visible:ring-blue-600"
                                />
                            </div>

                            {/* Last Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Last Name
                                </label>
                                <Input
                                    value={editLastName}
                                    onChange={(e) => setEditLastName(e.target.value)}
                                    maxLength={50}
                                    className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl h-11 px-3.5 shadow-none focus-visible:ring-1 focus-visible:ring-blue-600"
                                />
                            </div>

                            {/* Employee Code */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Employee Code
                                </label>
                                <Input
                                    value={editEmployeeCode}
                                    onChange={(e) => {
                                        setEditEmployeeCode(e.target.value);
                                        setEmployeeCodeError("");
                                    }}
                                    maxLength={50}
                                    placeholder="e.g., EMP-001 or emp_user_123"
                                    className={cn(
                                        "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border rounded-xl h-11 px-3.5 shadow-none focus-visible:ring-1",
                                        employeeCodeError 
                                            ? "border-red-500 focus-visible:ring-red-500" 
                                            : "border-zinc-200 dark:border-zinc-700 focus-visible:ring-blue-600"
                                    )}
                                />
                                {employeeCodeError && (
                                    <span className="text-xs text-red-500 dark:text-red-400 font-medium">
                                        {employeeCodeError}
                                    </span>
                                )}
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {getEmployeeCodeConstraintsText()}
                                </span>
                            </div>

                            {/* Workspace Role */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Workspace Role
                                </label>
                                <Input
                                    value={roleName}
                                    disabled
                                    readOnly
                                    className="bg-[#F9FAFB] dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl h-11 px-3.5 cursor-not-allowed shadow-none"
                                />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Email
                                </label>
                                <Input
                                    value={email}
                                    disabled
                                    readOnly
                                    className="bg-[#F9FAFB] dark:bg-zinc-800/40 text-zinc-550 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl h-11 px-3.5 cursor-not-allowed shadow-none break-all"
                                />
                            </div>

                            {/* Organization */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Organization
                                </label>
                                <Input
                                    value={organizationName}
                                    disabled
                                    readOnly
                                    className="bg-[#F9FAFB] dark:bg-zinc-800/40 text-zinc-550 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl h-11 px-3.5 cursor-not-allowed shadow-none"
                                />
                            </div>

                            {/* Member Since */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Member Since
                                </label>
                                <Input
                                    value={joinedDate}
                                    disabled
                                    readOnly
                                    className="bg-[#F9FAFB] dark:bg-zinc-800/40 text-zinc-550 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl h-11 px-3.5 cursor-not-allowed shadow-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Drawer Footer (Only in Edit Mode) */}
                {isEditing && (
                    <div className="flex items-center justify-end px-8 py-5 shrink-0 bg-white dark:bg-zinc-900">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[#1A56DB] hover:text-blue-750 font-semibold text-sm transition-colors cursor-pointer mr-6"
                        >
                            Cancel
                        </button>
                        <Button
                            onClick={handleSave}
                            className="rounded-lg bg-[#1A56DB] hover:bg-blue-750 text-white font-semibold text-sm px-6 py-2.5 cursor-pointer shadow-none animate-none"
                        >
                            Save
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
