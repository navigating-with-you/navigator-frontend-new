import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateFolderPayload } from "@/types/knowledge-base";
import { folderSchema } from "@/schemas/knowledgeBase";

interface CreateFolderDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateFolderPayload) => void | Promise<void>;
}

export default function CreateFolderDrawer({
    open,
    onOpenChange,
    onSubmit,
}: CreateFolderDrawerProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState<{ name?: boolean; description?: boolean }>({});

    useEffect(() => {
        if (!open) {
            setName("");
            setDescription("");
            setTouched({});
            setIsSubmitting(false);
        }
    }, [open]);

    const validation = folderSchema.safeParse({ name, description });
    const canCreate = validation.success && !isSubmitting;
    const fieldErrors = !validation.success ? validation.error.flatten().fieldErrors : {};

    const handleCreate = async () => {
        if (!canCreate) return;
        setIsSubmitting(true);
        try {
            await onSubmit({ name: name.trim(), description: description.trim() || undefined });
            onOpenChange(false);
        } catch {
            // Error toast is handled by the parent's onSubmit
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] bg-white dark:bg-zinc-900"
                data-testid="create-folder-drawer"
            >
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        data-testid="close-create-folder-btn"
                        aria-label="Close"
                        disabled={isSubmitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Create Folder
                    </SheetTitle>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="folder-name"
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Folder Name <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Input
                            id="folder-name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setTouched((p) => ({ ...p, name: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                            placeholder="Enter knowledge base folder name"
                            maxLength={100}
                            data-testid="folder-name-input"
                            disabled={isSubmitting}
                            className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                        />
                        {touched.name && fieldErrors.name && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{fieldErrors.name[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="folder-description"
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Description <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
                        </Label>
                        <Textarea
                            id="folder-description"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                setTouched((p) => ({ ...p, description: true }));
                            }}
                            onBlur={() => setTouched((p) => ({ ...p, description: true }))}
                            placeholder="Describe the purpose of this folder..."
                            maxLength={200}
                            rows={4}
                            data-testid="folder-description-input"
                            disabled={isSubmitting}
                            className="rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
                        />
                        <div className="flex justify-between items-center mt-1">
                            {touched.description && fieldErrors.description ? (
                                <div className="flex items-center gap-1.5 text-xs text-red-500">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{fieldErrors.description[0]}</span>
                                </div>
                            ) : (
                                <div />
                            )}
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                {description.length}/200
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                    <Button
                        onClick={handleCreate}
                        disabled={!canCreate}
                        data-testid="create-folder-submit-btn"
                        className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            "Create"
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}