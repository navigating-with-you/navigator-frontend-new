export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
    /** Value of the `data-tour` attribute on the target element */
    target: string;
    title: string;
    content: string;
    placement?: TourPlacement;
    /** Extra padding around the target element in the spotlight (px) */
    spotlightPadding?: number;
    /** Route to navigate to before this step. Engine navigates then polls for the element. */
    navigateTo?: string;
    /**
     * RBAC permission string required to see this step.
     * Used at tour-start time to pre-filter the step list so totalSteps is accurate.
     * Matches the permission strings from PERMISSIONS in rbacConfig (e.g. "employee:view").
     */
    permission?: string;
}

export interface Tour {
    id: string;
    name: string;
    description: string;
    steps: TourStep[];
}

export const TOURS: Tour[] = [
    {
        id: "app-overview",
        name: "App Overview",
        description: "Walk through every section of Navigator from top to bottom",
        steps: [
            {
                target: "sidebar",
                title: "Navigation sidebar",
                content: "Everything in Navigator lives here. Use this sidebar to move between your workspace sections — the list runs top to bottom in order of priority.",
                placement: "right",
                spotlightPadding: 0,
            },
            {
                target: "nav-dashboard",
                title: "Dashboard",
                content: "See your organisation's key metrics at a glance — document counts, team activity, recent uploads, and usage trends.",
                placement: "right",
                permission: "employee:view",
            },
            {
                target: "nav-employees",
                title: "Employees",
                content: "Manage your team. Invite people by email, assign roles (admin, editor, member), and control what each person can access.",
                placement: "right",
                permission: "employee:view",
            },
            {
                target: "nav-categories",
                title: "Categories",
                content: "Organise employees and documents into groups or departments. Categories help structure access control and search context.",
                placement: "right",
                permission: "group:view",
            },
            {
                target: "nav-knowledge-base",
                title: "Knowledge Base",
                content: "Your document library. Upload PDFs, images, Word files, and spreadsheets. Every file is processed with OCR and indexed so the AI can search it instantly.",
                placement: "right",
                permission: "folder:view",
            },
            {
                target: "nav-integration",
                title: "Integration",
                content: "Connect Navigator to third-party tools and data sources. Integrations let you bring external content into the AI's knowledge context.",
                placement: "right",
            },
            {
                target: "nav-new-chat",
                title: "AI Chat",
                content: "Ask any question about your documents. The AI searches your entire Knowledge Base and responds with accurate, cited answers drawn directly from your files.",
                placement: "right",
            },
            {
                target: "nav-search-chats",
                title: "Search Chats",
                content: "Find any previous conversation instantly. Use ⌘K (or Ctrl+K) as a shortcut to open the search from anywhere in the app.",
                placement: "right",
            },
            {
                target: "tour-notifications",
                title: "Notifications",
                content: "Real-time alerts appear here when documents finish processing, teammates are added, or other important events happen in your workspace.",
                placement: "bottom",
            },
            {
                target: "tour-user-menu",
                title: "Your account",
                content: "Access your profile, change your password, switch themes, manage your subscription, and sign out — all from this menu.",
                placement: "bottom",
            },
            {
                target: "chat-input-welcome",
                title: "Ask anything",
                content: "You're all set! Type your first question here. The AI searches across all your indexed documents and composes an answer with source references.",
                placement: "top",
                navigateTo: "/chat",
                spotlightPadding: 4,
            },
        ],
    },
];

export const TOUR_STORAGE_KEY = "navigator_completed_tours";
export const TOUR_PROGRESS_KEY = "navigator_tour_progress";

/**
 * Filter a tour's steps to only those the user has permission to see.
 * Call this BEFORE startTour so totalSteps is correct for the member's role.
 */
export function filterStepsForUser(
    steps: TourStep[],
    hasPermission: (p: string) => boolean,
): TourStep[] {
    return steps.filter((s) => !s.permission || hasPermission(s.permission));
}
