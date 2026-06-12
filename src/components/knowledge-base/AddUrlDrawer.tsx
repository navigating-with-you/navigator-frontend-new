import { useEffect, useState } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import type { KBEntry, AddUrlPayload } from "@/types/knowledge-base";

interface AddUrlDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: AddUrlPayload) => void | Promise<void>;
    folders: KBEntry[];
    isInsideFolder?: boolean;
}

export default function AddUrlDrawer({
    open,
    onOpenChange,
    onSubmit,
    folders,
    isInsideFolder = false,
}: AddUrlDrawerProps) {
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [folderId, setFolderId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState<{ url?: boolean; folderId?: boolean }>({});

    useEffect(() => {
        if (!open) {
            setUrl(""); setTitle(""); setFolderId(""); setTouched({}); setIsSubmitting(false);
        } else if (folders.length > 0) {
            setFolderId(folders[0].id);
        }
    }, [open, folders]);

    const trimmedUrl = url.trim();
    const isValidUrl = /^https?:\/\//i.test(trimmedUrl);
    const isFolderValid = folderId.trim().length > 0;
    const canSave = trimmedUrl.length > 0 && isValidUrl && isFolderValid && !isSubmitting;

    const handleBlur = (field: "url" | "folderId") =>
        setTouched((prev) => ({ ...prev, [field]: true }));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit({ url: trimmedUrl, title: title.trim(), folderId });
            toast.success(`URL reference saved successfully`, { id: "add-url" });
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save URL", { id: "add-url" });
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
                data-testid="add-url-drawer"
            >
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        data-testid="close-add-url-btn"
                        tabIndex={-1}
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Save URL Reference
                    </SheetTitle>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* URL */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            URL <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Input
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); setTouched((p) => ({ ...p, url: true })); }}
                            onBlur={() => handleBlur("url")}
                            placeholder="https://example.com/docs"
                            maxLength={2048}
                            data-testid="url-input"
                            className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                        />
                        {touched.url && trimmedUrl === "" && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" /><span>URL is required.</span>
                            </div>
                        )}
                        {touched.url && trimmedUrl !== "" && !isValidUrl && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" /><span>Please enter a valid URL starting with http:// or https://.</span>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Title <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
                        </Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Custom display name"
                            maxLength={100}
                            data-testid="url-title-input"
                            className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                        />
                    </div>

                    {/* Folder */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Target Folder <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Select
                            value={folderId}
                            onValueChange={(v) => { setFolderId(v); setTouched((p) => ({ ...p, folderId: true })); }}
                            disabled={isInsideFolder || isSubmitting}
                        >
                            <SelectTrigger
                                className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                data-testid="url-folder-select"
                            >
                                <SelectValue placeholder="Select folder" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                {folders.map((f) => (
                                    <SelectItem
                                        key={f.id}
                                        value={f.id}
                                        className="text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-700"
                                    >
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {touched.folderId && !isFolderValid && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" /><span>Please select a folder.</span>
                            </div>
                        )}
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            The URL will be saved as a <code className="font-mono">.txt</code> reference file. Note: content scraping is not supported.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="rounded-lg text-sm text-zinc-600 dark:text-zinc-400"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!canSave}
                        onClick={handleSubmit}
                        data-testid="add-url-submit-btn"
                        className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Saving Reference...</span>
                            </>
                        ) : (
                            "Save Reference"
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}