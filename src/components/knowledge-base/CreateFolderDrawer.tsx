import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateFolderPayload } from "@/types/knowledge-base";

interface CreateFolderDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateFolderPayload) => void;
}

export default function CreateFolderDrawer({
    open,
    onOpenChange,
    onSubmit,
}: CreateFolderDrawerProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (!open) {
            setName("");
            setDescription("");
        }
    }, [open]);

    const canCreate = name.trim().length > 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] bg-white dark:bg-zinc-900"
                data-testid="create-folder-drawer"
            >
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        data-testid="close-create-folder-btn"
                        aria-label="Close"
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
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter knowledge base folder name"
                            data-testid="folder-name-input"
                            className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                        />
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
                            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                            placeholder="Describe the purpose of this folder..."
                            rows={4}
                            data-testid="folder-description-input"
                            className="rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
                        />
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-right">
                            {description.length}/1000
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                    <Button
                        onClick={() => onSubmit({ name: name.trim(), description: description.trim() || undefined })}
                        disabled={!canCreate}
                        data-testid="create-folder-submit-btn"
                        className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Create
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}